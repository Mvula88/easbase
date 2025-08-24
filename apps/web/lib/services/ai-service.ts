import Anthropic from '@anthropic-ai/sdk';
import { getEnv } from '@/lib/config/env';

let anthropic: Anthropic | null = null;

export function getAnthropicClient() {
  if (!anthropic) {
    const env = getEnv();
    anthropic = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
    });
  }
  return anthropic;
}

export async function generateSchema(prompt: string) {
  const client = getAnthropicClient();
  
  const systemPrompt = `You are a database schema expert. Generate a PostgreSQL schema based on the user's requirements.
Return a JSON object with:
- tables: array of table definitions with columns, types, and constraints
- sql: the complete SQL statements to create the schema
- explanation: brief explanation of the design decisions

Use best practices:
- Use UUID for primary keys with gen_random_uuid()
- Add created_at/updated_at timestamps where appropriate
- Enable Row Level Security (RLS) for multi-tenant applications
- Add proper indexes for foreign keys and commonly queried columns
- Use appropriate data types (TEXT, INTEGER, BOOLEAN, TIMESTAMPTZ, UUID, JSONB)`;

  try {
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4000,
      temperature: 0.3,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response format');
    }

    // Parse the response to extract JSON
    const text = content.text;
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    
    // Try to parse the entire response as JSON
    try {
      return JSON.parse(text);
    } catch {
      // If not JSON, create a structured response
      const sqlMatch = text.match(/```sql\n([\s\S]*?)\n```/);
      return {
        tables: [],
        sql: sqlMatch ? sqlMatch[1] : text,
        explanation: 'Schema generated from prompt',
      };
    }
  } catch (error) {
    console.error('Claude API error:', error);
    throw new Error('Failed to generate schema');
  }
}

export function calculateTokenUsage(prompt: string, response: string): number {
  // Rough estimation: 1 token ≈ 4 characters
  return Math.ceil((prompt.length + response.length) / 4);
}