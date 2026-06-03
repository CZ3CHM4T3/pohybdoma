# Založení Supabase pro POHYB DOMA (krok za krokem)

Supabase = databáze + přihlašování uživatelů. Na začátku **zdarma**.
Tenhle návod tě provede založením. Až budeš hotový, pošli mi údaje z **kroku 5**
a já napojím web (admin správa termínů, přihlášení klientů, rezervace, zrušení).

---

## 1) Vytvoř účet
1. Otevři **https://supabase.com**
2. Klikni **Start your project** (vpravo nahoře)
3. Přihlas se přes **GitHub** (máš ho – `CZ3CHM4T3`) nebo e-mailem
   - GitHub je nejrychlejší: klikni *Continue with GitHub* a potvrď

## 2) Vytvoř nový projekt
1. Klikni **New project**
2. **Organization**: nech přednastavené (nebo vytvoř „Pohyb Doma")
3. Vyplň:
   - **Name**: `pohybdoma`
   - **Database Password**: klikni *Generate a password* → **někam si ho ulož**
     (budeš ho potřebovat jen výjimečně, ale neztrať ho)
   - **Region**: vyber **Central EU (Frankfurt)** — nejblíž ČR, nejrychlejší
   - **Plan**: **Free** (0 $)
4. Klikni **Create new project** a počkej ~2 minuty, než se projekt nastaví

## 3) (Zatím nic neinstaluj)
Databázové tabulky (rozvrh, rezervace, akce, uživatelé) vytvořím já –
buď ti pošlu hotový skript, nebo to nastavím přímo. Ty zatím jen získáš klíče.

## 4) Najdi přístupové údaje
1. V levém menu klikni na ⚙️ **Project Settings**
2. Otevři sekci **API** (resp. **API Keys** / **Data API**)
3. Najdeš tam:
   - **Project URL** — vypadá jako `https://xxxxxxxx.supabase.co`
   - **anon public** klíč — dlouhý text (je „veřejný", smí být v prohlížeči)
   - **service_role** klíč — dlouhý text ⚠️ **TAJNÝ** (nikdy nikam veřejně!)

## 5) Co mi pošli
Pošli mi:
- ✅ **Project URL**
- ✅ **anon public** klíč

➡️ **service_role klíč mi NEPOSÍLEJ do běžné zprávy.** Ten je tajný. Když ho
budu potřebovat, řeknu ti, jak ho bezpečně vložit přímo do nastavení (env),
aby se nikam neuložil ani nedostal do gitu.

Taky mi napiš:
- ✅ **admin e-mail** – tvůj e-mail, pod kterým se budeš přihlašovat do správy
  (klidně `schroffelh@seznam.cz`)

---

## Co bude následovat (udělám já)
1. Přidám do webu Supabase klienta + bezpečně klíče (přes `.env.local`, viz `.env.example`)
2. Vytvořím tabulky: `availability` (rozvrh/výjimky), `events` (akce),
   `bookings` (rezervace), `profiles` (klienti + tier členství)
3. Postavím **admin stránku** (přihlášený jen ty): klikací správa volných hodin
   a akcí – bez kódu
4. **Přihlášení / registrace** klientů
5. **Rezervace do databáze** + **zrušení s pravidlem 24 h** (peníze se nevrací)

## Bezpečnost (důležité)
- Klíče **nikdy** nedáváme do gitu. Slouží k tomu soubor `.env.local`, který je
  v `.gitignore` (necommituje se).
- `anon` klíč = veřejný (OK v prohlížeči). `service_role` = tajný (jen na serveru).
