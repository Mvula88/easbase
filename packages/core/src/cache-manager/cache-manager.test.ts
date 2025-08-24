import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheManager } from './index';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: {}, error: null }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: {}, error: null }))
      }))
    })),
    rpc: vi.fn(() => Promise.resolve({ data: [], error: null }))
  }))
}));

// Mock OpenAI embeddings
vi.mock('../embeddings/openai', () => ({
  OpenAIEmbeddings: vi.fn().mockImplementation(() => ({
    generateEmbedding: vi.fn(() => Promise.resolve(new Array(1536).fill(0))),
    generateBatchEmbeddings: vi.fn((texts) => 
      Promise.resolve(texts.map(() => new Array(1536).fill(0)))
    ),
    isConfigured: vi.fn(() => true),
    getModel: vi.fn(() => 'text-embedding-3-small')
  }))
}));

describe('CacheManager', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    cacheManager = new CacheManager();
  });

  describe('findSimilar', () => {
    it('should search for similar schemas', async () => {
      const result = await cacheManager.findSimilar('test prompt');
      expect(result).toBeNull(); // No matches in mock
    });

    it('should use custom threshold', async () => {
      const result = await cacheManager.findSimilar('test prompt', 0.9);
      expect(result).toBeNull();
    });
  });

  describe('store', () => {
    it('should store schema in cache', async () => {
      await expect(
        cacheManager.store(
          'test prompt',
          { schema: {}, sql: 'CREATE TABLE test' },
          100
        )
      ).resolves.not.toThrow();
    });
  });

  describe('calculateCostSavings', () => {
    it('should calculate correct cost savings', () => {
      const savings = cacheManager.calculateCostSavings(1000);
      expect(savings).toBe(0.045); // $0.045 for 1000 tokens
    });

    it('should handle zero tokens', () => {
      const savings = cacheManager.calculateCostSavings(0);
      expect(savings).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      const stats = await cacheManager.getStats();
      expect(stats).toHaveProperty('totalCached');
      expect(stats).toHaveProperty('totalHits');
      expect(stats).toHaveProperty('totalTokensSaved');
      expect(stats).toHaveProperty('avgSimilarity');
    });
  });

  describe('getEmbeddingStatus', () => {
    it('should return embedding configuration status', () => {
      const status = cacheManager.getEmbeddingStatus();
      expect(status).toHaveProperty('configured');
      expect(status).toHaveProperty('model');
      expect(status).toHaveProperty('fallback');
      expect(status.configured).toBe(true);
      expect(status.model).toBe('text-embedding-3-small');
    });
  });
});