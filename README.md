# Easbase - Backend Infrastructure at Ease

AI-powered backend infrastructure for modern applications. Generate production-ready database schemas, deploy authentication templates, and manage your backend infrastructure with natural language.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Mvula88/easbase)

## Features

- **AI Schema Generation**: Generate PostgreSQL schemas from plain English descriptions using Claude AI
- **Smart Caching**: Vector-based similarity search to cache and reuse similar schemas
- **Auth Templates**: Pre-built authentication patterns for SaaS, marketplaces, and social apps
- **One-Click Deploy**: Deploy schemas directly to your Supabase projects
- **Cost Optimization**: Save up to 95% on AI tokens with intelligent caching
- **SDK & CLI**: Integrate Easbase into your workflow with our TypeScript SDK

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/easbase.git
cd easbase
```

### 2. Install dependencies

```bash
npm install
# or
pnpm install
```

### 3. Set up environment variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Required environment variables:
- Supabase credentials (create a project at supabase.com)
- Anthropic API key (get from console.anthropic.com)
- Stripe keys for billing (optional for development)

### 4. Set up the database

Run the migration in your Supabase project:

```sql
-- Run the SQL from supabase/migrations/001_initial_schema.sql
```

### 5. Start the development server

```bash
cd apps/web
npm run dev
```

Visit `http://localhost:3000` to see the application.

## Using the SDK

Install the SDK in your project:

```bash
npm install @easbase/sdk
```

Generate schemas programmatically:

```javascript
import { EasbaseClient } from '@easbase/sdk';

const client = new EasbaseClient({
  apiKey: 'your-api-key'
});

// Generate a schema
const result = await client.generateSchema(
  'E-commerce platform with products, orders, and reviews'
);

console.log(result.sql); // Production-ready SQL
```

## Architecture

```
easbase/
├── apps/
│   ├── web/          # Next.js dashboard & API
│   └── docs/         # Documentation site
├── packages/
│   ├── core/         # Core business logic
│   ├── sdk/          # TypeScript SDK
│   └── ui/           # Shared UI components
└── supabase/         # Database migrations
```

## Tech Stack

- **AI**: Anthropic Claude API for schema generation
- **Database**: Supabase (PostgreSQL with pgvector)
- **Backend**: Next.js 14 App Router
- **UI**: Tailwind CSS + shadcn/ui
- **Language**: TypeScript
- **Testing**: Playwright

## API Endpoints

### Generate Schema
```http
POST /api/generate
x-api-key: your-api-key

{
  "prompt": "SaaS app with teams and billing",
  "projectId": "optional-project-id"
}
```

### Deploy to Supabase
```http
POST /api/deploy
x-api-key: your-api-key

{
  "projectId": "your-project-id",
  "sql": "CREATE TABLE ...",
  "schemaId": "optional-schema-id"
}
```

### Search Cache
```http
POST /api/cache/search
x-api-key: your-api-key

{
  "prompt": "E-commerce platform"
}
```

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT License - see LICENSE file for details.

## Support

- Documentation: https://docs.easbase.dev
- Discord: https://discord.gg/easbase
- Email: support@easbase.dev