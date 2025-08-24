import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabase-server';
import { getBackendOrchestrator } from '@/lib/services/backend-orchestrator';
import { stripe } from '@/lib/services/stripe';

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, companyName, plan = 'starter' } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          company_name: companyName,
        },
      },
    });

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'User creation failed' },
        { status: 400 }
      );
    }

    // Create user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        company_name: companyName,
        subscription_plan: plan,
        subscription_status: 'trialing',
        trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Don't fail the signup, profile can be created later
    }

    // Create Stripe customer
    try {
      const customer = await stripe.customers.create({
        email,
        name: fullName,
        metadata: {
          user_id: authData.user.id,
          company: companyName || '',
        },
      });

      // Update profile with Stripe customer ID
      await supabase
        .from('user_profiles')
        .update({ stripe_customer_id: customer.id })
        .eq('id', authData.user.id);
    } catch (stripeError) {
      console.error('Stripe customer creation error:', stripeError);
      // Don't fail signup if Stripe fails
    }

    // Initialize backend services
    try {
      const orchestrator = await getBackendOrchestrator();
      const backendStatus = await orchestrator.initializeBackend({
        projectId: crypto.randomUUID(),
        userId: authData.user.id,
      });

      // Create default organization
      const teamsService = orchestrator.getTeamsService();
      await teamsService.createOrganization({
        name: companyName || `${fullName}'s Organization`,
        ownerId: authData.user.id,
      });

      // Mark backend as initialized
      await supabase
        .from('user_profiles')
        .update({ 
          backend_initialized: true,
          backend_status: backendStatus,
        })
        .eq('id', authData.user.id);
    } catch (backendError) {
      console.error('Backend initialization error:', backendError);
      // Don't fail signup if backend init fails
    }

    return NextResponse.json({
      user: authData.user,
      session: authData.session,
      profile,
      message: 'Account created successfully! Check your email to verify your account.',
    });
  } catch (error: any) {
    console.error('Sign up error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}