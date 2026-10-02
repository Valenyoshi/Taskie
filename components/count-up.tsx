"use client";

import { useEffect, useRef, useState } from "react";

export function CountUp({ value }: { value: number }) {
  const origin = useRef<number | null>(null);
  const [shown, setShown] = useState(value);

  if (origin.current === null) {
    origin.current = value;
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("racha-points");
      const parsed = stored == null ? value : Number(stored);
      origin.current = Number.isFinite(parsed) ? parsed : value;
      sessionStorage.setItem("racha-points", String(value));
    }
  }

  useEffect(() => {
    const from = origin.current ?? value;
    if (from === value) {
      setShown(value);
      return;
    }
    const delta = value - from;
    const steps = Math.min(40, Math.max(8, Math.abs(delta)));
    let step = 0;
    const id = window.setInterval(() => {
      step += 1;
      setShown(step >= steps ? value : Math.round(from + (delta * step) / steps));
      if (step >= steps) {
        origin.current = value;
        window.clearInterval(id);
      }
    }, 36);
    return () => window.clearInterval(id);
  }, [value]);

  const text = String(Math.max(0, shown));
  return (
    <span className="points-digits" aria-label={text}>
      {text.split("").map((digit, index) => (
        <Digit key={text.length - index} digit={digit} />
      ))}
    </span>
  );
}

function Digit({ digit }: { digit: string }) {
  const n = Number(digit);
  if (!Number.isInteger(n)) return <span>{digit}</span>;
  return (
    <span className="digit-window" aria-hidden>
      <span className="digit-reel" style={{ transform: `translateY(-${n}em)` }}>
        {Array.from({ length: 10 }, (_, index) => (
          <span key={index} className="digit-cell">
            {index}
          </span>
        ))}
      </span>
    </span>
  );
}
