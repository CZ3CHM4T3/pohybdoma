import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Cíl odkazů z e-mailů (obnova hesla, potvrzení účtu).
 * Vymění `code` za přihlášenou session (cookies) a přesměruje na `next`.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/ucet";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocal = process.env.NODE_ENV === "development";
      const base = isLocal || !forwardedHost ? origin : `https://${forwardedHost}`;
      return NextResponse.redirect(`${base}${next}`);
    }
  }

  // Neplatný / vypršelý odkaz → na formulář s chybou
  return NextResponse.redirect(`${origin}/obnova-hesla?error=1`);
}
