import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabase-server';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if 2FA is already enabled
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('two_factor_enabled, two_factor_secret')
      .eq('id', user.id)
      .single();

    if (profile?.two_factor_enabled) {
      return NextResponse.json({
        enabled: true,
        message: '2FA is already enabled'
      });
    }

    // Generate a new secret
    const secret = speakeasy.generateSecret({
      name: `Easbase (${user.email})`,
      issuer: 'Easbase',
      length: 32
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    // Store the secret temporarily (encrypted in production)
    await supabase
      .from('user_profiles')
      .update({
        two_factor_temp_secret: secret.base32,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    return NextResponse.json({
      enabled: false,
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { token, action } = body;

    if (action === 'enable') {
      // Get the temporary secret
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('two_factor_temp_secret')
        .eq('id', user.id)
        .single();

      if (!profile?.two_factor_temp_secret) {
        return NextResponse.json(
          { error: 'No 2FA setup in progress' },
          { status: 400 }
        );
      }

      // Verify the token
      const verified = speakeasy.totp.verify({
        secret: profile.two_factor_temp_secret,
        encoding: 'base32',
        token: token,
        window: 2
      });

      if (!verified) {
        return NextResponse.json(
          { error: 'Invalid verification code' },
          { status: 400 }
        );
      }

      // Enable 2FA
      const { error } = await supabase
        .from('user_profiles')
        .update({
          two_factor_enabled: true,
          two_factor_secret: profile.two_factor_temp_secret,
          two_factor_temp_secret: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      // Generate backup codes
      const backupCodes = Array.from({ length: 8 }, () => 
        Math.random().toString(36).substring(2, 10).toUpperCase()
      );

      // Store backup codes (hashed in production)
      await supabase
        .from('two_factor_backup_codes')
        .insert(
          backupCodes.map(code => ({
            user_id: user.id,
            code_hash: code, // Should be hashed in production
            used: false
          }))
        );

      return NextResponse.json({
        success: true,
        message: '2FA enabled successfully',
        backupCodes
      });
    } else if (action === 'disable') {
      // Verify the token before disabling
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('two_factor_secret')
        .eq('id', user.id)
        .single();

      if (!profile?.two_factor_secret) {
        return NextResponse.json(
          { error: '2FA is not enabled' },
          { status: 400 }
        );
      }

      const verified = speakeasy.totp.verify({
        secret: profile.two_factor_secret,
        encoding: 'base32',
        token: token,
        window: 2
      });

      if (!verified) {
        return NextResponse.json(
          { error: 'Invalid verification code' },
          { status: 400 }
        );
      }

      // Disable 2FA
      await supabase
        .from('user_profiles')
        .update({
          two_factor_enabled: false,
          two_factor_secret: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      // Delete backup codes
      await supabase
        .from('two_factor_backup_codes')
        .delete()
        .eq('user_id', user.id);

      return NextResponse.json({
        success: true,
        message: '2FA disabled successfully'
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('2FA operation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}