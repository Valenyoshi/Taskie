import { classroomLogin, hasEducamosLogin } from "@/lib/credentials";
import { findUserById, getTask } from "@/lib/db";
import { fetchSubmissionRules, lmsBase, submitLmsAssignment } from "@/lib/educamos";
import { isUser, json, requireUser } from "@/lib/http";
import { deliverTask } from "@/lib/progress";
import { toPublic } from "@/lib/view";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const { id } = await context.params;
  const task = getTask(id);
  const body = (await request.json().catch(() => null)) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 5000) : "";
  if (task?.userId === user.id && task.source === "lms" && task.status === "pending") {
    if (!hasEducamosLogin(user)) {
      return json({ error: "Faltan los datos del aula para enviar la entrega." }, 400);
    }
    if (!lmsBase(user.educamosUrl, user.lmsUrl)) return json({ error: "El enlace del aula no es válido." }, 400);
    const login = classroomLogin(user);
    if (!login) return json({ error: "No pude abrir las credenciales cifradas del aula." }, 400);
    const rules = await fetchSubmissionRules({ ...login, taskUrl: task.educamosUrl });
    if (rules.mode !== "closed") {
      if (rules.mode === "text" && !text) return json({ error: "Escribí el texto o pegá el enlace de la entrega." }, 400);
      if (rules.mode !== "text" && (!task.filePath || !task.fileName)) return json({ error: "Primero subí un archivo." }, 400);
      const remote = await submitLmsAssignment({
        ...login,
        taskUrl: task.educamosUrl,
        ...(rules.mode === "text" ? { text } : { filePath: task.filePath!, fileName: task.fileName! }),
      });
      if (!remote.ok) return json({ error: remote.error }, 502);
    }
  }
  const result = deliverTask(user.id, id);
  if (!result.ok) return json({ error: result.error }, 400);
  const fresh = findUserById(user.id);
  return json({ ok: true, lines: result.lines, user: fresh ? toPublic(fresh) : null });
}
