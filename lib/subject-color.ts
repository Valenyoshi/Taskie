const palette = ["#e25b45", "#e8a317", "#1c7c6e", "#c44736", "#c48a12", "#145e54"];

export function shortSubject(subject: string): string {
  const piece = subject.includes(":") ? subject.split(":").pop()!.trim() : subject;
  return piece.length > 18 ? `${piece.slice(0, 16)}…` : piece;
}

export function subjectColor(subject: string): string {
  let hash = 0;
  for (const char of subject) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}
