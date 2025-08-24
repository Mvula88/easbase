import fetch from 'node-fetch';

const SUPABASE_URL = 'https://rgpitrwgattviyazsahf.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJncGl0cndnYXR0dml5YXpzYWhmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTc2MDA3NSwiZXhwIjoyMDcxMzM2MDc1fQ.NIxr31YsCE5UxjGg0j6GeCdVU3AJR7QGySsz2pnRcUI';

async function executeSql(sql, description) {
  console.log(`Executing: ${description}...`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({ sql }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed: ${error}`);
    }

    console.log(`✓ ${description} completed`);
    return true;
  } catch (error) {
    console.error(`✗ ${description} failed:`, error.message);
    // Continue with other migrations even if one fails
    return false;
  }
}

async function setupAuthTables() {
  console.log('Setting up authentication tables...\n');

  // Create profiles table
  await executeSql(`
    CREATE TABLE IF NOT EXISTS public.profiles (
      id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      full_name TEXT,
      avatar_url TEXT,
      company_name TEXT,
      role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
      subscription_status TEXT DEFAULT 'trialing' CHECK (subscription_status IN ('trialing', 'active', 'canceled', 'past_due', 'paused')),
      subscription_plan TEXT DEFAULT 'free' CHECK (subscription_plan IN ('free', 'starter', 'growth', 'scale', 'enterprise')),
      billing_period TEXT DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'annual')),
      stripe_customer_id TEXT UNIQUE,
      stripe_subscription_id TEXT,
      current_period_start TIMESTAMPTZ,
      current_period_end TIMESTAMPTZ,
      trial_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
      ai_generations_used INTEGER DEFAULT 0,
      ai_generations_limit INTEGER DEFAULT 100,
      projects_count INTEGER DEFAULT 0,
      projects_limit INTEGER DEFAULT 1,
      team_members_count INTEGER DEFAULT 1,
      team_members_limit INTEGER DEFAULT 1,
      cache_hits INTEGER DEFAULT 0,
      total_requests INTEGER DEFAULT 0,
      onboarding_completed BOOLEAN DEFAULT false,
      email_verified BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `, 'Create profiles table');

  // Create organizations table
  await executeSql(`
    CREATE TABLE IF NOT EXISTS public.organizations (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
      stripe_customer_id TEXT UNIQUE,
      stripe_subscription_id TEXT,
      subscription_plan TEXT DEFAULT 'free' CHECK (subscription_plan IN ('free', 'starter', 'growth', 'scale', 'enterprise')),
      billing_period TEXT DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'annual')),
      settings JSONB DEFAULT '{}',
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `, 'Create organizations table');

  // Create team members table
  await executeSql(`
    CREATE TABLE IF NOT EXISTS public.team_members (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
      user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
      role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
      invited_by UUID REFERENCES public.profiles(id),
      invited_at TIMESTAMPTZ DEFAULT NOW(),
      joined_at TIMESTAMPTZ,
      UNIQUE(organization_id, user_id)
    );
  `, 'Create team_members table');

  // Create activity logs table
  await executeSql(`
    CREATE TABLE IF NOT EXISTS public.activity_logs (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      resource_type TEXT,
      resource_id TEXT,
      metadata JSONB DEFAULT '{}',
      ip_address INET,
      user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `, 'Create activity_logs table');

  // Create indexes
  await executeSql(`
    CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
    CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON public.profiles(stripe_customer_id);
    CREATE INDEX IF NOT EXISTS idx_organizations_owner ON public.organizations(owner_id);
    CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
    CREATE INDEX IF NOT EXISTS idx_team_members_org ON public.team_members(organization_id);
    CREATE INDEX IF NOT EXISTS idx_team_members_user ON public.team_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_org ON public.activity_logs(organization_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs(created_at DESC);
  `, 'Create indexes');

  // Create trigger function
  await executeSql(`
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO public.profiles (id, email, full_name, avatar_url)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
      );
      
      INSERT INTO public.activity_logs (user_id, action, resource_type, resource_id, metadata)
      VALUES (
        NEW.id,
        'user.registered',
        'user',
        NEW.id::TEXT,
        jsonb_build_object('email', NEW.email, 'provider', NEW.raw_app_meta_data->>'provider')
      );
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `, 'Create handle_new_user function');

  // Create trigger
  await executeSql(`
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  `, 'Create auth trigger');

  // Create update_updated_at function
  await executeSql(`
    CREATE OR REPLACE FUNCTION public.update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `, 'Create update_updated_at function');

  // Create updated_at triggers
  await executeSql(`
    DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  `, 'Create profiles updated_at trigger');

  await executeSql(`
    DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
    CREATE TRIGGER update_organizations_updated_at
      BEFORE UPDATE ON public.organizations
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  `, 'Create organizations updated_at trigger');

  // Enable RLS
  await executeSql(`
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
  `, 'Enable RLS');

  // Create RLS policies for profiles
  await executeSql(`
    CREATE POLICY "Users can view their own profile"
      ON public.profiles FOR SELECT
      USING (auth.uid() = id);
  `, 'Create profile select policy');

  await executeSql(`
    CREATE POLICY "Users can update their own profile"
      ON public.profiles FOR UPDATE
      USING (auth.uid() = id);
  `, 'Create profile update policy');

  // Create RLS policies for organizations
  await executeSql(`
    CREATE POLICY "Users can view organizations they belong to"
      ON public.organizations FOR SELECT
      USING (
        owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.team_members
          WHERE team_members.organization_id = organizations.id
          AND team_members.user_id = auth.uid()
        )
      );
  `, 'Create organization select policy');

  await executeSql(`
    CREATE POLICY "Owners can update their organizations"
      ON public.organizations FOR UPDATE
      USING (owner_id = auth.uid());
  `, 'Create organization update policy');

  await executeSql(`
    CREATE POLICY "Users can create organizations"
      ON public.organizations FOR INSERT
      WITH CHECK (owner_id = auth.uid());
  `, 'Create organization insert policy');

  // Grant permissions
  await executeSql(`
    GRANT ALL ON public.profiles TO authenticated;
    GRANT ALL ON public.organizations TO authenticated;
    GRANT ALL ON public.team_members TO authenticated;
    GRANT ALL ON public.activity_logs TO authenticated;
    GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
  `, 'Grant permissions');

  console.log('\n✅ Authentication tables setup complete!');
  console.log('Users will now have profiles automatically created when they sign up.');
}

// Run the setup
setupAuthTables().catch(console.error);