import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";

/** Routes anyone can open. Everything else needs a signed-in user. */
const PUBLIC_PATHS = ["/login", "/auth"];

const isPublic = (pathname: string) =>
  PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

/**
 * Refreshes the Supabase session cookie on every request and redirects:
 * signed-out users to /login (remembering where they were going),
 * signed-in users away from /login.
 */
export async function updateSession(request: NextRequest) {
  const { url, key } = supabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });

  // Do not run code between createServerClient and getClaims: it refreshes the session.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims.sub);
  const { pathname, search } = request.nextUrl;

  const redirectTo = (path: string) => {
    const target = request.nextUrl.clone();
    target.pathname = path;
    target.search = "";
    if (path === "/login" && pathname !== "/") target.searchParams.set("next", pathname + search);
    const redirect = NextResponse.redirect(target);
    // Keep any refreshed session cookies.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  if (!signedIn && !isPublic(pathname)) return redirectTo("/login");
  if (signedIn && pathname === "/login") return redirectTo("/timer");
  return response;
}
