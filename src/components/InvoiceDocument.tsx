import { fmtCzDate, monthLabelCs, type InvoiceLine } from "@/lib/invoice";

export type InvoiceBusiness = {
  name: string; address: string; ico: string; iban: string; account: string; vatNote: string;
};

export type InvoiceDocData = {
  number?: number | null;          // null = náhled (ještě nevygenerováno)
  billTo: string;
  address?: string | null;
  ico?: string | null;
  dic?: string | null;
  month: string;
  issuedOn?: string | null;
  dueOn?: string | null;
  amount: number;
  vs?: string | null;
  intro?: string | null;
  lines: InvoiceLine[];
  paid?: boolean;
  qr?: string | null;              // URL na QR PNG; null = nezobrazovat (náhled)
};

/** Vizuální dokument faktury – s logem, hlavičkou a patičkou. Sdílené pro web i náhled. */
export function InvoiceDocument({ business, data }: { business: InvoiceBusiness; data: InvoiceDocData }) {
  const preview = data.number == null;
  return (
    <div className="fakt-doc rounded-2xl border border-slate-200 bg-white p-8 text-slate-800 shadow-sm sm:p-10">
      {/* Hlavička: logo + dodavatel */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/LOGO.png" alt="POHYB DOMA" className="h-12 w-auto object-contain" />
        <div className="text-right text-sm leading-6">
          <div className="text-base font-semibold text-slate-900">{business.name}</div>
          <div className="text-slate-500">{business.address}</div>
          <div className="text-slate-500">IČO: {business.ico}</div>
          <div className="text-slate-500">{business.vatNote}</div>
        </div>
      </div>

      {/* Titulek */}
      <div className="mt-6 flex items-center gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-400">Faktura</div>
          <div className="mt-1 text-3xl font-bold" style={{ color: "#062A6B" }}>
            {preview ? "náhled" : `č. ${data.number}`}
          </div>
        </div>
        {data.paid && (
          <span className="ml-auto rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">✓ Zaplaceno</span>
        )}
      </div>

      {/* Odběratel + údaje */}
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-400">Odběratel</div>
          <div className="mt-1 font-semibold text-slate-900">{data.billTo}</div>
          {data.address && <div className="text-slate-500">{data.address}</div>}
          {data.ico && <div className="text-slate-500">IČO: {data.ico}</div>}
          {data.dic && <div className="text-slate-500">DIČ: {data.dic}</div>}
        </div>
        <div className="text-sm leading-7 sm:text-right">
          <div><span className="text-slate-400">Vystaveno: </span>{data.issuedOn ? fmtCzDate(data.issuedOn) : "—"}</div>
          <div><span className="text-slate-400">Splatnost: </span><strong>{data.dueOn ? fmtCzDate(data.dueOn) : "—"}</strong></div>
          <div><span className="text-slate-400">Období: </span>{monthLabelCs(data.month)}</div>
          <div><span className="text-slate-400">Variabilní symbol: </span><strong>{preview ? "přidělí se" : data.vs}</strong></div>
        </div>
      </div>

      {/* Úvodní věta */}
      {data.intro && <p className="mt-8 text-slate-700">{data.intro}</p>}

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
          {data.lines.map((l, i) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="py-2 pr-3 align-top whitespace-nowrap text-slate-500">{l.date ? fmtCzDate(l.date) : ""}</td>
              <td className="py-2 pr-3 align-top">{l.what}</td>
              <td className="py-2 text-right align-top whitespace-nowrap">{l.amount.toLocaleString("cs-CZ")} Kč</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td />
            <td className="py-3 pr-3 text-right text-base font-semibold">Celkem k úhradě</td>
            <td className="py-3 text-right text-xl font-bold whitespace-nowrap" style={{ color: "#062A6B" }}>{data.amount.toLocaleString("cs-CZ")} Kč</td>
          </tr>
        </tfoot>
      </table>

      {/* Platba + QR */}
      <div className="mt-8 grid gap-6 rounded-xl bg-slate-50 p-6 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="text-sm leading-7">
          <div className="text-xs uppercase tracking-widest text-slate-400">Platební údaje</div>
          <div className="mt-1"><span className="text-slate-400">Účet: </span><strong>{business.account}</strong></div>
          <div><span className="text-slate-400">IBAN: </span>{business.iban}</div>
          <div><span className="text-slate-400">Částka: </span><strong>{data.amount.toLocaleString("cs-CZ")} Kč</strong></div>
          <div><span className="text-slate-400">Variabilní symbol: </span><strong>{preview ? "přidělí se při vygenerování" : data.vs}</strong></div>
          <div className="mt-2 text-xs text-slate-400">Naskenuj QR v bankovní aplikaci — částka i VS se vyplní samy.</div>
        </div>
        <div className="justify-self-center sm:justify-self-end">
          {data.qr ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.qr} alt="QR platba" width={180} height={180} className="rounded-lg bg-white p-2 shadow-sm" />
              <div className="mt-1 text-center text-xs text-slate-400">QR Platba</div>
            </>
          ) : (
            <div className="flex h-[180px] w-[180px] items-center justify-center rounded-lg border border-dashed border-slate-300 p-3 text-center text-xs text-slate-400">
              QR kód se vytvoří po vygenerování faktury
            </div>
          )}
        </div>
      </div>

      {/* Patička */}
      <div className="mt-8 border-t border-slate-100 pt-4 text-center text-xs text-slate-400">
        {business.name} · {business.address} · IČO {business.ico} · {business.vatNote}
        <div className="mt-0.5">pohybdoma.cz</div>
      </div>
    </div>
  );
}
