const palette = ["#e25b45", "#1c7c6e", "#2f6fdb", "#e8a317", "#7c3aed", "#db3e8a", "#0e7490", "#c2410c", "#0369a1", "#65a30d"];

const named: { test: RegExp; color: string }[] = [
  { test: /lengua|literatura/, color: "#7c3aed" },
  { test: /matem/, color: "#e8a317" },
  { test: /biolog/, color: "#65a30d" },
  { test: /natural/, color: "#1c7c6e" },
  { test: /histor/, color: "#c2410c" },
  { test: /geograf/, color: "#0369a1" },
  { test: /ingl/, color: "#db3e8a" },
  { test: /ciudadan/, color: "#0e7490" },
  { test: /program|taller/, color: "#2f6fdb" },
];

function fold(subject: string): string {
  return subject.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function shortSubject(subject: string): string {
  const piece = subject.includes(":") ? subject.split(":").pop()!.trim() : subject;
  return piece.length > 18 ? `${piece.slice(0, 16)}…` : piece;
}

export function subjectKey(subject: string): string {
  return fold(subject)
    .replace(/[º°]/g, " ")
    .replace(/\b\d+\b/g, " ")
    .replace(/\b(es|ano|turno|manana|tarde|division|div|curso)\b/g, " ")
    .replace(/\b[a-z]\b/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function dedupeSubjects(names: string[]): string[] {
  const best = new Map<string, string>();
  for (const name of names) {
    const key = subjectKey(name);
    if (!key) continue;
    const display = name.replace(/\s+\d+\s*[º°].*$/i, "").trim() || name;
    const prev = best.get(key);
    if (!prev || display.length < prev.length) best.set(key, display);
  }
  return [...best.values()].sort((a, b) => a.localeCompare(b, "es"));
}

export function subjectColor(subject: string): string {
  const name = fold(subject);
  const known = named.find((entry) => entry.test.test(name));
  if (known) return known.color;
  let hash = 0;
  for (const char of name) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}
