import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabase-server';

// This is the CORE of your platform - the API proxy
export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string; path: string[] } }
) {
  return handleRequest(req, params, 'GET');
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; path: string[] } }
) {
  return handleRequest(req, params, 'POST');
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; path: string[] } }
) {
  return handleRequest(req, params, 'PATCH');
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { projectId: string; path: string[] } }
) {
  return handleRequest(req, params, 'DELETE');
}

async function handleRequest(
  req: NextRequest,
  params: { projectId: string; path: string[] },
  method: string
) {
  try {
    // 1. Validate API Key
    const apiKey = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    // 2. Get project details and validate API key
    const supabase = await createClient();
    const { data: project, error: projectError } = await supabase
      .from('customer_projects')
      .select('*')
      .eq('id', params.projectId)
      .eq('api_key', apiKey)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // 3. Route to appropriate handler based on path
    const [resource, ...restPath] = params.path;
    
    // For MVP, use shared tables with tenant isolation
    const tenantId = project.id;
    
    switch (resource) {
      case 'products':
        return handleProducts(req, method, tenantId, restPath);
      case 'orders':
        return handleOrders(req, method, tenantId, restPath);
      case 'customers':
        return handleCustomers(req, method, tenantId, restPath);
      default:
        return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleProducts(
  req: NextRequest,
  method: string,
  tenantId: string,
  path: string[]
) {
  const supabase = await createClient();
  const [productId] = path;

  switch (method) {
    case 'GET':
      if (productId) {
        // Get single product
        const { data, error } = await supabase
          .from('tenant_products')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('id', productId)
          .single();
        
        if (error) return NextResponse.json({ error: error.message }, { status: 404 });
        return NextResponse.json(data);
      } else {
        // List products
        const { data, error } = await supabase
          .from('tenant_products')
          .select('*')
          .eq('tenant_id', tenantId);
        
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
      }

    case 'POST':
      const body = await req.json();
      const { data, error } = await supabase
        .from('tenant_products')
        .insert({ ...body, tenant_id: tenantId })
        .select()
        .single();
      
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json(data, { status: 201 });

    case 'PATCH':
      if (!productId) {
        return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
      }
      const updateBody = await req.json();
      const { data: updated, error: updateError } = await supabase
        .from('tenant_products')
        .update(updateBody)
        .eq('tenant_id', tenantId)
        .eq('id', productId)
        .select()
        .single();
      
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });
      return NextResponse.json(updated);

    case 'DELETE':
      if (!productId) {
        return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
      }
      const { error: deleteError } = await supabase
        .from('tenant_products')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('id', productId);
      
      if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });
      return NextResponse.json({ success: true });

    default:
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }
}

async function handleOrders(
  req: NextRequest,
  method: string,
  tenantId: string,
  path: string[]
) {
  // Similar to products but for orders
  const supabase = await createClient();
  
  switch (method) {
    case 'GET':
      const { data, error } = await supabase
        .from('tenant_orders')
        .select('*')
        .eq('tenant_id', tenantId);
      
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);

    case 'POST':
      const body = await req.json();
      const { data: order, error: orderError } = await supabase
        .from('tenant_orders')
        .insert({ ...body, tenant_id: tenantId })
        .select()
        .single();
      
      if (orderError) return NextResponse.json({ error: orderError.message }, { status: 400 });
      return NextResponse.json(order, { status: 201 });

    default:
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }
}

async function handleCustomers(
  req: NextRequest,
  method: string,
  tenantId: string,
  path: string[]
) {
  // Similar to products but for customers
  const supabase = await createClient();
  
  switch (method) {
    case 'GET':
      const { data, error } = await supabase
        .from('tenant_customers')
        .select('*')
        .eq('tenant_id', tenantId);
      
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);

    case 'POST':
      const body = await req.json();
      const { data: customer, error: customerError } = await supabase
        .from('tenant_customers')
        .insert({ ...body, tenant_id: tenantId })
        .select()
        .single();
      
      if (customerError) return NextResponse.json({ error: customerError.message }, { status: 400 });
      return NextResponse.json(customer, { status: 201 });

    default:
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }
}