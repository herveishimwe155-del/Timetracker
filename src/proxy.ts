import type { NextRequest } from "next/server";
import { contentSecurityPolicy } from "@/lib/csp";
import { supabaseEnv } from "@/lib/supabase/env";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  // A fresh nonce per request; Next.js reads it from the request's CSP header and
  // adds it to its own scripts. The root layout reads x-nonce for the theme script.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce, supabaseEnv().url);
  request.headers.set("x-nonce", nonce);
  request.headers.set("Content-Security-Policy", csp);

  const response = await updateSession(request);
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Skip static files and images.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)"],
};
