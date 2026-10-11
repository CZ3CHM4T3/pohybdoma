"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg bg-[#062A6B] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
    >
      🖨 Vytisknout / uložit PDF
    </button>
  );
}
