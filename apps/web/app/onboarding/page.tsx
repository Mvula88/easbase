import { redirect } from 'next/navigation';
import { createClient } from '@/lib/auth/supabase-server';
import OnboardingClient from './onboarding-client';

export default async function OnboardingPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  // Check if user has already completed onboarding
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // If profile exists and onboarding is completed, redirect to dashboard
  if (profile && profile.onboarding_completed === true) {
    redirect('/dashboard');
  }

  return <OnboardingClient userId={user.id} />;
}