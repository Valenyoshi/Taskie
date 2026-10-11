import { classroomLogin, hasEducamosLogin } from "@/lib/credentials";
import { findUserById, getTask } from "@/lib/db";
import { lmsBase, submitLmsAssignment } from "@/lib/educamos";
import { isUser, json, requireUser } from "@/lib/http";
import { deliverTask } from "@/lib/progress";
import { toPublic } from "@/lib/view";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const { id } = await context.params;
  const task = getTask(id);
  if (task?.userId === user.id && task.source === "lms") {
    if (!task.filePath || !task.fileName) return json({ error: "Primero subí un archivo." }, 400);
    if (!hasEducamosLogin(user)) {
      return json({ error: "Faltan los datos del aula para enviar el archivo." }, 400);
    }
    if (!lmsBase(user.educamosUrl, user.lmsUrl)) return json({ error: "El enlace del aula no es válido." }, 400);
    const login = classroomLogin(user);
    if (!login) return json({ error: "No pude abrir las credenciales cifradas del aula." }, 400);
    const remote = await submitLmsAssignment({
      ...login,
      taskUrl: task.educamosUrl,
      filePath: task.filePath,
      fileName: task.fileName,
    });
    if (!remote.ok) return json({ error: remote.error }, 502);
  }
  const result = deliverTask(user.id, id);
  if (!result.ok) return json({ error: result.error }, 400);
  const fresh = findUserById(user.id);
  return json({ ok: true, lines: result.lines, user: fresh ? toPublic(fresh) : null });
}
