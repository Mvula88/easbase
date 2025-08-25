export const OAUTH_CONFIG = {
  // OAuth App Configuration for Supabase
  app: {
    name: 'Easbase',
    description: 'Backend Infrastructure Platform - Generate your backend in 1 click',
    website: process.env.NEXT_PUBLIC_APP_URL || 'https://easbase.io',
    logo: '/logo.png',
  },

  // OAuth Endpoints
  endpoints: {
    authorize: 'https://api.supabase.com/oauth/authorize',
    token: 'https://api.supabase.com/oauth/token',
    revoke: 'https://api.supabase.com/oauth/revoke',
  },

  // OAuth Permissions/Scopes
  scopes: {
    analytics: {
      name: 'Analytics',
      description: 'Access to analytics logs',
      access: 'read',
    },
    auth: {
      name: 'Auth',
      description: 'Access to auth configurations and SSO providers',
      access: 'full',
    },
    database: {
      name: 'Database',
      description: 'Access to Postgres configurations, SQL snippets, SSL enforcement',
      access: 'full',
    },
    'database:migrations': {
      name: 'Database Migrations',
      description: 'Access to database migrations',
      access: 'full',
    },
    'database:pooler': {
      name: 'Database Pooler',
      description: 'Access to connection pooler configurations',
      access: 'full',
    },
    'database:types': {
      name: 'Database Types',
      description: 'Access to TypeScript type generation',
      access: 'read',
    },
    domains: {
      name: 'Custom Domains',
      description: 'Access to custom domains configurations',
      access: 'full',
    },
    edge_functions: {
      name: 'Edge Functions',
      description: 'Access to Edge Functions',
      access: 'full',
    },
    organizations: {
      name: 'Organizations',
      description: 'Access to manage organizations',
      access: 'read',
    },
    projects: {
      name: 'Projects',
      description: 'Access to manage projects',
      access: 'full',
    },
    realtime: {
      name: 'Realtime',
      description: 'Access to Realtime configurations',
      access: 'full',
    },
    secrets: {
      name: 'Secrets',
      description: 'Access to Edge Function secrets',
      access: 'full',
    },
    storage: {
      name: 'Storage',
      description: 'Access to Storage configurations',
      access: 'full',
    },
    'storage:buckets': {
      name: 'Storage Buckets',
      description: 'Access to manage storage buckets',
      access: 'full',
    },
  },

  // Callback URLs
  callbacks: {
    authorization: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/supabase`,
    success: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    error: `${process.env.NEXT_PUBLIC_APP_URL}/auth/error`,
  },

  // Client credentials (to be set in environment variables)
  client: {
    id: process.env.SUPABASE_OAUTH_CLIENT_ID,
    secret: process.env.SUPABASE_OAUTH_CLIENT_SECRET,
  },
};

/**
 * Generate OAuth authorization URL
 */
export function generateAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: OAUTH_CONFIG.client.id || '',
    redirect_uri: OAUTH_CONFIG.callbacks.authorization,
    response_type: 'code',
    scope: Object.keys(OAUTH_CONFIG.scopes).join(' '),
    state,
  });

  return `${OAUTH_CONFIG.endpoints.authorize}?${params.toString()}`;
}

/**
 * Get required scopes for Easbase functionality
 */
export function getRequiredScopes(): string[] {
  return Object.keys(OAUTH_CONFIG.scopes);
}

/**
 * Validate if user has granted all required scopes
 */
export function validateScopes(grantedScopes: string[]): {
  isValid: boolean;
  missingScopes: string[];
} {
  const required = getRequiredScopes();
  const missing = required.filter(scope => !grantedScopes.includes(scope));
  
  return {
    isValid: missing.length === 0,
    missingScopes: missing,
  };
}