import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabase-server';
import { getBackendOrchestrator } from '@/lib/services/backend-orchestrator';

export async function POST(request: NextRequest) {
  try {
    const { email, redirectTo } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Send magic link
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      },
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Log email sent
    const orchestrator = await getBackendOrchestrator();
    const commService = orchestrator.getCommunicationService();
    await commService.sendEmail({
      to: email,
      subject: 'Sign in to Easbase',
      template: 'magic-link',
    });

    return NextResponse.json({
      success: true,
      message: 'Magic link sent! Check your email to sign in.',
    });
  } catch (error: any) {
    console.error('Magic link error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}