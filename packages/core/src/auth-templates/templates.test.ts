import { describe, it, expect } from 'vitest';
import { AuthTemplateService, authTemplates } from './templates';

describe('AuthTemplateService', () => {
  describe('getAll', () => {
    it('should return all auth templates', () => {
      const templates = AuthTemplateService.getAll();
      expect(templates).toBeDefined();
      expect(templates.length).toBeGreaterThan(0);
      expect(templates).toEqual(authTemplates);
    });
  });

  describe('getByCategory', () => {
    it('should return templates for SaaS category', () => {
      const saasTemplates = AuthTemplateService.getByCategory('saas');
      expect(saasTemplates.length).toBeGreaterThan(0);
      expect(saasTemplates.every(t => t.category === 'saas')).toBe(true);
    });

    it('should return templates for marketplace category', () => {
      const marketplaceTemplates = AuthTemplateService.getByCategory('marketplace');
      expect(marketplaceTemplates.length).toBeGreaterThan(0);
      expect(marketplaceTemplates.every(t => t.category === 'marketplace')).toBe(true);
    });

    it('should return empty array for unknown category', () => {
      const unknownTemplates = AuthTemplateService.getByCategory('unknown');
      expect(unknownTemplates).toEqual([]);
    });
  });

  describe('getBySlug', () => {
    it('should return template by slug', () => {
      const template = AuthTemplateService.getBySlug('saas-multi-tenant');
      expect(template).toBeDefined();
      expect(template?.slug).toBe('saas-multi-tenant');
      expect(template?.name).toBe('SaaS Multi-Tenant');
    });

    it('should return undefined for unknown slug', () => {
      const template = AuthTemplateService.getBySlug('non-existent');
      expect(template).toBeUndefined();
    });
  });

  describe('getById', () => {
    it('should return template by ID', () => {
      const template = AuthTemplateService.getById('marketplace');
      expect(template).toBeDefined();
      expect(template?.id).toBe('marketplace');
    });

    it('should return undefined for unknown ID', () => {
      const template = AuthTemplateService.getById('unknown-id');
      expect(template).toBeUndefined();
    });
  });

  describe('generateSQL', () => {
    it('should generate complete SQL for a template', () => {
      const sql = AuthTemplateService.generateSQL('saas-multi-tenant');
      
      expect(sql).toBeDefined();
      expect(sql).toContain('CREATE TABLE organizations');
      expect(sql).toContain('CREATE TABLE organization_members');
      expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
      expect(sql).toContain('CREATE POLICY');
    });

    it('should include RLS policies by default', () => {
      const sql = AuthTemplateService.generateSQL('marketplace');
      
      expect(sql).toContain('ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY');
      expect(sql).toContain('CREATE POLICY');
    });

    it('should exclude RLS policies when specified', () => {
      const sql = AuthTemplateService.generateSQL('social-network', {
        includeRLS: false
      });
      
      expect(sql).toContain('CREATE TABLE profiles');
      expect(sql).not.toContain('CREATE POLICY');
    });

    it('should add custom prefix to table names', () => {
      const sql = AuthTemplateService.generateSQL('ecommerce', {
        customPrefix: 'shop'
      });
      
      expect(sql).toContain('CREATE TABLE shop_customers');
      expect(sql).toContain('CREATE TABLE shop_addresses');
      expect(sql).not.toContain('CREATE TABLE customers');
    });

    it('should throw error for non-existent template', () => {
      expect(() => {
        AuthTemplateService.generateSQL('non-existent');
      }).toThrow('Template non-existent not found');
    });
  });

  describe('customize', () => {
    it('should add additional tables to template', () => {
      const customized = AuthTemplateService.customize('saas-multi-tenant', {
        additionalTables: [{
          name: 'custom_settings',
          columns: [
            { name: 'id', type: 'uuid', primary: true },
            { name: 'key', type: 'text' },
            { name: 'value', type: 'jsonb' }
          ]
        }]
      });

      const tableNames = customized.schema.tables.map(t => t.name);
      expect(tableNames).toContain('custom_settings');
    });

    it('should add additional columns to existing tables', () => {
      const customized = AuthTemplateService.customize('marketplace', {
        additionalColumns: {
          'user_profiles': [
            { name: 'custom_field', type: 'text' },
            { name: 'preferences', type: 'jsonb' }
          ]
        }
      });

      const userProfilesTable = customized.schema.tables.find(t => t.name === 'user_profiles');
      const columnNames = userProfilesTable?.columns.map(c => c.name);
      expect(columnNames).toContain('custom_field');
      expect(columnNames).toContain('preferences');
    });

    it('should add custom RLS policies', () => {
      const customPolicies = `
        CREATE POLICY "Custom admin policy" ON organizations
          FOR ALL USING (role = 'super_admin');
      `;

      const customized = AuthTemplateService.customize('saas-multi-tenant', {
        customPolicies
      });

      expect(customized.rlsPolicies).toContain('Custom admin policy');
      expect(customized.rlsPolicies).toContain('super_admin');
    });

    it('should throw error for non-existent template', () => {
      expect(() => {
        AuthTemplateService.customize('non-existent', {});
      }).toThrow('Template non-existent not found');
    });
  });

  describe('template content validation', () => {
    it('all templates should have required properties', () => {
      authTemplates.forEach(template => {
        expect(template.id).toBeDefined();
        expect(template.slug).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.category).toBeDefined();
        expect(template.schema).toBeDefined();
        expect(template.sql).toBeDefined();
        expect(template.rlsPolicies).toBeDefined();
        expect(template.features).toBeInstanceOf(Array);
      });
    });

    it('all templates should have valid categories', () => {
      const validCategories = ['saas', 'marketplace', 'social', 'ecommerce', 'custom'];
      authTemplates.forEach(template => {
        expect(validCategories).toContain(template.category);
      });
    });

    it('all templates should have tables in schema', () => {
      authTemplates.forEach(template => {
        expect(template.schema.tables).toBeDefined();
        expect(template.schema.tables.length).toBeGreaterThan(0);
      });
    });

    it('all template SQL should contain CREATE TABLE statements', () => {
      authTemplates.forEach(template => {
        expect(template.sql).toContain('CREATE TABLE');
        expect(template.sql).toContain('PRIMARY KEY');
      });
    });

    it('all template RLS policies should contain ALTER TABLE and CREATE POLICY', () => {
      authTemplates.forEach(template => {
        expect(template.rlsPolicies).toContain('ALTER TABLE');
        expect(template.rlsPolicies).toContain('ENABLE ROW LEVEL SECURITY');
        expect(template.rlsPolicies).toContain('CREATE POLICY');
      });
    });
  });
});