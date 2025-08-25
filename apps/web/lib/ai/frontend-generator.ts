import { TableSchema } from '@/components/schema-editor/visual-schema-editor';

export type FrameworkType = 'react' | 'vue' | 'angular' | 'svelte' | 'nextjs';
export type UILibrary = 'tailwind' | 'mui' | 'antd' | 'chakra' | 'shadcn';

interface FrontendGeneratorOptions {
  framework: FrameworkType;
  uiLibrary: UILibrary;
  typescript: boolean;
  includeAuth: boolean;
  includeCRUD: boolean;
}

export class FrontendGenerator {
  generateFromSchema(
    schema: TableSchema[],
    options: FrontendGeneratorOptions
  ): Record<string, string> {
    const files: Record<string, string> = {};

    switch (options.framework) {
      case 'react':
      case 'nextjs':
        files['components'] = this.generateReactComponents(schema, options);
        files['api'] = this.generateAPILayer(schema, options);
        files['hooks'] = this.generateReactHooks(schema, options);
        if (options.includeAuth) {
          files['auth'] = this.generateAuthComponents(options);
        }
        break;
      case 'vue':
        files['components'] = this.generateVueComponents(schema, options);
        files['composables'] = this.generateVueComposables(schema, options);
        break;
      // Add more frameworks as needed
    }

    return files;
  }

  private generateReactComponents(
    schema: TableSchema[],
    options: FrontendGeneratorOptions
  ): string {
    const components: string[] = [];

    for (const table of schema) {
      // Generate List Component
      const listComponent = `
${options.typescript ? `interface ${this.toPascalCase(table.name)}Props {
  data?: any[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}` : ''}

export function ${this.toPascalCase(table.name)}List(${options.typescript ? `props: ${this.toPascalCase(table.name)}Props` : 'props'}) {
  const { data = [], onEdit, onDelete } = props;
  
  return (
    <div className="${this.getTableStyles(options.uiLibrary)}">
      <table className="w-full">
        <thead>
          <tr>
            ${table.columns.map(col => `<th>${this.toTitleCase(col.name)}</th>`).join('\n            ')}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.id}>
              ${table.columns.map(col => `<td>{item.${col.name}}</td>`).join('\n              ')}
              <td>
                <button onClick={() => onEdit?.(item.id)}>Edit</button>
                <button onClick={() => onDelete?.(item.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}`;

      // Generate Form Component
      const formComponent = `
${options.typescript ? `interface ${this.toPascalCase(table.name)}FormProps {
  initialData?: any;
  onSubmit?: (data: any) => void;
  onCancel?: () => void;
}` : ''}

export function ${this.toPascalCase(table.name)}Form(${options.typescript ? `props: ${this.toPascalCase(table.name)}FormProps` : 'props'}) {
  const { initialData, onSubmit, onCancel } = props;
  const [formData, setFormData] = useState(initialData || {});
  
  const handleSubmit = (e${options.typescript ? ': React.FormEvent' : ''}) => {
    e.preventDefault();
    onSubmit?.(formData);
  };
  
  return (
    <form onSubmit={handleSubmit} className="${this.getFormStyles(options.uiLibrary)}">
      ${table.columns
        .filter(col => !col.isPrimary && col.name !== 'created_at')
        .map(col => `
      <div className="mb-4">
        <label htmlFor="${col.name}">${this.toTitleCase(col.name)}</label>
        <input
          id="${col.name}"
          type="${this.getInputType(col.type)}"
          value={formData.${col.name} || ''}
          onChange={(e) => setFormData({...formData, ${col.name}: e.target.value})}
          ${!col.isNullable ? 'required' : ''}
        />
      </div>`).join('')}
      
      <div className="flex gap-2">
        <button type="submit">Save</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}`;

      components.push(listComponent, formComponent);
    }

    return components.join('\n\n');
  }

  private generateReactHooks(
    schema: TableSchema[],
    options: FrontendGeneratorOptions
  ): string {
    const hooks: string[] = [];

    for (const table of schema) {
      const hook = `
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function use${this.toPascalCase(table.name)}() {
  const [data, setData] = useState${options.typescript ? '<any[]>' : ''}([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState${options.typescript ? '<string | null>' : ''}(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('${table.name}')
        .select('*');
      
      if (error) throw error;
      setData(data || []);
    } catch (err${options.typescript ? ': any' : ''}) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const create = async (newData${options.typescript ? ': any' : ''}) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('${table.name}')
        .insert(newData)
        .select()
        .single();
      
      if (error) throw error;
      await fetchAll();
      return data;
    } catch (err${options.typescript ? ': any' : ''}) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const update = async (id${options.typescript ? ': string' : ''}, updates${options.typescript ? ': any' : ''}) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('${table.name}')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      await fetchAll();
      return data;
    } catch (err${options.typescript ? ': any' : ''}) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id${options.typescript ? ': string' : ''}) => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('${table.name}')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      await fetchAll();
    } catch (err${options.typescript ? ': any' : ''}) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  return {
    data,
    loading,
    error,
    fetchAll,
    create,
    update,
    remove,
  };
}`;
      hooks.push(hook);
    }

    return hooks.join('\n\n');
  }

  private generateAPILayer(
    schema: TableSchema[],
    options: FrontendGeneratorOptions
  ): string {
    const apiCalls: string[] = [];

    for (const table of schema) {
      const api = `
// API calls for ${table.name}
export const ${table.name}API = {
  async getAll() {
    const response = await fetch('/api/${table.name}');
    if (!response.ok) throw new Error('Failed to fetch ${table.name}');
    return response.json();
  },

  async getById(id${options.typescript ? ': string' : ''}) {
    const response = await fetch(\`/api/${table.name}/\${id}\`);
    if (!response.ok) throw new Error('Failed to fetch ${table.name}');
    return response.json();
  },

  async create(data${options.typescript ? ': any' : ''}) {
    const response = await fetch('/api/${table.name}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create ${table.name}');
    return response.json();
  },

  async update(id${options.typescript ? ': string' : ''}, data${options.typescript ? ': any' : ''}) {
    const response = await fetch(\`/api/${table.name}/\${id}\`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update ${table.name}');
    return response.json();
  },

  async delete(id${options.typescript ? ': string' : ''}) {
    const response = await fetch(\`/api/${table.name}/\${id}\`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete ${table.name}');
  },
};`;
      apiCalls.push(api);
    }

    return apiCalls.join('\n\n');
  }

  private generateVueComponents(
    schema: TableSchema[],
    options: FrontendGeneratorOptions
  ): string {
    // Vue component generation logic
    return '// Vue components generation coming soon';
  }

  private generateVueComposables(
    schema: TableSchema[],
    options: FrontendGeneratorOptions
  ): string {
    // Vue composables generation logic
    return '// Vue composables generation coming soon';
  }

  private generateAuthComponents(options: FrontendGeneratorOptions): string {
    if (options.framework === 'react' || options.framework === 'nextjs') {
      return `
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState${options.typescript ? '<string | null>' : ''}(null);

  const handleLogin = async (e${options.typescript ? ': React.FormEvent' : ''}) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) setError(error.message);
  };

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={handleLogin} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <div className="text-red-500">{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : 'Sign In'}
        </button>
        <button type="button" onClick={handleGoogleLogin}>
          Sign in with Google
        </button>
      </form>
    </div>
  );
}`;
    }
    return '';
  }

  // Utility functions
  private toPascalCase(str: string): string {
    return str
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  private toTitleCase(str: string): string {
    return str
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private getInputType(dbType: string): string {
    if (dbType.includes('int')) return 'number';
    if (dbType.includes('bool')) return 'checkbox';
    if (dbType.includes('date')) return 'date';
    if (dbType.includes('time')) return 'datetime-local';
    if (dbType.includes('json')) return 'textarea';
    return 'text';
  }

  private getTableStyles(uiLibrary: UILibrary): string {
    switch (uiLibrary) {
      case 'tailwind':
        return 'overflow-x-auto shadow-md sm:rounded-lg';
      case 'mui':
        return 'MuiTable-root';
      case 'shadcn':
        return 'border rounded-lg overflow-hidden';
      default:
        return '';
    }
  }

  private getFormStyles(uiLibrary: UILibrary): string {
    switch (uiLibrary) {
      case 'tailwind':
        return 'space-y-4 max-w-md mx-auto';
      case 'mui':
        return 'MuiForm-root';
      case 'shadcn':
        return 'space-y-4';
      default:
        return '';
    }
  }
}