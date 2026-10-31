import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only privileged Supabase client using SUPABASE_SERVICE_ROLE_KEY.
 * Never import this file in Client Components.
 * Used strictly for verified webhooks (e.g., Razorpay) and server-side email logging.
 */
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

