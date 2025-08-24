export class OpenAIEmbeddings {
  private client: any = null;
  private model = 'text-embedding-3-small'; // 1536 dimensions, optimized for cost/performance
  
  constructor(apiKey?: string) {
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (key) {
      try {
        const OpenAI = require('openai').default || require('openai');
        this.client = new OpenAI({ apiKey: key });
      } catch (error) {
        console.warn('OpenAI module not available, using fallback embeddings');
      }
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.client) {
      // Fallback to hash-based embedding if OpenAI not configured
      console.warn('OpenAI API key not configured, using fallback embeddings');
      return this.fallbackEmbedding(text);
    }

    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: text.slice(0, 8000), // Limit input to avoid token limits
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating OpenAI embedding:', error);
      // Fallback to hash-based if OpenAI fails
      return this.fallbackEmbedding(text);
    }
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.client) {
      return texts.map(text => this.fallbackEmbedding(text));
    }

    try {
      // OpenAI allows batch processing up to 2048 inputs
      const batches = [];
      for (let i = 0; i < texts.length; i += 100) {
        batches.push(texts.slice(i, i + 100));
      }

      const allEmbeddings: number[][] = [];
      
      for (const batch of batches) {
        const response = await this.client.embeddings.create({
          model: this.model,
          input: batch.map(text => text.slice(0, 8000)),
        });
        
        allEmbeddings.push(...response.data.map((d: any) => d.embedding));
      }

      return allEmbeddings;
    } catch (error) {
      console.error('Error generating batch embeddings:', error);
      return texts.map(text => this.fallbackEmbedding(text));
    }
  }

  private fallbackEmbedding(text: string): number[] {
    // Enhanced hash-based fallback with better distribution
    const crypto = require('crypto');
    const normalized = text.toLowerCase().trim();
    
    // Use multiple hash functions for better pseudo-randomness
    const hash1 = crypto.createHash('sha256').update(normalized).digest();
    const hash2 = crypto.createHash('sha512').update(normalized).digest();
    
    const embedding: number[] = [];
    
    // Combine hashes for 1536 dimensions
    for (let i = 0; i < 768; i++) {
      if (i < hash1.length) {
        embedding.push((hash1[i] - 128) / 128); // Normalize to [-1, 1]
      }
      if (i < hash2.length) {
        embedding.push((hash2[i] - 128) / 128);
      }
    }
    
    // Pad if necessary
    while (embedding.length < 1536) {
      embedding.push(0);
    }
    
    return embedding.slice(0, 1536);
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  getModel(): string {
    return this.model;
  }

  estimateCost(numTexts: number): number {
    // text-embedding-3-small costs $0.00002 per 1K tokens
    // Assume average 100 tokens per text
    const estimatedTokens = numTexts * 100;
    return (estimatedTokens / 1000) * 0.00002;
  }
}