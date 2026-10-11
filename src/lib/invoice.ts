// Pomůcky pro fakturaci (QR Platba / SPAYD + formátování).

/** Sestaví SPAYD řetězec pro QR Platbu (české bankovní appky). */
export function buildSpayd(opts: { iban: string; amountKc: number; vs: string; number: number | string }): string {
  const am = Number(opts.amountKc || 0).toFixed(2);
  const msg = `POHYB DOMA faktura ${opts.number}`;
  return [
    "SPD*1.0",
    `ACC:${opts.iban}`,
    `AM:${am}`,
    "CC:CZK",
    `X-VS:${opts.vs}`,
    `MSG:${msg}`,
  ].join("*");
}

/** URL na náš QR endpoint (vrací PNG) – absolutní pro e-mail. */
export function qrUrl(spayd: string, base = "https://pohybdoma.cz"): string {
  return `${base}/api/qr?spd=${encodeURIComponent(spayd)}`;
}

/** Datum ve formátu D. M. YYYY. */
export function fmtCzDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d + (d.length === 10 ? "T00:00:00" : "")) : d;
  return date.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" });
}

export type InvoiceLine = { date: string; what: string; amount: number };
