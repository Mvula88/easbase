import { z } from 'zod';

const envSchema = z.object({
  // Anthropic
  ANTHROPIC_API_KEY: z.string().min(1, "Anthropic API key is required"),
  
  // Database
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("Invalid Database URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "Database anon key is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "Database service role key is required").optional().or(z.undefined()),
  SUPABASE_SERVICE_KEY: z.string().min(1, "Database service key is required").optional().or(z.undefined()),
  
  // Database Management API (for Model B)
  SUPABASE_ACCESS_TOKEN: z.string().min(1, "Database access token for Management API").optional(),
  SUPABASE_ORGANIZATION_ID: z.string().min(1, "Database organization ID").optional(),
  SUPABASE_MANAGEMENT_API_URL: z.string().url().default("https://api.supabase.com"),
  
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
}).refine(
  (data) => data.SUPABASE_SERVICE_ROLE_KEY || data.SUPABASE_SERVICE_KEY,
  {
    message: "Either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY must be provided",
    path: ["SUPABASE_SERVICE_ROLE_KEY"],
  }
);

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