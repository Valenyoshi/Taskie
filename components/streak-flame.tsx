export function StreakFlame({ days }: { days: number }) {
  const label = days === 1 ? "1 día de racha" : `${days} días de racha`;
  return (
    <div className={`streak-corner ${days === 0 ? "cold" : ""}`} title={label}>
      <svg className="streak-fire" viewBox="0 0 32 32" aria-hidden>
        {/* Llama exterior con puntas orgánicas e imperfecciones vivas */}
        <path
          d="M16 2.2c1.8 3.5 4.8 5.4 6.8 9.8 1.8 3.8 1.4 8.2-1 11.5-2.6 3.5-7 4.8-11.2 3.6-4.2-1.2-7.2-4.8-7.5-9.2-.3-4 1.8-7.5 4.5-10.2.8 2.2 2.2 4 4.4 5.2.3-3.6 1.8-7.8 4-10.7Z"
          fill="#e25b45"
        />
        {/* Chispa viva secundaria */}
        <path
          d="M15.5 10.8c1.2 2.4 3.5 3.8 4.6 6.8 1.1 2.8.5 5.8-1.5 7.8-2 2-5 2.5-7.5 1.2-2-1-3.2-3.2-3-5.5.2-2.5 1.8-4.5 3.6-6 .5 1.5 1.5 2.6 3 3.2.2-2.4 1-5.2 2.4-7.5Z"
          fill="#f4a226"
        />
        {/* Corazón ardiente cálido con trazo de fósforo */}
        <path
          d="M15.8 19c.6 1.4 1.8 2 2 3.8.2 1.8-.8 3.4-2.4 3.8-1.6.4-3.2-.4-3.8-2-.5-1.4.1-2.8 1.2-3.8.3.8.8 1.4 1.6 1.6.1-1.2.6-2.4 1.4-3.4Z"
          fill="#fff6d2"
        />
      </svg>
      <span className="streak-count">{days}</span>
      <span className="sr-only">{label}</span>
    </div>
  );
}
