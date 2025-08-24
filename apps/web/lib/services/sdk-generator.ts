import { TableDefinition } from './claude-schema-generator';

export interface SDKConfig {
  projectId: string;
  projectName: string;
  apiUrl: string;
  apiKey: string;
  tables: TableDefinition[];
  features: {
    auth: boolean;
    storage: boolean;
    realtime: boolean;
  };
}

export class SDKGenerator {
  generateTypeScriptSDK(config: SDKConfig): string {
    const { projectId, projectName, apiUrl, tables, features } = config;
    const className = this.toPascalCase(projectName) + 'Client';

    const sdk = `// Auto-generated Easbase SDK for ${projectName}
// Generated at: ${new Date().toISOString()}

export interface ${className}Config {
  apiKey: string;
  apiUrl?: string;
}

${this.generateTypeDefinitions(tables)}

export class ${className} {
  private apiKey: string;
  private apiUrl: string;
  private headers: Record<string, string>;

  constructor(config: ${className}Config) {
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl || '${apiUrl}';
    this.headers = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
    };
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<T> {
    const response = await fetch(\`\${this.apiUrl}\${path}\`, {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(\`API Error: \${response.status} - \${error}\`);
    }

    return response.json();
  }

${features.auth ? this.generateAuthMethods() : ''}
${features.storage ? this.generateStorageMethods() : ''}
${this.generateTableMethods(tables)}
${features.realtime ? this.generateRealtimeMethods() : ''}
}

// Export convenience function
export function create${className}(apiKey: string, apiUrl?: string): ${className} {
  return new ${className}({ apiKey, apiUrl });
}

// Default export
export default ${className};`;

    return sdk;
  }

  private generateTypeDefinitions(tables: TableDefinition[]): string {
    const types: string[] = [];

    for (const table of tables) {
      const interfaceName = this.toPascalCase(table.name);
      const columns = table.columns
        .map(col => {
          const tsType = this.sqlToTypeScript(col.type);
          const optional = col.nullable ? '?' : '';
          return `  ${col.name}${optional}: ${tsType};`;
        })
        .join('\n');

      types.push(`export interface ${interfaceName} {\n${columns}\n}`);
      types.push(`export type ${interfaceName}Input = Omit<${interfaceName}, 'id' | 'created_at' | 'updated_at'>;`);
      types.push(`export type ${interfaceName}Update = Partial<${interfaceName}Input>;`);
    }

    return types.join('\n\n');
  }

  private generateAuthMethods(): string {
    return `
  // Authentication methods
  auth = {
    signUp: async (email: string, password: string, metadata?: any) => {
      return this.request<{ user: any; session: any }>('POST', '/auth/signup', {
        email,
        password,
        metadata,
      });
    },

    signIn: async (email: string, password: string) => {
      return this.request<{ user: any; session: any }>('POST', '/auth/signin', {
        email,
        password,
      });
    },

    signOut: async () => {
      return this.request<{ success: boolean }>('POST', '/auth/signout', {});
    },

    getUser: async () => {
      return this.request<{ user: any }>('GET', '/auth/user');
    },

    updateUser: async (updates: any) => {
      return this.request<{ user: any }>('PATCH', '/auth/user', updates);
    },

    resetPassword: async (email: string) => {
      return this.request<{ success: boolean }>('POST', '/auth/reset-password', {
        email,
      });
    },

    verifyEmail: async (token: string) => {
      return this.request<{ success: boolean }>('POST', '/auth/verify-email', {
        token,
      });
    },
  };`;
  }

  private generateStorageMethods(): string {
    return `
  // Storage methods
  storage = {
    upload: async (bucket: string, path: string, file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(\`\${this.apiUrl}/storage/\${bucket}/\${path}\`, {
        method: 'POST',
        headers: {
          'X-API-Key': this.apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(\`Upload failed: \${response.statusText}\`);
      }

      return response.json();
    },

    download: async (bucket: string, path: string): Promise<Blob> => {
      const response = await fetch(\`\${this.apiUrl}/storage/\${bucket}/\${path}\`, {
        headers: {
          'X-API-Key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(\`Download failed: \${response.statusText}\`);
      }

      return response.blob();
    },

    delete: async (bucket: string, path: string) => {
      return this.request<{ success: boolean }>('DELETE', \`/storage/\${bucket}/\${path}\`);
    },

    list: async (bucket: string, prefix?: string) => {
      const query = prefix ? \`?prefix=\${encodeURIComponent(prefix)}\` : '';
      return this.request<{ files: any[] }>('GET', \`/storage/\${bucket}\${query}\`);
    },

    getPublicUrl: (bucket: string, path: string): string => {
      return \`\${this.apiUrl}/storage/\${bucket}/\${path}\`;
    },
  };`;
  }

  private generateTableMethods(tables: TableDefinition[]): string {
    const methods: string[] = [];

    for (const table of tables) {
      const interfaceName = this.toPascalCase(table.name);
      const propertyName = this.toCamelCase(table.name);

      methods.push(`
  // ${interfaceName} methods
  ${propertyName} = {
    create: async (data: ${interfaceName}Input): Promise<${interfaceName}> => {
      return this.request<${interfaceName}>('POST', '/${table.name}', data);
    },

    get: async (id: string): Promise<${interfaceName}> => {
      return this.request<${interfaceName}>('GET', \`/${table.name}/\${id}\`);
    },

    list: async (params?: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      filter?: Record<string, any>;
    }): Promise<{ data: ${interfaceName}[]; count: number }> => {
      const query = new URLSearchParams();
      if (params?.limit) query.append('limit', params.limit.toString());
      if (params?.offset) query.append('offset', params.offset.toString());
      if (params?.orderBy) query.append('order', params.orderBy);
      if (params?.filter) {
        Object.entries(params.filter).forEach(([key, value]) => {
          query.append(\`filter[\${key}]\`, value);
        });
      }
      
      const queryString = query.toString() ? \`?\${query.toString()}\` : '';
      return this.request<{ data: ${interfaceName}[]; count: number }>('GET', \`/${table.name}\${queryString}\`);
    },

    update: async (id: string, data: ${interfaceName}Update): Promise<${interfaceName}> => {
      return this.request<${interfaceName}>('PATCH', \`/${table.name}/\${id}\`, data);
    },

    delete: async (id: string): Promise<{ success: boolean }> => {
      return this.request<{ success: boolean }>('DELETE', \`/${table.name}/\${id}\`);
    },

    query: async (query: {
      select?: string[];
      where?: Record<string, any>;
      orderBy?: { column: string; direction: 'asc' | 'desc' }[];
      limit?: number;
      offset?: number;
    }): Promise<${interfaceName}[]> => {
      return this.request<${interfaceName}[]>('POST', '/${table.name}/query', query);
    },
  };`);
    }

    return methods.join('\n');
  }

  private generateRealtimeMethods(): string {
    return `
  // Realtime subscription methods
  realtime = {
    subscribe: (channel: string, callback: (payload: any) => void) => {
      const ws = new WebSocket(\`\${this.apiUrl.replace('http', 'ws')}/realtime\`);
      
      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel,
          apiKey: this.apiKey,
        }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.channel === channel) {
          callback(data.payload);
        }
      };

      return {
        unsubscribe: () => {
          ws.send(JSON.stringify({
            type: 'unsubscribe',
            channel,
          }));
          ws.close();
        },
      };
    },
  };`;
  }

  generateJavaScriptSDK(config: SDKConfig): string {
    // Generate JavaScript version without types
    const tsSDK = this.generateTypeScriptSDK(config);
    
    // Remove TypeScript-specific syntax
    let jsSDK = tsSDK
      .replace(/export interface .+?\n}\n\n/gs, '')
      .replace(/export type .+?;\n/g, '')
      .replace(/: \w+(\[\])?/g, '')
      .replace(/<.+?>/g, '')
      .replace(/\?: /g, ': ')
      .replace(/async \(/g, 'async (')
      .replace(/\): Promise/g, ')')
      .replace(/interface /g, 'class ');

    return jsSDK;
  }

  generatePythonSDK(config: SDKConfig): string {
    const { projectName, apiUrl, tables } = config;
    const className = this.toSnakeCase(projectName) + '_client';

    return `"""
Auto-generated Easbase SDK for ${projectName}
Generated at: ${new Date().toISOString()}
"""

import requests
from typing import Dict, List, Optional, Any


class ${this.toPascalCase(projectName)}Client:
    """Client for interacting with ${projectName} API"""
    
    def __init__(self, api_key: str, api_url: str = "${apiUrl}"):
        self.api_key = api_key
        self.api_url = api_url
        self.headers = {
            "Content-Type": "application/json",
            "X-API-Key": api_key,
        }
    
    def _request(self, method: str, path: str, data: Optional[Dict] = None) -> Dict:
        """Make an API request"""
        url = f"{self.api_url}{path}"
        response = requests.request(
            method=method,
            url=url,
            headers=self.headers,
            json=data
        )
        response.raise_for_status()
        return response.json()

${tables.map(table => this.generatePythonTableMethods(table)).join('\n')}


def create_${className}(api_key: str, api_url: str = "${apiUrl}") -> ${this.toPascalCase(projectName)}Client:
    """Create a new client instance"""
    return ${this.toPascalCase(projectName)}Client(api_key, api_url)
`;
  }

  private generatePythonTableMethods(table: TableDefinition): string {
    const className = this.toPascalCase(table.name);
    const methodName = this.toSnakeCase(table.name);

    return `
    class ${className}:
        """Methods for ${table.name} table"""
        
        def __init__(self, client):
            self.client = client
        
        def create(self, data: Dict) -> Dict:
            """Create a new ${table.name} record"""
            return self.client._request("POST", "/${table.name}", data)
        
        def get(self, id: str) -> Dict:
            """Get a ${table.name} by ID"""
            return self.client._request("GET", f"/${table.name}/{id}")
        
        def list(self, limit: int = 10, offset: int = 0, **filters) -> Dict:
            """List ${table.name} records"""
            params = {"limit": limit, "offset": offset, **filters}
            query = "&".join(f"{k}={v}" for k, v in params.items())
            return self.client._request("GET", f"/${table.name}?{query}")
        
        def update(self, id: str, data: Dict) -> Dict:
            """Update a ${table.name} record"""
            return self.client._request("PATCH", f"/${table.name}/{id}", data)
        
        def delete(self, id: str) -> Dict:
            """Delete a ${table.name} record"""
            return self.client._request("DELETE", f"/${table.name}/{id}")
    
    @property
    def ${methodName}(self) -> ${className}:
        """Access ${table.name} methods"""
        return self.${className}(self)`;
  }

  generateREADME(config: SDKConfig): string {
    const { projectName, apiUrl } = config;

    return `# ${projectName} SDK

Auto-generated SDK for interacting with your ${projectName} backend.

## Installation

### JavaScript/TypeScript
\`\`\`bash
npm install @easbase/${this.toKebabCase(projectName)}
\`\`\`

### Python
\`\`\`bash
pip install easbase-${this.toKebabCase(projectName)}
\`\`\`

## Quick Start

### JavaScript/TypeScript
\`\`\`javascript
import { create${this.toPascalCase(projectName)}Client } from '@easbase/${this.toKebabCase(projectName)}';

const client = create${this.toPascalCase(projectName)}Client('your-api-key');

// Create a record
const newRecord = await client.users.create({
  email: 'user@example.com',
  name: 'John Doe'
});

// List records
const users = await client.users.list({ limit: 10 });

// Update a record
await client.users.update('user-id', { name: 'Jane Doe' });

// Delete a record
await client.users.delete('user-id');
\`\`\`

### Python
\`\`\`python
from easbase_${this.toSnakeCase(projectName)} import create_${this.toSnakeCase(projectName)}_client

client = create_${this.toSnakeCase(projectName)}_client('your-api-key')

# Create a record
new_record = client.users.create({
    'email': 'user@example.com',
    'name': 'John Doe'
})

# List records
users = client.users.list(limit=10)

# Update a record
client.users.update('user-id', {'name': 'Jane Doe'})

# Delete a record
client.users.delete('user-id')
\`\`\`

## API Reference

Full API documentation available at: ${apiUrl}/docs

## Support

For support, please contact support@easbase.dev
`;
  }

  private sqlToTypeScript(sqlType: string): string {
    const typeMap: Record<string, string> = {
      'UUID': 'string',
      'TEXT': 'string',
      'VARCHAR': 'string',
      'CHAR': 'string',
      'INTEGER': 'number',
      'BIGINT': 'number',
      'DECIMAL': 'number',
      'NUMERIC': 'number',
      'REAL': 'number',
      'DOUBLE': 'number',
      'BOOLEAN': 'boolean',
      'DATE': 'string',
      'TIMESTAMP': 'string',
      'TIMESTAMPTZ': 'string',
      'JSON': 'any',
      'JSONB': 'any',
    };

    const upperType = sqlType.toUpperCase();
    for (const [key, value] of Object.entries(typeMap)) {
      if (upperType.includes(key)) {
        return value;
      }
    }
    return 'any';
  }

  private toPascalCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '')
      .replace(/^./, char => char.toUpperCase());
  }

  private toCamelCase(str: string): string {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  private toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .replace(/[-\s]+/g, '_')
      .toLowerCase()
      .replace(/^_/, '');
  }

  private toKebabCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '-$1')
      .replace(/[\s_]+/g, '-')
      .toLowerCase()
      .replace(/^-/, '');
  }
}

export const sdkGenerator = new SDKGenerator();