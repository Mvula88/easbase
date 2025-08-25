import { NextRequest, NextResponse } from 'next/server';
import { CustomerBackendService } from '@/lib/services/customer-backend';
import { createClient } from '@/lib/auth/supabase';

/**
 * GET /api/backends/[backendId]/docs - Get API documentation for a backend
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
    const documentation = await service.generateApiDocs(params.backendId, user.id);

    // Return as markdown or HTML based on Accept header
    const acceptHeader = request.headers.get('accept') || '';
    
    if (acceptHeader.includes('text/html')) {
      // Convert markdown to HTML
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>API Documentation</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 2rem;
              line-height: 1.6;
            }
            pre { 
              background: #f4f4f4;
              padding: 1rem;
              border-radius: 4px;
              overflow-x: auto;
            }
            code {
              background: #f4f4f4;
              padding: 0.2rem 0.4rem;
              border-radius: 3px;
            }
            h1, h2, h3 { color: #333; }
            h1 { border-bottom: 2px solid #eee; padding-bottom: 0.5rem; }
            h2 { margin-top: 2rem; }
          </style>
        </head>
        <body>
          ${convertMarkdownToHtml(documentation)}
        </body>
        </html>
      `;
      
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html',
        },
      });
    }

    // Return as markdown
    return new NextResponse(documentation, {
      headers: {
        'Content-Type': 'text/markdown',
      },
    });
  } catch (error: any) {
    console.error('Failed to generate documentation:', error);
    return NextResponse.json(
      { error: 'Failed to generate documentation' },
      { status: 500 }
    );
  }
}

function convertMarkdownToHtml(markdown: string): string {
  // Simple markdown to HTML conversion
  return markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}