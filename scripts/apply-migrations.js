const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client with service role key
const supabaseUrl = 'https://rgpitrwgattviyazsahf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJncGl0cndnYXR0dml5YXpzYWhmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTc2MDA3NSwiZXhwIjoyMDcxMzM2MDc1fQ.NIxr31YsCE5UxjGg0j6GeCdVU3AJR7QGySsz2pnRcUI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '009_user_profiles_auth.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying user profiles migration...');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }

    console.log('Migration applied successfully!');
    
    // Verify tables were created
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['profiles', 'organizations', 'team_members', 'activity_logs']);

    if (tables && tables.length > 0) {
      console.log('Created tables:', tables.map(t => t.table_name).join(', '));
    }

  } catch (error) {
    console.error('Error applying migration:', error);
    process.exit(1);
  }
}

applyMigration();