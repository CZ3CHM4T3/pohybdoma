import type { Metadata } from "next";

export const metadata: Metadata = { title: "GDPR & Ochrana dat" };

export default function GdprPage() {
  return (
    <div className="min-h-screen bg-white py-12 lg:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold text-brand-dark mb-8">GDPR & Ochrana osobních dat</h1>
        <div className="p-8 rounded-2xl border-2 border-dashed border-gray-200 text-center text-gray-400">
          <p className="font-semibold text-lg mb-2">Obsah bude doplněn</p>
          <p className="text-sm">GDPR dokument bude zpracován před spuštěním webu.</p>
        </div>
      </div>
    </div>
  );
}
