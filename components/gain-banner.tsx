"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function rememberGain(lines: string[]) {
  sessionStorage.setItem("racha-gain", JSON.stringify(lines));
}

export function GainBanner({ initial }: { initial?: string[] }) {
  const pathname = usePathname();
  const stamp = (initial ?? []).join("\n");
  const [lines, setLines] = useState<string[]>(initial ?? []);

  useEffect(() => {
    const raw = sessionStorage.getItem("racha-gain");
    if (raw) {
      sessionStorage.removeItem("racha-gain");
      try {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed) && parsed.length) {
          setLines(parsed);
          return;
        }
      } catch {
        sessionStorage.removeItem("racha-gain");
      }
    }
    setLines(stamp ? stamp.split("\n") : []);
  }, [pathname, stamp]);

  if (lines.length === 0) return null;
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm">
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}
