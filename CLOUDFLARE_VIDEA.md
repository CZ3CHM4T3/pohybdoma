# Videa přes Cloudflare Stream — návod

Přehrávač na webu je hotový. Hraje video podle jeho **Cloudflare UID**. Jakmile
u videa v adminu vyplníš UID, hned se přehraje. Žádné klíče ani programování.

## 1) Založ Cloudflare účet a zapni Stream
1. Jdi na **dash.cloudflare.com** → zaregistruj se (zdarma).
2. V levém menu najdi **Stream** → aktivuj. Stream je placená služba (viz ceny níže),
   ale účet i procházení jsou zdarma; platíš až za nahraná videa a sledování.

## 2) Nahraj video
1. Ve Stream dej **Upload video** a vyber soubor (MP4 apod.).
2. Po nahrání se u videa zobrazí **Video ID / UID** — dlouhý řetězec písmen a čísel,
   např. `a1b2c3d4e5f6...`. To je to, co potřebuješ.
3. (Doporučeno) U videa nebo v nastavení Stream nastav **Allowed origins** na
   `pohybdoma.cz` — video pak půjde přehrát jen na tvém webu, ne jinde.

## 3) Vlož UID do webu (admin)
1. Na webu jdi do **Admin → Videa**.
2. U daného videa vyplň pole **Cloudflare UID** tím řetězcem z kroku 2.
3. Ulož. Hotovo — video se na stránce videa rovnou přehraje.

> Dokud UID nevyplníš, ukáže se u videa hláška „Video se připravuje".

## Ceny (orientačně)
Cloudflare Stream se platí dvěma způsoby:
- **Uložení:** ~$5 za každých 1 000 minut nahraných videí / měsíc.
- **Sledování:** ~$1 za každých 1 000 minut shlédnutých videí / měsíc.

Příklad: **100 videí po ~10 min = 1 000 minut uložení ≈ $5/měsíc** za úložiště.
K tomu se přičítá sledování podle toho, kolik toho lidi nakoukají.
(Ceny si vždy ověř aktuálně na webu Cloudflare.)

## Soukromí videí — důležité k zvážení
- Teď je přístup hlídaný **na úrovni webu** (zamčená videa vidí jen členové se správným
  členstvím). To je pro start v pohodě.
- Embed přes UID je ale technicky **veřejný** — kdo by znal přímou adresu videa, mohl by
  ho teoreticky pustit i mimo web. Proto doporučuju nastavit **Allowed origins =
  pohybdoma.cz** (krok 2.3) — to drtivou většinu obejití zavře.
- Pokud bys někdy chtěl **tvrdé zabezpečení** (podepsané odkazy, video nejde pustit ani
  s přímou adresou), dá se doplnit — vyžaduje to API token a kousek serverového kódu.
  Řekni, až na to dojde.

## Co potřebuju od tebe, abych mohl pomoct dál
- Nic nutně hned — UID si vkládáš v adminu sám.
- Kdybys chtěl **hromadné nahrání**, **automatické generování náhledů**, **podepsané
  odkazy** nebo **přesnější měření minut z přehrávače**, dej vědět a domluvíme,
  co k tomu budu potřebovat (Account ID + API token — ty mi ale nikdy neposílej do chatu,
  dáš je do Vercelu/Supabase).
