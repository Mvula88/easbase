# Easbase Integration Guide for Lovable

## Quick Start

Integrate Easbase into Lovable to automatically generate backend schemas for your AI-generated applications.

### 1. Installation

```bash
npm install @easbase/sdk
```

### 2. Get Your API Key

1. Sign up at [easbase.dev](https://easbase.dev)
2. Navigate to Settings → API Keys
3. Create a new API key for Lovable integration

### 3. Configure Lovable

Add to your Lovable project configuration:

```javascript
// lovable.config.js
module.exports = {
  plugins: [
    {
      name: 'easbase',
      config: {
        apiKey: process.env.EASBASE_API_KEY,
        autoGenerate: true,
        cacheEnabled: true
      }
    }
  ]
};
```

### 4. Usage in Lovable Projects

```javascript
import { EasbaseClient } from '@easbase/sdk';

const easbase = new EasbaseClient({
  apiKey: process.env.EASBASE_API_KEY
});

// When Lovable generates a new component that needs data
async function generateBackend(appDescription) {
  const result = await easbase.generateSchema(
    `${appDescription} with user authentication and data persistence`
  );
  
  // Deploy directly to your Supabase project
  await easbase.deploy(projectId, result.sql);
  
  return result;
}
```

## Webhook Integration

Set up webhooks to get notified when schemas are generated:

```javascript
// Setup webhook endpoint in your Lovable backend
app.post('/webhooks/easbase', (req, res) => {
  const signature = req.headers['x-easbase-signature'];
  const isValid = EasbaseClient.verifyWebhookSignature(
    JSON.stringify(req.body),
    signature,
    process.env.EASBASE_WEBHOOK_SECRET
  );
  
  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }
  
  const event = req.body;
  
  switch(event.type) {
    case 'schema.generated':
      // Auto-sync with your Lovable project
      syncSchemaToProject(event.payload);
      break;
    case 'deployment.completed':
      // Update project status
      updateProjectStatus(event.payload);
      break;
  }
  
  res.status(200).send('OK');
});
```

## Lovable Plugin

Install our official Lovable plugin for seamless integration:

```bash
npm install @easbase/lovable-plugin
```

```javascript
// In your Lovable workflow
import { EasbasePlugin } from '@easbase/lovable-plugin';

const plugin = new EasbasePlugin({
  apiKey: process.env.EASBASE_API_KEY,
  autoSync: true
});

// Plugin automatically:
// - Detects when you need a backend
// - Generates appropriate schemas
// - Deploys to your connected Supabase
// - Provides TypeScript types
// - Handles authentication setup
```

## Example: E-commerce App

When building an e-commerce app in Lovable:

```javascript
// Lovable generates frontend components
const ProductList = () => {
  // Your UI code
};

// Easbase automatically generates backend
const backend = await easbase.generateSchema(
  "E-commerce platform with products, categories, cart, and orders"
);

// Result: Complete PostgreSQL schema with:
// - products table with variants
// - categories with hierarchy
// - shopping_cart with session management
// - orders with status tracking
// - customers with authentication
// - reviews and ratings
// - inventory tracking
```

## TypeScript Support

Easbase automatically generates TypeScript types:

```typescript
// Generated types from your schema
export interface Product {
  id: string;
  name: string;
  price: number;
  category_id: string;
  created_at: Date;
}

export interface Order {
  id: string;
  customer_id: string;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
}
```

## Cost Optimization

Easbase helps Lovable users save on AI costs:

- **95% cost reduction** through intelligent caching
- **Shared patterns** across Lovable community
- **Free tier**: 100 API calls/month

## Best Practices

1. **Use descriptive prompts**: Be specific about your app's requirements
2. **Enable caching**: Reduce costs and improve speed
3. **Version your schemas**: Track changes over time
4. **Use auth templates**: Don't reinvent authentication

## Common Patterns

### SaaS Application
```javascript
const saasBackend = await easbase.generateSchema(
  "Multi-tenant SaaS with teams, billing, and permissions"
);
```

### Social Network
```javascript
const socialBackend = await easbase.generateSchema(
  "Social network with profiles, posts, comments, and messaging"
);
```

### Marketplace
```javascript
const marketplaceBackend = await easbase.generateSchema(
  "Two-sided marketplace with buyers, sellers, and transactions"
);
```

## Support

- Documentation: [docs.easbase.dev/lovable](https://docs.easbase.dev/lovable)
- Discord: [discord.gg/easbase](https://discord.gg/easbase)
- Email: lovable@easbase.dev

## Video Tutorial

Watch our 5-minute integration guide: [YouTube Link]

---

Built with ❤️ for the Lovable community