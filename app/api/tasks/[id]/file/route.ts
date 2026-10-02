import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { attachFile, getTask } from "@/lib/db";
import { isUser, json, requireUser } from "@/lib/http";

const ALLOWED = new Set(["pdf", "doc", "docx", "png", "jpg", "jpeg", "txt", "ppt", "pptx", "odt", "zip"]);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const { id } = await context.params;
  const task = getTask(id);
  if (!task || task.userId !== user.id) return json({ error: "No encontré esa tarea." }, 404);

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return json({ error: "Elegí un archivo." }, 400);
  if (file.size > 8 * 1024 * 1024) return json({ error: "El archivo pesa más de 8 MB." }, 400);
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED.has(ext)) return json({ error: "Ese tipo de archivo no entra. Usá PDF, imagen, Word o texto." }, 400);

  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.{2,}/g, ".").slice(0, 80);
  if (!safe || safe === "." || safe === "..") return json({ error: "Ese nombre de archivo no sirve." }, 400);
  const dir = path.join(process.cwd(), "data", "uploads", user.id, id);
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
