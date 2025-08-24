import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabase-server';

// GET /api/storage/[bucket]/[...path] - Get file or list files
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const pathSegments = params.path;
    const bucket = pathSegments[0];
    const filePath = pathSegments.slice(1).join('/');

    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!filePath) {
      // List files in bucket/path
      const { data: files, error } = await supabase.storage
        .from(bucket)
        .list(undefined, {
          limit: 100,
          offset: 0,
        });

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      return NextResponse.json({ files });
    } else {
      // Get signed URL for specific file
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      return NextResponse.json({ 
        url: data.signedUrl,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      });
    }
  } catch (error: any) {
    console.error('Storage GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/storage/[bucket]/[...path] - Delete file(s)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const pathSegments = params.path;
    const bucket = pathSegments[0];
    const filePath = pathSegments.slice(1).join('/');

    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user owns the file (path should start with user ID)
    if (!filePath.startsWith(user.id) && !filePath.includes(`/${user.id}/`)) {
      // Check if user has admin access
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        return NextResponse.json(
          { error: 'You can only delete your own files' },
          { status: 403 }
        );
      }
    }

    // Delete file
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Log deletion
    await supabase
      .from('storage_logs')
      .insert({
        user_id: user.id,
        bucket,
        path: filePath,
        action: 'delete',
        deleted_at: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error: any) {
    console.error('Storage DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}