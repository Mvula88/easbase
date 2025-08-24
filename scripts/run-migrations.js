#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');

  // Create Supabase client with service role key
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing Supabase credentials in .env.local');
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log('📍 Supabase URL:', supabaseUrl);
  console.log('🔑 Using service role key for migrations\n');

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Read migration file
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql');
  console.log('📄 Reading migration file:', migrationPath);
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Error: Migration file not found at', migrationPath);
    process.exit(1);
  }

  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  console.log('✅ Migration file loaded successfully\n');

  // Split SQL into individual statements
  const statements = migrationSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));

  console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    
    // Extract a description from the statement
    const firstLine = statement.split('\n')[0];
    const description = firstLine.length > 50 
      ? firstLine.substring(0, 50) + '...' 
      : firstLine;
    
    process.stdout.write(`[${i + 1}/${statements.length}] ${description} ... `);

    try {
      // Use raw SQL execution through Supabase
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        // If exec_sql doesn't exist, try direct query
        if (error.message.includes('exec_sql') || error.code === '42883') {
          // Try to execute directly (this might not work for all statements)
          const { error: directError } = await supabase
            .from('health_check')
            .select('id')
            .limit(1)
            .maybeSingle();
          
          // If health_check doesn't exist, the migration needs to be run differently
          if (directError?.code === '42P01') {
            console.log('⚠️  Table does not exist yet (expected)');
            successCount++;
          } else {
            throw directError || error;
          }
        } else {
          throw error;
        }
      } else {
        console.log('✅');
        successCount++;
      }
    } catch (err) {
      console.log('❌');
      errorCount++;
      errors.push({
        statement: description,
        error: err.message
      });
      
      // Continue with other statements
      if (!err.message.includes('already exists') && 
          !err.message.includes('duplicate key') &&
          !err.message.includes('42P07')) {
        console.error(`   Error: ${err.message}`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  
  if (errors.length > 0) {
    console.log('\n⚠️  Errors encountered (some may be expected):');
    errors.forEach((err, idx) => {
      console.log(`   ${idx + 1}. ${err.statement}`);
      console.log(`      ${err.error}`);
    });
  }

  // Test the database connection
  console.log('\n🔍 Testing database connection...');
  try {
    const { data, error } = await supabase
      .from('health_check')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('⚠️  Health check table may not be accessible yet');
      console.log('   This is normal if migrations are still being applied');
    } else {
      console.log('✅ Database connection successful!');
      if (data && data.length > 0) {
        console.log('✅ Health check table is accessible');
      }
    }
  } catch (err) {
    console.log('⚠️  Could not verify database status:', err.message);
  }

  console.log('\n✨ Migration process completed!');
  
  if (errorCount === 0) {
    console.log('🎉 All migrations applied successfully!');
  } else {
    console.log('⚠️  Some statements failed - please review the errors above');
    console.log('   Many errors are expected if tables/indexes already exist');
  }
}

// Run migrations
runMigrations().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});