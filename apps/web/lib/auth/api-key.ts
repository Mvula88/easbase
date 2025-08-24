import { NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/auth/supabase';

export interface ApiKeyValidation {
  valid: boolean;
  error?: string;
  customerId?: string;
  userId?: string;
}

export async function validateApiKey(request: NextRequest): Promise<ApiKeyValidation> {
  try {
    // Get API key from Authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        valid: false,
        error: 'Missing or invalid Authorization header. Use: Bearer YOUR_API_KEY'
      };
    }

    const apiKey = authHeader.substring(7);
    
    if (!apiKey || apiKey.length < 32) {
      return {
        valid: false,
        error: 'Invalid API key format'
      };
    }

    // Validate API key against database
    const supabase = await createServiceClient();
    
    const { data: apiKeyData, error } = await supabase
      .from('api_keys')
      .select('id, customer_id, user_id, name, last_used_at, is_active')
      .eq('key_hash', hashApiKey(apiKey))
      .eq('is_active', true)
      .single();

    if (error || !apiKeyData) {
      return {
        valid: false,
        error: 'Invalid or expired API key'
      };
    }

    // Update last used timestamp
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKeyData.id);

    return {
      valid: true,
      customerId: apiKeyData.customer_id,
      userId: apiKeyData.user_id
    };
  } catch (error) {
    console.error('API key validation error:', error);
    return {
      valid: false,
      error: 'API key validation failed'
    };
  }
}

export async function generateApiKey(userId: string, name: string = 'Default'): Promise<string> {
  const supabase = await createServiceClient();
  
  // Generate a secure random API key
  const apiKey = `sk_${generateRandomString(32)}`;
  const keyHash = hashApiKey(apiKey);
  
  // Store the hashed key in database
  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      user_id: userId,
      customer_id: userId, // In Model B, customer_id equals user_id
      name,
      key_hash: keyHash,
      key_prefix: apiKey.substring(0, 7), // Store prefix for display
      is_active: true
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to generate API key: ${error.message}`);
  }

  return apiKey;
}

function hashApiKey(apiKey: string): string {
  // In production, use proper hashing like bcrypt or argon2
  // For now, using a simple hash
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}