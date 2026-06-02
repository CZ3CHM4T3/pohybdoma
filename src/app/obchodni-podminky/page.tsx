import type { Metadata } from "next";

export const metadata: Metadata = { title: "Obchodní podmínky" };

export default function ObchodniPodminkyPage() {
  return (
    <div className="min-h-screen bg-white py-12 lg:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 prose prose-sm max-w-none">
        <h1 className="text-3xl font-semibold text-brand-dark mb-8">Obchodní podmínky</h1>
        <div className="p-8 rounded-2xl border-2 border-dashed border-gray-200 text-center text-gray-400">
          <p className="font-semibold text-lg mb-2">Obsah bude doplněn</p>
          <p className="text-sm">Obchodní podmínky budou zpracovány právníkem a doplněny před spuštěním webu.</p>
        </div>
      </div>
    </div>
  );
}
