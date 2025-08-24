import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const API_URL = process.env.TEST_API_URL || 'http://localhost:3000';
const API_KEY = process.env.TEST_API_KEY || 'test-api-key';

describe('API: /api/generate', () => {
  let apiKey: string;

  beforeAll(async () => {
    // Setup test API key
    apiKey = API_KEY;
  });

  describe('POST /api/generate', () => {
    it('should generate schema with valid prompt', async () => {
      const response = await fetch(`${API_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          prompt: 'Simple blog with posts and comments',
        }),
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('schema');
      expect(data).toHaveProperty('sql');
      expect(data.sql).toContain('CREATE TABLE');
    });

    it('should return cached result for similar prompt', async () => {
      // First request
      await fetch(`${API_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          prompt: 'E-commerce with products',
        }),
      });

      // Second similar request
      const response = await fetch(`${API_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          prompt: 'E-commerce with products',
          useCache: true,
        }),
      });

      const data = await response.json();
      expect(data.cached).toBe(true);
      expect(data.costSaved).toBeGreaterThan(0);
    });

    it('should reject invalid API key', async () => {
      const response = await fetch(`${API_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'invalid-key',
        },
        body: JSON.stringify({
          prompt: 'Test prompt',
        }),
      });

      expect(response.status).toBe(401);
    });

    it('should validate prompt length', async () => {
      const response = await fetch(`${API_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          prompt: 'Too short',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('at least 10 characters');
    });
  });
});

describe('API: /api/deploy', () => {
  it('should deploy schema to project', async () => {
    const response = await fetch(`${API_URL}/api/deploy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        projectId: 'test-project-id',
        sql: 'CREATE TABLE test (id UUID PRIMARY KEY);',
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('deploymentId');
  });

  it('should handle deployment failures gracefully', async () => {
    const response = await fetch(`${API_URL}/api/deploy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        projectId: 'invalid-project',
        sql: 'INVALID SQL',
      }),
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });
});

describe('API: /api/webhooks', () => {
  it('should create webhook subscription', async () => {
    const response = await fetch(`${API_URL}/api/webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        url: 'https://example.com/webhook',
        events: ['schema.generated', 'deployment.completed'],
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('subscription');
    expect(data.subscription).toHaveProperty('secret');
  });

  it('should list webhook subscriptions', async () => {
    const response = await fetch(`${API_URL}/api/webhooks`, {
      headers: {
        'x-api-key': apiKey,
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('subscriptions');
    expect(Array.isArray(data.subscriptions)).toBe(true);
  });
});