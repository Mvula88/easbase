import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/auth/supabase';
import { generateApiKey } from '@/lib/auth/api-key';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, full_name, company_name, team_size, use_case, role, goals } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const supabase = await createServiceClient();

    // Update user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        full_name,
        company_name,
        team_size,
        use_case,
        role,
        goals,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString()
      })
      .eq('id', user_id);

    if (profileError) {
      console.error('Profile update error:', profileError);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    // Generate default API key for the user
    try {
      const apiKey = await generateApiKey(user_id, 'Default API Key');
      
      // Return the API key only during onboarding
      return NextResponse.json({ 
        success: true,
        api_key: apiKey // User should save this, we only show it once
      });
    } catch (error) {
      console.error('Failed to generate API key:', error);
      // Don't fail onboarding if API key generation fails
      return NextResponse.json({ success: true });
    }

  } catch (error: any) {
    console.error('Onboarding error:', error);
    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
}