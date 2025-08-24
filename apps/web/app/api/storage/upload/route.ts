import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabase-server';
import { getBackendOrchestrator } from '@/lib/services/backend-orchestrator';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bucket = formData.get('bucket') as string || 'uploads';
    const path = formData.get('path') as string;
    const isPublic = formData.get('public') === 'true';

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
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

    // Check storage limits
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('subscription_plan')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Generate file path
    const fileExt = file.name.split('.').pop();
    const fileName = path || `${user.id}/${Date.now()}.${fileExt}`;

    // Use orchestrator to upload file
    const orchestrator = await getBackendOrchestrator();
    const storageService = orchestrator.getStorageService();

    // Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.find(b => b.name === bucket)) {
      await storageService.createBucket(bucket, isPublic);
    }

    // Convert File to ArrayBuffer then to Blob
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: file.type });

    // Upload file
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, blob, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Get public URL if bucket is public
    let url = '';
    if (isPublic) {
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);
      url = urlData.publicUrl;
    } else {
      // Generate signed URL (1 hour expiry)
      const { data: signedUrlData } = await supabase.storage
        .from(bucket)
        .createSignedUrl(fileName, 3600);
      url = signedUrlData?.signedUrl || '';
    }

    // Log upload
    await supabase
      .from('storage_logs')
      .insert({
        user_id: user.id,
        bucket,
        path: fileName,
        size: file.size,
        type: file.type,
        is_public: isPublic,
        uploaded_at: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      key: data.path,
      url,
      bucket,
      size: file.size,
      type: file.type,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}

// GET /api/storage/upload - Get presigned upload URL
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bucket = searchParams.get('bucket') || 'uploads';
    const maxSize = parseInt(searchParams.get('maxSize') || '52428800'); // 50MB default
    const allowedTypes = searchParams.get('types')?.split(',') || [];

    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Generate unique upload path
    const uploadId = crypto.randomUUID();
    const uploadPath = `${user.id}/temp/${uploadId}`;

    // Create signed upload URL
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(uploadPath);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      url: data.signedUrl,
      path: uploadPath,
      token: data.token,
      bucket,
      maxSize,
      allowedTypes,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
    });
  } catch (error: any) {
    console.error('Get upload URL error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}