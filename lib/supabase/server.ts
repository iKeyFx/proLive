import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options: CookieOptions };
import { requirePublicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Server Supabase client bound to the request's cookies — runs under the
 * user's session, so RLS + auth.uid() apply to every query.
 */
export async function createClient() {
  const { supabaseUrl, supabaseAnonKey } = requirePublicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component where cookies are read-only — the
          // middleware refresh path handles writing the rotated session cookie.
        }
      },
    },
  });
}
