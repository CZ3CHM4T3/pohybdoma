import { NextRequest } from "next/server";
import { createRequire } from "module";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { BUSINESS } from "@/lib/invoice-business";
import { buildSpayd, fmtCzDate, monthLabelCs, type InvoiceLine } from "@/lib/invoice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// pdfmake je CommonJS – načteme ho přes createRequire (a je v serverExternalPackages).
const require = createRequire(import.meta.url);
/* eslint-disable @typescript-eslint/no-explicit-any */
const PdfPrinter = require("pdfmake");
const vfsMod = require("pdfmake/build/vfs_fonts");
const vfs = (vfsMod.pdfMake && vfsMod.pdfMake.vfs) || vfsMod.vfs || vfsMod.default || vfsMod;

const FONTS = {
  Roboto: {
    normal: Buffer.from(vfs["Roboto-Regular.ttf"], "base64"),
    bold: Buffer.from(vfs["Roboto-Medium.ttf"], "base64"),
    italics: Buffer.from(vfs["Roboto-Italic.ttf"], "base64"),
    bolditalics: Buffer.from(vfs["Roboto-MediumItalic.ttf"], "base64"),
  },
};

const DARK = "#062A6B";
const BLUE = "#1976FF";
const SLATE = "#64748b";
const INK = "#0f172a";
const LINE = "#e2e8f0";
const LIGHT = "#f8fafc";

type Inv = {
  number: number; payer_name: string; bill_name: string | null;
  address: string | null; ico: string | null; dic: string | null; month: string;
  issued_on: string; due_on: string; amount: number; vs: string;
  intro: string | null; lines: InvoiceLine[]; status: string;
};

const kc = (n: number) => `${Number(n || 0).toLocaleString("cs-CZ")} Kč`;

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_invoice", { p_token: token });
  const inv: Inv | undefined = Array.isArray(data) ? data[0] : undefined;
  if (!inv) return new Response("Faktura nenalezena", { status: 404 });

  // QR platba (SPAYD) jako data URL
  const spayd = buildSpayd({ iban: BUSINESS.iban, amountKc: inv.amount, vs: inv.vs, number: inv.number });
  let qrDataUrl: string | null = null;
  try {
    qrDataUrl = await QRCode.toDataURL(spayd, { errorCorrectionLevel: "M", margin: 1, width: 300, color: { dark: DARK, light: "#ffffff" } });
  } catch { qrDataUrl = null; }

  // Logo z public/ (přes vlastní origin)
  let logoDataUrl: string | null = null;
  try {
    const origin = new URL(req.url).origin;
    const r = await fetch(`${origin}/LOGO.png`);
    if (r.ok) logoDataUrl = `data:image/png;base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;
  } catch { logoDataUrl = null; }

  const billTo = inv.bill_name || inv.payer_name;
  const paid = inv.status === "paid";

  const itemsBody: any[] = [
    [
      { text: "Datum", style: "th" },
      { text: "Popis", style: "th" },
      { text: "Částka", style: "th", alignment: "right" },
    ],
    ...(inv.lines || []).map((l) => [
      { text: l.date ? fmtCzDate(l.date) : "", color: SLATE, fontSize: 9, noWrap: true },
      { text: l.what, color: "#334155", fontSize: 10 },
      { text: kc(l.amount), alignment: "right", color: INK, fontSize: 10, noWrap: true },
    ]),
  ];

  const supplierStack: any[] = [
    { text: "DODAVATEL", style: "label" },
    ...(logoDataUrl ? [{ image: logoDataUrl, width: 120, margin: [0, 2, 0, 6] as [number, number, number, number] }] : []),
    { text: BUSINESS.name, bold: true, color: INK, fontSize: 11 },
    { text: BUSINESS.address, color: SLATE, fontSize: 10 },
    { text: `IČO: ${BUSINESS.ico}`, color: SLATE, fontSize: 10 },
    { text: BUSINESS.vatNote, color: SLATE, fontSize: 10 },
  ];

  const customerStack: any[] = [
    { text: "ODBĚRATEL", style: "label", alignment: "right" },
    { text: billTo, bold: true, color: INK, fontSize: 11, alignment: "right", margin: [0, 2, 0, 0] as [number, number, number, number] },
    ...(inv.address ? [{ text: inv.address, color: SLATE, fontSize: 10, alignment: "right" as const }] : []),
    ...(inv.ico ? [{ text: `IČO: ${inv.ico}`, color: SLATE, fontSize: 10, alignment: "right" as const }] : []),
    ...(inv.dic ? [{ text: `DIČ: ${inv.dic}`, color: SLATE, fontSize: 10, alignment: "right" as const }] : []),
  ];

  const dateCell = (label: string, value: string) => ({
    stack: [
      { text: label, color: SLATE, fontSize: 8 },
      { text: value, bold: true, color: INK, fontSize: 10, margin: [0, 1, 0, 0] as [number, number, number, number] },
    ],
  });

  const paymentStack: any[] = [
    { text: "PLATEBNÍ ÚDAJE", style: "label" },
    {
      margin: [0, 4, 0, 0] as [number, number, number, number],
      table: {
        widths: ["auto", "*"],
        body: [
          [{ text: "Účet", color: SLATE, fontSize: 10, border: [false, false, false, false] }, { text: BUSINESS.account, bold: true, color: INK, fontSize: 10, border: [false, false, false, false] }],
          [{ text: "IBAN", color: SLATE, fontSize: 10, border: [false, false, false, false] }, { text: BUSINESS.iban, color: "#334155", fontSize: 10, border: [false, false, false, false] }],
          [{ text: "Var. symbol", color: SLATE, fontSize: 10, border: [false, false, false, false] }, { text: inv.vs, bold: true, color: INK, fontSize: 10, border: [false, false, false, false] }],
          [{ text: "Částka", color: SLATE, fontSize: 10, border: [false, false, false, false] }, { text: kc(inv.amount), bold: true, color: INK, fontSize: 10, border: [false, false, false, false] }],
        ],
      },
      layout: "noBorders",
    },
    { text: "Naskenujte QR v bankovní aplikaci — částka i VS se vyplní samy.", color: SLATE, fontSize: 8, margin: [0, 6, 0, 0] as [number, number, number, number] },
  ];

  const docDefinition: any = {
    pageSize: "A4",
    pageMargins: [40, 42, 40, 48],
    defaultStyle: { font: "Roboto", fontSize: 10, color: "#334155", lineHeight: 1.2 },
    styles: {
      label: { fontSize: 8, bold: true, color: SLATE, characterSpacing: 1 },
      th: { fontSize: 9, bold: true, color: SLATE },
    },
    content: [
      // Nadpis
      {
        columns: [
          { stack: [ { text: "FAKTURA", color: SLATE, fontSize: 11, bold: true, characterSpacing: 2 }, { text: `č. ${inv.number}`, color: DARK, fontSize: 24, bold: true, margin: [0, 2, 0, 0] } ] },
          paid
            ? { text: "ZAPLACENO", color: "#047857", bold: true, fontSize: 12, alignment: "right", margin: [0, 8, 0, 0] }
            : { text: "", alignment: "right" },
        ],
      },
      { canvas: [{ type: "line", x1: 0, y1: 6, x2: 515, y2: 6, lineWidth: 1.4, lineColor: DARK }], margin: [0, 4, 0, 0] },

      // Dodavatel / Odběratel
      { columns: [ { width: "*", stack: supplierStack }, { width: "*", stack: customerStack } ], columnGap: 24, margin: [0, 16, 0, 0] },

      // Datumy
      {
        margin: [0, 16, 0, 0] as [number, number, number, number],
        table: {
          widths: ["*", "*", "*", "*"],
          body: [[ dateCell("Datum vystavení", inv.issued_on ? fmtCzDate(inv.issued_on) : "—"), dateCell("Splatnost", inv.due_on ? fmtCzDate(inv.due_on) : "—"), dateCell("Období", monthLabelCs(inv.month)), dateCell("Variabilní symbol", inv.vs) ]],
        },
        layout: {
          fillColor: () => LIGHT,
          hLineWidth: () => 0, vLineWidth: () => 0,
          paddingLeft: () => 10, paddingRight: () => 10, paddingTop: () => 10, paddingBottom: () => 10,
        },
      },

      // Úvodní věta
      ...(inv.intro ? [{ text: inv.intro, color: "#334155", fontSize: 11, margin: [0, 18, 0, 8] as [number, number, number, number] }] : [{ text: "", margin: [0, 10, 0, 0] as [number, number, number, number] }]),

      // Položky
      {
        table: { headerRows: 1, widths: ["auto", "*", "auto"], body: itemsBody },
        layout: {
          hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length ? 0.8 : 0.5),
          hLineColor: (i: number) => (i <= 1 ? "#cbd5e1" : "#eef2f7"),
          vLineWidth: () => 0,
          paddingLeft: () => 0, paddingRight: () => 6, paddingTop: () => 5, paddingBottom: () => 5,
        },
      },

      // Celkem
      {
        margin: [0, 10, 0, 0] as [number, number, number, number],
        columns: [ { width: "*", text: "" }, { width: "auto", text: "Celkem k úhradě", bold: true, color: DARK, fontSize: 12, margin: [0, 4, 12, 0] }, { width: "auto", text: kc(inv.amount), bold: true, color: DARK, fontSize: 17, alignment: "right" } ],
      },

      // Platba + QR
      {
        margin: [0, 22, 0, 0] as [number, number, number, number],
        table: {
          widths: ["*", "auto"],
          body: [[
            { stack: paymentStack, border: [false, false, false, false], margin: [4, 4, 4, 4] },
            qrDataUrl
              ? { stack: [ { image: qrDataUrl, width: 120 }, { text: "QR Platba", color: SLATE, fontSize: 8, alignment: "center", margin: [0, 3, 0, 0] } ], border: [false, false, false, false], margin: [4, 4, 4, 4] }
              : { text: "", border: [false, false, false, false] },
          ]],
        },
        layout: {
          fillColor: () => LIGHT,
          hLineWidth: () => 0, vLineWidth: () => 0,
          paddingLeft: () => 14, paddingRight: () => 14, paddingTop: () => 14, paddingBottom: () => 14,
        },
      },
    ],
    footer: () => ({
      margin: [40, 10, 40, 0] as [number, number, number, number],
      stack: [
        { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: LINE }] },
        { text: `${BUSINESS.name} · ${BUSINESS.address} · IČO ${BUSINESS.ico} · ${BUSINESS.vatNote}`, color: SLATE, fontSize: 8, alignment: "center", margin: [0, 6, 0, 0] },
        { text: "pohybdoma.cz", color: BLUE, fontSize: 8, alignment: "center", margin: [0, 1, 0, 0] },
      ],
    }),
  };

  const printer = new PdfPrinter(FONTS);
  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  const chunks: Buffer[] = [];
  const pdfBuffer: Buffer = await new Promise((resolve, reject) => {
    pdfDoc.on("data", (c: Buffer) => chunks.push(c));
    pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
    pdfDoc.on("error", reject);
    pdfDoc.end();
  });

  return new Response(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="faktura-${inv.number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
