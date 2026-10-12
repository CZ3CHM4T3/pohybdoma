import { createClient } from "@/lib/supabase/server";
import { BUSINESS } from "@/lib/invoice-business";
import { buildSpayd, fmtCzDate, monthLabelCs, type InvoiceLine } from "@/lib/invoice";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

type Inv = {
  number: number;
  payer_name: string;
  bill_name: string | null;
  address: string | null;
  ico: string | null;
  month: string;
  issued_on: string;
  due_on: string;
  amount: number;
  vs: string;
  intro: string | null;
  lines: InvoiceLine[];
  status: string;
};

export default async function FakturaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_invoice", { p_token: token });
  const inv: Inv | undefined = Array.isArray(data) ? data[0] : undefined;

  if (!inv) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold text-slate-800">Faktura nenalezena</h1>
        <p className="mt-3 text-slate-500">
          Odkaz je neplatný nebo byl zrušen. Napiš mi prosím na{" "}
          <a className="text-blue-600 underline" href={`mailto:${BUSINESS.email}`}>
            {BUSINESS.email}
          </a>.
        </p>
      </main>
    );
  }

  const billTo = inv.bill_name || inv.payer_name;
  const spayd = buildSpayd({ iban: BUSINESS.iban, amountKc: inv.amount, vs: inv.vs, number: inv.number });
  const qr = `/api/qr?spd=${encodeURIComponent(spayd)}`;
  const paid = inv.status === "paid";

  return (
    <main className="fakt-wrap mx-auto max-w-[820px] px-5 py-10 text-slate-800">
      {/* Ovládací lišta (netiskne se) */}
      <div className="no-print mb-6 flex items-center justify-between gap-3">
        <span className="text-sm text-slate-400">POHYB DOMA · faktura {inv.number}</span>
        <PrintButton />
      </div>

      <div className="fakt-doc rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        {/* Hlavička */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-slate-400">Faktura</div>
            <div className="mt-1 text-3xl font-bold" style={{ color: "#062A6B" }}>
              č. {inv.number}
            </div>
            {paid && (
              <div className="mt-2 inline-block rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                ✓ Zaplaceno
              </div>
            )}
          </div>
          <div className="text-right text-sm leading-6">
            <div className="text-base font-semibold text-slate-900">{BUSINESS.name}</div>
            <div className="text-slate-500">{BUSINESS.address}</div>
            <div className="text-slate-500">IČO: {BUSINESS.ico}</div>
            <div className="text-slate-500">{BUSINESS.vatNote}</div>
          </div>
        </div>

        {/* Odběratel + data */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div>
            <div className="text-xs uppercase tracking-widest text-slate-400">Odběratel</div>
            <div className="mt-1 font-semibold text-slate-900">{billTo}</div>
            {inv.address && <div className="text-slate-500">{inv.address}</div>}
            {inv.ico && <div className="text-slate-500">IČO: {inv.ico}</div>}
          </div>
          <div className="sm:text-right text-sm leading-7">
            <div><span className="text-slate-400">Vystaveno: </span>{fmtCzDate(inv.issued_on)}</div>
            <div><span className="text-slate-400">Splatnost: </span><strong>{fmtCzDate(inv.due_on)}</strong></div>
            <div><span className="text-slate-400">Období: </span>{monthLabelCs(inv.month)}</div>
            <div><span className="text-slate-400">Variabilní symbol: </span><strong>{inv.vs}</strong></div>
          </div>
        </div>

        {/* Úvodní věta */}
        {inv.intro && <p className="mt-8 text-slate-700">{inv.intro}</p>}

        {/* Položky */}
        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-400">
              <th className="py-2 pr-3 font-medium">Datum</th>
              <th className="py-2 pr-3 font-medium">Popis</th>
              <th className="py-2 text-right font-medium">Částka</th>
            </tr>
          </thead>
          <tbody>
            {inv.lines.map((l, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-2 pr-3 align-top text-slate-500 whitespace-nowrap">
                  {l.date ? fmtCzDate(l.date) : ""}
                </td>
                <td className="py-2 pr-3 align-top">{l.what}</td>
                <td className="py-2 text-right align-top whitespace-nowrap">
                  {l.amount.toLocaleString("cs-CZ")} Kč
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td />
              <td className="py-3 pr-3 text-right text-base font-semibold">Celkem k úhradě</td>
              <td className="py-3 text-right text-xl font-bold whitespace-nowrap" style={{ color: "#062A6B" }}>
                {inv.amount.toLocaleString("cs-CZ")} Kč
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Platba + QR */}
        <div className="mt-8 grid gap-6 rounded-xl bg-slate-50 p-6 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="text-sm leading-7">
            <div className="text-xs uppercase tracking-widest text-slate-400">Platební údaje</div>
            <div className="mt-1"><span className="text-slate-400">Účet: </span><strong>{BUSINESS.account}</strong></div>
            <div><span className="text-slate-400">IBAN: </span>{BUSINESS.iban}</div>
            <div><span className="text-slate-400">Částka: </span><strong>{inv.amount.toLocaleString("cs-CZ")} Kč</strong></div>
            <div><span className="text-slate-400">Variabilní symbol: </span><strong>{inv.vs}</strong></div>
            <div className="mt-2 text-xs text-slate-400">Naskenuj QR v bankovní aplikaci — částka i VS se vyplní samy.</div>
          </div>
          <div className="justify-self-center sm:justify-self-end">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="QR platba" width={180} height={180} className="rounded-lg bg-white p-2 shadow-sm" />
            <div className="mt-1 text-center text-xs text-slate-400">QR Platba</div>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-slate-400">
          {BUSINESS.name} · {BUSINESS.address} · IČO {BUSINESS.ico} · {BUSINESS.vatNote}
        </div>
      </div>
    </main>
  );
}
