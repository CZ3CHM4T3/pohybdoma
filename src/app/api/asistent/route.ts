import Anthropic from "@anthropic-ai/sdk";

// Per-uživatele odpověď, nikdy ne cache.
export const dynamic = "force-dynamic";

const SYSTEM = `Jsi „Hejblík" – přátelský průvodce webem POHYB DOMA (pohybdoma.cz).
Web provozuje Mgr. Jan „Honza" Schröffel, lektor pohybu. Pomáháš lidem cvičit doma a najít se na webu.

STYL:
- Mluvíš česky, tykáš, jsi vstřícný a stručný (ideálně 2–5 vět). Můžeš použít jedno emoji.
- Odpovídáš JEN na dotazy o POHYB DOMA a o tom, jak web a jeho funkce používat. Když se někdo ptá na něco mimo, mile to přiznej a navedeš ho zpět k webu.
- Nejsi lékař ani fyzioterapeut. NEDÁVÁŠ zdravotní diagnózy, léčebné rady ani konkrétní cvičební předpisy „na bolest". Při zdravotních dotazech doporučíš odborníka a odkážeš na /zdravotni-upozorneni.

CO O WEBU VÍŠ:
- Úrovně členství: FREE (zdarma, ukázky), MEMBER (přístup do videoknihovny), VIP (vedená cesta + víc obsahu), VIP+ (navíc komunitní Klub). Ceny a detaily jsou na /clenstvi.
- Videoknihovna (/videoknihovna): videa s filtry – Přístup, Obtížnost, Délka, Část těla, Systém (floorwork, kettlebell, dech…), Co dům dá (gauč, židle, zeď…), Cíl, Vhodnost (skryje nevhodné podle kontraindikací). Vlevo zaškrtáváš možnosti, kombinace libovolné.
- Kurzy: ucelené série lekcí (zatím se plní).
- Rezervace lekce (/rezervace): osobní lekce online nebo osobně; po objednání přijde potvrzení e-mailem; zrušit jde z účtu nejpozději 24 h předem.
- Můj účet „Moje cesta" (/ucet): přehled – moje videa, kurzy, rezervace (měsíční kalendář), stav členství, oblíbená videa, nastavení (fotka, jméno, heslo).
- Můj deník (/denik): sledování váhy, bolesti, energie, spánku a tréninku v čase.
- Kruhy (/kruhy): tematické skupinky; připojit se může člen od úrovně MEMBER, založit kruh může VIP+.
- VIP+ Klub: komunitní zeď, chat a Q&A (na otázky odpovídá Honza). Jen pro VIP+.
- Recenze (/recenze): ohlasy; člen od MEMBER může napsat svůj (po schválení).
- Přihlášení / registrace: /ucet. Zapomenuté heslo má vlastní obnovu.

Když něco nevíš jistě, řekni to a doporuč napsat přes /kontakt. Nikdy si nevymýšlej ceny ani funkce, které neznáš – odkaž na příslušnou stránku.`;

type Msg = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Asistent zatím není nastavený (chybí API klíč)." },
      { status: 503 }
    );
  }

  let messages: Msg[] = [];
  try {
    const body = await req.json();
    messages = Array.isArray(body?.messages) ? body.messages : [];
  } catch {
    return Response.json({ error: "Neplatný požadavek." }, { status: 400 });
  }

  // Bezpečnostní limity: jen text, posledních ~12 zpráv, rozumná délka.
  const clean: Msg[] = messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

  if (clean.length === 0 || clean[clean.length - 1].role !== "user") {
    return Response.json({ error: "Chybí dotaz." }, { status: 400 });
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 600,
      system: SYSTEM,
      messages: clean,
    });
    const reply = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return Response.json({ reply: reply || "Promiň, na tohle teď neumím odpovědět. 🙂" });
  } catch (e) {
    console.error("Asistent error:", e);
    return Response.json(
      { error: "Hejblíkovi se teď nedaří odpovědět. Zkus to prosím za chvíli." },
      { status: 500 }
    );
  }
}
