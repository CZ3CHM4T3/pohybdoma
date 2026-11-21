"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold text-brand-dark">Něco se nepovedlo</h1>
      <p className="mt-3 text-gray-600">
        Omlouvám se, tuhle stránku se teď nepodařilo načíst. Zkus to prosím znovu za chvíli.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button onClick={reset} className="btn-primary">
          Zkusit znovu
        </button>
        <Link href="/" className="btn-outline">
          Zpět na úvod
        </Link>
      </div>
    </div>
  );
}
