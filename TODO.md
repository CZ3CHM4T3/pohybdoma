# POHYB DOMA — TO DO LIST

Živý seznam. Aktualizujeme průběžně. Legenda: `[ ]` čeká · `[x]` hotovo · 🔧 ruční krok (Honza) · 💡 nápad

---

## 0) ČEKÁ NA TEBE (rychlé ruční kroky)
- [ ] 🔧 Spustit v Supabase nově přidané SQL (viz sekce „SQL k spuštění").
- [ ] 🔧 Finální avatar Jeníka → přepsat `public/asistent.png` (ježek + větší kouty).
- [ ] 🔧 (Volitelně) Zapnout soukromou bránu: nastavit `SITE_ACCESS_CODE` ve Vercelu.
- [ ] 🔧 Rozhodnout finální podobu prvků členství (analýza je hotová) → dáš seznam, zapracuju.

## SQL k spuštění v Supabase (pořadí nehraje roli, ale spusť vše)
- [ ] membership · progress · community (v1–v5) · favorites · account · journey
- [ ] reviews · reviews_order · notifications · circles
- [ ] bookings_extras · content · content_filters · streams · circle_posts · challenges
> Tip: po každém Run zkontroluj „Success". Když něco hlásí chybu, pošli mi text.

---

## 1) HOTOVO ✅
- [x] Jednotné barvy úrovní (FREE/MEMBER/VIP/VIP+) všude
- [x] Řízení přístupu podle úrovně členství (zámky na obsahu)
- [x] Kurzy: progress bar + soukromé poznámky
- [x] Obnova hesla (stránka + e-maily přes Resend/DNS)
- [x] Admin: měsíční kalendář termínů + týdenní rozvrh
- [x] Animované zámky na videích + štítky úrovně
- [x] VIP+ Klub (zeď, chat, Q&A, reakce, obrázky, vlákna)
- [x] Oblíbená videa (srdíčko) + zobrazení v účtu
- [x] „Moje cesta" – přehledový dashboard účtu
- [x] Můj deník (váha, bolest, energie, spánek + grafy)
- [x] Recenze v DB + admin (přidávání, schvalování, řazení přetažením)
- [x] Formulář recenze pro členy (MEMBER+, moderace)
- [x] Obchodní podmínky + GDPR (2026) + zdravotní upozornění
- [x] Bezpečnostní okénko u cviků (kontraindikace) + Legals
- [x] Rezervace propojené s přihlášeným uživatelem (user_id)
- [x] Kruhy: procházení/hledání/připojení (MEMBER+)/založení (VIP+) + detail
- [x] Potvrzovací e-maily rezervací (klient + admin)
- [x] Zrušení rezervace klientem (pravidlo 24 h)
- [x] Cookie lišta (GDPR)
- [x] Videa v databázi + admin správa (přidat/skrýt/smazat, Cloudflare UID)
- [x] Fasetové filtry knihovny (Přístup, Obtížnost, Délka, Část těla, Systém, Co dům dá, Cíl, Vhodnost)
- [x] Admin: filtry videí jako zaškrtávací volby
- [x] AI/FAQ pomocník „Jeník" (zdarma, bez nákladů) + animovaný avatar
- [x] Soukromá brána webu (přístup jen s kódem) – připraveno
- [x] Účet: zámky na dlaždicích (Kruhy=MEMBER+, Deník=VIP+) + „Stav členství" jako dlaždice s hierarchií + zrušení přes heslo
- [x] Členství: srovnávací tabulka (✓/✗) + vyladěné výhody

---

## 2) K DODĚLÁNÍ (priorita shora)
- [ ] 💾 **Záloha dat** (viz sekce níže) — důležité!
- [ ] Admin pro **kurzy** (přesun z kódu do DB + správa lekcí) — navazuje na admin videí
- [ ] Finální podoba prvků členství (po tvém sepsání)
- [ ] Doplnit kontraindikace ke kurzům (záda/koleno/pánev)
- [ ] Projít a doladit texty (Jeník, vstupní brána, FAQ členství)

## 2b) FUNKCE SLÍBENÉ V ČLENSTVÍ — dostavět před placením (ať to sedí pravdivě)
- [x] **Mixér** – fronta lekce z videoknihovny (VIP+), přetahování pořadí + „JDEME NA TO" + automatické přehrávání za sebou (Cloudflare Stream `ended`). `/klub/mixer`
- [x] **Měsíční výzva** – pro VŠECHNY, krátká/hravá. Karta v „Moje cesta" + správa v adminu (challenges.sql). „Beru výzvu/Splněno" + počítadlo.
- [x] **Chytré filtry knihovny** = od VIP (MEMBER už je nemá; FREE/MEMBER vidí jen vyhledávání + upsell)
- [x] **Diskuse v kruzích** – chat + obrázky pro členy kruhu (circle_posts.sql)
- [x] **Živé streamy + záznam (týden zpětně)** → VIP+. `/klub/live` + správa v adminu (streams.sql). *(přidáš stream s odkazem YouTube/Vimeo; záznam dostupný týden)*
- [x] **VIP+ Klub jako rozcestník** – dlaždice Mixér / LIVE / Kruhy / VIP+ videa
- [ ] **VIP+ videa** jako samostatná úroveň obsahu (stačí u videí nastavit přístup VIP+)
- [ ] 🔧 Slevy na kurzy (VIP 10 % / VIP+ 20 %) – uplatníš ručně, dokud nebude Stripe
> Pozn.: tyto prvky už jsou napsané v kartách i v matici na /clenstvi. Web je zatím soukromý a bez plateb, takže je to OK jako „nabídka"; před spuštěním placení je dostavíme nebo označíme „připravujeme".

## 3) PŘED SPUŠTĚNÍM
- [ ] 🔧 **Cloudflare Stream** – účet, nahrát videa, doplnit UID, zapojit přehrávač + podepsané odkazy (zámek dle členství)
- [ ] 🔧 **Stripe + Fakturoid** – platby členství + faktury (neplátce DPH, vlastní číselné řady)
- [ ] Reálný obsah (videa, kurzy), intro video na homepage
- [ ] Závěrečná kontrola: SEO, rychlost, mobil, přístupnost

---

## 4) 💾 ZÁLOHA DAT (vyřešit)
Cíl: kdyby se cokoliv stalo, nepřijdeš o data ani obsah.

Co zálohovat:
- **Databáze** (uživatelé, profily, rezervace, recenze, kruhy, deník, příspěvky klubu, videa-metadata)
- **Storage** (avatary, obrázky v klubu)
- **Kód** → už je bezpečně na GitHubu ✅

Možnosti (od nejjednodušší):
- [ ] **A) Supabase placený plán** – automatické denní zálohy + obnova do bodu v čase (PITR). Nejmíň práce, nejjistější. *(doporučeno k spuštění naostro)*
- [ ] **B) Ruční export** – občas stáhnout `pg_dump` (DB) + soubory ze Storage do offline úložiště (počítač/cloud). Zdarma, ale na tobě.
- [ ] **C) Automatická záloha zdarma** – naplánovaná úloha (GitHub Action) 1×týdně udělá `pg_dump`, zašifruje a uloží (např. do privátního úložiště). Nastavím, řekni.

Doporučení: do spuštění aspoň **B** (občasný ruční export), naostro přejít na **A** nebo **C**.

**STAV:** Varianta C nasazena – `.github/workflows/backup.yml` (týdenní `pg_dump`, artefakt 90 dní).
- [ ] 🔧 V GitHubu přidat secret `SUPABASE_DB_URL` (Settings → Secrets and variables → Actions) = **Session pooler** connection string ze Supabase (IPv4).
- [ ] 🔧 Občas stáhnout artefakt zálohy (Actions → běh → Artifacts) pro dlouhodobé uložení.
- [ ] (Později) Záloha Storage (avatary, obrázky klubu) – pg_dump je neobsahuje.

---

## 5) 💡 NÁPADY NA FUNKCE (co může klienty nadchnout)
Označ, co se ti líbí — zapracujeme.

**Motivace & návyk**
- [ ] 💡 Série / „streaky" a odznaky v deníku (gamifikace pokroku)
- [ ] 💡 E-mailové připomínky a týdenní souhrn („tento týden jsi zacvičil 3×")
- [ ] 💡 Měsíční výzva (challenge) pro komunitu
- [ ] 💡 Žebříček aktivních / buddy systém (parťák na cvičení)

**Personalizace**
- [ ] 💡 Vstupní dotazník → doporučí „cestu" a videa na míru
- [ ] 💡 „Na dnešek" – doporučené video podle cíle/deníku
- [ ] 💡 Tělová mapa: klikneš na bolavé místo → relevantní videa
- [ ] 💡 „Pokračovat" – widget naváže tam, kde jsi skončil

**Zážitek**
- [ ] 💡 PWA / appka na plochu (rychlé spuštění, případně offline)
- [ ] 💡 Časovač/odpočet a hudba do cvičení
- [ ] 💡 Hodnocení videí (palec/hvězdy) → lepší doporučení
- [ ] 💡 Stažitelné PDF plány / cheat-sheety k cvikům

**Komunita & živě**
- [ ] 💡 Živé online lekce + chat (mobil)
- [ ] 💡 Měsíční živé Q&A / mini-webinář (VIP+)
- [ ] 💡 „Knihovna na přání" – hlasování o dalších tématech

**Růst (akvizice/retence)**
- [ ] 💡 Doporuč kamaráda → odměna (referral)
- [ ] 💡 Roční plán se slevou (2 měsíce zdarma)
- [ ] 💡 Duo/rodinný přístup (2 lidé)
- [ ] 💡 Certifikát po dokončení kurzu

---

_Poslední aktualizace: 2026-06-09_
