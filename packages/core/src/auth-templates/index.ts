import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface AuthTemplate {
  name: string;
  description: string;
  sql: string;
  edgeFunctions?: {
    name: string;
    code: string;
  }[];
}

export class AuthTemplateManager {
  private supabase: SupabaseClient;
  
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
    );
  }

  private templates: Record<string, AuthTemplate> = {
    saas: {
      name: 'Multi-tenant SaaS',
      description: 'Teams, roles, invitations, billing',
      sql: `
        -- Organizations/Teams
        CREATE TABLE organizations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          owner_id UUID REFERENCES auth.users(id),
          subscription_status TEXT DEFAULT 'trial',
          stripe_customer_id TEXT,
          stripe_subscription_id TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Team members with roles
        CREATE TABLE team_members (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          role TEXT CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
          invited_by UUID REFERENCES auth.users(id),
          joined_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(organization_id, user_id)
        );

        -- Invitations
        CREATE TABLE invitations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          email TEXT NOT NULL,
          role TEXT,
          token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
          invited_by UUID REFERENCES auth.users(id),
          accepted_at TIMESTAMPTZ,
          expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Projects within organizations
        CREATE TABLE organization_projects (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          description TEXT,
          created_by UUID REFERENCES auth.users(id),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(organization_id, name)
        );

        -- API Keys per organization
        CREATE TABLE api_keys (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          key_hash TEXT UNIQUE NOT NULL,
          last_used_at TIMESTAMPTZ,
          created_by UUID REFERENCES auth.users(id),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          expires_at TIMESTAMPTZ
        );

        -- RLS Policies
        ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
        ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
        ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
        ALTER TABLE organization_projects ENABLE ROW LEVEL SECURITY;
        ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

        -- Users can see organizations they belong to
        CREATE POLICY "Users can view their organizations" ON organizations
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM team_members
              WHERE team_members.organization_id = organizations.id
              AND team_members.user_id = auth.uid()
            )
          );

        -- Only owners can update organizations
        CREATE POLICY "Owners can update organizations" ON organizations
          FOR UPDATE USING (owner_id = auth.uid());

        -- Team members policies
        CREATE POLICY "Members can view team" ON team_members
          FOR SELECT USING (
            organization_id IN (
              SELECT organization_id FROM team_members WHERE user_id = auth.uid()
            )
          );

        -- Only admins and owners can manage team
        CREATE POLICY "Admins can manage team" ON team_members
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM team_members
              WHERE team_members.organization_id = team_members.organization_id
              AND team_members.user_id = auth.uid()
              AND team_members.role IN ('owner', 'admin')
            )
          );

        -- Create indexes
        CREATE INDEX idx_team_members_user ON team_members(user_id);
        CREATE INDEX idx_team_members_org ON team_members(organization_id);
        CREATE INDEX idx_invitations_token ON invitations(token);
        CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
      `,
      edgeFunctions: [
        {
          name: 'handle-invitation',
          code: `
            import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
            import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

            serve(async (req) => {
              const { token, accept } = await req.json()
              
              const supabase = createClient(
                Deno.env.get('SUPABASE_URL')!,
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
              )
              
              // Verify invitation
              const { data: invitation } = await supabase
                .from('invitations')
                .select('*')
                .eq('token', token)
                .single()
              
              if (!invitation || new Date(invitation.expires_at) < new Date()) {
                return new Response(JSON.stringify({ error: 'Invalid or expired invitation' }), { status: 400 })
              }
              
              if (accept) {
                // Add user to team
                await supabase.from('team_members').insert({
                  organization_id: invitation.organization_id,
                  user_id: req.user.id,
                  role: invitation.role
                })
                
                // Mark invitation as accepted
                await supabase
                  .from('invitations')
                  .update({ accepted_at: new Date() })
                  .eq('id', invitation.id)
              }
              
              return new Response(JSON.stringify({ success: true }), { status: 200 })
            })
          `
        }
      ]
    },
    marketplace: {
      name: 'Marketplace',
      description: 'Buyers, sellers, products, transactions',
      sql: `
        -- Users with roles
        CREATE TABLE user_profiles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          role TEXT CHECK (role IN ('buyer', 'seller', 'both', 'admin')),
          display_name TEXT,
          avatar_url TEXT,
          bio TEXT,
          rating DECIMAL(3,2) DEFAULT 0,
          total_sales INTEGER DEFAULT 0,
          total_purchases INTEGER DEFAULT 0,
          verified BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(user_id)
        );

        -- Seller stores
        CREATE TABLE stores (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          seller_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          description TEXT,
          logo_url TEXT,
          banner_url TEXT,
          policies TEXT,
          rating DECIMAL(3,2) DEFAULT 0,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Product categories
        CREATE TABLE categories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          parent_id UUID REFERENCES categories(id),
          icon TEXT,
          sort_order INTEGER DEFAULT 0
        );

        -- Products
        CREATE TABLE products (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
          category_id UUID REFERENCES categories(id),
          name TEXT NOT NULL,
          slug TEXT NOT NULL,
          description TEXT,
          price DECIMAL(10,2) NOT NULL,
          compare_at_price DECIMAL(10,2),
          cost DECIMAL(10,2),
          sku TEXT,
          barcode TEXT,
          quantity INTEGER DEFAULT 0,
          track_quantity BOOLEAN DEFAULT true,
          weight DECIMAL(10,3),
          status TEXT CHECK (status IN ('active', 'draft', 'archived')),
          featured BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(store_id, slug)
        );

        -- Product images
        CREATE TABLE product_images (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          product_id UUID REFERENCES products(id) ON DELETE CASCADE,
          url TEXT NOT NULL,
          alt_text TEXT,
          position INTEGER DEFAULT 0
        );

        -- Shopping cart
        CREATE TABLE cart_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          product_id UUID REFERENCES products(id) ON DELETE CASCADE,
          quantity INTEGER NOT NULL DEFAULT 1,
          added_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(user_id, product_id)
        );

        -- Orders
        CREATE TABLE orders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          order_number TEXT UNIQUE NOT NULL,
          buyer_id UUID REFERENCES user_profiles(id),
          status TEXT CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
          subtotal DECIMAL(10,2) NOT NULL,
          tax DECIMAL(10,2) DEFAULT 0,
          shipping DECIMAL(10,2) DEFAULT 0,
          total DECIMAL(10,2) NOT NULL,
          currency TEXT DEFAULT 'USD',
          payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
          payment_method TEXT,
          stripe_payment_intent_id TEXT,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Order items
        CREATE TABLE order_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
          product_id UUID REFERENCES products(id),
          store_id UUID REFERENCES stores(id),
          price DECIMAL(10,2) NOT NULL,
          quantity INTEGER NOT NULL,
          total DECIMAL(10,2) NOT NULL,
          fulfillment_status TEXT CHECK (fulfillment_status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
          tracking_number TEXT,
          shipped_at TIMESTAMPTZ,
          delivered_at TIMESTAMPTZ
        );

        -- Reviews
        CREATE TABLE reviews (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          product_id UUID REFERENCES products(id) ON DELETE CASCADE,
          buyer_id UUID REFERENCES user_profiles(id),
          order_item_id UUID REFERENCES order_items(id),
          rating INTEGER CHECK (rating >= 1 AND rating <= 5),
          title TEXT,
          comment TEXT,
          verified_purchase BOOLEAN DEFAULT false,
          helpful_count INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Enable RLS
        ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
        ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
        ALTER TABLE products ENABLE ROW LEVEL SECURITY;
        ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
        ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
        ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

        -- Create indexes
        CREATE INDEX idx_products_store ON products(store_id);
        CREATE INDEX idx_products_category ON products(category_id);
        CREATE INDEX idx_products_status ON products(status) WHERE status = 'active';
        CREATE INDEX idx_orders_buyer ON orders(buyer_id);
        CREATE INDEX idx_order_items_order ON order_items(order_id);
        CREATE INDEX idx_reviews_product ON reviews(product_id);
      `
    },
    social: {
      name: 'Social Network',
      description: 'Users, friends, posts, messages',
      sql: `
        -- User profiles
        CREATE TABLE profiles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          username TEXT UNIQUE NOT NULL,
          display_name TEXT,
          bio TEXT,
          avatar_url TEXT,
          cover_url TEXT,
          location TEXT,
          website TEXT,
          verified BOOLEAN DEFAULT false,
          is_private BOOLEAN DEFAULT false,
          followers_count INTEGER DEFAULT 0,
          following_count INTEGER DEFAULT 0,
          posts_count INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(user_id)
        );

        -- Follows/Friends
        CREATE TABLE follows (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
          following_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
          status TEXT CHECK (status IN ('pending', 'accepted', 'blocked')),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(follower_id, following_id)
        );

        -- Posts
        CREATE TABLE posts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
          content TEXT,
          media_urls TEXT[],
          visibility TEXT CHECK (visibility IN ('public', 'followers', 'private')),
          likes_count INTEGER DEFAULT 0,
          comments_count INTEGER DEFAULT 0,
          shares_count INTEGER DEFAULT 0,
          is_pinned BOOLEAN DEFAULT false,
          parent_id UUID REFERENCES posts(id) ON DELETE CASCADE, -- For replies/threads
          created_at TIMESTAMPTZ DEFAULT NOW(),
          edited_at TIMESTAMPTZ
        );

        -- Likes
        CREATE TABLE likes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
          post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(user_id, post_id)
        );

        -- Comments
        CREATE TABLE comments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
          author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          likes_count INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          edited_at TIMESTAMPTZ
        );

        -- Direct messages
        CREATE TABLE conversations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE conversation_participants (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
          user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
          last_read_at TIMESTAMPTZ,
          UNIQUE(conversation_id, user_id)
        );

        CREATE TABLE messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
          sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
          content TEXT,
          media_urls TEXT[],
          is_edited BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          edited_at TIMESTAMPTZ
        );

        -- Notifications
        CREATE TABLE notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
          type TEXT CHECK (type IN ('like', 'comment', 'follow', 'mention', 'message')),
          actor_id UUID REFERENCES profiles(id),
          post_id UUID REFERENCES posts(id),
          message TEXT,
          is_read BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Enable RLS
        ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
        ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
        ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
        ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
        ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
        ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
        ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
        ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

        -- Create indexes
        CREATE INDEX idx_follows_follower ON follows(follower_id);
        CREATE INDEX idx_follows_following ON follows(following_id);
        CREATE INDEX idx_posts_author ON posts(author_id);
        CREATE INDEX idx_posts_created ON posts(created_at DESC);
        CREATE INDEX idx_likes_post ON likes(post_id);
        CREATE INDEX idx_comments_post ON comments(post_id);
        CREATE INDEX idx_messages_conversation ON messages(conversation_id);
        CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
      `
    }
  };

  async deployTemplate(
    templateSlug: string,
    projectId: string,
    customerSupabase: SupabaseClient
  ): Promise<void> {
    const template = this.templates[templateSlug];
    if (!template) throw new Error('Template not found');

    // 1. Execute SQL in customer's Supabase
    const statements = template.sql
      .split(';')
      .filter(s => s.trim())
      .map(s => s.trim() + ';');
    
    for (const statement of statements) {
      await customerSupabase.rpc('exec_sql', {
        sql: statement
      });
    }

    // 2. Deploy Edge Functions if any
    if (template.edgeFunctions) {
      for (const func of template.edgeFunctions) {
        await this.deployEdgeFunction(customerSupabase, func);
      }
    }

    // 3. Update deployment status
    await this.updateDeploymentStatus(projectId, 'completed');
  }

  private async deployEdgeFunction(supabase: SupabaseClient, func: { name: string; code: string }) {
    // This would use Supabase Management API to deploy edge functions
    // For now, we'll store the function code for manual deployment
    console.log(`Edge function ${func.name} ready for deployment`);
  }

  private async updateDeploymentStatus(projectId: string, status: string) {
    await this.supabase
      .from('projects')
      .update({ deployment_status: status })
      .eq('id', projectId);
  }

  getTemplates() {
    return Object.entries(this.templates).map(([slug, template]) => ({
      slug,
      name: template.name,
      description: template.description
    }));
  }

  getTemplate(slug: string) {
    return this.templates[slug];
  }
}

// Export alias for compatibility
export const AuthTemplateService = AuthTemplateManager;