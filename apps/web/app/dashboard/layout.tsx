import { redirect } from 'next/navigation';
import { createClient } from '@/lib/auth/supabase-server';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  
  // Check authentication
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    redirect('/login');
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    // Profile doesn't exist, might be a new user
    // Redirect to onboarding or create profile
    redirect('/onboarding');
  }

  return <>{children}</>;
}