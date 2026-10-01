export function localDateString(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function localHour(date: Date, timeZone: string): number {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(date);
  return Number(hour);
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function weekdayIndex(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return (day + 6) % 7;
}

export function weekStart(dateStr: string): string {
  return addDays(dateStr, -weekdayIndex(dateStr));
}

export function zonedTimeToUtc(dateStr: string, time: string, timeZone: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm, ss] = time.split(":").map(Number);
  const desired = Date.UTC(y, m - 1, d, hh, mm, ss);
  let utc = desired;
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  for (let i = 0; i < 4; i++) {
    const parts = Object.fromEntries(
      fmt.formatToParts(new Date(utc)).map((p) => [p.type, p.value]),
    );
    const asUTC = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    const diff = desired - asUTC;
    if (diff === 0) break;
    utc += diff;
  }
  return new Date(utc);
}

export function endOfLocalDay(dateStr: string, timeZone: string): string {
  return zonedTimeToUtc(dateStr, "23:59:59", timeZone).toISOString();
}

export function formatWhen(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function dueLabel(iso: string, timeZone: string, now = new Date()): string {
  const dueDay = localDateString(new Date(iso), timeZone);
  const today = localDateString(now, timeZone);
  const when = formatWhen(iso, timeZone);
  if (dueDay === today) return `Vence hoy, ${when}`;
  if (dueDay === addDays(today, 1)) return `Vence mañana, ${when}`;
  if (new Date(iso).getTime() < now.getTime()) return `Venció el ${when}`;
  return `Vence el ${when}`;
}
