import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from '@/lib/config/env';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store for rate limiting
// In production, use Redis or similar
const store: RateLimitStore = {};

export interface RateLimitConfig {
  maxRequests?: number;
  windowMs?: number;
  keyGenerator?: (req: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
}

export function createRateLimiter(config: RateLimitConfig = {}) {
  const env = getEnv();
  
  const {
    maxRequests = env.RATE_LIMIT_MAX_REQUESTS || 100,
    windowMs = env.RATE_LIMIT_WINDOW_MS || 60000,
    keyGenerator = defaultKeyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    message = 'Too many requests, please try again later.',
  } = config;

  return async function rateLimit(
    request: NextRequest,
    handler: (request: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const key = keyGenerator(request);
    const now = Date.now();

    // Clean up expired entries
    cleanupExpiredEntries(now);

    // Get or create rate limit entry
    if (!store[key]) {
      store[key] = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    const entry = store[key];

    // Reset if window has expired
    if (now > entry.resetTime) {
      entry.count = 0;
      entry.resetTime = now + windowMs;
    }

    // Check if limit exceeded
    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      
      return NextResponse.json(
        { error: message },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
            'Retry-After': retryAfter.toString(),
          },
        }
      );
    }

    // Increment counter
    entry.count++;

    // Execute handler
    const response = await handler(request);

    // Optionally skip counting based on response
    if (
      (skipSuccessfulRequests && response.status < 400) ||
      (skipFailedRequests && response.status >= 400)
    ) {
      entry.count--;
    }

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count).toString());
    response.headers.set('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

    return response;
  };
}

function defaultKeyGenerator(req: NextRequest): string {
  // Use IP address as key
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  
  // Include user ID if authenticated
  const authHeader = req.headers.get('authorization');
  const userId = authHeader ? extractUserId(authHeader) : '';
  
  return `${ip}:${userId}`;
}

function extractUserId(authHeader: string): string {
  // Extract user ID from JWT or session
  // This is a simplified version
  try {
    const token = authHeader.replace('Bearer ', '');
    // In production, properly decode and verify JWT
    return token.slice(0, 16);
  } catch {
    return '';
  }
}

function cleanupExpiredEntries(now: number) {
  for (const key in store) {
    if (store[key].resetTime < now - 60000) {
      delete store[key];
    }
  }
}

// Specific rate limiters for different endpoints
export const apiRateLimit = createRateLimiter({
  maxRequests: 100,
  windowMs: 60000,
});

export const authRateLimit = createRateLimiter({
  maxRequests: 5,
  windowMs: 60000,
  message: 'Too many authentication attempts',
});

export const generateRateLimit = createRateLimiter({
  maxRequests: 20,
  windowMs: 60000,
  message: 'Schema generation rate limit exceeded',
});

export const deployRateLimit = createRateLimiter({
  maxRequests: 10,
  windowMs: 3600000, // 1 hour
  message: 'Deployment rate limit exceeded',
});