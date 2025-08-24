import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabase-server';
import { getBackendOrchestrator } from '@/lib/services/backend-orchestrator';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    // Initialize backend services if first login
    if (profile && !profile.backend_initialized) {
      const orchestrator = await getBackendOrchestrator();
      const status = await orchestrator.initializeBackend({
        projectId: profile.default_project_id || '',
        userId: data.user.id,
      });

      // Mark as initialized
      await supabase
        .from('user_profiles')
        .update({ backend_initialized: true })
        .eq('id', data.user.id);
    }

    return NextResponse.json({
      user: data.user,
      session: data.session,
      profile,
    });
  } catch (error: any) {
    console.error('Sign in error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}