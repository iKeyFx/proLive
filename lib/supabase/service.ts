import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requirePublicEnv, serverEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Service-role client — bypasses RLS, SERVER ONLY (`server-only` makes client
 * bundling a build error). Never used to serve user requests.
 */
export function createServiceClient() {
  const { supabaseUrl } = requirePublicEnv();
  const { serviceRoleKey } = serverEnv();
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
