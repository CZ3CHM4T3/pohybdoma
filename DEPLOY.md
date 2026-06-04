# Nasazení POHYB DOMA na web (Vercel) – krok za krokem

Vercel = hosting pro Next.js, **zdarma**, napojený přímo na GitHub.
Po nasazení bude web veřejně dostupný a po každém pushi se sám aktualizuje.

---

## 1) Účet a import projektu
1. Otevři **https://vercel.com** → **Sign Up** → **Continue with GitHub** (účet `CZ3CHM4T3`)
2. Po přihlášení klikni **Add New… → Project**
3. U repozitáře **`pohybdoma`** klikni **Import**

## 2) Nastav proměnné prostředí (KLÍČOVÉ)
V kroku konfigurace (před Deploy) otevři **Environment Variables** a přidej:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://elavgxuequqnptbjswqn.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(anon public klíč ze Supabase → Project Settings → API)* |

> Bez nich web nepoběží (nepřipojí se k databázi). `.npmrc` v projektu už řeší
> instalaci závislostí, takže build projde.

## 3) Deploy
- Klikni **Deploy** a počkej ~1–2 minuty.
- Dostaneš adresu typu **`https://pohybdoma.vercel.app`** → otevři a zkontroluj.

## 4) Propoj Supabase s adresou webu (kvůli přihlašování)
V Supabase → **Authentication → URL Configuration**:
- **Site URL**: `https://pohybdoma.vercel.app` (nebo později `https://pohybdoma.cz`)
- **Redirect URLs**: přidej `https://pohybdoma.vercel.app/**`

## 5) (Později) Vlastní doména pohybdoma.cz
1. Ve Vercelu: **Project → Settings → Domains → Add** → `pohybdoma.cz`
2. Vercel ukáže, jaké DNS záznamy nastavit u registrátora domény (A / CNAME)
3. Po propsání DNS bude web na `pohybdoma.cz` (Vercel přidá i HTTPS certifikát zdarma)
4. Aktualizuj **Site URL** v Supabase na `https://pohybdoma.cz`

---

## Aktualizace webu
Cokoliv pushneme do větve `main` na GitHubu → Vercel **automaticky nasadí**.
Žádný ruční krok.

## Na později (produkce)
- Znovu zapnout potvrzování e-mailu + nastavit **vlastní SMTP** (spolehlivé e-maily).
- Doplnit reálná videa (MP4 do /public/videos) a texty.
- Platební brána (Stripe/GoPay) a chráněná videa (Mux/Cloudflare) až bude potřeba.
