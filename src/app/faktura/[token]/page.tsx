import { createClient } from "@/lib/supabase/server";
import { BUSINESS } from "@/lib/invoice-business";
import { buildSpayd, type InvoiceLine } from "@/lib/invoice";
import { InvoiceDocument } from "@/components/InvoiceDocument";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

type Inv = {
  number: number;
  payer_name: string;
  bill_name: string | null;
  address: string | null;
  ico: string | null;
  dic: string | null;
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

  const spayd = buildSpayd({ iban: BUSINESS.iban, amountKc: inv.amount, vs: inv.vs, number: inv.number });
  const qr = `/api/qr?spd=${encodeURIComponent(spayd)}`;

  return (
    <main className="fakt-wrap mx-auto max-w-[820px] px-5 py-10 text-slate-800">
      {/* Ovládací lišta (netiskne se) */}
      <div className="no-print mb-6 flex items-center justify-between gap-3">
        <span className="text-sm text-slate-400">POHYB DOMA · faktura {inv.number}</span>
        <PrintButton />
      </div>

      <InvoiceDocument
        business={BUSINESS}
        data={{
          number: inv.number,
          billTo: inv.bill_name || inv.payer_name,
          address: inv.address,
          ico: inv.ico,
          dic: inv.dic,
          month: inv.month,
          issuedOn: inv.issued_on,
          dueOn: inv.due_on,
          amount: inv.amount,
          vs: inv.vs,
          intro: inv.intro,
          lines: inv.lines,
          paid: inv.status === "paid",
          qr,
        }}
      />
    </main>
  );
}
