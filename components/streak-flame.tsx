export function StreakFlame({ days }: { days: number }) {
  const label = days === 1 ? "1 día de racha" : `${days} días de racha`;
  return (
    <div className={`streak-corner ${days === 0 ? "cold" : ""}`} title={label}>
      <svg className="streak-fire" viewBox="0 0 32 32" aria-hidden>
        <path d="M16 2c1.2 5 6.2 7.2 6.2 13.2a8.2 8.2 0 1 1-16.4 0c0-4.2 3-6.2 4.2-9.4 1.8 3.2 4 3.4 6-3.8z" fill="#e25b45" />
        <path d="M16 12c1 3.2 4.2 4.4 4.2 8.2a4.2 4.2 0 1 1-8.4 0c0-2.4 1.8-3.4 2.2-5.6 1 1.6 1.6 1.6 2-2.6z" fill="#e8a317" />
        <path d="M16 20.5c.5 1.2 1.5 1.7 1.5 3a1.5 1.5 0 1 1-3 0c0-.8.7-1.2.7-2.2.4.5.6.5.8-.8z" fill="#fff6d0" />
      </svg>
      <span className="streak-count">{days}</span>
      <span className="sr-only">{label}</span>
    </div>
  );
}
