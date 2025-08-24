import { NextRequest, NextResponse } from 'next/server';
import { DatabaseProvisioningService } from '@/lib/services/database-provisioning';

export async function GET(req: NextRequest) {
  try {
    const provisioning = new DatabaseProvisioningService();
    
    // Check if provisioning is enabled
    const isEnabled = provisioning.isProvisioningEnabled();
    
    if (!isEnabled) {
      return NextResponse.json({
        status: 'not_configured',
        message: 'Database Management API is not configured',
        required: [
          'SUPABASE_ACCESS_TOKEN',
          'SUPABASE_ORGANIZATION_ID'
        ]
      });
    }
    
    // Test the connection
    const testResponse = await fetch('https://api.supabase.com/v1/organizations', {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!testResponse.ok) {
      return NextResponse.json({
        status: 'api_error',
        message: 'Failed to connect to Supabase Management API',
        error: await testResponse.text()
      }, { status: 500 });
    }
    
    const orgs = await testResponse.json();
    const targetOrg = orgs.find((org: any) => org.id === process.env.SUPABASE_ORGANIZATION_ID);
    
    return NextResponse.json({
      status: 'ready',
      message: 'Model B provisioning is ready!',
      configuration: {
        organizationFound: !!targetOrg,
        organizationName: targetOrg?.name || 'Not found',
        organizationId: process.env.SUPABASE_ORGANIZATION_ID,
        provisioningEnabled: true
      }
    });
    
  } catch (error: any) {
    console.error('Provisioning test error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to test provisioning',
      error: error.message
    }, { status: 500 });
  }
}