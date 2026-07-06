import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requirePublicEnv, serverEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Service-role client. Bypasses RLS — SERVER ONLY. The `server-only` import
 * above makes it a build error to pull this into a client bundle. Used solely
 * by the seed script and trusted admin paths, never to serve user requests
 * (those go through the RLS-bound server client).
 */
export function createServiceClient() {
  const { supabaseUrl } = requirePublicEnv();
  const { serviceRoleKey } = serverEnv();
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
