import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabase-server';

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const projectId = params.projectId;
    
    // Verify user owns this project
    const { data: project, error: fetchError } = await supabase
      .from('customer_projects')
      .select('id')
      .eq('id', projectId)
      .eq('customer_id', user.id)
      .single();
    
    if (fetchError || !project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }
    
    // Generate new API key
    const newApiKey = `easbase_${user.id.substring(0, 8)}_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;
    
    // Update project with new API key
    const { error: updateError } = await supabase
      .from('customer_projects')
      .update({ 
        api_key: newApiKey,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId);
    
    if (updateError) {
      console.error('Error updating API key:', updateError);
      return NextResponse.json(
        { error: 'Failed to regenerate API key' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      apiKey: newApiKey
    });
    
  } catch (error: any) {
    console.error('Error regenerating API key:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}