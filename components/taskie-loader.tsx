export function TaskieLoader() {
  return (
    <div className="taskie-loader" role="status" aria-label="Cargando Taskie">
      <div className="taskie-loader-logo" aria-hidden>
        <svg viewBox="0 0 96 96" width="72" height="72">
          <path d="M17 28h62v12H56v35H40V40H17z" fill="currentColor" />
          <path d="M24 18h48a8 8 0 0 1 8 8v3H16v-3a8 8 0 0 1 8-8Z" fill="#e8a317" />
          <circle cx="48" cy="24" r="4" fill="#fff6d8" />
        </svg>
      </div>
      <span className="gradient-text font-display text-4xl">Taskie</span>
      <span className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Cargando</span>
    </div>
  );
}
