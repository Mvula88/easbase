import { createClient } from '@/lib/auth/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/onboarding';

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data?.user) {
      // Check if user has completed onboarding
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('onboarding_completed')
        .eq('id', data.user.id)
        .single();
      
      // If onboarding is completed and they're trying to go to onboarding, redirect to dashboard
      if (profile?.onboarding_completed && next === '/onboarding') {
        return NextResponse.redirect(`${origin}/dashboard`);
      }
      
      // If onboarding is not completed, always go to onboarding
      if (!profile?.onboarding_completed) {
        return NextResponse.redirect(`${origin}/onboarding`);
      }
      
      // Otherwise, redirect to the requested page
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-error`);
}