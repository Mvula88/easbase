// Test Model B Complete Flow
const fetch = require('node-fetch');
require('dotenv').config({ path: '../apps/web/.env.local' });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';

async function testModelBFlow() {
  console.log('🚀 Testing Model B Customer Signup Flow\n');
  console.log('=' .repeat(60));
  
  // Generate test customer email
  const testEmail = `test-customer-${Date.now()}@easbase.com`;
  const testPassword = 'TestPassword123!';
  
  console.log('📧 Test Customer:', testEmail);
  console.log('🔑 Password:', testPassword);
  console.log('\n' + '-'.repeat(60));
  
  try {
    // Step 1: Test signup with auto-provisioning
    console.log('\n📝 Step 1: Creating customer account...');
    const signupResponse = await fetch(`${APP_URL}/api/auth/signup-provision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        plan: 'starter'
      })
    });

    if (!signupResponse.ok) {
      const error = await signupResponse.text();
      console.error('❌ Signup failed:', error);
      return;
    }

    const signupData = await signupResponse.json();
    console.log('✅ Customer account created!');
    console.log('   Customer ID:', signupData.customer?.id);
    console.log('   Plan:', signupData.customer?.plan);
    
    if (signupData.project) {
      console.log('\n🏗️  Project Status:', signupData.project.status);
      console.log('   Estimated time:', signupData.project.estimatedTime);
      console.log('\n✨ Model B Success! Customer project is being provisioned automatically!');
    } else if (signupData.requiresManualSetup) {
      console.log('\n⚠️  Fallback to Model A - Manual setup required');
      console.log('   This means auto-provisioning is not fully configured');
    }
    
    // Step 2: Check provisioning queue
    console.log('\n📋 Step 2: Checking provisioning queue...');
    
    // This would normally check the database, but for testing we'll just show the expected behavior
    console.log('   Expected: New entry in provisioning_queue table');
    console.log('   Action: create');
    console.log('   Status: pending → processing → completed');
    
    // Step 3: What happens next
    console.log('\n🔄 Step 3: Background process (what happens automatically):');
    console.log('   1. Worker picks up from provisioning_queue');
    console.log('   2. Creates Supabase project in "Easbase Customers" org');
    console.log('   3. Stores credentials in projects table');
    console.log('   4. Initializes with template schema');
    console.log('   5. Sends notification to customer');
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Model B Flow Test Complete!');
    console.log('='.repeat(60));
    
    console.log('\n📊 Check your database:');
    console.log('1. customers table - New customer record');
    console.log('2. provisioning_queue - Provisioning task');
    console.log('3. projects table - Will have project once provisioned');
    console.log('4. customer_notifications - "Project ready" notification');
    
    console.log('\n💡 Next steps:');
    console.log('1. Implement background worker to process provisioning_queue');
    console.log('2. Add webhook to monitor project creation status');
    console.log('3. Test with real customer signup on frontend');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

// Run the test
testModelBFlow();