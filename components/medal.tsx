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
      <div className={`medal-face ${unlocked ? "won" : "locked"}`}>{unlocked ? mark ?? label.slice(0, 1) : "?"}</div>
      <div className={`medal-ribbon ${unlocked ? "" : "locked"}`} />
      <p className="line-clamp-2 text-center text-[11px] font-semibold leading-tight">{hidden ? "???" : label}</p>
    </div>
  );
}
