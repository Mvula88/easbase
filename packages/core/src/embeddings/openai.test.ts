import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenAIEmbeddings } from './openai';

describe('OpenAIEmbeddings', () => {
  let embeddings: OpenAIEmbeddings;

  describe('with API key', () => {
    beforeEach(() => {
      // Mock OpenAI module
      vi.mock('openai', () => ({
        default: vi.fn().mockImplementation(() => ({
          embeddings: {
            create: vi.fn().mockResolvedValue({
              data: [
                { embedding: new Array(1536).fill(0).map(() => Math.random() - 0.5) }
              ]
            })
          }
        }))
      }));

      embeddings = new OpenAIEmbeddings('test-api-key');
    });

    it('should generate embeddings for text', async () => {
      const text = 'This is a test text for embedding generation';
      const embedding = await embeddings.generateEmbedding(text);

      expect(embedding).toBeDefined();
      expect(embedding).toBeInstanceOf(Array);
      expect(embedding.length).toBe(1536); // text-embedding-3-small dimension
    });

    it('should generate batch embeddings', async () => {
      const texts = [
        'First text to embed',
        'Second text to embed',
        'Third text to embed'
      ];

      const batchEmbeddings = await embeddings.generateBatchEmbeddings(texts);

      expect(batchEmbeddings).toBeDefined();
      expect(batchEmbeddings.length).toBe(3);
      expect(batchEmbeddings[0].length).toBe(1536);
    });

    it('should limit text length to avoid token limits', async () => {
      const longText = 'x'.repeat(10000); // Very long text
      const embedding = await embeddings.generateEmbedding(longText);

      expect(embedding).toBeDefined();
      expect(embedding.length).toBe(1536);
    });
  });

  describe('without API key (fallback mode)', () => {
    beforeEach(() => {
      embeddings = new OpenAIEmbeddings(); // No API key
    });

    it('should use fallback embedding when API key is not configured', async () => {
      const text = 'Test text for fallback embedding';
      const embedding = await embeddings.generateEmbedding(text);

      expect(embedding).toBeDefined();
      expect(embedding).toBeInstanceOf(Array);
      expect(embedding.length).toBe(1536);
      // Fallback embeddings should be deterministic
      const embedding2 = await embeddings.generateEmbedding(text);
      expect(embedding).toEqual(embedding2);
    });

    it('should generate different embeddings for different texts', async () => {
      const text1 = 'First unique text';
      const text2 = 'Second different text';
      
      const embedding1 = await embeddings.generateEmbedding(text1);
      const embedding2 = await embeddings.generateEmbedding(text2);

      expect(embedding1).not.toEqual(embedding2);
    });

    it('should normalize fallback embeddings to [-1, 1] range', async () => {
      const text = 'Test normalization';
      const embedding = await embeddings.generateEmbedding(text);

      embedding.forEach(value => {
        expect(value).toBeGreaterThanOrEqual(-1);
        expect(value).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('utility methods', () => {
    beforeEach(() => {
      embeddings = new OpenAIEmbeddings();
    });

    it('should check if configured correctly', () => {
      const configured = embeddings.isConfigured();
      expect(typeof configured).toBe('boolean');
    });

    it('should return the model being used', () => {
      const model = embeddings.getModel();
      expect(model).toBe('text-embedding-3-small');
    });

    it('should estimate cost for embeddings', () => {
      const cost = embeddings.estimateCost(100);
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(1); // Should be a small amount
    });
  });
});