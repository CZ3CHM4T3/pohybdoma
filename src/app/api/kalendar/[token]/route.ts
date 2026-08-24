import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type Ev = { uid: string; dtstart: string; dtend: string; summary: string };

function esc(s: string): string {
  return s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
}

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await supabase.rpc("ical_events", { p_token: token });
  const events = (data as Ev[] | null) ?? [];

  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//POHYB DOMA//Rezervace//CS",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:POHYB DOMA – moje lekce",
    "X-WR-TIMEZONE:Europe/Prague",
  ];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}@pohybdoma.cz`,
      `DTSTAMP:${now}`,
      `DTSTART:${e.dtstart}`,
      `DTEND:${e.dtend}`,
      `SUMMARY:${esc(e.summary)}`,
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");

  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="pohybdoma.ics"',
      "Cache-Control": "public, max-age=900",
    },
  });
}
