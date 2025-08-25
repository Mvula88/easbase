import { NextRequest, NextResponse } from 'next/server';
import { CustomerBackendService } from '@/lib/services/customer-backend';
import { createClient } from '@/lib/auth/supabase';

/**
 * GET /api/backends/[backendId] - Get backend details
 * PATCH /api/backends/[backendId] - Update backend (upgrade plan, etc.)
 * DELETE /api/backends/[backendId] - Delete backend
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { backendId: string } }
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

    const service = new CustomerBackendService();
    const backend = await service.getBackend(params.backendId, user.id);

    if (!backend) {
      return NextResponse.json(
        { error: 'Backend not found' },
        { status: 404 }
      );
    }

    // Get usage statistics
    const usage = await service.getBackendUsage(params.backendId, user.id);

    return NextResponse.json({
      backend,
      usage,
    });
  } catch (error: any) {
    console.error('Failed to fetch backend:', error);
    return NextResponse.json(
      { error: 'Failed to fetch backend' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { backendId: string } }
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

    const body = await request.json();
    const { action, plan } = body;

    const service = new CustomerBackendService();

    switch (action) {
      case 'upgrade':
        if (!plan || !['pro', 'enterprise'].includes(plan)) {
          return NextResponse.json(
            { error: 'Invalid plan for upgrade' },
            { status: 400 }
          );
        }
        const upgraded = await service.upgradeBackend(params.backendId, user.id, plan);
        return NextResponse.json({
          message: 'Backend upgraded successfully',
          backend: upgraded,
        });

      case 'pause':
        await service.pauseBackend(params.backendId, user.id);
        return NextResponse.json({
          message: 'Backend paused successfully',
        });

      case 'resume':
        await service.resumeBackend(params.backendId, user.id);
        return NextResponse.json({
          message: 'Backend resumed successfully',
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Failed to update backend:', error);
    return NextResponse.json(
      { error: 'Failed to update backend' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { backendId: string } }
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

    const service = new CustomerBackendService();
    await service.deleteBackend(params.backendId, user.id);

    return NextResponse.json({
      message: 'Backend deleted successfully',
    });
  } catch (error: any) {
    console.error('Failed to delete backend:', error);
    return NextResponse.json(
      { error: 'Failed to delete backend' },
      { status: 500 }
    );
  }
}