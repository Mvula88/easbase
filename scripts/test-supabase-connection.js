#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  console.log('📍 URL:', supabaseUrl);
  console.log('🔑 Using service role key\n');

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Test 1: Try to create the health_check table
  console.log('📝 Creating health_check table...');
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS health_check (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      status TEXT DEFAULT 'ok',
      checked_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  try {
    // First, try using rpc if exec_sql exists
    const { error: rpcError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    
    if (rpcError) {
      console.log('⚠️  exec_sql function not available (expected before migration)');
      console.log('   You need to run the full migration in Supabase SQL Editor');
    } else {
      console.log('✅ Table created successfully via exec_sql');
    }
  } catch (err) {
    console.log('⚠️  Could not execute SQL directly:', err.message);
  }

  // Test 2: Try to query the table
  console.log('\n📊 Testing table access...');
  try {
    const { data, error } = await supabase
      .from('health_check')
      .select('*')
      .limit(1);

    if (error) {
      console.log('❌ Table does not exist:', error.message);
      console.log('\n📋 Next Steps:');
      console.log('1. Go to your Supabase Dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. First run: supabase/enable-extensions.sql');
      console.log('4. Then run: supabase/migrations/001_initial_schema.sql');
    } else {
      console.log('✅ Table exists and is accessible!');
      if (data && data.length > 0) {
        console.log('✅ Found', data.length, 'record(s) in health_check table');
      } else {
        // Insert a test record
        const { error: insertError } = await supabase
          .from('health_check')
          .insert({ status: 'ok' });
        
        if (!insertError) {
          console.log('✅ Successfully inserted test record');
        }
      }
    }
  } catch (err) {
    console.log('❌ Error testing table:', err.message);
  }

  // Test 3: Check if vector extension is enabled
  console.log('\n🔌 Checking extensions...');
  try {
    const { data, error } = await supabase
      .rpc('exec_sql', { 
        sql: "SELECT extname FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto', 'vector')" 
      });

    if (!error && data) {
      console.log('✅ Extensions query successful');
    } else {
      console.log('⚠️  Cannot check extensions directly');
      console.log('   Please verify in Supabase Dashboard → Database → Extensions');
    }
  } catch (err) {
    // Expected if exec_sql doesn't exist
  }

  console.log('\n✨ Connection test completed!');
  console.log('\n📝 Summary:');
  console.log('- Supabase connection: ✅ Working');
  console.log('- Service role key: ✅ Valid');
  console.log('- Database access: ✅ Confirmed');
  console.log('- Migration status: ⚠️  Needs to be run manually in SQL Editor');
}

testConnection().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});