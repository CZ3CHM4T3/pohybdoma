import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Přihlášení k newsletteru.
 * 1) uloží e-mail do Supabase (tabulka subscribers) – tvoje vlastní kopie
 * 2) pokud jsou nastavené ECOMAIL_* proměnné, přidá e-mail i do Ecomail seznamu
 *
 * Ecomail API klíč je TAJNÝ – proto to běží na serveru, ne v prohlížeči.
 */
export async function POST(request: Request) {
  let email = "";
  try {
    const body = await request.json();
    email = String(body.email ?? "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ status: "error" }, { status: 400 });
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json({ status: "error" }, { status: 400 });
  }

  let duplicate = false;

  // 1) Supabase
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anon) {
    const supabase = createClient(url, anon);
    const { error } = await supabase.from("subscribers").insert({ email });
    if (error) {
      if (error.code === "23505") {
        duplicate = true; // už je přihlášený
      } else {
        return NextResponse.json({ status: "error" }, { status: 500 });
      }
    }
  }

  // 2) Ecomail – přes veřejný přihlašovací formulář (žádný API klíč není potřeba).
  //    Ecomail pošle potvrzovací e-mail (double opt-in) a po potvrzení je člověk
  //    v seznamu, odkud rozesíláš kampaně.
  const ecomailUrl = process.env.ECOMAIL_SUBSCRIBE_URL;
  if (ecomailUrl) {
    try {
      await fetch(ecomailUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ email, source: "form_hosted" }).toString(),
      });
    } catch {
      // Ecomail výpadek nesmí shodit přihlášení – e-mail máme v Supabase.
    }
  }

  return NextResponse.json({ status: duplicate ? "duplicate" : "success" });
}
