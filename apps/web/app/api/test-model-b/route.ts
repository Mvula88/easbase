import { NextRequest, NextResponse } from 'next/server';
import { DatabaseProvisioningService } from '@/lib/services/database-provisioning';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    
    // Test provisioning service
    const provisioning = new DatabaseProvisioningService();
    
    if (!provisioning.isProvisioningEnabled()) {
      return NextResponse.json({
        success: false,
        message: 'Provisioning not configured'
      });
    }
    
    // Simulate creating a project for a test customer
    const testCustomerId = `test-${Date.now()}`;
    const testEmail = email || `test-${Date.now()}@easbase.com`;
    
    return NextResponse.json({
      success: true,
      message: 'Model B is ready! In production, this would create a database project',
      testData: {
        customerId: testCustomerId,
        email: testEmail,
        wouldCreateProject: true,
        organizationId: process.env.SUPABASE_ORGANIZATION_ID,
        estimatedTime: '1-2 minutes'
      },
      nextSteps: [
        '1. Customer signs up on Easbase',
        '2. Easbase creates Supabase project in "Easbase Customers" org',
        '3. Project credentials stored securely',
        '4. Customer uses Easbase dashboard (never sees Supabase)',
        '5. You profit $74/month per customer!'
      ]
    });
    
  } catch (error: any) {
    console.error('Test Model B error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}