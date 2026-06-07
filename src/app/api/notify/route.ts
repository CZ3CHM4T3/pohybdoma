import { NextResponse } from "next/server";
import { createClient as createServer } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

/**
 * Pošle e-mail upozornění, když někdo odpoví v klubu.
 * Volá se z klienta (fire-and-forget) po vložení komentáře/odpovědi.
 * Příjemci: autor topicu + (u odpovědi) autor nadřazeného komentáře.
 */
export async function POST(req: Request) {
  let commentId: string | undefined;
  try {
    ({ commentId } = await req.json());
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!commentId) return NextResponse.json({ ok: false }, { status: 400 });

  // Jen pro přihlášené (proti zneužití)
  const supa = await createServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  // Když chybí konfigurace, tiše nic neposílej (neblokuj diskuzi).
  if (!url || !serviceKey || !resendKey) {
    return NextResponse.json({ ok: false, reason: "not_configured" });
  }

  const admin = createAdmin(url, serviceKey, { auth: { persistSession: false } });

  const { data: c } = await admin
    .from("community_comments")
    .select("id, post_id, parent_id, author_id, author_name, author_role, body")
    .eq("id", commentId)
    .maybeSingle();
  if (!c) return NextResponse.json({ ok: false });

  const { data: post } = await admin
    .from("community_posts")
    .select("id, author_id, channel")
    .eq("id", c.post_id)
    .maybeSingle();
  if (!post) return NextResponse.json({ ok: false });

  // Příjemci: autor topicu + autor nadřazeného komentáře (u odpovědi)
  const recipients = new Set<string>();
  recipients.add(post.author_id as string);
  if (c.parent_id) {
    const { data: parent } = await admin
      .from("community_comments")
      .select("author_id")
      .eq("id", c.parent_id)
      .maybeSingle();
    if (parent?.author_id) recipients.add(parent.author_id as string);
  }
  recipients.delete(c.author_id as string); // sám sebe nenotifikuj
  if (recipients.size === 0) return NextResponse.json({ ok: true });

  const { data: profs } = await admin
    .from("profiles")
    .select("id, email")
    .in("id", [...recipients]);
  const emails = (profs ?? [])
    .map((p) => p.email as string | null)
    .filter((e): e is string => !!e);
  if (emails.length === 0) return NextResponse.json({ ok: true });

  const isLektor = c.author_role === "lektor";
  const who = c.author_name || "Někdo";
  const subject = isLektor
    ? "Lektor ti odpověděl v klubu – POHYB DOMA"
    : `${who} reagoval(a) v klubu – POHYB DOMA`;
  const preview = (c.body || "").slice(0, 160);
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:auto;color:#062A6B">
      <h2 style="color:#062A6B">${isLektor ? "Lektor ti odpověděl 🥇" : "Nová reakce v klubu"}</h2>
      <p style="color:#444">${who} napsal(a):</p>
      <blockquote style="border-left:3px solid #1976FF;margin:0;padding:8px 14px;color:#333;background:#EEF4FF;border-radius:6px">
        ${preview ? preview.replace(/</g, "&lt;") : "(obrázek)"}
      </blockquote>
      <p style="margin-top:20px">
        <a href="https://pohybdoma.cz/klub" style="background:#1976FF;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold">
          Otevřít diskuzi
        </a>
      </p>
      <p style="color:#999;font-size:12px;margin-top:24px">POHYB DOMA · VIP+ Klub</p>
    </div>`;

  await Promise.all(
    emails.map((to) =>
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "POHYB DOMA <noreply@pohybdoma.cz>",
          to,
          subject,
          html,
        }),
      }).catch(() => {})
    )
  );

  return NextResponse.json({ ok: true });
}
