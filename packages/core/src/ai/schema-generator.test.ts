import { describe, it, expect, beforeEach } from 'vitest';
import { AISchemaGenerator } from './schema-generator';

describe('AISchemaGenerator', () => {
  let generator: AISchemaGenerator;

  beforeEach(() => {
    // Use mock API key for testing
    generator = new AISchemaGenerator('test-api-key', 'claude');
  });

  describe('generateFromDescription', () => {
    it('should generate a schema from business description', async () => {
      const businessType = 'e-commerce platform';
      const requirements = 'Need products, orders, and customers';
      const features = ['shopping cart', 'inventory tracking', 'customer reviews'];

      // This will use the mock schema in development
      const schema = await generator.generateFromDescription(
        businessType,
        requirements,
        features
      );

      expect(schema).toBeDefined();
      expect(schema.tables).toBeInstanceOf(Array);
      expect(schema.tables.length).toBeGreaterThan(0);
      expect(schema.tables[0]).toHaveProperty('name');
      expect(schema.tables[0]).toHaveProperty('columns');
    });

    it('should include audit columns in all tables', async () => {
      const schema = await generator.generateFromDescription(
        'SaaS application',
        'User management system',
        []
      );

      schema.tables.forEach(table => {
        const columnNames = table.columns.map(col => col.name);
        expect(columnNames).toContain('created_at');
        expect(columnNames).toContain('updated_at');
      });
    });

    it('should apply security defaults', async () => {
      const schema = await generator.generateFromDescription(
        'Multi-tenant app',
        'Organizations with teams',
        []
      );

      expect(schema.tables[0].policies).toBeDefined();
      expect(schema.tables[0].policies!.length).toBeGreaterThan(0);
    });
  });

  describe('toSQL', () => {
    it('should convert schema to valid SQL', async () => {
      const schema = await generator.generateFromDescription(
        'Blog platform',
        'Posts and comments',
        []
      );

      const sql = await generator.toSQL(schema);

      expect(sql).toBeDefined();
      expect(sql).toContain('CREATE TABLE');
      expect(sql).toContain('PRIMARY KEY');
      expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
    });

    it('should include indexes in SQL output', async () => {
      const schema = {
        tables: [{
          name: 'test_table',
          columns: [
            { name: 'id', type: 'uuid' as const, primary: true },
            { name: 'name', type: 'text' as const }
          ],
          indexes: [{
            name: 'idx_test_name',
            columns: ['name'],
            unique: false
          }]
        }]
      };

      const sql = await generator.toSQL(schema);
      expect(sql).toContain('CREATE INDEX idx_test_name');
    });
  });

  describe('sanitization', () => {
    it('should sanitize table names', () => {
      const sanitized = generator['sanitizeTableName']('My Table-Name!');
      expect(sanitized).toBe('my_table_name_');
      expect(sanitized).toMatch(/^[a-z_][a-z0-9_]*$/);
    });

    it('should sanitize column names', () => {
      const sanitized = generator['sanitizeColumnName']('Column Name 123');
      expect(sanitized).toBe('column_name_123');
      expect(sanitized).toMatch(/^[a-z_][a-z0-9_]*$/);
    });

    it('should handle names starting with numbers', () => {
      const sanitized = generator['sanitizeTableName']('123_table');
      expect(sanitized).toBe('_123_table');
      expect(sanitized[0]).not.toMatch(/[0-9]/);
    });
  });
});