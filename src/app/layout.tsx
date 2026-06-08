import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CookieBanner } from "@/components/CookieBanner";

const montserrat = Montserrat({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "POHYB DOMA | Tvoje možnosti. Tvoje cesta.",
    template: "%s | POHYB DOMA",
  },
  description:
    "Osobní lektor pohybu. Cvič doma, naprav si tělo a vrať si svobodu pohybu s minimem vybavení.",
  metadataBase: new URL("https://pohybdoma.cz"),
  openGraph: {
    siteName: "POHYB DOMA",
    locale: "cs_CZ",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs" className={montserrat.variable}>
      <body className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <CookieBanner />
      </body>
    </html>
  );
}
