import { NextRequest } from "next/server";
import QRCode from "qrcode";

// QR Platba (SPAYD) → PNG. Použití: /api/qr?spd=<SPAYD řetězec>
// Příklad: SPD*1.0*ACC:CZ...*AM:1000.00*CC:CZK*X-VS:20260163*MSG:...
export async function GET(req: NextRequest) {
  const spd = req.nextUrl.searchParams.get("spd");
  if (!spd || !spd.startsWith("SPD*")) {
    return new Response("Neplatný QR", { status: 400 });
  }
  try {
    const png = await QRCode.toBuffer(spd, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 420,
      color: { dark: "#062A6B", light: "#ffffff" },
    });
    return new Response(new Uint8Array(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Chyba QR", { status: 500 });
  }
}
