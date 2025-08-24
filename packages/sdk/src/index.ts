interface EasbaseConfig {
  apiKey: string;
  baseUrl?: string;
}

interface SchemaResult {
  success: boolean;
  schema: any;
  sql: string;
  cached: boolean;
  tokensUsed: number;
  costSaved: number;
  remaining?: number;
}

interface DeploymentResult {
  success: boolean;
  deploymentId: string;
  error?: string;
}

interface CachedSchema {
  found: boolean;
  schema?: any;
  sql?: string;
  similarity?: number;
  tokensSaved?: number;
}

interface CacheStatus {
  cache: {
    totalCached: number;
    totalHits: number;
    totalTokensSaved: number;
    avgSimilarity: number;
    hitRate: string;
    costSaved: string;
  };
  embeddings: {
    configured: boolean;
    model: string;
    fallback: boolean;
    recommendation: string;
  };
}

interface WebhookSubscription {
  id?: string;
  url: string;
  events: string[];
  secret?: string;
  headers?: Record<string, string>;
  active?: boolean;
}

interface WebhookEvent {
  id: string;
  type: string;
  payload: any;
  timestamp: string;
}

interface CodeGenerationOptions {
  schemaId: string;
  language: string;
  framework?: string;
  includeValidation?: boolean;
  includeComments?: boolean;
  includeTests?: boolean;
}

interface GeneratedCode {
  language: string;
  framework?: string;
  files: Array<{
    path: string;
    content: string;
    type: string;
  }>;
}

export class EasbaseClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: EasbaseConfig) {
    if (!config.apiKey) {
      throw new Error('API key is required');
    }
    
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.easbase.dev';
  }

  /**
   * Generate a database schema from natural language
   */
  async generateSchema(prompt: string, options?: {
    autoDeploy?: boolean;
    projectId?: string;
  }): Promise<SchemaResult> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify({
        prompt,
        projectId: options?.projectId
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Easbase API error: ${response.statusText} - ${error}`);
    }

    return await response.json() as SchemaResult;
  }

  /**
   * Deploy an auth template
   */
  async deployAuthTemplate(template: 'saas' | 'marketplace' | 'social', projectId: string): Promise<DeploymentResult> {
    const response = await fetch(`${this.baseUrl}/api/auth/deploy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify({ template, projectId }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Easbase API error: ${response.statusText} - ${error}`);
    }

    return await response.json() as DeploymentResult;
  }

  /**
   * Get cached schemas similar to prompt
   */
  async findSimilar(prompt: string): Promise<CachedSchema> {
    const response = await fetch(`${this.baseUrl}/api/cache/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Easbase API error: ${response.statusText} - ${error}`);
    }

    return await response.json() as CachedSchema;
  }

  /**
   * Deploy SQL to connected Supabase
   */
  async deploy(projectId: string, sql: string, schemaId?: string): Promise<DeploymentResult> {
    const response = await fetch(`${this.baseUrl}/api/deploy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify({ projectId, sql, schemaId }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Easbase API error: ${response.statusText} - ${error}`);
    }

    return await response.json() as DeploymentResult;
  }

  /**
   * Check deployment status
   */
  async getDeploymentStatus(deploymentId: string): Promise<{ status: string }> {
    const response = await fetch(`${this.baseUrl}/api/deployments/${deploymentId}`, {
      headers: {
        'x-api-key': this.apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Easbase API error: ${response.statusText} - ${error}`);
    }

    return await response.json() as { status: string };
  }

  /**
   * List all projects
   */
  async listProjects(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/api/projects`, {
      headers: {
        'x-api-key': this.apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Easbase API error: ${response.statusText} - ${error}`);
    }

    return await response.json() as any[];
  }

  /**
   * Create a new project
   */
  async createProject(project: {
    name: string;
    description?: string;
    supabaseProjectUrl: string;
    supabaseAnonKey: string;
    supabaseServiceKey: string;
  }): Promise<{ id: string }> {
    const response = await fetch(`${this.baseUrl}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify({
        name: project.name,
        description: project.description,
        supabase_project_url: project.supabaseProjectUrl,
        supabase_anon_key: project.supabaseAnonKey,
        supabase_service_key: project.supabaseServiceKey,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Easbase API error: ${response.statusText} - ${error}`);
    }

    return await response.json() as { id: string };
  }

  /**
   * Get cache status and embedding configuration
   */
  async getCacheStatus(): Promise<CacheStatus> {
    const response = await fetch(`${this.baseUrl}/api/cache/status`, {
      headers: {
        'x-api-key': this.apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Easbase API error: ${response.statusText} - ${error}`);
    }

    return await response.json() as CacheStatus;
  }

  /**
   * Create a webhook subscription
   */
  async createWebhook(webhook: WebhookSubscription): Promise<WebhookSubscription> {
    const response = await fetch(`${this.baseUrl}/api/webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify(webhook),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Easbase API error: ${response.statusText} - ${error}`);
    }

    const result = await response.json();
    return result.subscription;
  }

  /**
   * List webhook subscriptions
   */
  async listWebhooks(): Promise<WebhookSubscription[]> {
    const response = await fetch(`${this.baseUrl}/api/webhooks`, {
      headers: {
        'x-api-key': this.apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Easbase API error: ${response.statusText} - ${error}`);
    }

    const result = await response.json();
    return result.subscriptions;
  }

  /**
   * Update a webhook subscription
   */
  async updateWebhook(subscriptionId: string, updates: Partial<WebhookSubscription>): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/webhooks`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify({ subscriptionId, ...updates }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Easbase API error: ${response.statusText} - ${error}`);
    }
  }

  /**
   * Disable a webhook subscription
   */
  async disableWebhook(subscriptionId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/webhooks?subscriptionId=${subscriptionId}`, {
      method: 'DELETE',
      headers: {
        'x-api-key': this.apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Easbase API error: ${response.statusText} - ${error}`);
    }
  }

  /**
   * Generate code from schema
   */
  async generateCode(options: CodeGenerationOptions): Promise<GeneratedCode> {
    const response = await fetch(`${this.baseUrl}/api/generate/code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Easbase API error: ${response.statusText} - ${error}`);
    }

    return await response.json() as GeneratedCode;
  }

  /**
   * Get supported languages and frameworks for code generation
   */
  async getSupportedLanguages(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/generate/code`, {
      headers: {
        'x-api-key': this.apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Easbase API error: ${response.statusText} - ${error}`);
    }

    return await response.json();
  }

  /**
   * Verify webhook signature (for receiving webhooks)
   */
  static verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const crypto = require('crypto');
    const parts = signature.split(',');
    const timestamp = parseInt(parts[0].replace('t=', ''));
    const receivedSig = parts[1].replace('v1=', '');

    // Check timestamp (5 minute tolerance)
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime - timestamp > 300) {
      return false;
    }

    // Verify signature
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(receivedSig),
      Buffer.from(expectedSig)
    );
  }
}

// CLI tool helper
export class EasbaseCLI {
  static async init() {
    console.log('🚀 Initializing Easbase project...');
    
    // Create .easbase config file
    const fs = require('fs');
    const path = require('path');
    
    const config = {
      version: '1.0.0',
      apiKey: process.env.EASBASE_API_KEY || '',
      projects: []
    };
    
    fs.writeFileSync(
      path.join(process.cwd(), '.easbase.json'),
      JSON.stringify(config, null, 2)
    );
    
    console.log('✅ Created .easbase.json config file');
    console.log('📝 Add your API key to the config file or set EASBASE_API_KEY environment variable');
  }

  static async generate(prompt: string) {
    const apiKey = process.env.EASBASE_API_KEY;
    if (!apiKey) {
      console.error('❌ EASBASE_API_KEY environment variable not set');
      process.exit(1);
    }
    
    const client = new EasbaseClient({ apiKey });
    
    console.log('🤖 Generating schema...');
    try {
      const result = await client.generateSchema(prompt);
      
      if (result.cached) {
        console.log(`⚡ Retrieved from cache (saved $${result.costSaved.toFixed(2)})`);
      }
      
      console.log('✅ Schema generated successfully!');
      console.log('\n--- SQL ---');
      console.log(result.sql);
      
      // Save to file
      const fs = require('fs');
      const filename = `schema_${Date.now()}.sql`;
      fs.writeFileSync(filename, result.sql);
      console.log(`\n💾 Saved to ${filename}`);
      
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }

  static async deploy(projectId: string, sqlFile: string) {
    const apiKey = process.env.EASBASE_API_KEY;
    if (!apiKey) {
      console.error('❌ EASBASE_API_KEY environment variable not set');
      process.exit(1);
    }
    
    const fs = require('fs');
    const sql = fs.readFileSync(sqlFile, 'utf-8');
    
    const client = new EasbaseClient({ apiKey });
    
    console.log('🚀 Deploying to Supabase...');
    try {
      const result = await client.deploy(projectId, sql);
      
      if (result.success) {
        console.log('✅ Deployment successful!');
        console.log(`📝 Deployment ID: ${result.deploymentId}`);
      } else {
        console.error('❌ Deployment failed:', result.error);
        process.exit(1);
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }
}

// Export default
export default EasbaseClient;