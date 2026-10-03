"use client";

import { useEffect, useState } from "react";

export function PrizeReveal({
  machine,
  children,
}: {
  machine: React.ReactNode;
  children: React.ReactNode;
}) {
  const [clear, setClear] = useState(0);

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      setClear(Math.max(0, Math.min(1, (y - 24) / 220)));
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const blur = (1 - clear) * 10;

  return (
    <div className="flex flex-col gap-4">
      {machine}
      <div
        className="prize-below flex flex-col gap-4"
        style={{
          filter: `blur(${blur}px)`,
          opacity: 0.4 + clear * 0.6,
        }}
      >
        {children}
      </div>
    </div>
  );
}
