import { NextRequest, NextResponse } from 'next/server';
import { SupabaseProxyService } from '@/lib/services/supabase-proxy';
import { createClient } from '@/lib/auth/supabase';

/**
 * OAuth callback handler for Supabase OAuth App
 * This handles the redirect after user authorizes your app in Supabase
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/auth/error?message=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/auth/error?message=Invalid+OAuth+callback', request.url)
      );
    }

    // Validate and exchange code for tokens
    const proxy = new SupabaseProxyService();
    const tokenResponse = await proxy.validateOAuthCallback(code, state);

    if (!tokenResponse.isValid || !tokenResponse.accessToken) {
      return NextResponse.redirect(
        new URL('/auth/error?message=Failed+to+validate+OAuth', request.url)
      );
    }

    // Store tokens securely in user's session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Store OAuth tokens in user metadata or secure storage
      await supabase
        .from('user_oauth_tokens')
        .upsert({
          user_id: user.id,
          provider: 'supabase',
          access_token: tokenResponse.accessToken,
          refresh_token: tokenResponse.refreshToken,
          updated_at: new Date().toISOString(),
        });
    }

    // Redirect to success page
    return NextResponse.redirect(
      new URL('/dashboard/backends?oauth=success', request.url)
    );
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/auth/error?message=OAuth+callback+failed', request.url)
    );
  }
}