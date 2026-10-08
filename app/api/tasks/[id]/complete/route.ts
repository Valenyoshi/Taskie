import { findUserById, getTask } from "@/lib/db";
import { lmsBase, submitLmsAssignment } from "@/lib/educamos";
import { isUser, json, requireUser } from "@/lib/http";
import { deliverTask } from "@/lib/progress";
import { decryptSecret } from "@/lib/secret";
import { toPublic } from "@/lib/view";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const { id } = await context.params;
  const task = getTask(id);
  if (task?.userId === user.id && task.source === "lms") {
    if (!task.filePath || !task.fileName) return json({ error: "Primero subí un archivo." }, 400);
    if (!user.educamosUrl || !user.educamosUsername || !user.educamosPasswordEnc) {
      return json({ error: "Faltan los datos del aula para enviar el archivo." }, 400);
    }
    const classroom = lmsBase(user.educamosUrl, user.lmsUrl);
    if (!classroom) return json({ error: "El enlace del aula no es válido." }, 400);
    let password = "";
    try {
      password = decryptSecret(user.educamosPasswordEnc);
    } catch {
      return json({ error: "No pude leer la contraseña del aula." }, 400);
    }
    const remote = await submitLmsAssignment({
      lmsUrl: classroom,
      username: user.educamosUsername,
      password,
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
