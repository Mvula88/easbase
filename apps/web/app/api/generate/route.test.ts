import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the dependencies
vi.mock('@/lib/auth/middleware', () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: 'test-user-id', email: 'test@example.com' })
}));

vi.mock('@/lib/auth/supabase', () => ({
  createServiceClient: vi.fn().mockResolvedValue({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null }),
    insert: vi.fn().mockResolvedValue({ error: null }),
    rpc: vi.fn().mockResolvedValue({ error: null })
  })
}));

vi.mock('@/lib/services/ai-service', () => ({
  generateSchema: vi.fn().mockResolvedValue({
    tables: [{ name: 'test_table', columns: [] }],
    sql: 'CREATE TABLE test_table ();',
    explanation: 'Test schema'
  }),
  calculateTokenUsage: vi.fn().mockReturnValue(100)
}));

describe('POST /api/generate', () => {
  let POST: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const routeModule = await import('./route');
    POST = routeModule.POST;
  });

  it('should require authentication', async () => {
    const { requireAuth } = await import('@/lib/auth/middleware');
    vi.mocked(requireAuth).mockResolvedValueOnce(null);

    const request = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'Create a blog schema'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should validate request body', async () => {
    const request = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'short' // Too short
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request');
    expect(data.details).toBeDefined();
  });

  it('should generate schema successfully', async () => {
    const request = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'Create a complete e-commerce database schema',
        useCache: false
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.schema).toBeDefined();
    expect(data.sql).toBeDefined();
    expect(data.cached).toBe(false);
    expect(data.tokensUsed).toBe(100);
  });

  it('should return cached result when available', async () => {
    const { createServiceClient } = await import('@/lib/auth/supabase');
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          schema: { tables: [] },
          sql: 'CACHED SQL',
          tokens_used: 500
        }
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      rpc: vi.fn().mockResolvedValue({ error: null })
    };
    
    vi.mocked(createServiceClient).mockResolvedValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'Create a blog database schema with posts',
        useCache: true
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.cached).toBe(true);
    expect(data.sql).toBe('CACHED SQL');
    expect(data.tokensUsed).toBe(0);
    expect(data.costSaved).toBeGreaterThan(0);
  });

  it('should check usage limits', async () => {
    const { createServiceClient } = await import('@/lib/auth/supabase');
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn((table?: string) => {
        if (table === 'user_usage') {
          return Promise.resolve({
            data: {
              tokens_used: 10000,
              tokens_limit: 10000
            }
          });
        }
        return Promise.resolve({ data: null });
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      rpc: vi.fn().mockResolvedValue({ error: null })
    };
    
    vi.mocked(createServiceClient).mockResolvedValue(mockSupabase as any);

    const request = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'Create another database schema',
        useCache: false
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toContain('Usage limit exceeded');
  });
});