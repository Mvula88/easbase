import { NextRequest, NextResponse } from 'next/server';
import { CustomerBackendService } from '@/lib/services/customer-backend';
import { createClient } from '@/lib/auth/supabase';

/**
 * GET /api/backends - List all backends for the authenticated customer
 * POST /api/backends - Create a new backend
 */

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const service = new CustomerBackendService();
    const backends = await service.getCustomerBackends(user.id);

    return NextResponse.json({
      backends,
      count: backends.length,
    });
  } catch (error: any) {
    console.error('Failed to fetch backends:', error);
    return NextResponse.json(
      { error: 'Failed to fetch backends' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, template, plan = 'free' } = body;

    // Validate input
    if (!name || !template) {
      return NextResponse.json(
        { error: 'Name and template are required' },
        { status: 400 }
      );
    }

    const validTemplates = ['saas', 'marketplace', 'social', 'enterprise'];
    if (!validTemplates.includes(template)) {
      return NextResponse.json(
        { error: 'Invalid template' },
        { status: 400 }
      );
    }

    const validPlans = ['free', 'pro', 'enterprise'];
    if (!validPlans.includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      );
    }

    // Check backend limits based on user's plan
    const service = new CustomerBackendService();
    const existingBackends = await service.getCustomerBackends(user.id);
    
    // Free users can only have 1 backend
    if (plan === 'free' && existingBackends.length >= 1) {
      return NextResponse.json(
        { error: 'Free plan is limited to 1 backend. Please upgrade to create more.' },
        { status: 403 }
      );
    }

    // Create the backend
    const backend = await service.createBackend(
      user.id,
      user.email!,
      { name, template, plan }
    );

    return NextResponse.json(
      {
        message: 'Backend created successfully',
        backend,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Failed to create backend:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create backend',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}