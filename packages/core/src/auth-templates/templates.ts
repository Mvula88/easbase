export interface AuthTemplate {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: 'saas' | 'marketplace' | 'social' | 'ecommerce' | 'custom';
  schema: any;
  sql: string;
  rlsPolicies: string;
  edgeFunctions?: any;
  features: string[];
  preview?: string;
}

export const authTemplates: AuthTemplate[] = [
  {
    id: 'saas-multi-tenant',
    slug: 'saas-multi-tenant',
    name: 'SaaS Multi-Tenant',
    description: 'Complete multi-tenant SaaS authentication with organizations, teams, and role-based access',
    category: 'saas',
    features: [
      'Organizations/Workspaces',
      'Team invitations',
      'Role-based access control',
      'Billing per organization',
      'SSO ready'
    ],
    schema: {
      tables: [
        {
          name: 'organizations',
          columns: [
            { name: 'id', type: 'uuid', primary: true },
            { name: 'name', type: 'text', required: true },
            { name: 'slug', type: 'text', unique: true },
            { name: 'owner_id', type: 'uuid', references: 'auth.users.id' },
            { name: 'subscription_tier', type: 'text' },
            { name: 'stripe_customer_id', type: 'text' },
            { name: 'created_at', type: 'timestamp' },
            { name: 'updated_at', type: 'timestamp' }
          ]
        },
        {
          name: 'organization_members',
          columns: [
            { name: 'id', type: 'uuid', primary: true },
            { name: 'organization_id', type: 'uuid', references: 'organizations.id' },
            { name: 'user_id', type: 'uuid', references: 'auth.users.id' },
            { name: 'role', type: 'text' },
            { name: 'joined_at', type: 'timestamp' }
          ]
        },
        {
          name: 'invitations',
          columns: [
            { name: 'id', type: 'uuid', primary: true },
            { name: 'organization_id', type: 'uuid', references: 'organizations.id' },
            { name: 'email', type: 'text', required: true },
            { name: 'role', type: 'text' },
            { name: 'token', type: 'text', unique: true },
            { name: 'expires_at', type: 'timestamp' },
            { name: 'created_by', type: 'uuid', references: 'auth.users.id' },
            { name: 'created_at', type: 'timestamp' }
          ]
        }
      ]
    },
    sql: `-- SaaS Multi-Tenant Authentication Schema
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_tier TEXT DEFAULT 'free',
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'admin', 'member', 'viewer')) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'member', 'viewer')) DEFAULT 'member',
  token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email ON invitations(email);`,
    rlsPolicies: `-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Users can view organizations they belong to" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update their organizations" ON organizations
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Organization members policies
CREATE POLICY "Members can view their organization members" ON organization_members
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage members" ON organization_members
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Invitations policies
CREATE POLICY "Admins can manage invitations" ON invitations
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );`,
    preview: '/templates/saas-multi-tenant.png'
  },
  {
    id: 'marketplace',
    slug: 'marketplace',
    name: 'Marketplace',
    description: 'Two-sided marketplace with buyers, sellers, and admin roles',
    category: 'marketplace',
    features: [
      'Buyer and Seller accounts',
      'Vendor onboarding',
      'Commission tracking',
      'Dispute resolution',
      'Reviews and ratings'
    ],
    schema: {
      tables: [
        {
          name: 'user_profiles',
          columns: [
            { name: 'id', type: 'uuid', primary: true },
            { name: 'user_id', type: 'uuid', references: 'auth.users.id' },
            { name: 'account_type', type: 'text' },
            { name: 'display_name', type: 'text' },
            { name: 'avatar_url', type: 'text' },
            { name: 'bio', type: 'text' },
            { name: 'created_at', type: 'timestamp' }
          ]
        },
        {
          name: 'vendors',
          columns: [
            { name: 'id', type: 'uuid', primary: true },
            { name: 'user_id', type: 'uuid', references: 'auth.users.id' },
            { name: 'business_name', type: 'text', required: true },
            { name: 'business_type', type: 'text' },
            { name: 'tax_id', type: 'text' },
            { name: 'commission_rate', type: 'decimal' },
            { name: 'stripe_account_id', type: 'text' },
            { name: 'verification_status', type: 'text' },
            { name: 'approved_at', type: 'timestamp' },
            { name: 'created_at', type: 'timestamp' }
          ]
        },
        {
          name: 'vendor_payouts',
          columns: [
            { name: 'id', type: 'uuid', primary: true },
            { name: 'vendor_id', type: 'uuid', references: 'vendors.id' },
            { name: 'amount', type: 'decimal', required: true },
            { name: 'currency', type: 'text' },
            { name: 'status', type: 'text' },
            { name: 'stripe_transfer_id', type: 'text' },
            { name: 'created_at', type: 'timestamp' }
          ]
        }
      ]
    },
    sql: `-- Marketplace Authentication Schema
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  account_type TEXT CHECK (account_type IN ('buyer', 'seller', 'both', 'admin')) DEFAULT 'buyer',
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  phone TEXT,
  address JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  business_name TEXT NOT NULL,
  business_type TEXT,
  tax_id TEXT,
  commission_rate DECIMAL(5,2) DEFAULT 10.00,
  stripe_account_id TEXT,
  verification_status TEXT CHECK (verification_status IN ('pending', 'verified', 'rejected')) DEFAULT 'pending',
  verification_documents JSONB,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vendor_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  stripe_transfer_id TEXT,
  payout_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_profiles_user ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_type ON user_profiles(account_type);
CREATE INDEX idx_vendors_user ON vendors(user_id);
CREATE INDEX idx_vendors_status ON vendors(verification_status);
CREATE INDEX idx_vendor_payouts_vendor ON vendor_payouts(vendor_id);`,
    rlsPolicies: `-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_payouts ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view all profiles" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Vendors policies
CREATE POLICY "Public can view verified vendors" ON vendors
  FOR SELECT USING (verification_status = 'verified');

CREATE POLICY "Users can view own vendor profile" ON vendors
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own vendor profile" ON vendors
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can create vendor profile" ON vendors
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Vendor payouts policies
CREATE POLICY "Vendors can view own payouts" ON vendor_payouts
  FOR SELECT USING (
    vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
  );`,
    preview: '/templates/marketplace.png'
  },
  {
    id: 'social-network',
    slug: 'social-network',
    name: 'Social Network',
    description: 'Social platform with profiles, connections, and content sharing',
    category: 'social',
    features: [
      'User profiles',
      'Friend/Follow system',
      'Posts and comments',
      'Direct messaging',
      'Notifications'
    ],
    schema: {
      tables: [
        {
          name: 'profiles',
          columns: [
            { name: 'id', type: 'uuid', primary: true },
            { name: 'user_id', type: 'uuid', references: 'auth.users.id' },
            { name: 'username', type: 'text', unique: true },
            { name: 'display_name', type: 'text' },
            { name: 'bio', type: 'text' },
            { name: 'avatar_url', type: 'text' },
            { name: 'cover_url', type: 'text' },
            { name: 'is_verified', type: 'boolean' },
            { name: 'is_private', type: 'boolean' },
            { name: 'created_at', type: 'timestamp' }
          ]
        },
        {
          name: 'connections',
          columns: [
            { name: 'id', type: 'uuid', primary: true },
            { name: 'follower_id', type: 'uuid', references: 'auth.users.id' },
            { name: 'following_id', type: 'uuid', references: 'auth.users.id' },
            { name: 'status', type: 'text' },
            { name: 'created_at', type: 'timestamp' }
          ]
        },
        {
          name: 'posts',
          columns: [
            { name: 'id', type: 'uuid', primary: true },
            { name: 'user_id', type: 'uuid', references: 'auth.users.id' },
            { name: 'content', type: 'text' },
            { name: 'media', type: 'jsonb' },
            { name: 'visibility', type: 'text' },
            { name: 'likes_count', type: 'integer' },
            { name: 'comments_count', type: 'integer' },
            { name: 'shares_count', type: 'integer' },
            { name: 'created_at', type: 'timestamp' }
          ]
        }
      ]
    },
    sql: `-- Social Network Authentication Schema
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  cover_url TEXT,
  website TEXT,
  location TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_private BOOLEAN DEFAULT false,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'accepted', 'blocked')) DEFAULT 'accepted',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  media JSONB,
  visibility TEXT CHECK (visibility IN ('public', 'followers', 'private')) DEFAULT 'public',
  reply_to UUID REFERENCES posts(id) ON DELETE CASCADE,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Indexes
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_connections_follower ON connections(follower_id);
CREATE INDEX idx_connections_following ON connections(following_id);
CREATE INDEX idx_posts_user ON posts(user_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_post_likes_post ON post_likes(post_id);`,
    rlsPolicies: `-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by all" ON profiles
  FOR SELECT USING (NOT is_private OR user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Connections policies
CREATE POLICY "Users can view their connections" ON connections
  FOR SELECT USING (follower_id = auth.uid() OR following_id = auth.uid());

CREATE POLICY "Users can create connections" ON connections
  FOR INSERT WITH CHECK (follower_id = auth.uid());

CREATE POLICY "Users can delete own connections" ON connections
  FOR DELETE USING (follower_id = auth.uid());

-- Posts policies
CREATE POLICY "Public posts are viewable by all" ON posts
  FOR SELECT USING (
    visibility = 'public' OR 
    user_id = auth.uid() OR
    (visibility = 'followers' AND EXISTS (
      SELECT 1 FROM connections 
      WHERE follower_id = auth.uid() AND following_id = posts.user_id AND status = 'accepted'
    ))
  );

CREATE POLICY "Users can create own posts" ON posts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own posts" ON posts
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own posts" ON posts
  FOR DELETE USING (user_id = auth.uid());`,
    preview: '/templates/social-network.png'
  },
  {
    id: 'ecommerce',
    slug: 'ecommerce',
    name: 'E-commerce',
    description: 'Online store with customer accounts, orders, and inventory',
    category: 'ecommerce',
    features: [
      'Customer accounts',
      'Shopping cart',
      'Order management',
      'Wishlist',
      'Address book'
    ],
    schema: {
      tables: [
        {
          name: 'customers',
          columns: [
            { name: 'id', type: 'uuid', primary: true },
            { name: 'user_id', type: 'uuid', references: 'auth.users.id' },
            { name: 'first_name', type: 'text' },
            { name: 'last_name', type: 'text' },
            { name: 'phone', type: 'text' },
            { name: 'date_of_birth', type: 'date' },
            { name: 'stripe_customer_id', type: 'text' },
            { name: 'created_at', type: 'timestamp' }
          ]
        },
        {
          name: 'addresses',
          columns: [
            { name: 'id', type: 'uuid', primary: true },
            { name: 'customer_id', type: 'uuid', references: 'customers.id' },
            { name: 'type', type: 'text' },
            { name: 'line1', type: 'text' },
            { name: 'line2', type: 'text' },
            { name: 'city', type: 'text' },
            { name: 'state', type: 'text' },
            { name: 'postal_code', type: 'text' },
            { name: 'country', type: 'text' },
            { name: 'is_default', type: 'boolean' }
          ]
        },
        {
          name: 'carts',
          columns: [
            { name: 'id', type: 'uuid', primary: true },
            { name: 'customer_id', type: 'uuid', references: 'customers.id' },
            { name: 'session_id', type: 'text' },
            { name: 'items', type: 'jsonb' },
            { name: 'subtotal', type: 'decimal' },
            { name: 'expires_at', type: 'timestamp' },
            { name: 'created_at', type: 'timestamp' }
          ]
        }
      ]
    },
    sql: `-- E-commerce Authentication Schema
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  date_of_birth DATE,
  stripe_customer_id TEXT,
  loyalty_points INTEGER DEFAULT 0,
  vip_status TEXT CHECK (vip_status IN ('regular', 'silver', 'gold', 'platinum')) DEFAULT 'regular',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('billing', 'shipping', 'both')) DEFAULT 'both',
  name TEXT,
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'US',
  phone TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  session_id TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  subtotal DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  name TEXT DEFAULT 'My Wishlist',
  items JSONB DEFAULT '[]'::jsonb,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_customers_user ON customers(user_id);
CREATE INDEX idx_addresses_customer ON addresses(customer_id);
CREATE INDEX idx_carts_customer ON carts(customer_id);
CREATE INDEX idx_carts_session ON carts(session_id);
CREATE INDEX idx_wishlists_customer ON wishlists(customer_id);`,
    rlsPolicies: `-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

-- Customers policies
CREATE POLICY "Users can view own customer profile" ON customers
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own customer profile" ON customers
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert own customer profile" ON customers
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Addresses policies
CREATE POLICY "Users can manage own addresses" ON addresses
  FOR ALL USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

-- Carts policies
CREATE POLICY "Users can manage own cart" ON carts
  FOR ALL USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

-- Wishlists policies
CREATE POLICY "Public wishlists are viewable" ON wishlists
  FOR SELECT USING (
    is_public OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage own wishlists" ON wishlists
  FOR ALL USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );`,
    preview: '/templates/ecommerce.png'
  }
];

export class AuthTemplateService {
  /**
   * Get all available auth templates
   */
  static getAll(): AuthTemplate[] {
    return authTemplates;
  }

  /**
   * Get templates by category
   */
  static getByCategory(category: string): AuthTemplate[] {
    return authTemplates.filter((t: AuthTemplate) => t.category === category);
  }

  /**
   * Get a single template by slug
   */
  static getBySlug(slug: string): AuthTemplate | undefined {
    return authTemplates.find(t => t.slug === slug);
  }

  /**
   * Get a single template by ID
   */
  static getById(id: string): AuthTemplate | undefined {
    return authTemplates.find(t => t.id === id);
  }

  /**
   * Generate complete SQL for a template
   */
  static generateSQL(templateId: string, options?: {
    includeRLS?: boolean;
    customPrefix?: string;
  }): string {
    const template = this.getById(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    let sql = `-- ${template.name} Authentication Template\n`;
    sql += `-- Generated at ${new Date().toISOString()}\n\n`;

    if (options?.customPrefix) {
      sql = sql.replace(/CREATE TABLE /g, `CREATE TABLE ${options.customPrefix}_`);
    }

    sql += template.sql;

    if (options?.includeRLS !== false) {
      sql += '\n\n' + template.rlsPolicies;
    }

    return sql;
  }

  /**
   * Customize a template with user-specific requirements
   */
  static customize(templateId: string, customizations: {
    additionalTables?: any[];
    additionalColumns?: Record<string, any[]>;
    customPolicies?: string;
  }): AuthTemplate {
    const template = this.getById(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const customized = { ...template };

    // Add additional tables
    if (customizations.additionalTables) {
      customized.schema.tables.push(...customizations.additionalTables);
    }

    // Add additional columns to existing tables
    if (customizations.additionalColumns) {
      for (const [tableName, columns] of Object.entries(customizations.additionalColumns)) {
        const table = customized.schema.tables.find((t: any) => t.name === tableName);
        if (table) {
          table.columns.push(...columns);
        }
      }
    }

    // Add custom policies
    if (customizations.customPolicies) {
      customized.rlsPolicies += '\n\n' + customizations.customPolicies;
    }

    return customized;
  }
}