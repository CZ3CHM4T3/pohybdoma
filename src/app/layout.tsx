import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CookieBanner } from "@/components/CookieBanner";
import { ChatAssistant } from "@/components/ChatAssistant";
import { BuddiesWidget } from "@/components/BuddiesWidget";
import { MembershipExpiryBanner } from "@/components/MembershipExpiryBanner";
import { OnboardingTour } from "@/components/OnboardingTour";
import { PageViewTracker } from "@/components/PageViewTracker";
import { DemoTierSwitcher } from "@/components/DemoTierSwitcher";

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
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "POHYB DOMA",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#062A6B",
};

// Strukturovaná data pro Google (bohatší výsledky). Aktivní hlavně po spuštění naveřejno.
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "POHYB DOMA",
  description: "Osobní lektor pohybu. Cvič doma, naprav si tělo a vrať si svobodu pohybu s minimem vybavení.",
  url: "https://pohybdoma.cz",
  logo: "https://pohybdoma.cz/LOGO.png",
  image: "https://pohybdoma.cz/og.png",
  email: "pohybdoma@seznam.cz",
  areaServed: "Hradištko, Dobřichovice a okolí (a online po celé ČR)",
  sameAs: ["https://www.instagram.com/pohybdoma/"],
  founder: {
    "@type": "Person",
    name: "Mgr. Jan Schröffel",
    jobTitle: "Lektor pohybu",
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
        <MembershipExpiryBanner />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <CookieBanner />
        <ChatAssistant />
        <BuddiesWidget />
        <OnboardingTour />
        <PageViewTracker />
        <DemoTierSwitcher />
      </body>
    </html>
  );
}
