import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Knihovna pohybu – cvičení na doma",
  description:
    "Video-knihovna cvičení na doma: bolesti zad, mobilita, síla, náprava. Filtruj podle části těla, obtížnosti a vybavení – cvič vlastním tempem.",
};

export default function VideoknihovnaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
