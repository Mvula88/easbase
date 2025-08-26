import { redirect } from 'next/navigation';
import { createClient } from '@/lib/auth/supabase-server';
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar';

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

  // Check if user is admin (you can adjust this logic based on your role system)
  const isAdmin = profile.role === 'admin' || user.email?.endsWith('@easbase.com');

  return (
    <div className="flex h-screen">
      <DashboardSidebar 
        user={{
          name: profile.display_name || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          role: profile.role
        }}
        isAdmin={isAdmin}
      />
      <main className="flex-1 lg:ml-64 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}