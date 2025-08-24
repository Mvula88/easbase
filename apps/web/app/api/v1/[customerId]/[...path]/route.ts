import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/auth/supabase-server';

// API Gateway for customer backend requests
// Routes: /api/v1/{customerId}/{resource}/{action}

interface CustomerProject {
  id: string;
  customer_id: string;
  project_name: string;
  supabase_url: string;
  supabase_anon_key: string;
  api_key: string;
  status: string;
  features: any;
}

async function getCustomerProject(customerId: string, apiKey?: string): Promise<CustomerProject | null> {
  const supabase = await createServerClient();
  
  // Validate by customer ID and optional API key
  let query = supabase
    .from('customer_projects')
    .select('*')
    .eq('customer_id', customerId)
    .eq('status', 'active');
  
  if (apiKey) {
    query = query.eq('api_key', apiKey);
  }
  
  const { data, error } = await query.single();
  
  if (error || !data) {
    return null;
  }
  
  return data as CustomerProject;
}

async function validateApiKey(req: NextRequest): Promise<string | null> {
  const apiKey = req.headers.get('x-api-key') || 
                 req.headers.get('authorization')?.replace('Bearer ', '');
  return apiKey || null;
}

async function trackUsage(projectId: string, endpoint: string, method: string, statusCode: number, responseTime: number) {
  const supabase = await createServerClient();
  
  await supabase.from('api_usage').insert({
    project_id: projectId,
    endpoint,
    method,
    status_code: statusCode,
    response_time_ms: responseTime,
    timestamp: new Date().toISOString()
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { customerId: string, path: string[] } }
) {
  const startTime = Date.now();
  
  try {
    const { customerId, path } = params;
    const apiKey = await validateApiKey(req);
    
    // Get customer's project
    const project = await getCustomerProject(customerId, apiKey || undefined);
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or invalid API key' },
        { status: 404 }
      );
    }
    
    // Build the path for the customer's Supabase instance
    const endpoint = path.join('/');
    
    // Create client for customer's Supabase
    const customerSupabase = createClient(
      project.supabase_url,
      project.supabase_anon_key
    );
    
    // Forward the request to customer's Supabase
    // This is a simplified example - in production, you'd handle all query params
    const url = new URL(req.url);
    const queryParams = url.searchParams.toString();
    
    const response = await fetch(
      `${project.supabase_url}/rest/v1/${endpoint}${queryParams ? `?${queryParams}` : ''}`,
      {
        method: 'GET',
        headers: {
          'apikey': project.supabase_anon_key,
          'Authorization': `Bearer ${project.supabase_anon_key}`,
          'Content-Type': 'application/json',
          'Prefer': req.headers.get('Prefer') || ''
        }
      }
    );
    
    const data = await response.json();
    const responseTime = Date.now() - startTime;
    
    // Track API usage
    await trackUsage(project.id, endpoint, 'GET', response.status, responseTime);
    
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    console.error('API Gateway error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { customerId: string, path: string[] } }
) {
  const startTime = Date.now();
  
  try {
    const { customerId, path } = params;
    const apiKey = await validateApiKey(req);
    
    // Get customer's project
    const project = await getCustomerProject(customerId, apiKey || undefined);
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or invalid API key' },
        { status: 404 }
      );
    }
    
    // Get request body
    const body = await req.json();
    
    // Build the path for the customer's Supabase instance
    const endpoint = path.join('/');
    
    // Forward the request to customer's Supabase
    const response = await fetch(
      `${project.supabase_url}/rest/v1/${endpoint}`,
      {
        method: 'POST',
        headers: {
          'apikey': project.supabase_anon_key,
          'Authorization': `Bearer ${project.supabase_anon_key}`,
          'Content-Type': 'application/json',
          'Prefer': req.headers.get('Prefer') || 'return=representation'
        },
        body: JSON.stringify(body)
      }
    );
    
    const data = await response.json();
    const responseTime = Date.now() - startTime;
    
    // Track API usage
    await trackUsage(project.id, endpoint, 'POST', response.status, responseTime);
    
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    console.error('API Gateway error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { customerId: string, path: string[] } }
) {
  const startTime = Date.now();
  
  try {
    const { customerId, path } = params;
    const apiKey = await validateApiKey(req);
    
    // Get customer's project
    const project = await getCustomerProject(customerId, apiKey || undefined);
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or invalid API key' },
        { status: 404 }
      );
    }
    
    // Get request body
    const body = await req.json();
    
    // Build the path for the customer's Supabase instance
    const endpoint = path.join('/');
    const url = new URL(req.url);
    const queryParams = url.searchParams.toString();
    
    // Forward the request to customer's Supabase
    const response = await fetch(
      `${project.supabase_url}/rest/v1/${endpoint}${queryParams ? `?${queryParams}` : ''}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': project.supabase_anon_key,
          'Authorization': `Bearer ${project.supabase_anon_key}`,
          'Content-Type': 'application/json',
          'Prefer': req.headers.get('Prefer') || 'return=representation'
        },
        body: JSON.stringify(body)
      }
    );
    
    const data = await response.json();
    const responseTime = Date.now() - startTime;
    
    // Track API usage
    await trackUsage(project.id, endpoint, 'PATCH', response.status, responseTime);
    
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    console.error('API Gateway error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { customerId: string, path: string[] } }
) {
  const startTime = Date.now();
  
  try {
    const { customerId, path } = params;
    const apiKey = await validateApiKey(req);
    
    // Get customer's project
    const project = await getCustomerProject(customerId, apiKey || undefined);
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or invalid API key' },
        { status: 404 }
      );
    }
    
    // Build the path for the customer's Supabase instance
    const endpoint = path.join('/');
    const url = new URL(req.url);
    const queryParams = url.searchParams.toString();
    
    // Forward the request to customer's Supabase
    const response = await fetch(
      `${project.supabase_url}/rest/v1/${endpoint}${queryParams ? `?${queryParams}` : ''}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': project.supabase_anon_key,
          'Authorization': `Bearer ${project.supabase_anon_key}`,
          'Content-Type': 'application/json',
          'Prefer': req.headers.get('Prefer') || ''
        }
      }
    );
    
    const responseTime = Date.now() - startTime;
    
    // Track API usage
    await trackUsage(project.id, endpoint, 'DELETE', response.status, responseTime);
    
    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    console.error('API Gateway error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}