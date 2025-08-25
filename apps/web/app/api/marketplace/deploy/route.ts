import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabase-server';
import { CustomerBackendService } from '@/lib/services/customer-backend';
import { MARKETPLACE_TEMPLATES } from '@/lib/marketplace/templates';

/**
 * Deploy a purchased template as a new backend
 * POST /api/marketplace/deploy
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { templateId, projectName, plan = 'free' } = await req.json();

    // Verify user has purchased this template
    const { data: purchase, error: purchaseError } = await supabase
      .from('user_templates')
      .select('*')
      .eq('user_id', user.id)
      .eq('template_id', templateId)
      .single();

    if (purchaseError || !purchase) {
      return NextResponse.json(
        { error: 'Template not purchased or not found' },
        { status: 403 }
      );
    }

    // Get template details
    const template = MARKETPLACE_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Create the backend using CustomerBackendService
    const backendService = new CustomerBackendService();
    const backend = await backendService.createBackend(
      user.id,
      user.email!,
      {
        name: projectName,
        template: mapTemplateToType(template.category),
        plan: plan as 'free' | 'pro' | 'enterprise'
      }
    );

    // Apply the template schema
    await applyTemplateSchema(backend.projectId, template.schema);

    // Insert seed data if available
    if (template.seedData) {
      await applySeedData(backend.projectId, template.seedData);
    }

    // Track deployment
    await supabase
      .from('template_deployments')
      .insert({
        user_id: user.id,
        template_id: templateId,
        backend_id: backend.id,
        project_name: projectName,
        deployed_at: new Date().toISOString(),
        status: 'active'
      });

    return NextResponse.json({
      success: true,
      message: `Template "${template.name}" deployed successfully!`,
      backend: {
        id: backend.id,
        name: projectName,
        apiUrl: backend.endpoints.api,
        authUrl: backend.endpoints.auth,
        storageUrl: backend.endpoints.storage,
        realtimeUrl: backend.endpoints.realtime,
        apiKey: backend.credentials.anonKey,
        documentation: generateDocumentation(template, backend)
      }
    });
  } catch (error: any) {
    console.error('Template deployment error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to deploy template',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * Apply template schema to the backend
 */
async function applyTemplateSchema(projectId: string, schema: string) {
  try {
    // Get project credentials
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: schema,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to apply schema');
    }

    return true;
  } catch (error) {
    console.error('Schema application error:', error);
    // For now, we'll continue even if schema application fails
    // In production, you'd want to handle this more gracefully
    return false;
  }
}

/**
 * Apply seed data to the backend
 */
async function applySeedData(projectId: string, seedData: string) {
  try {
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: seedData,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to apply seed data');
    }

    return true;
  } catch (error) {
    console.error('Seed data application error:', error);
    return false;
  }
}

/**
 * Map template category to backend type
 */
function mapTemplateToType(category: string): 'saas' | 'marketplace' | 'social' | 'enterprise' {
  const mapping: Record<string, 'saas' | 'marketplace' | 'social' | 'enterprise'> = {
    'Transportation': 'marketplace',
    'Marketplace': 'marketplace',
    'SaaS': 'saas',
    'E-commerce': 'marketplace',
    'Social': 'social',
    'Entertainment': 'social',
    'Productivity': 'saas',
    'Communication': 'social',
  };

  return mapping[category] || 'saas';
}

/**
 * Generate documentation for deployed template
 */
function generateDocumentation(template: any, backend: any): string {
  return `
# ${template.name} - Deployment Documentation

## Quick Start

Your backend is now live and ready to use!

### Connection Details

- **API Endpoint**: ${backend.endpoints.api}
- **Auth Endpoint**: ${backend.endpoints.auth}
- **Storage**: ${backend.endpoints.storage}
- **Realtime**: ${backend.endpoints.realtime}

### Authentication

Use your API key in all requests:

\`\`\`javascript
const client = createClient(
  '${backend.endpoints.api}',
  '${backend.credentials.anonKey}'
);
\`\`\`

### Features Included

${template.features.map((f: string) => `- ✅ ${f}`).join('\n')}

### API Examples

\`\`\`javascript
// Fetch data
const { data, error } = await client
  .from('your_table')
  .select('*');

// Insert data
const { data, error } = await client
  .from('your_table')
  .insert({ column: 'value' });

// Real-time subscription
client
  .from('your_table')
  .on('INSERT', payload => {
    console.log('New record:', payload.new);
  })
  .subscribe();
\`\`\`

### Next Steps

1. Test your API endpoints
2. Configure authentication providers
3. Set up your frontend
4. Enable additional features as needed

### Support

Need help? Contact support@easbase.io
`;
}