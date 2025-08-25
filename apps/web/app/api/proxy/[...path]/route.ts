import { NextRequest, NextResponse } from 'next/server';
import { SupabaseProxyService } from '@/lib/services/supabase-proxy';
import { createClient } from '@/lib/auth/supabase';

/**
 * Proxy all Supabase API calls through our server
 * This hides Supabase branding and makes it appear as Easbase
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleProxy(request, 'GET', params.path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleProxy(request, 'POST', params.path);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleProxy(request, 'PUT', params.path);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleProxy(request, 'PATCH', params.path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleProxy(request, 'DELETE', params.path);
}

async function handleProxy(
  request: NextRequest,
  method: string,
  pathSegments: string[]
) {
  try {
    // Extract customer API key from headers
    const apiKey = request.headers.get('X-Easbase-Key') || 
                   request.headers.get('apikey') ||
                   request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      );
    }

    // Validate API key and get customer's backend info
    const backendInfo = await validateApiKey(apiKey);
    if (!backendInfo) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // Construct the path
    const path = '/' + pathSegments.join('/');
    
    // Get request body if present
    let body = null;
    if (method !== 'GET' && method !== 'HEAD') {
      try {
        body = await request.json();
      } catch {
        // Not JSON body, might be FormData or other
        body = await request.text();
      }
    }

    // Proxy the request
    const proxy = new SupabaseProxyService();
    const response = await proxy.proxyRequest(
      path,
      method,
      body,
      {
        'X-Project-Ref': backendInfo.projectId,
      }
    );

    // Track usage
    await trackApiUsage(backendInfo.id, method, path);

    return response;
  } catch (error: any) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * Validate API key and get backend info
 */
async function validateApiKey(apiKey: string): Promise<any> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('customer_backends')
    .select('*')
    .or(`credentials->anonKey.eq.${apiKey},credentials->serviceRoleKey.eq.${apiKey}`)
    .single();

  if (error || !data) {
    return null;
  }

  // Check if backend is active
  if (data.status !== 'active') {
    return null;
  }

  return data;
}

/**
 * Track API usage for billing
 */
async function trackApiUsage(
  backendId: string,
  method: string,
  path: string
): Promise<void> {
  try {
    const supabase = await createClient();
    
    // Increment request counter
    await supabase.rpc('increment_api_usage', {
      backend_id: backendId,
      request_count: 1,
    });

    // Log detailed usage for analytics
    await supabase
      .from('api_usage_logs')
      .insert({
        backend_id: backendId,
        method,
        path,
        timestamp: new Date().toISOString(),
      });
  } catch (error) {
    console.error('Failed to track API usage:', error);
    // Don't fail the request if tracking fails
  }
}