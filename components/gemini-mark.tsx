import { useId } from "react";

export function GeminiMark({ size = 28 }: { size?: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className="gemini-mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id={id} x1="10" y1="6" x2="54" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4b8bff" />
          <stop offset="0.5" stopColor="#7a5cff" />
          <stop offset="1" stopColor="#e25b45" />
        </linearGradient>
      </defs>
      <path fill={`url(#${id})`} d="M18 30 24 8l10 16L18 30z" />
      <path fill={`url(#${id})`} d="M46 30 40 8 30 24l16 6z" />
      <path fill={`url(#${id})`} d="M14 34c0-8 8-14 18-14s18 6 18 14c0 12-8 22-18 22S14 46 14 34z" />
      <ellipse cx="32" cy="44" rx="8" ry="6" fill="#f7f1e8" />
      <circle cx="25" cy="34" r="2.2" fill="#1b2a4a" />
      <circle cx="39" cy="34" r="2.2" fill="#1b2a4a" />
      <path d="M29 42c1 2 5 2 6 0" fill="none" stroke="#1b2a4a" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
