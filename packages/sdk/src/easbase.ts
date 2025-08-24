import { SupabaseClient } from '@supabase/supabase-js';
import { Stripe } from 'stripe';

export interface EasbaseConfig {
  apiKey: string;
  projectId?: string;
  environment?: 'development' | 'staging' | 'production';
}

export interface AuthUser {
  id: string;
  email: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  members: TeamMember[];
  createdAt: Date;
}

export interface TeamMember {
  id: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: Date;
}

export class Easbase {
  private config: EasbaseConfig;
  private baseUrl: string;
  public auth: AuthService;
  public teams: TeamsService;
  public billing: BillingService;
  public email: EmailService;
  public storage: StorageService;
  public database: DatabaseService;

  constructor(apiKey: string, options?: Partial<EasbaseConfig>) {
    this.config = {
      apiKey,
      ...options,
      environment: options?.environment || 'production',
    };

    this.baseUrl = this.getBaseUrl();
    
    // Initialize services
    this.auth = new AuthService(this);
    this.teams = new TeamsService(this);
    this.billing = new BillingService(this);
    this.email = new EmailService(this);
    this.storage = new StorageService(this);
    this.database = new DatabaseService(this);
  }

  private getBaseUrl(): string {
    const urls = {
      development: 'http://localhost:3000/api',
      staging: 'https://staging-api.easbase.com',
      production: 'https://api.easbase.com',
    };
    return urls[this.config.environment!];
  }

  async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }
}

// Auth Service
export class AuthService {
  constructor(private easbase: Easbase) {}

  async signUp(data: {
    email: string;
    password: string;
    metadata?: Record<string, any>;
  }): Promise<AuthUser> {
    return this.easbase.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async signIn(data: {
    email: string;
    password: string;
  }): Promise<{ user: AuthUser; session: any }> {
    return this.easbase.request('/auth/signin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async signOut(): Promise<void> {
    return this.easbase.request('/auth/signout', {
      method: 'POST',
    });
  }

  async sendMagicLink(email: string): Promise<void> {
    return this.easbase.request('/auth/magic-link', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(email: string): Promise<void> {
    return this.easbase.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async updatePassword(newPassword: string): Promise<void> {
    return this.easbase.request('/auth/update-password', {
      method: 'POST',
      body: JSON.stringify({ password: newPassword }),
    });
  }

  async enableMFA(type: 'totp' | 'sms' = 'totp'): Promise<{ secret: string; qrCode: string }> {
    return this.easbase.request('/auth/mfa/enable', {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
  }

  async verifyMFA(code: string): Promise<boolean> {
    return this.easbase.request('/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async signInWithProvider(provider: 'google' | 'github' | 'microsoft'): Promise<{ url: string }> {
    return this.easbase.request(`/auth/oauth/${provider}`, {
      method: 'GET',
    });
  }

  async getUser(): Promise<AuthUser | null> {
    return this.easbase.request('/auth/user', {
      method: 'GET',
    });
  }

  async updateUser(updates: Partial<AuthUser>): Promise<AuthUser> {
    return this.easbase.request('/auth/user', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }
}

// Teams Service
export class TeamsService {
  constructor(private easbase: Easbase) {}

  async createOrganization(data: {
    name: string;
    slug?: string;
  }): Promise<Team> {
    return this.easbase.request('/teams/organizations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getOrganization(id: string): Promise<Team> {
    return this.easbase.request(`/teams/organizations/${id}`, {
      method: 'GET',
    });
  }

  async updateOrganization(id: string, updates: Partial<Team>): Promise<Team> {
    return this.easbase.request(`/teams/organizations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteOrganization(id: string): Promise<void> {
    return this.easbase.request(`/teams/organizations/${id}`, {
      method: 'DELETE',
    });
  }

  async inviteMembers(data: {
    orgId: string;
    emails: string[];
    role?: 'admin' | 'member';
  }): Promise<void> {
    return this.easbase.request('/teams/invitations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async acceptInvitation(token: string): Promise<void> {
    return this.easbase.request(`/teams/invitations/${token}/accept`, {
      method: 'POST',
    });
  }

  async removeMember(orgId: string, userId: string): Promise<void> {
    return this.easbase.request(`/teams/organizations/${orgId}/members/${userId}`, {
      method: 'DELETE',
    });
  }

  async updateMemberRole(orgId: string, userId: string, role: string): Promise<void> {
    return this.easbase.request(`/teams/organizations/${orgId}/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  }

  async setPermissions(data: {
    role: string;
    permissions: string[];
  }): Promise<void> {
    return this.easbase.request('/teams/permissions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async linkBilling(orgId: string, stripeCustomerId: string): Promise<void> {
    return this.easbase.request(`/teams/organizations/${orgId}/billing`, {
      method: 'POST',
      body: JSON.stringify({ stripeCustomerId }),
    });
  }
}

// Billing Service
export class BillingService {
  constructor(private easbase: Easbase) {}

  async createCheckout(data: {
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    customerId?: string;
  }): Promise<{ url: string }> {
    return this.easbase.request('/billing/checkout', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPortalUrl(customerId: string): Promise<{ url: string }> {
    return this.easbase.request('/billing/portal', {
      method: 'POST',
      body: JSON.stringify({ customerId }),
    });
  }

  async trackUsage(data: {
    customerId: string;
    metric: string;
    quantity: number;
    timestamp?: Date;
  }): Promise<void> {
    return this.easbase.request('/billing/usage', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getUsage(customerId: string, period?: 'day' | 'week' | 'month'): Promise<any> {
    return this.easbase.request(`/billing/usage/${customerId}?period=${period || 'month'}`, {
      method: 'GET',
    });
  }

  async updateSubscription(data: {
    subscriptionId: string;
    priceId?: string;
    quantity?: number;
  }): Promise<any> {
    return this.easbase.request('/billing/subscriptions', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    return this.easbase.request(`/billing/subscriptions/${subscriptionId}`, {
      method: 'DELETE',
    });
  }

  async getInvoices(customerId: string): Promise<any[]> {
    return this.easbase.request(`/billing/invoices/${customerId}`, {
      method: 'GET',
    });
  }
}

// Email Service
export class EmailService {
  constructor(private easbase: Easbase) {}

  async send(data: {
    to: string | string[];
    subject?: string;
    template?: string;
    html?: string;
    text?: string;
    data?: Record<string, any>;
  }): Promise<void> {
    return this.easbase.request('/emails/send', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async sendBulk(data: {
    recipients: Array<{ email: string; data?: Record<string, any> }>;
    template: string;
    subject: string;
  }): Promise<void> {
    return this.easbase.request('/emails/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async useTemplate(templateId: string, data: Record<string, any>): Promise<void> {
    return this.easbase.request(`/emails/templates/${templateId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async scheduleEmail(data: {
    to: string;
    template: string;
    sendAt: Date;
    data?: Record<string, any>;
  }): Promise<void> {
    return this.easbase.request('/emails/schedule', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// Storage Service
export class StorageService {
  constructor(private easbase: Easbase) {}

  async upload(data: {
    bucket: string;
    file: File | Blob;
    path?: string;
    public?: boolean;
  }): Promise<{ key: string; url: string }> {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('bucket', data.bucket);
    if (data.path) formData.append('path', data.path);
    formData.append('public', String(data.public || false));

    const response = await fetch(`${this.easbase['baseUrl']}/storage/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.easbase['config'].apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    return response.json();
  }

  async getSignedUrl(data: {
    key: string;
    expiresIn?: number;
  }): Promise<{ url: string }> {
    return this.easbase.request('/storage/signed-url', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getUploadUrl(data: {
    bucket: string;
    maxSize?: number;
    allowedTypes?: string[];
  }): Promise<{ url: string; fields: Record<string, string> }> {
    return this.easbase.request('/storage/upload-url', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async delete(key: string): Promise<void> {
    return this.easbase.request(`/storage/${key}`, {
      method: 'DELETE',
    });
  }

  async list(bucket: string, prefix?: string): Promise<any[]> {
    return this.easbase.request(`/storage/${bucket}?prefix=${prefix || ''}`, {
      method: 'GET',
    });
  }

  async transform(data: {
    key: string;
    operations: {
      resize?: { width: number; height: number };
      crop?: { x: number; y: number; width: number; height: number };
      format?: 'webp' | 'jpeg' | 'png';
      quality?: number;
    };
  }): Promise<{ url: string }> {
    return this.easbase.request('/storage/transform', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// Database Service (Direct Supabase Access)
export class DatabaseService {
  constructor(private easbase: Easbase) {}

  async query(sql: string, params?: any[]): Promise<any> {
    return this.easbase.request('/database/query', {
      method: 'POST',
      body: JSON.stringify({ sql, params }),
    });
  }

  async create(table: string, data: Record<string, any>): Promise<any> {
    return this.easbase.request(`/database/${table}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async read(table: string, filters?: Record<string, any>): Promise<any[]> {
    const query = new URLSearchParams(filters).toString();
    return this.easbase.request(`/database/${table}?${query}`, {
      method: 'GET',
    });
  }

  async update(table: string, id: string, data: Record<string, any>): Promise<any> {
    return this.easbase.request(`/database/${table}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete(table: string, id: string): Promise<void> {
    return this.easbase.request(`/database/${table}/${id}`, {
      method: 'DELETE',
    });
  }

  async setPolicy(table: string, policies: {
    select?: string;
    insert?: string;
    update?: string;
    delete?: string;
  }): Promise<void> {
    return this.easbase.request(`/database/${table}/policies`, {
      method: 'POST',
      body: JSON.stringify(policies),
    });
  }

  subscribe(table: string, options?: {
    filter?: Record<string, any>;
  }): EventSource {
    const query = new URLSearchParams(options?.filter).toString();
    return new EventSource(
      `${this.easbase['baseUrl']}/database/${table}/subscribe?${query}`,
      {
        headers: {
          'Authorization': `Bearer ${this.easbase['config'].apiKey}`,
        },
      } as any
    );
  }

  encrypt(value: string): string {
    // Client-side encryption before storing
    return btoa(value); // Use proper encryption in production
  }
}

// OTP Service
export class OTPService {
  constructor(private easbase: Easbase) {}

  async send(data: {
    phone?: string;
    email?: string;
    channel: 'sms' | 'whatsapp' | 'email';
  }): Promise<{ id: string }> {
    return this.easbase.request('/otp/send', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verify(data: {
    phone?: string;
    email?: string;
    code: string;
  }): Promise<{ valid: boolean }> {
    return this.easbase.request('/otp/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// Export everything
export default Easbase;