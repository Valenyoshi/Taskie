"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function rememberGain(lines: string[]) {
  sessionStorage.setItem("racha-gain", JSON.stringify(lines));
  window.dispatchEvent(new CustomEvent("racha-gain"));
}

export function GainBanner({ initial }: { initial?: string[] }) {
  const pathname = usePathname();
  const stamp = (initial ?? []).join("\n");
  const [lines, setLines] = useState<string[]>(initial ?? []);

  useEffect(() => {
    function read() {
      const raw = sessionStorage.getItem("racha-gain");
      if (!raw) return false;
      sessionStorage.removeItem("racha-gain");
      try {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed) && parsed.length) {
          setLines(parsed);
          return true;
        }
      } catch {
        sessionStorage.removeItem("racha-gain");
      }
      return false;
    }
    if (!read()) setLines(stamp ? stamp.split("\n") : []);
    window.addEventListener("racha-gain", read);
    return () => window.removeEventListener("racha-gain", read);
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
