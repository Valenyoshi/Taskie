export function Medal({
  unlocked,
  label,
  mark,
  secret = false,
}: {
  unlocked: boolean;
  label: string;
  mark?: string;
  secret?: boolean;
}) {
  const hidden = !unlocked && secret;
  return (
    <div className="medal" title={hidden ? "???" : label}>
      <div className={`medal-face ${unlocked ? "won" : "locked"}`}>
        {unlocked ? (
          <span className="medal-mark">{mark ?? label.slice(0, 1)}</span>
        ) : (
          <svg className="size-5 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="5" y="11" width="14" height="10" rx="2.5" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        )}
      </div>
      <div className={`medal-ribbon ${unlocked ? "" : "locked"}`} />
      <p className="line-clamp-2 text-center text-[11px] font-semibold leading-tight">{hidden ? "???" : label}</p>
    </div>
  );
}
