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
    return false;
  }
}

async function setupContactTable() {
  console.log('Setting up contact submissions table...\n');

  await executeSql(`
    CREATE TABLE IF NOT EXISTS public.contact_submissions (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      company TEXT,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
      replied_at TIMESTAMPTZ,
      reply_message TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `, 'Create contact_submissions table');

  await executeSql(`
    CREATE INDEX IF NOT EXISTS idx_contact_submissions_email ON public.contact_submissions(email);
    CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON public.contact_submissions(status);
    CREATE INDEX IF NOT EXISTS idx_contact_submissions_created ON public.contact_submissions(created_at DESC);
  `, 'Create indexes');

  await executeSql(`
    ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
  `, 'Enable RLS');

  await executeSql(`
    CREATE POLICY "Anyone can submit contact form"
      ON public.contact_submissions FOR INSERT
      WITH CHECK (true);
  `, 'Create insert policy');

  await executeSql(`
    CREATE POLICY "Admins can view contact submissions"
      ON public.contact_submissions FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'super_admin')
        )
      );
  `, 'Create select policy');

  await executeSql(`
    GRANT INSERT ON public.contact_submissions TO anon;
    GRANT ALL ON public.contact_submissions TO authenticated;
  `, 'Grant permissions');

  console.log('\n✅ Contact submissions table setup complete!');
}

setupContactTable().catch(console.error);