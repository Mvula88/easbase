import { NextRequest } from 'next/server';

export interface ProxyConfig {
  targetUrl: string;
  headers?: Record<string, string>;
  rewriteResponse?: boolean;
}

export class SupabaseProxyService {
  private baseUrl: string;
  private accessToken: string;
  private organizationId: string;

  constructor() {
    this.baseUrl = process.env.SUPABASE_MANAGEMENT_API_URL || 'https://api.supabase.com';
    this.accessToken = process.env.SUPABASE_ACCESS_TOKEN || '';
    this.organizationId = process.env.SUPABASE_ORGANIZATION_ID || '';
  }

  /**
   * Proxy requests to Supabase API and rewrite responses to hide Supabase branding
   */
  async proxyRequest(
    path: string,
    method: string,
    body?: any,
    headers?: Record<string, string>
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    // Clone response to modify it
    const responseText = await response.text();
    let modifiedResponse = responseText;

    // Rewrite Supabase URLs and branding
    if (response.headers.get('content-type')?.includes('application/json')) {
      try {
        const data = JSON.parse(responseText);
        const rewrittenData = this.rewriteSupabaseReferences(data);
        modifiedResponse = JSON.stringify(rewrittenData);
      } catch (e) {
        // If not valid JSON, return as is
      }
    }

    return new Response(modifiedResponse, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
        'X-Powered-By': 'Easbase',
        // Remove Supabase headers
        'X-Supabase-Api-Version': undefined,
      } as any,
    });
  }

  /**
   * Rewrite Supabase references in responses
   */
  private rewriteSupabaseReferences(data: any): any {
    if (typeof data === 'string') {
      return data
        .replace(/supabase\.co/g, 'easbase.io')
        .replace(/supabase\.io/g, 'easbase.io')
        .replace(/Supabase/g, 'Easbase Backend')
        .replace(/supabase/g, 'easbase');
    }

    if (Array.isArray(data)) {
      return data.map(item => this.rewriteSupabaseReferences(item));
    }

    if (typeof data === 'object' && data !== null) {
      const rewritten: any = {};
      for (const [key, value] of Object.entries(data)) {
        // Rewrite URLs in specific fields
        if (key === 'url' || key === 'endpoint' || key === 'host') {
          rewritten[key] = this.rewriteSupabaseReferences(value);
        } else {
          rewritten[key] = this.rewriteSupabaseReferences(value);
        }
      }
      return rewritten;
    }

    return data;
  }

  /**
   * Create a custom subdomain for customer projects
   */
  generateCustomerSubdomain(customerId: string, projectName: string): string {
    const cleanName = projectName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `${cleanName}-${customerId.slice(0, 8)}.backend.easbase.io`;
  }

  /**
   * Generate customer-friendly API endpoints
   */
  generateCustomerEndpoints(projectId: string, customerId: string): {
    apiUrl: string;
    authUrl: string;
    storageUrl: string;
    realtimeUrl: string;
  } {
    const subdomain = this.generateCustomerSubdomain(customerId, 'api');
    
    return {
      apiUrl: `https://${subdomain}/rest/v1`,
      authUrl: `https://${subdomain}/auth/v1`,
      storageUrl: `https://${subdomain}/storage/v1`,
      realtimeUrl: `wss://${subdomain}/realtime/v1`,
    };
  }

  /**
   * Validate OAuth callback from Supabase
   */
  async validateOAuthCallback(code: string, state: string): Promise<{
    isValid: boolean;
    accessToken?: string;
    refreshToken?: string;
  }> {
    try {
      // Exchange code for tokens
      const response = await fetch('https://api.supabase.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code,
          client_id: process.env.SUPABASE_OAUTH_CLIENT_ID,
          client_secret: process.env.SUPABASE_OAUTH_CLIENT_SECRET,
          redirect_uri: process.env.SUPABASE_OAUTH_REDIRECT_URI,
        }),
      });

      if (!response.ok) {
        return { isValid: false };
      }

      const tokens = await response.json();
      return {
        isValid: true,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      };
    } catch (error) {
      console.error('OAuth validation error:', error);
      return { isValid: false };
    }
  }
}