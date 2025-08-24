import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getEnv } from '@/lib/config/env';

export async function createClient() {
  const cookieStore = await cookies();
  const env = getEnv();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options?: any) {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // Cookie setting can fail in Server Components
          }
        },
        remove(name: string, options?: any) {
          try {
            cookieStore.set(name, '', options);
          } catch {
            // Cookie removal can fail in Server Components
          }
        },
      },
    }
  );
}

export async function createServiceClient() {
  const env = getEnv();
  
  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY!,
    {
      cookies: {
        get() {
          return null;
        },
        set() {
          // Service role client doesn't need cookies
        },
        remove() {
          // Service role client doesn't need cookies
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}