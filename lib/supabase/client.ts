"use client";

import { createBrowserClient } from "@supabase/ssr";
import { requirePublicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Browser Supabase client — anon key only. RLS, not secrecy, is what protects
 * data here. Never instantiate the service-role client in the browser.
 */
export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = requirePublicEnv();
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
