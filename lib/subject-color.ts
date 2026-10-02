const palette = ["#e25b45", "#1c7c6e", "#2f6fdb", "#e8a317", "#8b5cf6", "#db3e8a", "#0f766e", "#c2410c", "#0369a1", "#65a30d"];

export function shortSubject(subject: string): string {
  const piece = subject.includes(":") ? subject.split(":").pop()!.trim() : subject;
  return piece.length > 18 ? `${piece.slice(0, 16)}…` : piece;
}

export function subjectColor(subject: string): string {
  let hash = 0;
  for (const char of subject) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}
