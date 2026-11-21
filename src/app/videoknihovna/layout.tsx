import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Knihovna pohybu – cvičení na doma",
  description:
    "Video-knihovna cvičení na doma: pohyb při sedavém zaměstnání, mobilita, síla, návrat k pohybu. Filtruj podle části těla, obtížnosti a vybavení – cvič vlastním tempem.",
};

export default function VideoknihovnaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
