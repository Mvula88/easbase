import { AuthTemplateManager } from './index';

export interface AuthTemplateConfig {
  sql: string;
  features: string[];
  tables: string[];
  edgeFunctions?: Array<{
    name: string;
    code: string;
  }>;
}

export interface TemplateCustomization {
  companyName?: string;
  primaryColor?: string;
  enableMFA?: boolean;
  enableSocialAuth?: boolean;
  customFields?: Record<string, any>;
}

export class AuthTemplateService {
  private templateManager: AuthTemplateManager;

  constructor() {
    this.templateManager = new AuthTemplateManager();
  }

  async getTemplate(
    templateType: string, 
    customization?: TemplateCustomization
  ): Promise<AuthTemplateConfig | null> {
    const template = this.templateManager.getTemplate(templateType);
    
    if (!template) {
      return null;
    }

    // Apply customizations if provided
    let sql = template.sql;
    if (customization) {
      sql = this.applyCustomization(sql, customization);
    }

    // Add enterprise features if requested
    if (templateType === 'enterprise') {
      sql = this.addEnterpriseFeatures(sql);
    }

    // Extract metadata from template
    const features = this.extractFeatures(templateType);
    const tables = this.extractTables(sql);

    return {
      sql,
      features,
      tables,
      edgeFunctions: template.edgeFunctions
    };
  }

  private applyCustomization(sql: string, customization: TemplateCustomization): string {
    let customizedSql = sql;

    // Add MFA tables if enabled
    if (customization.enableMFA) {
      customizedSql += `
        -- Multi-Factor Authentication
        CREATE TABLE mfa_factors (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          factor_type TEXT CHECK (factor_type IN ('totp', 'sms', 'email')),
          secret TEXT,
          phone_number TEXT,
          email TEXT,
          verified BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          last_used_at TIMESTAMPTZ,
          UNIQUE(user_id, factor_type)
        );

        CREATE TABLE mfa_challenges (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          factor_id UUID REFERENCES mfa_factors(id) ON DELETE CASCADE,
          code TEXT NOT NULL,
          verified BOOLEAN DEFAULT false,
          expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        ALTER TABLE mfa_factors ENABLE ROW LEVEL SECURITY;
        ALTER TABLE mfa_challenges ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Users can manage their own MFA" ON mfa_factors
          FOR ALL USING (user_id = auth.uid());
        
        CREATE POLICY "Users can view their challenges" ON mfa_challenges
          FOR SELECT USING (user_id = auth.uid());
      `;
    }

    // Add social auth connections if enabled
    if (customization.enableSocialAuth) {
      customizedSql += `
        -- Social Auth Connections
        CREATE TABLE social_connections (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          provider TEXT CHECK (provider IN ('google', 'github', 'facebook', 'twitter', 'linkedin')),
          provider_user_id TEXT NOT NULL,
          access_token TEXT,
          refresh_token TEXT,
          expires_at TIMESTAMPTZ,
          profile_data JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(provider, provider_user_id)
        );

        ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Users can manage their social connections" ON social_connections
          FOR ALL USING (user_id = auth.uid());

        CREATE INDEX idx_social_provider ON social_connections(provider, provider_user_id);
      `;
    }

    // Add custom fields if specified
    if (customization.customFields) {
      for (const [tableName, fields] of Object.entries(customization.customFields)) {
        customizedSql += `\n-- Custom fields for ${tableName}\n`;
        for (const [fieldName, fieldType] of Object.entries(fields as Record<string, string>)) {
          customizedSql += `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${fieldName} ${fieldType};\n`;
        }
      }
    }

    return customizedSql;
  }

  private addEnterpriseFeatures(sql: string): string {
    return sql + `
      -- Enterprise Features

      -- Audit Logs
      CREATE TABLE audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID REFERENCES organizations(id),
        user_id UUID REFERENCES auth.users(id),
        action TEXT NOT NULL,
        resource_type TEXT,
        resource_id UUID,
        changes JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- SSO Configuration
      CREATE TABLE sso_providers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        provider_type TEXT CHECK (provider_type IN ('saml', 'oidc', 'ldap')),
        enabled BOOLEAN DEFAULT false,
        config JSONB NOT NULL,
        metadata_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(organization_id, provider_type)
      );

      -- Advanced Permissions
      CREATE TABLE custom_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        permissions JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(organization_id, name)
      );

      CREATE TABLE user_custom_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        role_id UUID REFERENCES custom_roles(id) ON DELETE CASCADE,
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        granted_by UUID REFERENCES auth.users(id),
        granted_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, role_id)
      );

      -- Compliance & Data Retention
      CREATE TABLE data_retention_policies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        resource_type TEXT NOT NULL,
        retention_days INTEGER NOT NULL,
        auto_delete BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- IP Allowlists
      CREATE TABLE ip_allowlists (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        ip_range CIDR NOT NULL,
        description TEXT,
        created_by UUID REFERENCES auth.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Enable RLS on enterprise tables
      ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE sso_providers ENABLE ROW LEVEL SECURITY;
      ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE user_custom_roles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;
      ALTER TABLE ip_allowlists ENABLE ROW LEVEL SECURITY;

      -- Create indexes for performance
      CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id, created_at DESC);
      CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
      CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
    `;
  }

  private extractFeatures(templateType: string): string[] {
    const featureMap: Record<string, string[]> = {
      saas: [
        'Multi-tenant organizations',
        'Team management with roles',
        'Invitation system',
        'API key management',
        'Project management',
        'Billing integration ready'
      ],
      marketplace: [
        'Buyer and seller profiles',
        'Store management',
        'Product catalog',
        'Shopping cart',
        'Order management',
        'Review system',
        'Payment integration ready'
      ],
      social: [
        'User profiles',
        'Follow/friend system',
        'Posts and comments',
        'Direct messaging',
        'Notifications',
        'Media sharing'
      ],
      enterprise: [
        'All SaaS features',
        'Audit logging',
        'SSO/SAML support',
        'Custom roles and permissions',
        'Data retention policies',
        'IP allowlisting',
        'Compliance features'
      ]
    };

    return featureMap[templateType] || [];
  }

  private extractTables(sql: string): string[] {
    const tableMatches = sql.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/gi);
    const tables: string[] = [];
    
    for (const match of tableMatches) {
      if (match[1]) {
        tables.push(match[1]);
      }
    }
    
    return tables;
  }

  getAllTemplates(): Array<{ slug: string; name: string; description: string; features: string[] }> {
    const templates = this.templateManager.getTemplates();
    
    return templates.map(template => ({
      ...template,
      features: this.extractFeatures(template.slug)
    }));
  }
}