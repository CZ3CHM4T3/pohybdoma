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

  // 2) Ecomail (volitelné – aktivuje se po vložení klíčů)
  const ecomailKey = process.env.ECOMAIL_API_KEY;
  const listId = process.env.ECOMAIL_LIST_ID;
  if (ecomailKey && listId) {
    try {
      await fetch(`https://api2.ecomailapp.cz/lists/${listId}/subscribe`, {
        method: "POST",
        headers: { key: ecomailKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriber_data: { email },
          update_existing: true,
          resubscribe: false,
        }),
      });
    } catch {
      // Ecomail výpadek nesmí shodit přihlášení – e-mail máme v Supabase.
    }
  }

  return NextResponse.json({ status: duplicate ? "duplicate" : "success" });
}
