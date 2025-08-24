# Easbase Integration Guide for Bolt

## Overview

Seamlessly integrate Easbase with Bolt to automatically generate production-ready database schemas for your AI-powered applications.

## Installation

### Via Bolt's Package Manager

```bash
bolt add @easbase/sdk
```

### Environment Setup

```env
EASBASE_API_KEY=your_api_key_here
EASBASE_PROJECT_ID=your_project_id
```

## Bolt Workflow Integration

### 1. Auto-Detection Setup

Easbase can automatically detect when your Bolt project needs a backend:

```javascript
// bolt.config.js
export default {
  extensions: {
    easbase: {
      enabled: true,
      apiKey: process.env.EASBASE_API_KEY,
      triggers: {
        onComponentCreate: true,
        onDataFetch: true,
        onFormSubmit: true
      }
    }
  }
};
```

### 2. Manual Integration

```javascript
import { EasbaseClient } from '@easbase/sdk';

const easbase = new EasbaseClient({
  apiKey: process.env.EASBASE_API_KEY,
  baseUrl: 'https://api.easbase.dev'
});

// In your Bolt component
export default function ProductPage() {
  // Bolt detects data needs
  const products = useData('products');
  
  // Easbase generates schema automatically
  useEffect(() => {
    if (!products.schema) {
      easbase.generateSchema(
        'E-commerce products with categories, variants, and inventory'
      ).then(result => {
        products.setSchema(result.schema);
      });
    }
  }, []);
  
  return <ProductList products={products.data} />;
}
```

## Bolt Actions Integration

Create custom Bolt actions that leverage Easbase:

```javascript
// actions/generate-backend.js
import { createAction } from '@bolt/sdk';
import { EasbaseClient } from '@easbase/sdk';

export const generateBackend = createAction({
  name: 'Generate Backend',
  description: 'Generate database schema with Easbase',
  
  async execute(context) {
    const { project } = context;
    const easbase = new EasbaseClient({
      apiKey: process.env.EASBASE_API_KEY
    });
    
    // Analyze Bolt project structure
    const components = project.getComponents();
    const dataNeeds = analyzeDataRequirements(components);
    
    // Generate appropriate schema
    const schema = await easbase.generateSchema(dataNeeds.description);
    
    // Deploy to Supabase
    if (project.supabaseConnected) {
      await easbase.deploy(project.supabaseId, schema.sql);
    }
    
    // Generate TypeScript types
    const types = await generateTypes(schema);
    await project.saveFile('types/database.ts', types);
    
    return {
      success: true,
      schema,
      message: 'Backend generated successfully!'
    };
  }
});
```

## Real-time Sync

Keep your Bolt frontend in sync with Easbase schemas:

```javascript
// Real-time schema updates
const useEasbaseSchema = (description) => {
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const easbase = new EasbaseClient({
      apiKey: process.env.EASBASE_API_KEY
    });
    
    // Check cache first
    easbase.findSimilar(description).then(cached => {
      if (cached.found) {
        setSchema(cached.schema);
        setLoading(false);
      } else {
        // Generate new schema
        easbase.generateSchema(description).then(result => {
          setSchema(result.schema);
          setLoading(false);
        });
      }
    });
    
    // Subscribe to updates
    easbase.createWebhook({
      url: `${window.location.origin}/api/webhooks/easbase`,
      events: ['schema.generated', 'deployment.completed']
    });
  }, [description]);
  
  return { schema, loading };
};
```

## Bolt Templates with Easbase

Create reusable Bolt templates with pre-configured backends:

```javascript
// templates/saas-starter.js
export const SaaSTemplate = {
  name: 'SaaS Starter',
  description: 'Multi-tenant SaaS with auth and billing',
  
  async initialize(project) {
    const easbase = new EasbaseClient({
      apiKey: process.env.EASBASE_API_KEY
    });
    
    // Deploy auth template
    await easbase.deployAuthTemplate('saas', project.id);
    
    // Generate additional schemas
    const schemas = await Promise.all([
      easbase.generateSchema('User profiles with settings'),
      easbase.generateSchema('Subscription billing with Stripe'),
      easbase.generateSchema('Team collaboration features')
    ]);
    
    // Combine and deploy
    const combinedSQL = schemas.map(s => s.sql).join('\n');
    await easbase.deploy(project.id, combinedSQL);
    
    return {
      backend: 'ready',
      schemas,
      features: ['auth', 'teams', 'billing']
    };
  }
};
```

## Bolt + Easbase CLI

Use both CLIs together for maximum productivity:

```bash
# Create new Bolt project
bolt new my-app

# Generate backend with Easbase
easbase generate "SaaS platform with user management" | bolt import-schema

# Deploy to production
bolt deploy --with-backend
```

## Advanced Features

### Schema Versioning in Bolt

```javascript
// Track schema versions in your Bolt project
const schemaVersion = useSchemaVersion();

async function updateSchema(newRequirements) {
  const easbase = new EasbaseClient({
    apiKey: process.env.EASBASE_API_KEY
  });
  
  // Generate new version
  const newSchema = await easbase.generateSchema(newRequirements);
  
  // Compare with current version
  const changes = await easbase.compareVersions(
    schemaVersion.current,
    newSchema.version
  );
  
  if (changes.breaking) {
    // Show migration warning in Bolt UI
    showMigrationDialog(changes);
  } else {
    // Auto-apply non-breaking changes
    await easbase.applyMigration(project.id, changes);
  }
}
```

### Intelligent Caching

```javascript
// Bolt components benefit from Easbase's caching
const ProductCatalog = () => {
  const { schema, cached, costSaved } = useEasbaseSchema(
    'Product catalog with categories and filters'
  );
  
  if (cached) {
    console.log(`Saved $${costSaved} using cached schema!`);
  }
  
  return <CatalogView schema={schema} />;
};
```

## Performance Optimization

### Preload Common Patterns

```javascript
// Preload common schemas for instant access
const preloadSchemas = async () => {
  const patterns = [
    'User authentication with roles',
    'Product catalog with inventory',
    'Order management system',
    'Content management system'
  ];
  
  const easbase = new EasbaseClient({
    apiKey: process.env.EASBASE_API_KEY
  });
  
  // Warm the cache
  await Promise.all(
    patterns.map(p => easbase.findSimilar(p))
  );
};

// Run on Bolt app initialization
preloadSchemas();
```

## Error Handling

```javascript
// Robust error handling for Bolt + Easbase
try {
  const schema = await easbase.generateSchema(description);
  
  // Validate schema before using in Bolt
  if (!validateSchema(schema)) {
    throw new Error('Invalid schema generated');
  }
  
  // Apply to Bolt project
  await applySchemaToProject(schema);
} catch (error) {
  if (error.message.includes('rate limit')) {
    // Use cached version or queue for later
    const cached = await easbase.findSimilar(description);
    if (cached.found) {
      await applySchemaToProject(cached.schema);
    }
  } else {
    // Log to Bolt error tracking
    Bolt.logError('Easbase integration error', error);
  }
}
```

## Monitoring & Analytics

Track your Easbase usage within Bolt:

```javascript
// Monitor API usage
const usage = await easbase.getCacheStatus();

Bolt.dashboard.addWidget({
  title: 'Easbase Usage',
  data: {
    'Schemas Generated': usage.cache.totalCached,
    'Cache Hit Rate': usage.cache.hitRate,
    'Cost Saved': usage.cache.costSaved,
    'Embedding Model': usage.embeddings.model
  }
});
```

## Best Practices for Bolt Users

1. **Enable caching**: Reduce AI costs by 95%
2. **Use webhooks**: Keep your Bolt app in sync
3. **Version schemas**: Track database changes
4. **Share patterns**: Contribute to the community cache
5. **Monitor usage**: Stay within your limits

## Troubleshooting

### Common Issues

**Issue**: Schema not generating
```javascript
// Check API key and connection
const status = await easbase.getCacheStatus();
console.log('Easbase connected:', status.embeddings.configured);
```

**Issue**: Deployment failing
```javascript
// Verify Supabase credentials
const testConnection = await easbase.testConnection(projectId);
if (!testConnection.success) {
  console.error('Supabase connection failed:', testConnection.error);
}
```

## Resources

- Bolt + Easbase Tutorial: [YouTube]
- Example Projects: [GitHub]
- Community Discord: [discord.gg/easbase]
- Support: bolt@easbase.dev

---

Made for Bolt developers by Easbase