# České e-maily pro Supabase (registrace, obnova hesla…)

## Kam to vložit
1. Otevři **Supabase** → projekt POHYB DOMA.
2. V levém menu: **Authentication** → **Emails** (dříve „Email Templates").
3. Pro každou šablonu níže přepiš **Subject** (předmět) a **Message body** (tělo / HTML).
4. Ulož (Save) u každé zvlášť.

> Tip: do těla vlož celý HTML blok (od `<table` po konec). Proměnnou
> `{{ .ConfirmationURL }}` nech být – Supabase si tam sám doplní správný odkaz.

---

## 1) Potvrzení registrace  (Confirm signup)

**Subject:**
```
Potvrď svou registraci – POHYB DOMA
```

**Message body (HTML):**
```html
<table width="100%" cellpadding="0" cellspacing="0" style="background:#EEF4FF;padding:24px 0;font-family:Arial,Helvetica,sans-serif;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(6,42,107,.12);">
      <tr><td align="center" style="padding:28px 24px 8px;">
        <img src="https://pohybdoma.cz/LOGO.png" alt="POHYB DOMA" width="160" style="display:block;height:auto;max-width:160px;" />
      </td></tr>
      <tr><td style="padding:8px 32px 0;">
        <h1 style="margin:0 0 8px;color:#062A6B;font-size:22px;font-weight:600;">Vítej v POHYB DOMA</h1>
        <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.7;">
          Díky za registraci. Ještě potvrď svůj e-mail a tvoje cesta může začít.
        </p>
      </td></tr>
      <tr><td align="center" style="padding:8px 32px 4px;">
        <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#1976FF;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 32px;border-radius:10px;">
          Potvrdit e-mail
        </a>
      </td></tr>
      <tr><td style="padding:18px 32px 0;">
        <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
          Kdyby tlačítko nefungovalo, otevři tento odkaz v prohlížeči:<br/>
          <a href="{{ .ConfirmationURL }}" style="color:#1976FF;word-break:break-all;">{{ .ConfirmationURL }}</a>
        </p>
      </td></tr>
      <tr><td style="padding:22px 32px 28px;">
        <p style="margin:0;color:#334155;font-size:14px;line-height:1.7;">
          Těším se na tebe.<br/>
          <strong style="color:#062A6B;">Honza Schröffel — POHYB DOMA</strong>
        </p>
        <p style="margin:14px 0 0;color:#cbd5e1;font-size:11px;line-height:1.6;">
          Pokud tahle registrace nevzešla od tebe, nech tento e-mail bez povšimnutí.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
```

---

## 2) Obnova hesla  (Reset Password)

**Subject:**
```
Obnova hesla – POHYB DOMA
```

**Message body (HTML):**
```html
<table width="100%" cellpadding="0" cellspacing="0" style="background:#EEF4FF;padding:24px 0;font-family:Arial,Helvetica,sans-serif;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(6,42,107,.12);">
      <tr><td align="center" style="padding:28px 24px 8px;">
        <img src="https://pohybdoma.cz/LOGO.png" alt="POHYB DOMA" width="160" style="display:block;height:auto;max-width:160px;" />
      </td></tr>
      <tr><td style="padding:8px 32px 0;">
        <h1 style="margin:0 0 8px;color:#062A6B;font-size:22px;font-weight:600;">Obnova hesla</h1>
        <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.7;">
          Přišla žádost o nastavení nového hesla k tvému účtu. Pokud vzešla od tebe, pokračuj tlačítkem níže.
        </p>
      </td></tr>
      <tr><td align="center" style="padding:8px 32px 4px;">
        <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#1976FF;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 32px;border-radius:10px;">
          Nastavit nové heslo
        </a>
      </td></tr>
      <tr><td style="padding:18px 32px 0;">
        <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
          Kdyby tlačítko nefungovalo, otevři tento odkaz v prohlížeči:<br/>
          <a href="{{ .ConfirmationURL }}" style="color:#1976FF;word-break:break-all;">{{ .ConfirmationURL }}</a>
        </p>
      </td></tr>
      <tr><td style="padding:22px 32px 28px;">
        <p style="margin:0;color:#334155;font-size:14px;line-height:1.7;">
          <strong style="color:#062A6B;">Honza Schröffel — POHYB DOMA</strong>
        </p>
        <p style="margin:14px 0 0;color:#cbd5e1;font-size:11px;line-height:1.6;">
          Pokud žádost nevzešla od tebe, nic nedělej — tvé heslo zůstává beze změny.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
```

---

## 3) Přihlašovací odkaz  (Magic Link)

**Subject:**
```
Přihlášení do účtu – POHYB DOMA
```

**Message body (HTML):**
```html
<table width="100%" cellpadding="0" cellspacing="0" style="background:#EEF4FF;padding:24px 0;font-family:Arial,Helvetica,sans-serif;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(6,42,107,.12);">
      <tr><td align="center" style="padding:28px 24px 8px;">
        <img src="https://pohybdoma.cz/LOGO.png" alt="POHYB DOMA" width="160" style="display:block;height:auto;max-width:160px;" />
      </td></tr>
      <tr><td style="padding:8px 32px 0;">
        <h1 style="margin:0 0 8px;color:#062A6B;font-size:22px;font-weight:600;">Přihlášení do účtu</h1>
        <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.7;">
          Tímto odkazem se rovnou přihlásíš do svého účtu na POHYB DOMA.
        </p>
      </td></tr>
      <tr><td align="center" style="padding:8px 32px 4px;">
        <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#1976FF;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 32px;border-radius:10px;">
          Přihlásit se
        </a>
      </td></tr>
      <tr><td style="padding:18px 32px 0;">
        <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
          Kdyby tlačítko nefungovalo, otevři tento odkaz v prohlížeči:<br/>
          <a href="{{ .ConfirmationURL }}" style="color:#1976FF;word-break:break-all;">{{ .ConfirmationURL }}</a>
        </p>
      </td></tr>
      <tr><td style="padding:22px 32px 28px;">
        <p style="margin:0;color:#334155;font-size:14px;line-height:1.7;">
          <strong style="color:#062A6B;">Honza Schröffel — POHYB DOMA</strong>
        </p>
        <p style="margin:14px 0 0;color:#cbd5e1;font-size:11px;line-height:1.6;">
          Pokud ses nepřihlašoval, nech tento e-mail bez povšimnutí.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
```

---

## 4) Změna e-mailu  (Change Email Address)

**Subject:**
```
Potvrzení nového e-mailu – POHYB DOMA
```

**Message body (HTML):**
```html
<table width="100%" cellpadding="0" cellspacing="0" style="background:#EEF4FF;padding:24px 0;font-family:Arial,Helvetica,sans-serif;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(6,42,107,.12);">
      <tr><td align="center" style="padding:28px 24px 8px;">
        <img src="https://pohybdoma.cz/LOGO.png" alt="POHYB DOMA" width="160" style="display:block;height:auto;max-width:160px;" />
      </td></tr>
      <tr><td style="padding:8px 32px 0;">
        <h1 style="margin:0 0 8px;color:#062A6B;font-size:22px;font-weight:600;">Potvrzení nového e-mailu</h1>
        <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.7;">
          Přišla žádost o změnu e-mailu u tvého účtu. Potvrď ji prosím tlačítkem níže.
        </p>
      </td></tr>
      <tr><td align="center" style="padding:8px 32px 4px;">
        <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#1976FF;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 32px;border-radius:10px;">
          Potvrdit nový e-mail
        </a>
      </td></tr>
      <tr><td style="padding:18px 32px 0;">
        <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
          Kdyby tlačítko nefungovalo, otevři tento odkaz v prohlížeči:<br/>
          <a href="{{ .ConfirmationURL }}" style="color:#1976FF;word-break:break-all;">{{ .ConfirmationURL }}</a>
        </p>
      </td></tr>
      <tr><td style="padding:22px 32px 28px;">
        <p style="margin:0;color:#334155;font-size:14px;line-height:1.7;">
          <strong style="color:#062A6B;">Honza Schröffel — POHYB DOMA</strong>
        </p>
        <p style="margin:14px 0 0;color:#cbd5e1;font-size:11px;line-height:1.6;">
          Pokud žádost nevzešla od tebe, nech tento e-mail bez povšimnutí.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
```

---

## Poznámky
- Proměnnou `{{ .ConfirmationURL }}` **nemaž ani neměň** – Supabase tam vloží funkční odkaz.
- Logo se načítá z `https://pohybdoma.cz/LOGO.png` (web musí být nasazený, což je).
- Žádné emotikony, klidný a osobní tón – ladí s webem.
- Když budeš chtít jiný text/podpis, klidně si ho v těle uprav – měň jen text, ne odkazy.
