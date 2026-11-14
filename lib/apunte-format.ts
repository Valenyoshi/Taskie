export type MindBranch = { label: string; children: string[] };

export type MindMap = { title: string; center: string; branches: MindBranch[] };

export function parseMind(body: string, fallback: string): MindMap {
  const branches: MindBranch[] = [];
  let title = "";
  let center = "";
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const asTitle = trimmed.match(/^t[ií]tulo:\s*(.+)$/i)?.[1]?.trim();
    if (asTitle) {
      title = asTitle;
      continue;
    }
    const asCenter = trimmed.match(/^centro:\s*(.+)$/i)?.[1]?.trim();
    if (asCenter) {
      center = asCenter;
      continue;
    }
    if (/^[•*-]\s+/.test(trimmed)) {
      branches.push({ label: trimmed.replace(/^[•*-]\s+/, ""), children: [] });
      continue;
    }
    if (/^[-–]\s+/.test(trimmed) && branches.length > 0) {
      branches[branches.length - 1].children.push(trimmed.replace(/^[-–]\s+/, ""));
    }
  }
  return { title: title || fallback, center: center || title || fallback, branches };
}
