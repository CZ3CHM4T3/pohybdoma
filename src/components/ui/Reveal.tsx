"use client";

import { useEffect, useRef, useState } from "react";

type RevealVariant = "up" | "left" | "right" | "scale";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Animation direction. Default "up". */
  variant?: RevealVariant;
  /** Delay before the reveal animation starts, in ms. */
  delay?: number;
  /** Render only once (default) or re-trigger on every scroll in/out. */
  once?: boolean;
}

/**
 * Lehká scroll-reveal obálka postavená na IntersectionObserver.
 * Obsah se vynoří, jakmile se dostane do viewportu.
 * Respektuje prefers-reduced-motion (řešeno v globals.css).
 */
export function Reveal({
  children,
  className = "",
  variant = "up",
  delay = 0,
  once = true,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Pojistka: pokud prohlížeč IntersectionObserver nepodporuje, ukaž rovnou.
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return; }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      // threshold 0 = stačí jediný pixel ve viewportu (důležité pro vysoké
      // sekce na mobilu, které se nikdy nevejdou z 15 %), spouštíme mírně dřív
      { threshold: 0, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);

    // Záchranná síť: kdyby observer z jakéhokoliv důvodu nezareagoval,
    // po 1,2 s obsah stejně zobrazíme – nikdy nesmí zůstat neviditelný.
    const fallback = window.setTimeout(() => setVisible(true), 1200);

    return () => { observer.disconnect(); window.clearTimeout(fallback); };
  }, [once]);

  return (
    <div
      ref={ref}
      data-reveal={variant}
      data-visible={visible}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={className}
    >
      {children}
    </div>
  );
}
