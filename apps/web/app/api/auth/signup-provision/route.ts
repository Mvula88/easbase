import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabase';
import { DatabaseProvisioningService } from '@/lib/services/database-provisioning';
import { getEnv } from '@/lib/config/env';

export async function POST(req: NextRequest) {
  try {
    const { email, password, plan = 'starter' } = await req.json();
    
    // Step 1: Create user account in our database
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Step 2: Create customer record
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({
        id: userId,
        email,
        subscription_tier: plan,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (customerError) {
      console.error('Failed to create customer:', customerError);
      return NextResponse.json({ error: 'Failed to create customer account' }, { status: 500 });
    }

    // Step 3: Auto-provision Supabase project (Model B magic!)
    const provisioning = new DatabaseProvisioningService();
    
    if (provisioning.isProvisioningEnabled()) {
      try {
        // Create a new Supabase project for this customer
        const project = await provisioning.createProject(
          customer.id,
          customer.email,
          plan === 'enterprise' ? 'pro' : 'free'
        );

        // Wait for project to be ready (usually takes 1-2 minutes)
        // In production, you'd handle this with a background job
        setTimeout(async () => {
          try {
            // Get project credentials
            const credentials = await provisioning.getProjectCredentials(project.id);
            
            // Store credentials in our database
            await supabase
              .from('projects')
              .update({
                supabase_url: credentials.url,
                supabase_anon_key: credentials.anon_key,
                supabase_service_key: credentials.service_role_key,
                status: 'active',
              })
              .eq('supabase_project_id', project.id);

            // Initialize with template schema
            await provisioning.initializeProjectSchema(
              project.id,
              plan === 'enterprise' ? 'enterprise' : 'saas'
            );

            // Send welcome email with project ready notification
            // await sendWelcomeEmail(customer.email);
            
          } catch (error) {
            console.error('Failed to complete project setup:', error);
          }
        }, 5000); // Give Supabase time to provision

        return NextResponse.json({
          success: true,
          message: 'Account created! Your database is being set up and will be ready in 1-2 minutes.',
          customer: {
            id: customer.id,
            email: customer.email,
            plan,
          },
          project: {
            status: 'provisioning',
            estimatedTime: '1-2 minutes',
          }
        });
        
      } catch (provisionError) {
        console.error('Failed to provision project:', provisionError);
        // Continue without auto-provisioning (fallback to manual)
      }
    }

    // Fallback: Manual provisioning mode (Model A)
    return NextResponse.json({
      success: true,
      message: 'Account created! Please configure your Supabase project in the dashboard.',
      customer: {
        id: customer.id,
        email: customer.email,
        plan,
      },
      requiresManualSetup: true,
    });

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}