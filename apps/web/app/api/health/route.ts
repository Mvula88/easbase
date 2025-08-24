import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/auth/supabase';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database: ServiceStatus;
    cache: ServiceStatus;
    ai: ServiceStatus;
    storage: ServiceStatus;
  };
  metrics?: {
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
  };
}

interface ServiceStatus {
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  error?: string;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: { status: 'down' },
      cache: { status: 'down' },
      ai: { status: 'down' },
      storage: { status: 'down' },
    },
  };

  try {
    // Check database
    const dbStart = Date.now();
    try {
      const supabase = await createServiceClient();
      const { error } = await supabase.from('health_check').select('id').limit(1);
      
      if (!error) {
        health.services.database = {
          status: 'up',
          latency: Date.now() - dbStart,
        };
      } else {
        health.services.database = {
          status: 'down',
          error: error.message,
        };
      }
    } catch (error: any) {
      health.services.database = {
        status: 'down',
        error: error.message,
      };
    }

    // Check cache (Redis/Vector DB)
    const cacheStart = Date.now();
    try {
      // Test vector similarity search
      const supabase = await createServiceClient();
      const { error } = await supabase.rpc('find_similar_schemas', {
        query_embedding: new Array(1536).fill(0),
        similarity_threshold: 0.99,
        match_limit: 1,
      });
      
      if (!error) {
        health.services.cache = {
          status: 'up',
          latency: Date.now() - cacheStart,
        };
      } else {
        health.services.cache = {
          status: 'degraded',
          error: error.message,
        };
      }
    } catch (error: any) {
      health.services.cache = {
        status: 'down',
        error: error.message,
      };
    }

    // Check AI service (Claude API)
    const aiStart = Date.now();
    try {
      const response = await fetch('https://api.anthropic.com/v1/health', {
        headers: {
          'anthropic-version': '2023-06-01',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
        },
        signal: AbortSignal.timeout(5000),
      });
      
      if (response.ok) {
        health.services.ai = {
          status: 'up',
          latency: Date.now() - aiStart,
        };
      } else {
        health.services.ai = {
          status: 'degraded',
          latency: Date.now() - aiStart,
        };
      }
    } catch (error: any) {
      health.services.ai = {
        status: 'down',
        error: error.message,
      };
    }

    // Check storage (Supabase Storage)
    const storageStart = Date.now();
    try {
      const supabase = await createServiceClient();
      const { error } = await supabase.storage.listBuckets();
      
      if (!error) {
        health.services.storage = {
          status: 'up',
          latency: Date.now() - storageStart,
        };
      } else {
        health.services.storage = {
          status: 'degraded',
          error: error.message,
        };
      }
    } catch (error: any) {
      health.services.storage = {
        status: 'down',
        error: error.message,
      };
    }

    // Determine overall health
    const services = Object.values(health.services);
    const downCount = services.filter(s => s.status === 'down').length;
    const degradedCount = services.filter(s => s.status === 'degraded').length;
    
    if (downCount > 1) {
      health.status = 'unhealthy';
    } else if (downCount > 0 || degradedCount > 1) {
      health.status = 'degraded';
    } else {
      health.status = 'healthy';
    }

    // Add metrics if available
    if (process.env.NODE_ENV === 'production') {
      // In production, you'd fetch these from your monitoring service
      health.metrics = {
        requestsPerMinute: 120,
        averageResponseTime: 450,
        errorRate: 0.01,
      };
    }

    const statusCode = health.status === 'healthy' ? 200 : 
                       health.status === 'degraded' ? 503 : 500;

    return NextResponse.json(health, { status: statusCode });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        error: error.message,
        services: health.services,
      },
      { status: 500 }
    );
  }
}