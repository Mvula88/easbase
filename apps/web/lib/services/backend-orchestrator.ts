/**
 * Backend-in-a-Box Orchestration Service
 * Manages and orchestrates all backend services for Easbase
 */

import { createServiceClient } from '@/lib/auth/supabase-server';
import { stripe } from './stripe';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface BackendConfig {
  projectId: string;
  userId: string;
  organizationId?: string;
}

export interface ServiceStatus {
  auth: boolean;
  teams: boolean;
  billing: boolean;
  email: boolean;
  storage: boolean;
  database: boolean;
}

/**
 * Authentication Service
 */
export class AuthenticationService {
  constructor(private supabase: SupabaseClient) {}

  async setupAuth(config: {
    enableOAuth?: boolean;
    enableMagicLinks?: boolean;
    enable2FA?: boolean;
    providers?: string[];
  }) {
    // Configure auth settings
    const { data, error } = await this.supabase
      .from('auth_configurations')
      .upsert({
        enable_oauth: config.enableOAuth ?? true,
        enable_magic_links: config.enableMagicLinks ?? true,
        enable_2fa: config.enable2FA ?? false,
        oauth_providers: config.providers ?? ['google', 'github'],
        updated_at: new Date().toISOString(),
      });

    return { success: !error, data, error };
  }

  async getUsers(organizationId?: string) {
    let query = this.supabase.from('user_profiles').select('*');
    
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    return await query;
  }

  async createSession(userId: string) {
    // Create auth session
    return await this.supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: userId,
    });
  }
}

/**
 * Team Management Service
 */
export class TeamManagementService {
  constructor(private supabase: SupabaseClient) {}

  async createOrganization(data: {
    name: string;
    ownerId: string;
    slug?: string;
  }) {
    const slug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-');
    
    const { data: org, error } = await this.supabase
      .from('organizations')
      .insert({
        name: data.name,
        slug,
        owner_id: data.ownerId,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (!error && org) {
      // Add owner as first member
      await this.addMember({
        organizationId: org.id,
        userId: data.ownerId,
        role: 'owner',
      });
    }

    return { success: !error, data: org, error };
  }

  async addMember(data: {
    organizationId: string;
    userId: string;
    role: 'owner' | 'admin' | 'member';
  }) {
    return await this.supabase
      .from('organization_members')
      .insert({
        organization_id: data.organizationId,
        user_id: data.userId,
        role: data.role,
        joined_at: new Date().toISOString(),
      });
  }

  async inviteMembers(data: {
    organizationId: string;
    emails: string[];
    role?: string;
  }) {
    const invitations = data.emails.map(email => ({
      organization_id: data.organizationId,
      email,
      role: data.role || 'member',
      token: crypto.randomUUID(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }));

    return await this.supabase
      .from('organization_invitations')
      .insert(invitations);
  }
}

/**
 * Billing Service
 */
export class BillingService {
  constructor(private supabase: SupabaseClient) {}

  async createCustomer(data: {
    userId: string;
    email: string;
    name?: string;
  }) {
    const customer = await stripe.customers.create({
      email: data.email,
      name: data.name,
      metadata: {
        user_id: data.userId,
      },
    });

    // Store customer ID
    await this.supabase
      .from('user_profiles')
      .update({ stripe_customer_id: customer.id })
      .eq('id', data.userId);

    return customer;
  }

  async createSubscription(data: {
    customerId: string;
    priceId: string;
    trialDays?: number;
  }) {
    return await stripe.subscriptions.create({
      customer: data.customerId,
      items: [{ price: data.priceId }],
      trial_period_days: data.trialDays ?? 14,
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });
  }

  async trackUsage(data: {
    customerId: string;
    metric: string;
    quantity: number;
  }) {
    const { data: usage, error } = await this.supabase
      .from('usage_logs')
      .insert({
        customer_id: data.customerId,
        metric: data.metric,
        quantity: data.quantity,
        timestamp: new Date().toISOString(),
      });

    return { success: !error, data: usage, error };
  }

  async getUsageStats(customerId: string, period: 'day' | 'week' | 'month' = 'month') {
    const startDate = new Date();
    if (period === 'day') startDate.setDate(startDate.getDate() - 1);
    else if (period === 'week') startDate.setDate(startDate.getDate() - 7);
    else startDate.setMonth(startDate.getMonth() - 1);

    return await this.supabase
      .from('usage_logs')
      .select('*')
      .eq('customer_id', customerId)
      .gte('timestamp', startDate.toISOString());
  }
}

/**
 * Email/SMS Service
 */
export class CommunicationService {
  constructor(private supabase: SupabaseClient) {}

  async sendEmail(data: {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    template?: string;
  }) {
    // Use SendGrid/Resend API
    const response = await fetch('/api/emails/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    // Log email
    await this.supabase
      .from('email_logs')
      .insert({
        recipients: Array.isArray(data.to) ? data.to : [data.to],
        subject: data.subject,
        template: data.template,
        status: result.success ? 'sent' : 'failed',
        sent_at: new Date().toISOString(),
      });

    return result;
  }

  async sendSMS(data: {
    to: string;
    body: string;
    type?: 'sms' | 'otp';
  }) {
    // Use Twilio API
    const response = await fetch('/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    // Log SMS
    await this.supabase
      .from('sms_logs')
      .insert({
        recipient: data.to,
        body: data.body,
        type: data.type || 'sms',
        status: result.success ? 'sent' : 'failed',
        sent_at: new Date().toISOString(),
      });

    return result;
  }

  async verifyOTP(phone: string, code: string) {
    const { data } = await this.supabase
      .from('otp_verifications')
      .select('*')
      .eq('phone', phone)
      .eq('code', code)
      .eq('verified', false)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (data) {
      await this.supabase
        .from('otp_verifications')
        .update({ verified: true })
        .eq('id', data.id);
      
      return { success: true, verified: true };
    }

    return { success: false, verified: false };
  }
}

/**
 * Storage Service
 */
export class StorageService {
  constructor(private supabase: SupabaseClient) {}

  async createBucket(name: string, isPublic: boolean = false) {
    return await this.supabase.storage.createBucket(name, {
      public: isPublic,
      fileSizeLimit: 52428800, // 50MB
    });
  }

  async uploadFile(data: {
    bucket: string;
    path: string;
    file: File | Blob;
    contentType?: string;
  }) {
    return await this.supabase.storage
      .from(data.bucket)
      .upload(data.path, data.file, {
        contentType: data.contentType,
        upsert: false,
      });
  }

  async getSignedUrl(bucket: string, path: string, expiresIn: number = 3600) {
    return await this.supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
  }

  async deleteFile(bucket: string, paths: string[]) {
    return await this.supabase.storage
      .from(bucket)
      .remove(paths);
  }

  async listFiles(bucket: string, path?: string) {
    return await this.supabase.storage
      .from(bucket)
      .list(path);
  }
}

/**
 * Database Service
 */
export class DatabaseService {
  constructor(private supabase: SupabaseClient) {}

  async createTable(schema: {
    name: string;
    columns: Array<{
      name: string;
      type: string;
      nullable?: boolean;
      primary?: boolean;
      unique?: boolean;
      default?: any;
    }>;
  }) {
    // Generate SQL for table creation
    const columns = schema.columns.map(col => {
      let def = `${col.name} ${col.type}`;
      if (col.primary) def += ' PRIMARY KEY';
      if (col.unique) def += ' UNIQUE';
      if (!col.nullable) def += ' NOT NULL';
      if (col.default !== undefined) def += ` DEFAULT ${col.default}`;
      return def;
    }).join(', ');

    const sql = `CREATE TABLE IF NOT EXISTS ${schema.name} (${columns})`;
    
    return await this.supabase.rpc('execute_sql', { sql });
  }

  async enableRLS(table: string, policies: Array<{
    name: string;
    operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    check?: string;
    using?: string;
  }>) {
    // Enable RLS
    await this.supabase.rpc('execute_sql', { 
      sql: `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY` 
    });

    // Create policies
    for (const policy of policies) {
      let sql = `CREATE POLICY ${policy.name} ON ${table} FOR ${policy.operation}`;
      if (policy.check) sql += ` WITH CHECK (${policy.check})`;
      if (policy.using) sql += ` USING (${policy.using})`;
      
      await this.supabase.rpc('execute_sql', { sql });
    }

    return { success: true };
  }

  async query(sql: string, params?: any[]) {
    return await this.supabase.rpc('execute_sql', { sql, params });
  }
}

/**
 * Main Backend Orchestrator
 */
export class BackendOrchestrator {
  private auth: AuthenticationService;
  private teams: TeamManagementService;
  private billing: BillingService;
  private communication: CommunicationService;
  private storage: StorageService;
  private database: DatabaseService;

  constructor(private supabase: SupabaseClient) {
    this.auth = new AuthenticationService(supabase);
    this.teams = new TeamManagementService(supabase);
    this.billing = new BillingService(supabase);
    this.communication = new CommunicationService(supabase);
    this.storage = new StorageService(supabase);
    this.database = new DatabaseService(supabase);
  }

  /**
   * Initialize a complete backend for a new project
   */
  async initializeBackend(config: BackendConfig) {
    const results = {
      auth: false,
      teams: false,
      billing: false,
      storage: false,
      database: false,
    };

    try {
      // 1. Setup Authentication
      const authResult = await this.auth.setupAuth({
        enableOAuth: true,
        enableMagicLinks: true,
        enable2FA: false,
        providers: ['google', 'github'],
      });
      results.auth = authResult.success;

      // 2. Create default organization if needed
      if (!config.organizationId) {
        const { data: profile } = await this.supabase
          .from('user_profiles')
          .select('*')
          .eq('id', config.userId)
          .single();

        if (profile) {
          const orgResult = await this.teams.createOrganization({
            name: profile.company_name || `${profile.full_name}'s Organization`,
            ownerId: config.userId,
          });
          results.teams = orgResult.success;
          if (orgResult.data) {
            config.organizationId = orgResult.data.id;
          }
        }
      }

      // 3. Setup Billing
      const { data: profile } = await this.supabase
        .from('user_profiles')
        .select('stripe_customer_id, email')
        .eq('id', config.userId)
        .single();

      if (profile && !profile.stripe_customer_id) {
        const customer = await this.billing.createCustomer({
          userId: config.userId,
          email: profile.email,
        });
        results.billing = !!customer;
      } else {
        results.billing = true;
      }

      // 4. Create Storage Buckets
      await this.storage.createBucket('avatars', true);
      await this.storage.createBucket('documents', false);
      await this.storage.createBucket('uploads', false);
      results.storage = true;

      // 5. Setup Database Tables with RLS
      await this.setupDefaultTables();
      results.database = true;

    } catch (error) {
      console.error('Backend initialization error:', error);
    }

    return results;
  }

  /**
   * Setup default database tables with RLS
   */
  private async setupDefaultTables() {
    // User profiles table
    await this.database.createTable({
      name: 'app_user_profiles',
      columns: [
        { name: 'id', type: 'UUID', primary: true },
        { name: 'email', type: 'TEXT', unique: true },
        { name: 'full_name', type: 'TEXT' },
        { name: 'avatar_url', type: 'TEXT' },
        { name: 'created_at', type: 'TIMESTAMPTZ', default: 'NOW()' },
      ],
    });

    // Enable RLS on user profiles
    await this.database.enableRLS('app_user_profiles', [
      {
        name: 'users_can_view_own_profile',
        operation: 'SELECT',
        using: 'auth.uid() = id',
      },
      {
        name: 'users_can_update_own_profile',
        operation: 'UPDATE',
        using: 'auth.uid() = id',
      },
    ]);

    // Organizations table
    await this.database.createTable({
      name: 'app_organizations',
      columns: [
        { name: 'id', type: 'UUID', primary: true, default: 'gen_random_uuid()' },
        { name: 'name', type: 'TEXT' },
        { name: 'slug', type: 'TEXT', unique: true },
        { name: 'owner_id', type: 'UUID' },
        { name: 'created_at', type: 'TIMESTAMPTZ', default: 'NOW()' },
      ],
    });

    // Organization members table
    await this.database.createTable({
      name: 'app_organization_members',
      columns: [
        { name: 'id', type: 'UUID', primary: true, default: 'gen_random_uuid()' },
        { name: 'organization_id', type: 'UUID' },
        { name: 'user_id', type: 'UUID' },
        { name: 'role', type: 'TEXT' },
        { name: 'joined_at', type: 'TIMESTAMPTZ', default: 'NOW()' },
      ],
    });
  }

  /**
   * Get service status
   */
  async getServiceStatus(projectId: string): Promise<ServiceStatus> {
    const status: ServiceStatus = {
      auth: false,
      teams: false,
      billing: false,
      email: false,
      storage: false,
      database: false,
    };

    try {
      // Check auth configuration
      const { data: authConfig } = await this.supabase
        .from('auth_configurations')
        .select('*')
        .single();
      status.auth = !!authConfig;

      // Check organizations
      const { data: orgs } = await this.supabase
        .from('organizations')
        .select('count')
        .single();
      status.teams = (orgs?.count || 0) > 0;

      // Check billing setup
      const { data: customers } = await this.supabase
        .from('user_profiles')
        .select('stripe_customer_id')
        .not('stripe_customer_id', 'is', null)
        .limit(1);
      status.billing = (customers && customers.length > 0) || false;

      // Check email logs
      const { data: emails } = await this.supabase
        .from('email_logs')
        .select('count')
        .single();
      status.email = (emails?.count || 0) > 0;

      // Check storage buckets
      const { data: buckets } = await this.supabase.storage.listBuckets();
      status.storage = (buckets && buckets.length > 0) || false;

      // Check custom tables
      const { data: tables } = await this.supabase.rpc('get_table_count');
      status.database = tables > 10; // More than just system tables

    } catch (error) {
      console.error('Error checking service status:', error);
    }

    return status;
  }

  // Export service instances for direct access
  getAuthService() { return this.auth; }
  getTeamsService() { return this.teams; }
  getBillingService() { return this.billing; }
  getCommunicationService() { return this.communication; }
  getStorageService() { return this.storage; }
  getDatabaseService() { return this.database; }
}

// Create and export singleton instance
let orchestratorInstance: BackendOrchestrator | null = null;

export async function getBackendOrchestrator(): Promise<BackendOrchestrator> {
  if (!orchestratorInstance) {
    const supabase = await createServiceClient();
    orchestratorInstance = new BackendOrchestrator(supabase);
  }
  return orchestratorInstance;
}