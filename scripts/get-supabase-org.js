// Script to get your Supabase organizations
// Run this after adding your access token to .env.local

const fetch = require('node-fetch');
require('dotenv').config({ path: '../apps/web/.env.local' });

async function getOrganizations() {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.error('❌ SUPABASE_ACCESS_TOKEN not found in .env.local');
    console.log('\n📝 To get your access token:');
    console.log('1. Go to: https://app.supabase.com/account/tokens');
    console.log('2. Click "Generate new token"');
    console.log('3. Name it "easbase-provisioning"');
    console.log('4. Copy the token and add to .env.local:');
    console.log('   SUPABASE_ACCESS_TOKEN=your-token-here\n');
    return;
  }

  try {
    const response = await fetch('https://api.supabase.com/v1/organizations', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ API Error:', error);
      console.log('\n🔍 Check that your token is valid and try again.');
      return;
    }

    const organizations = await response.json();
    
    console.log('\n✅ Your Supabase Organizations:\n');
    console.log('=' .repeat(60));
    
    organizations.forEach((org, index) => {
      console.log(`\n${index + 1}. ${org.name}`);
      console.log(`   ID: ${org.id}`);
      console.log(`   Slug: ${org.slug || 'N/A'}`);
      console.log(`   Created: ${new Date(org.created_at).toLocaleDateString()}`);
      
      if (org.name.toLowerCase().includes('customer') || 
          org.name.toLowerCase().includes('easbase')) {
        console.log(`   👉 This looks like your customer org!`);
      }
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('\n📋 Add to your .env.local:');
    console.log('SUPABASE_ORGANIZATION_ID=<choose-the-org-id-for-customers>');
    console.log('SUPABASE_MANAGEMENT_API_URL=https://api.supabase.com\n');
    
    // Show example of complete env setup
    console.log('📄 Complete .env.local setup for Model B:');
    console.log('-'.repeat(60));
    console.log(`# For customer project provisioning`);
    console.log(`SUPABASE_ACCESS_TOKEN=${accessToken}`);
    console.log(`SUPABASE_ORGANIZATION_ID=<org-id-here>`);
    console.log(`SUPABASE_MANAGEMENT_API_URL=https://api.supabase.com`);
    console.log('-'.repeat(60));
    
  } catch (error) {
    console.error('❌ Error fetching organizations:', error);
    console.log('\n🔍 Troubleshooting:');
    console.log('1. Check your internet connection');
    console.log('2. Verify your access token is correct');
    console.log('3. Make sure the token has proper permissions');
  }
}

// Run the script
console.log('🔍 Fetching your Supabase organizations...\n');
getOrganizations();