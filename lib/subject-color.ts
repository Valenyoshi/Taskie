const palette = ["#ef5b4c", "#f0a202", "#1f9d8a", "#3d6cb3", "#9b5de5", "#e36b2c", "#2a9d4a", "#d6457a"];

export function shortSubject(subject: string): string {
  const piece = subject.includes(":") ? subject.split(":").pop()!.trim() : subject;
  return piece.length > 18 ? `${piece.slice(0, 16)}…` : piece;
}

export function subjectColor(subject: string): string {
  let hash = 0;
  for (const char of subject) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}
