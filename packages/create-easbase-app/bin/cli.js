#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const validateProjectName = require('validate-npm-package-name');

const PRICING_TIERS = {
  starter: {
    name: 'Starter',
    price: '$149/month',
    features: ['2,500 MAU', '10,000 emails', '1,000 OTPs', '10GB storage'],
  },
  professional: {
    name: 'Professional',
    price: '$349/month',
    features: ['10,000 MAU', '50,000 emails', '5,000 OTPs', '50GB storage'],
  },
  business: {
    name: 'Business',
    price: '$749/month',
    features: ['25,000 MAU', '150,000 emails', '15,000 OTPs', '150GB storage'],
  },
};

async function createApp() {
  console.log(chalk.cyan.bold('\n🚀 Welcome to Easbase!\n'));
  console.log(chalk.gray('Create a complete backend with auth, teams, billing, emails & storage.\n'));

  // Get project details
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'What is your project name?',
      default: 'my-easbase-app',
      validate: (input) => {
        const validation = validateProjectName(input);
        if (validation.validForNewPackages) {
          return true;
        }
        return 'Invalid project name';
      },
    },
    {
      type: 'list',
      name: 'framework',
      message: 'Which framework are you using?',
      choices: [
        { name: 'Next.js', value: 'nextjs' },
        { name: 'React', value: 'react' },
        { name: 'Vue', value: 'vue' },
        { name: 'Express/Node.js', value: 'express' },
        { name: 'API Only', value: 'api' },
      ],
    },
    {
      type: 'checkbox',
      name: 'features',
      message: 'Select features to include:',
      choices: [
        { name: '✅ Authentication (Email, OAuth, MFA)', value: 'auth', checked: true },
        { name: '👥 Team Management', value: 'teams', checked: true },
        { name: '💳 Stripe Billing', value: 'billing', checked: true },
        { name: '📧 Email Service', value: 'email', checked: true },
        { name: '📱 SMS/OTP', value: 'sms', checked: true },
        { name: '📁 File Storage', value: 'storage', checked: true },
        { name: '📊 Admin Dashboard', value: 'dashboard', checked: true },
        { name: '🔄 Real-time Updates', value: 'realtime', checked: true },
      ],
    },
    {
      type: 'list',
      name: 'authProviders',
      message: 'Which authentication providers?',
      choices: [
        { name: 'Email/Password + Magic Links', value: 'email' },
        { name: 'Email + Google', value: 'email-google' },
        { name: 'Email + Google + GitHub', value: 'email-google-github' },
        { name: 'All Providers (Email, Google, GitHub, Microsoft)', value: 'all' },
      ],
    },
    {
      type: 'list',
      name: 'tier',
      message: 'Select your pricing tier:',
      choices: Object.entries(PRICING_TIERS).map(([key, tier]) => ({
        name: `${tier.name} (${tier.price}) - ${tier.features[0]}`,
        value: key,
      })),
    },
    {
      type: 'confirm',
      name: 'useTypeScript',
      message: 'Use TypeScript?',
      default: true,
    },
  ]);

  const projectPath = path.join(process.cwd(), answers.projectName);
  
  // Check if directory exists
  if (fs.existsSync(projectPath)) {
    console.log(chalk.red(`\n❌ Directory ${answers.projectName} already exists!`));
    process.exit(1);
  }

  // Create project
  const spinner = ora('Creating your Easbase backend...').start();
  
  try {
    // Create project directory
    fs.ensureDirSync(projectPath);
    
    // Generate project structure
    await generateProject(projectPath, answers);
    
    spinner.succeed('Project created successfully!');
    
    // Install dependencies
    const installSpinner = ora('Installing dependencies...').start();
    process.chdir(projectPath);
    execSync('npm install', { stdio: 'ignore' });
    installSpinner.succeed('Dependencies installed!');
    
    // Setup instructions
    console.log(chalk.green.bold('\n✅ Your Easbase backend is ready!\n'));
    console.log(chalk.white('Next steps:\n'));
    console.log(chalk.gray(`  cd ${answers.projectName}`));
    console.log(chalk.gray('  npm run setup    # Configure your services'));
    console.log(chalk.gray('  npm run dev      # Start development server\n'));
    console.log(chalk.cyan('📚 Documentation: https://docs.easbase.com'));
    console.log(chalk.cyan('💬 Support: support@easbase.com\n'));
    
  } catch (error) {
    spinner.fail('Failed to create project');
    console.error(error);
    process.exit(1);
  }
}

async function generateProject(projectPath, config) {
  const { projectName, framework, features, authProviders, tier, useTypeScript } = config;
  const ext = useTypeScript ? 'ts' : 'js';
  
  // Create base structure
  const dirs = [
    'api/auth',
    'api/teams',
    'api/billing',
    'api/storage',
    'api/emails',
    'database',
    'emails/templates',
    'config',
    'lib',
    'middleware',
    'types',
  ];
  
  if (features.includes('dashboard')) {
    dirs.push('dashboard/components', 'dashboard/pages');
  }
  
  dirs.forEach(dir => {
    fs.ensureDirSync(path.join(projectPath, dir));
  });
  
  // Generate package.json
  const packageJson = {
    name: projectName,
    version: '1.0.0',
    private: true,
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
      setup: 'node scripts/setup.js',
      'db:migrate': 'node scripts/migrate.js',
      'db:seed': 'node scripts/seed.js',
      test: 'jest',
    },
    dependencies: {
      '@easbase/sdk': '^1.0.0',
      '@supabase/supabase-js': '^2.39.0',
      'stripe': '^14.10.0',
      '@sendgrid/mail': '^8.1.0',
      'twilio': '^4.19.0',
      'next': '^14.0.4',
      'react': '^18.2.0',
      'react-dom': '^18.2.0',
    },
    devDependencies: useTypeScript ? {
      '@types/node': '^20.10.5',
      '@types/react': '^18.2.45',
      'typescript': '^5.3.3',
    } : {},
  };
  
  fs.writeJsonSync(path.join(projectPath, 'package.json'), packageJson, { spaces: 2 });
  
  // Generate .env.example
  const envExample = `# Easbase Configuration
EASBASE_API_KEY=your_easbase_api_key_here
EASBASE_PROJECT_ID=your_project_id_here

# Generated Supabase (DO NOT SHARE)
NEXT_PUBLIC_SUPABASE_URL=will_be_generated
NEXT_PUBLIC_SUPABASE_ANON_KEY=will_be_generated
SUPABASE_SERVICE_KEY=will_be_generated

# Stripe (Generated)
STRIPE_SECRET_KEY=will_be_generated
STRIPE_WEBHOOK_SECRET=will_be_generated
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=will_be_generated

# Email Service
SENDGRID_API_KEY=will_be_generated
EMAIL_FROM=noreply@${projectName.toLowerCase()}.com

# SMS/OTP
TWILIO_ACCOUNT_SID=will_be_generated
TWILIO_AUTH_TOKEN=will_be_generated
TWILIO_PHONE_NUMBER=will_be_generated

# Storage
STORAGE_ENDPOINT=will_be_generated
STORAGE_ACCESS_KEY=will_be_generated
STORAGE_SECRET_KEY=will_be_generated

# Your tier: ${tier}
EASBASE_TIER=${tier}
`;
  
  fs.writeFileSync(path.join(projectPath, '.env.example'), envExample);
  fs.writeFileSync(path.join(projectPath, '.env.local'), envExample);
  
  // Generate database schema
  const databaseSchema = generateDatabaseSchema(features);
  fs.writeFileSync(path.join(projectPath, 'database/schema.sql'), databaseSchema);
  
  // Generate API routes
  if (features.includes('auth')) {
    generateAuthAPI(projectPath, ext, authProviders);
  }
  
  if (features.includes('teams')) {
    generateTeamsAPI(projectPath, ext);
  }
  
  if (features.includes('billing')) {
    generateBillingAPI(projectPath, ext, tier);
  }
  
  if (features.includes('storage')) {
    generateStorageAPI(projectPath, ext);
  }
  
  if (features.includes('email')) {
    generateEmailAPI(projectPath, ext);
    generateEmailTemplates(projectPath);
  }
  
  if (features.includes('dashboard')) {
    generateAdminDashboard(projectPath, ext, features);
  }
  
  // Generate SDK wrapper
  generateSDKWrapper(projectPath, ext);
  
  // Generate setup script
  generateSetupScript(projectPath);
  
  // Generate README
  generateReadme(projectPath, config);
  
  // Generate TypeScript config if needed
  if (useTypeScript) {
    generateTSConfig(projectPath);
  }
}

function generateDatabaseSchema(features) {
  let schema = `-- Easbase Generated Schema
-- Created: ${new Date().toISOString()}

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Core tables always included
`;

  // Always include users/profiles
  schema += `
-- User profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
`;

  if (features.includes('teams')) {
    schema += `
-- Organizations/Teams
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
`;
  }

  if (features.includes('billing')) {
    schema += `
-- Billing/Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'trial',
  plan TEXT NOT NULL DEFAULT 'starter',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE usage_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
`;
  }

  if (features.includes('storage')) {
    schema += `
-- File storage metadata
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  bucket TEXT NOT NULL,
  path TEXT NOT NULL,
  filename TEXT NOT NULL,
  size_bytes BIGINT,
  mime_type TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bucket, path)
);

ALTER TABLE files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own files" ON files
  FOR ALL USING (auth.uid() = user_id);
`;
  }

  return schema;
}

function generateAuthAPI(projectPath, ext, providers) {
  const authCode = `import { Easbase } from '@easbase/sdk';
import { NextRequest, NextResponse } from 'next/server';

const easbase = new Easbase(process.env.EASBASE_API_KEY!);

export async function POST(req: NextRequest) {
  const { action, ...data } = await req.json();
  
  try {
    switch (action) {
      case 'signup':
        const user = await easbase.auth.signUp(data);
        return NextResponse.json({ user });
        
      case 'signin':
        const session = await easbase.auth.signIn(data);
        return NextResponse.json({ session });
        
      case 'signout':
        await easbase.auth.signOut();
        return NextResponse.json({ success: true });
        
      case 'magic-link':
        await easbase.auth.sendMagicLink(data.email);
        return NextResponse.json({ success: true });
        
      case 'reset-password':
        await easbase.auth.resetPassword(data.email);
        return NextResponse.json({ success: true });
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}`;

  fs.writeFileSync(path.join(projectPath, `api/auth/route.${ext}`), authCode);
}

function generateEmailTemplates(projectPath) {
  const templates = {
    welcome: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; background: #f7f7f7; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to {{appName}}!</h1>
    </div>
    <div class="content">
      <p>Hi {{name}},</p>
      <p>Thanks for signing up! We're excited to have you on board.</p>
      <p>Get started by exploring your dashboard:</p>
      <p style="text-align: center;">
        <a href="{{dashboardUrl}}" class="button">Go to Dashboard</a>
      </p>
      <p>If you have any questions, just reply to this email.</p>
      <p>Best,<br>The {{appName}} Team</p>
    </div>
  </div>
</body>
</html>`,
    invite: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f7f7f7; padding: 20px; text-align: center; }
    .content { padding: 30px; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>You're invited to join {{teamName}}</h2>
    </div>
    <div class="content">
      <p>Hi there,</p>
      <p>{{inviterName}} has invited you to join {{teamName}} on {{appName}}.</p>
      <p>Click the button below to accept the invitation:</p>
      <p style="text-align: center;">
        <a href="{{inviteUrl}}" class="button">Accept Invitation</a>
      </p>
      <p>This invitation will expire in 7 days.</p>
      <p>Best,<br>The {{appName}} Team</p>
    </div>
  </div>
</body>
</html>`,
  };

  Object.entries(templates).forEach(([name, content]) => {
    fs.writeFileSync(path.join(projectPath, `emails/templates/${name}.html`), content);
  });
}

function generateSetupScript(projectPath) {
  const setupScript = `#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

async function setup() {
  console.log(chalk.cyan.bold('\\n🔧 Easbase Setup Wizard\\n'));
  
  // Check for API key
  if (!process.env.EASBASE_API_KEY) {
    console.log(chalk.red('❌ EASBASE_API_KEY not found in .env.local'));
    console.log(chalk.yellow('\\n👉 Get your API key at: https://app.easbase.com/settings/api'));
    process.exit(1);
  }
  
  console.log(chalk.green('✅ API key found'));
  console.log(chalk.gray('\\nProvisioning your backend services...'));
  
  // Call Easbase API to provision services
  try {
    const response = await fetch('https://api.easbase.com/v1/provision', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${process.env.EASBASE_API_KEY}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectName: require('./package.json').name,
        tier: process.env.EASBASE_TIER || 'starter',
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to provision services');
    }
    
    const data = await response.json();
    
    // Update .env.local with generated credentials
    let envContent = fs.readFileSync('.env.local', 'utf-8');
    envContent = envContent.replace('will_be_generated', data.supabase.url);
    // ... update other values
    fs.writeFileSync('.env.local', envContent);
    
    console.log(chalk.green('\\n✅ Services provisioned successfully!'));
    console.log(chalk.gray('\\nYour backend includes:'));
    console.log('  • Supabase database with auth');
    console.log('  • Stripe billing integration');
    console.log('  • SendGrid email service');
    console.log('  • Twilio SMS/OTP');
    console.log('  • Cloudflare R2 storage');
    
    console.log(chalk.cyan('\\n🚀 Run "npm run dev" to start your application!'));
    
  } catch (error) {
    console.error(chalk.red('❌ Setup failed:', error.message));
    process.exit(1);
  }
}

setup();`;

  fs.ensureDirSync(path.join(projectPath, 'scripts'));
  fs.writeFileSync(path.join(projectPath, 'scripts/setup.js'), setupScript);
}

function generateReadme(projectPath, config) {
  const readme = `# ${config.projectName}

Built with Easbase - Complete backend infrastructure in minutes.

## Features

${config.features.map(f => `- ✅ ${f.charAt(0).toUpperCase() + f.slice(1)}`).join('\n')}

## Quick Start

1. **Configure your API key:**
   \`\`\`bash
   # Get your key at https://app.easbase.com
   # Add to .env.local
   EASBASE_API_KEY=your_key_here
   \`\`\`

2. **Run setup:**
   \`\`\`bash
   npm run setup
   \`\`\`

3. **Start development:**
   \`\`\`bash
   npm run dev
   \`\`\`

## Your Plan: ${PRICING_TIERS[config.tier].name}

${PRICING_TIERS[config.tier].features.map(f => `- ${f}`).join('\n')}

## API Documentation

Visit http://localhost:3000/api-docs when running locally.

## Support

- Documentation: https://docs.easbase.com
- Email: support@easbase.com
- Discord: https://discord.gg/easbase

## License

Private - This is a proprietary application.
`;

  fs.writeFileSync(path.join(projectPath, 'README.md'), readme);
}

function generateTSConfig(projectPath) {
  const tsconfig = {
    compilerOptions: {
      target: 'es2020',
      lib: ['dom', 'dom.iterable', 'esnext'],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      forceConsistentCasingInFileNames: true,
      noEmit: true,
      esModuleInterop: true,
      module: 'esnext',
      moduleResolution: 'node',
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: 'preserve',
      incremental: true,
      paths: {
        '@/*': ['./*'],
      },
    },
    include: ['**/*.ts', '**/*.tsx'],
    exclude: ['node_modules'],
  };

  fs.writeJsonSync(path.join(projectPath, 'tsconfig.json'), tsconfig, { spaces: 2 });
}

// Helper functions for other APIs...
function generateTeamsAPI(projectPath, ext) {
  // Implementation...
}

function generateBillingAPI(projectPath, ext, tier) {
  // Implementation...
}

function generateStorageAPI(projectPath, ext) {
  // Implementation...
}

function generateEmailAPI(projectPath, ext) {
  // Implementation...
}

function generateAdminDashboard(projectPath, ext, features) {
  // Implementation...
}

function generateSDKWrapper(projectPath, ext) {
  // Implementation...
}

// Run CLI
program
  .name('create-easbase-app')
  .description('Create a complete backend with Easbase')
  .version('1.0.0')
  .action(createApp);

program.parse();