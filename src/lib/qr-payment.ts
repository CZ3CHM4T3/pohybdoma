// Sestaví řetězec „QR Platba" (formát SPD 1.0) pro české bankovní QR platby.
// Naskenováním v bankovní aplikaci se předvyplní platba.
export function spdString(opts: {
  iban: string;
  amountKc: number;
  vs?: string;
  message?: string;
}): string {
  const parts = [
    "SPD*1.0",
    `ACC:${opts.iban.replace(/\s+/g, "")}`,
    `AM:${opts.amountKc.toFixed(2)}`,
    "CC:CZK",
  ];
  if (opts.vs) parts.push(`X-VS:${opts.vs.replace(/\D/g, "")}`);
  if (opts.message) parts.push(`MSG:${opts.message.slice(0, 60).replace(/\*/g, " ")}`);
  return parts.join("*");
}
