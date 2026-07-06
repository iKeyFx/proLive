import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };
import { publicEnv } from "@/lib/env";

/**
 * Runs on every matched request. It (a) refreshes the Supabase session cookie so
 * server components always see a valid session, and (b) guards the app: any
 * unauthenticated request to a protected route is redirected to /login before
 * any protected data is fetched. Auth is enforced here AND by RLS at the DB —
 * defence in depth.
 */
const PUBLIC_PATHS = ["/login", "/signup", "/auth"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // If env isn't configured yet, don't hard-crash every route — let pages render
  // their own "configure Supabase" guidance. (Real deploys always have env.)
  if (!publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Signed-in users shouldn't sit on auth pages.
  if (user && (path === "/login" || path === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Run on everything except static assets and the favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
