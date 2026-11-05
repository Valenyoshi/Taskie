import { mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import path from "path";
import { classroomLogin } from "@/lib/credentials";
import { attachFile, getTask } from "@/lib/db";
import { fetchSubmissionRules } from "@/lib/educamos";
import { isUser, json, requireUser } from "@/lib/http";

const BLOCKED = new Set(["exe", "msi", "bat", "cmd", "com", "scr", "ps1", "vbs", "jar", "apk", "dll", "sh", "html", "htm"]);
const MAX_BYTES = 20 * 1024 * 1024;

function matchesAcceptedType(ext: string, mime: string, acceptedType: string): boolean {
  const type = acceptedType.trim().toLowerCase();
  if (type === "*" || type === "*/*" || type === `.${ext}`) return true;
  if (type.endsWith("/*")) return mime.toLowerCase().startsWith(`${type.slice(0, -1)}`);
  return type === mime.toLowerCase();
}

function megabytes(bytes: number): string {
  return `${Math.floor(bytes / 1024 / 1024)} MB`;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const { id } = await context.params;
  const task = getTask(id);
  if (!task || task.userId !== user.id) return json({ error: "No encontré esa tarea." }, 404);
  if (task.source !== "lms") return json({ error: "Esta tarea no tiene un punto de entrega para subir archivos." }, 400);

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) return json({ error: "Elegí un archivo." }, 400);
  const ext = file.name.includes(".") ? (file.name.split(".").pop()?.toLowerCase() ?? "") : "";
  if (!ext || BLOCKED.has(ext)) return json({ error: "Ese tipo de archivo no se puede entregar." }, 400);

  let limit = MAX_BYTES;
  const login = classroomLogin(user);
  if (login) {
    const rules = await fetchSubmissionRules({ ...login, taskUrl: task.educamosUrl }).catch(() => null);
    if (rules?.mode === "closed") return json({ error: "El aula ya cerró esta entrega." }, 400);
    if (rules?.mode === "text") return json({ error: "Esta entrega no lleva archivo: se hace con un texto o un enlace." }, 400);
    if (rules?.maxBytes) limit = Math.min(limit, rules.maxBytes);
    if (rules?.acceptedTypes.length && !rules.acceptedTypes.some((type) => matchesAcceptedType(ext, file.type, type))) {
      const label = rules.acceptedTypes.map((type) => type.replace(/^\./, "").toUpperCase()).join(", ");
      return json({ error: `El aula solo acepta: ${label}.` }, 400);
    }
  }
  if (file.size > limit) return json({ error: `El archivo pesa más de ${megabytes(limit)}.` }, 400);

  const base = file.name.slice(0, file.name.length - ext.length - 1).normalize("NFD").replace(/\p{M}/gu, "");
  const safe = `${base.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.{2,}/g, ".").slice(0, 70) || "archivo"}.${ext.replace(/[^a-z0-9]/g, "")}`;
  const dir = path.join(process.cwd(), "data", "uploads", user.id, id);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const stored = path.join(dir, safe);
  writeFileSync(stored, Buffer.from(await file.arrayBuffer()));
  attachFile(id, user.id, safe, stored);
  return json({ ok: true, fileName: safe });
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const { id } = await context.params;
  const task = getTask(id);
  if (!task || task.userId !== user.id || !task.filePath || !task.fileName) {
    return json({ error: "No hay archivo." }, 404);
  }
  const root = path.join(process.cwd(), "data", "uploads", user.id, id) + path.sep;
  const resolved = path.resolve(task.filePath);
  if (!resolved.startsWith(root)) return json({ error: "No hay archivo." }, 404);
  let bytes: Buffer;
  try {
    bytes = readFileSync(resolved);
  } catch {
    return json({ error: "No hay archivo." }, 404);
  }
  return new Response(bytes as unknown as BodyInit, {
    headers: {
      "content-type": "application/octet-stream",
      "content-disposition": `attachment; filename="${task.fileName.replace(/"/g, "")}"`,
    },
  });
}
