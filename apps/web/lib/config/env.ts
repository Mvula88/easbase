import { z } from 'zod';

const envSchema = z.object({
  // Anthropic
  ANTHROPIC_API_KEY: z.string().min(1, "Anthropic API key is required"),
  
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("Invalid Supabase URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "Supabase anon key is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "Supabase service role key is required"),
  
  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1, "Stripe secret key is required"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1, "Stripe publishable key is required"),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, "Stripe webhook secret is required"),
  
  // App Configuration
  NEXT_PUBLIC_APP_URL: z.string().url("Invalid app URL").default("http://localhost:3000"),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  
  // Rate Limiting
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().positive().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().positive().default(60000),
});

export type Env = z.infer<typeof envSchema>;

export const env = (): Env => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.errors.map(e => e.path.join('.')).join(', ');
      throw new Error(`Missing or invalid environment variables: ${missing}`);
    }
    throw error;
  }
};

export const getEnv = () => {
  if (process.env.NODE_ENV === 'production') {
    return env();
  }
  
  // In development, allow partial configuration
  try {
    return env();
  } catch (error) {
    console.warn('Environment validation failed:', error);
    return process.env as unknown as Env;
  }
};