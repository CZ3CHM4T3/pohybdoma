"use client";

import { useEffect } from "react";

// Záchrana pro případ, že selže i kořenový layout. Má vlastní <html>/<body>
// a jen inline styly (globální CSS nemusí být dostupné).
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="cs">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#fff",
          color: "#0f172a",
          padding: "24px",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "32rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0 0 12px" }}>
            Něco se nepovedlo
          </h1>
          <p style={{ color: "#64748b", margin: "0 0 24px" }}>
            Omlouvám se, stránku se teď nepodařilo načíst. Zkus to prosím znovu.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#1976ff",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              padding: "12px 24px",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Zkusit znovu
          </button>
        </div>
      </body>
    </html>
  );
}
