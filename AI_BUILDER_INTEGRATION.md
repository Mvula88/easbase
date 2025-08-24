# 🔗 How Easbase Connects to AI Builders

## The Complete Integration Flow

### 1️⃣ User Generates Schema in Easbase
```
User Input: "Create an e-commerce platform"
     ↓
Easbase generates:
- PostgreSQL schema
- TypeScript/Python/Go types
- Prisma/Drizzle ORM configs
- API endpoints structure
```

### 2️⃣ Schema Gets Sent to AI Builder

## Integration Methods by Platform:

### **Lovable.dev Integration**
```javascript
// Method 1: Direct API Push
POST https://api.lovable.dev/v1/import-schema
{
  "schema": {...},
  "sql": "CREATE TABLE...",
  "source": "easbase"
}

// Method 2: Lovable reads from Easbase
GET https://easbase.vercel.app/api/schemas/{project-id}
Authorization: Bearer YOUR_API_KEY
```

**What Happens:**
- Lovable receives the schema
- Automatically generates full-stack app
- Creates components that match the data structure
- Sets up API routes connected to Supabase

### **Bolt.new Integration**
```javascript
// Webhook Integration
POST https://bolt.new/api/webhooks/easbase
{
  "event": "schema.generated",
  "schema": {...},
  "sql": "...",
  "deployment_url": "https://supabase.co/project/..."
}
```

**What Happens:**
- Bolt.new receives webhook
- Injects schema into WebContainer
- Generates app with pre-configured backend
- No need to write database code

### **v0.dev Integration**
```javascript
// Clipboard Integration (Current)
// User clicks "Send to v0"
1. Schema formatted for v0
2. Copied to clipboard
3. User pastes in v0 prompt:
   "Build an app with this schema: [paste]"

// Future: Direct API
POST https://v0.dev/api/context
{
  "context_type": "database_schema",
  "content": {...}
}
```

**What Happens:**
- v0 understands the complete data model
- Generates UI that matches the schema
- Creates proper type safety
- Adds data fetching logic

### **Cursor Integration**
```javascript
// .cursorrules Integration
// Easbase generates .cursorrules file:
{
  "database_schema": {...},
  "api_endpoints": [...],
  "type_definitions": {...}
}
```

**What Happens:**
- Cursor AI has full context
- Autocomplete knows your schema
- Suggests correct queries
- Maintains consistency

## 🎯 Real-World Example

### Step 1: Generate in Easbase
```
Prompt: "SaaS with teams, billing, and projects"
```

### Step 2: Easbase Creates
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name TEXT,
  stripe_customer_id TEXT
);

CREATE TABLE team_members (
  organization_id UUID,
  user_id UUID,
  role TEXT
);

CREATE TABLE projects (
  organization_id UUID,
  name TEXT
);
```

### Step 3: Send to Lovable.dev
Click "Send to Lovable" → Lovable receives:
```json
{
  "schema": {
    "tables": ["organizations", "team_members", "projects"],
    "relationships": {...},
    "auth": "multi-tenant"
  },
  "sql": "...",
  "typescript_types": "...",
  "api_structure": {
    "/api/organizations": "CRUD",
    "/api/teams": "invite, remove, update_role",
    "/api/projects": "CRUD with org scope"
  }
}
```

### Step 4: Lovable Generates Complete App
- ✅ Dashboard with team management
- ✅ Billing pages connected to Stripe
- ✅ Project CRUD with proper permissions
- ✅ All database queries pre-written
- ✅ Type-safe from database to UI

## 🔌 Setting Up Integration

### For AI Builder Developers

#### Option 1: Webhook Subscription
```javascript
// Register webhook with Easbase
POST https://easbase.vercel.app/api/webhooks/register
{
  "url": "https://your-builder.com/webhook",
  "events": ["schema.generated", "deployment.completed"],
  "secret": "your-webhook-secret"
}
```

#### Option 2: Pull API
```javascript
// Poll for latest schemas
GET https://easbase.vercel.app/api/organizations/{org}/schemas
Authorization: Bearer API_KEY

// Response
{
  "schemas": [
    {
      "id": "...",
      "created_at": "...",
      "prompt": "...",
      "schema": {...},
      "sql": "...",
      "deployment_status": "ready"
    }
  ]
}
```

#### Option 3: JavaScript SDK
```javascript
import { EasbaseClient } from '@easbase/sdk';

const easbase = new EasbaseClient({
  apiKey: process.env.EASBASE_API_KEY
});

// Listen for schemas
easbase.on('schema.generated', (data) => {
  // Your builder receives the schema
  generateApp(data.schema);
});
```

## 🚀 Benefits for Each Platform

### Lovable.dev
- Skip the "describe your database" step
- Focus on UI/UX generation
- Guaranteed working backend
- 10x faster app creation

### Bolt.new
- No WebContainer database limitations
- Real PostgreSQL from day one
- Production-ready backend
- Instant Supabase connection

### v0.dev
- Better context for generation
- Consistent data model
- Type-safe by default
- No hallucinated schemas

### Cursor
- Complete project context
- Better code suggestions
- Fewer errors
- Consistent patterns

## 📊 The Value Proposition

**Without Easbase:**
1. AI generates schema (might be wrong)
2. User fixes errors
3. AI regenerates code
4. More fixes needed
5. Finally works (maybe)

**With Easbase:**
1. Easbase generates perfect schema (cached from 1000s of similar requests)
2. AI builder receives validated schema
3. Generated app works immediately
4. User ships to production

## 🔄 The Network Effect

```
More AI Builders use Easbase
    ↓
More schemas get cached
    ↓
Better pattern recognition
    ↓
Faster, cheaper generation
    ↓
AI Builders save money
    ↓
Users get better apps
```

## 🎁 Ready-to-Use Integration Code

### For Lovable.dev
```typescript
// Add to your schema import handler
async function importFromEasbase(easbaseUrl: string) {
  const response = await fetch(easbaseUrl);
  const { schema, sql, types } = await response.json();
  
  // Generate your app with this schema
  await generateFullStackApp({
    database: schema,
    sqlMigrations: sql,
    typeDefinitions: types
  });
}
```

### For Bolt.new
```typescript
// Webhook receiver
app.post('/webhooks/easbase', async (req, res) => {
  const { schema, sql } = req.body;
  
  // Inject into WebContainer
  await webcontainer.fs.writeFile(
    '/prisma/schema.prisma',
    generatePrismaSchema(schema)
  );
  
  // Run migrations
  await webcontainer.spawn('npx', ['prisma', 'migrate', 'dev']);
});
```

### For v0.dev
```typescript
// Context enhancement
function enhancePromptWithSchema(userPrompt: string, easbaseSchema: any) {
  return `
    ${userPrompt}
    
    Use this exact database schema:
    ${easbaseSchema.sql}
    
    Type definitions:
    ${easbaseSchema.types}
    
    Ensure all queries match this schema exactly.
  `;
}
```

## 🔮 Coming Soon

1. **Chrome Extension**: Select schema in Easbase → Auto-inject into any AI builder
2. **GitHub App**: Push schema to repo → Auto-update all connected builders
3. **VS Code Extension**: Generate schema → Sync to all your tools
4. **Universal Protocol**: Standard schema format all AI builders understand

---

**Ready to integrate?** Contact integrations@easbase.com or check our [SDK documentation](https://docs.easbase.com/sdk)