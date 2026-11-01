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
      {/* Nadpis: FAKTURA + číslo */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 pb-4" style={{ borderColor: "#062A6B" }}>
        <div>
          <div className="text-sm font-semibold uppercase tracking-widest text-slate-500">Faktura</div>
          <div className="mt-0.5 text-4xl font-bold leading-none" style={{ color: "#062A6B" }}>
            {preview ? "náhled" : `č. ${data.number}`}
          </div>
        </div>
        {data.paid && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">✓ Zaplaceno</span>
        )}
      </div>

      {/* Dodavatel | Odběratel – na stejné úrovni */}
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Dodavatel</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/LOGO.png" alt="POHYB DOMA" className="mb-2 h-16 w-auto object-contain" />
          <div className="font-semibold text-slate-900">{business.name}</div>
          <div className="text-slate-600">{business.address}</div>
          <div className="text-slate-600">IČO: {business.ico}</div>
          <div className="text-slate-600">{business.vatNote}</div>
        </div>
        <div className="sm:text-right">
          <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Odběratel</div>
          <div className="font-semibold text-slate-900">{data.billTo}</div>
          {data.address && <div className="text-slate-600">{data.address}</div>}
          {data.ico && <div className="text-slate-600">IČO: {data.ico}</div>}
          {data.dic && <div className="text-slate-600">DIČ: {data.dic}</div>}
        </div>
      </div>

      {/* Datum vystavení / splatnost / období / VS */}
      <div className="mt-6 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-4">
        <div><div className="text-xs text-slate-500">Datum vystavení</div><div className="font-semibold text-slate-900">{data.issuedOn ? fmtCzDate(data.issuedOn) : "—"}</div></div>
        <div><div className="text-xs text-slate-500">Splatnost</div><div className="font-semibold text-slate-900">{data.dueOn ? fmtCzDate(data.dueOn) : "—"}</div></div>
        <div><div className="text-xs text-slate-500">Období</div><div className="font-semibold text-slate-900 capitalize">{monthLabelCs(data.month)}</div></div>
        <div><div className="text-xs text-slate-500">Variabilní symbol</div><div className="font-semibold text-slate-900">{preview ? "přidělí se" : data.vs}</div></div>
      </div>

      {/* Úvodní věta */}
      {data.intro && <p className="mt-7 text-slate-700">{data.intro}</p>}

      {/* Položky */}
      <table className="mt-4 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-slate-300 text-left text-slate-600">
            <th className="py-2 pr-3 font-semibold">Datum</th>
            <th className="py-2 pr-3 font-semibold">Popis</th>
            <th className="py-2 text-right font-semibold">Částka</th>
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
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Platební údaje</div>
          <div className="mt-1"><span className="text-slate-500">Účet: </span><strong className="text-slate-900">{business.account}</strong></div>
          <div><span className="text-slate-500">IBAN: </span><span className="text-slate-700">{business.iban}</span></div>
          <div><span className="text-slate-500">Částka: </span><strong className="text-slate-900">{data.amount.toLocaleString("cs-CZ")} Kč</strong></div>
          <div><span className="text-slate-500">Variabilní symbol: </span><strong className="text-slate-900">{preview ? "přidělí se při vygenerování" : data.vs}</strong></div>
          <div className="mt-2 text-xs text-slate-500">Naskenuj QR v bankovní aplikaci — částka i VS se vyplní samy.</div>
        </div>
        <div className="justify-self-center sm:justify-self-end">
          {data.qr ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.qr} alt="QR platba" width={180} height={180} className="rounded-lg bg-white p-2 shadow-sm" />
              <div className="mt-1 text-center text-xs text-slate-500">QR Platba</div>
            </>
          ) : (
            <div className="flex h-[180px] w-[180px] items-center justify-center rounded-lg border border-dashed border-slate-300 p-3 text-center text-xs text-slate-500">
              QR kód se vytvoří po vygenerování faktury
            </div>
          )}
        </div>
      </div>

      {/* Patička */}
      <div className="mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
        {business.name} · {business.address} · IČO {business.ico} · {business.vatNote}
        <div className="mt-0.5">pohybdoma.cz</div>
      </div>
    </div>
  );
}
