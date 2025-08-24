import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { phone, email, code } = await request.json();

    if ((!phone && !email) || !code) {
      return NextResponse.json(
        { error: 'Phone/email and code are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Find the OTP record
    let query = supabase
      .from('otp_verifications')
      .select('*')
      .eq('code', code)
      .eq('verified', false)
      .gte('expires_at', new Date().toISOString());

    if (phone) {
      query = query.eq('phone', phone);
    } else if (email) {
      query = query.eq('email', email);
    }

    const { data: otp, error } = await query.single();

    if (error || !otp) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid or expired code' 
        },
        { status: 400 }
      );
    }

    // Mark OTP as verified
    await supabase
      .from('otp_verifications')
      .update({ 
        verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq('id', otp.id);

    // If user_id exists, update user verification status
    if (otp.user_id) {
      await supabase
        .from('user_profiles')
        .update({
          phone_verified: phone ? true : undefined,
          email_verified: email ? true : undefined,
          verified_at: new Date().toISOString(),
        })
        .eq('id', otp.user_id);
    }

    return NextResponse.json({
      success: true,
      verified: true,
      message: 'Code verified successfully',
    });
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify OTP' },
      { status: 500 }
    );
  }
}