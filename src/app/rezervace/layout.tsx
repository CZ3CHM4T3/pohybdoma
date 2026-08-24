import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rezervace osobní lekce",
  description:
    "Rezervuj si osobní lekci pohybu v Dobřichovicích a okolí, sportovní masáž nebo online konzultaci. Vyber si volný termín online.",
};

export default function RezervaceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
