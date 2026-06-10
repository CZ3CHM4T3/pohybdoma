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
        <h1 style="margin:0 0 8px;color:#062A6B;font-size:22px;">Vítej v POHYB DOMA! 👋</h1>
        <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6;">
          Díky, že ses zaregistroval/a. Ještě jeden krok – potvrď prosím svůj e-mail a tvůj účet bude připravený.
        </p>
      </td></tr>
      <tr><td align="center" style="padding:8px 32px 4px;">
        <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#1976FF;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 32px;border-radius:10px;">
          Potvrdit e-mail
        </a>
      </td></tr>
      <tr><td style="padding:16px 32px 0;">
        <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
          Kdyby tlačítko nefungovalo, zkopíruj si do prohlížeče tento odkaz:<br/>
          <a href="{{ .ConfirmationURL }}" style="color:#1976FF;word-break:break-all;">{{ .ConfirmationURL }}</a>
        </p>
      </td></tr>
      <tr><td style="padding:20px 32px 28px;">
        <p style="margin:0;color:#334155;font-size:14px;line-height:1.6;">
          Těším se na tebe na cestě za lepším pohybem.<br/>
          <strong style="color:#062A6B;">Honza · POHYB DOMA</strong>
        </p>
        <p style="margin:14px 0 0;color:#cbd5e1;font-size:11px;">
          Pokud sis účet nezakládal/a, tento e-mail klidně ignoruj.
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
        <h1 style="margin:0 0 8px;color:#062A6B;font-size:22px;">Obnova hesla 🔑</h1>
        <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6;">
          Někdo (snad ty) požádal o obnovu hesla k tvému účtu. Klikni níže a nastav si nové heslo.
        </p>
      </td></tr>
      <tr><td align="center" style="padding:8px 32px 4px;">
        <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#1976FF;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 32px;border-radius:10px;">
          Nastavit nové heslo
        </a>
      </td></tr>
      <tr><td style="padding:16px 32px 0;">
        <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
          Kdyby tlačítko nefungovalo, zkopíruj si do prohlížeče tento odkaz:<br/>
          <a href="{{ .ConfirmationURL }}" style="color:#1976FF;word-break:break-all;">{{ .ConfirmationURL }}</a>
        </p>
      </td></tr>
      <tr><td style="padding:20px 32px 28px;">
        <p style="margin:0;color:#334155;font-size:14px;line-height:1.6;">
          Drž se,<br/>
          <strong style="color:#062A6B;">Honza · POHYB DOMA</strong>
        </p>
        <p style="margin:14px 0 0;color:#cbd5e1;font-size:11px;">
          Pokud jsi o obnovu hesla nežádal/a, tento e-mail ignoruj – tvé heslo zůstává beze změny.
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
Tvůj přihlašovací odkaz – POHYB DOMA
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
        <h1 style="margin:0 0 8px;color:#062A6B;font-size:22px;">Přihlášení jedním klikem ✨</h1>
        <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6;">
          Klikni na tlačítko a rovnou se přihlásíš do svého účtu POHYB DOMA.
        </p>
      </td></tr>
      <tr><td align="center" style="padding:8px 32px 4px;">
        <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#1976FF;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 32px;border-radius:10px;">
          Přihlásit se
        </a>
      </td></tr>
      <tr><td style="padding:16px 32px 0;">
        <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
          Kdyby tlačítko nefungovalo, zkopíruj si do prohlížeče tento odkaz:<br/>
          <a href="{{ .ConfirmationURL }}" style="color:#1976FF;word-break:break-all;">{{ .ConfirmationURL }}</a>
        </p>
      </td></tr>
      <tr><td style="padding:20px 32px 28px;">
        <p style="margin:0;color:#334155;font-size:14px;line-height:1.6;">
          <strong style="color:#062A6B;">Honza · POHYB DOMA</strong>
        </p>
        <p style="margin:14px 0 0;color:#cbd5e1;font-size:11px;">
          Pokud ses nepřihlašoval/a, tento e-mail ignoruj.
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
Potvrď změnu e-mailu – POHYB DOMA
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
        <h1 style="margin:0 0 8px;color:#062A6B;font-size:22px;">Potvrď nový e-mail 📧</h1>
        <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6;">
          Žádal/a jsi o změnu e-mailu u svého účtu POHYB DOMA. Potvrď ji prosím kliknutím níže.
        </p>
      </td></tr>
      <tr><td align="center" style="padding:8px 32px 4px;">
        <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#1976FF;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 32px;border-radius:10px;">
          Potvrdit nový e-mail
        </a>
      </td></tr>
      <tr><td style="padding:16px 32px 0;">
        <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
          Kdyby tlačítko nefungovalo, zkopíruj si do prohlížeče tento odkaz:<br/>
          <a href="{{ .ConfirmationURL }}" style="color:#1976FF;word-break:break-all;">{{ .ConfirmationURL }}</a>
        </p>
      </td></tr>
      <tr><td style="padding:20px 32px 28px;">
        <p style="margin:0;color:#334155;font-size:14px;line-height:1.6;">
          <strong style="color:#062A6B;">Honza · POHYB DOMA</strong>
        </p>
        <p style="margin:14px 0 0;color:#cbd5e1;font-size:11px;">
          Pokud jsi o změnu nežádal/a, tento e-mail ignoruj.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
```

---

## Poznámky
- Proměnnou `{{ .ConfirmationURL }}` **nemaž ani neměň** – Supabase tam vloží funkční odkaz.
- Logo se načítá z `https://pohybdoma.cz/LOGO.png` (musí být web nasazený, což je).
- Když budeš chtít jiný text/podpis, klidně si ho v těle uprav – měň jen text, ne odkazy.
