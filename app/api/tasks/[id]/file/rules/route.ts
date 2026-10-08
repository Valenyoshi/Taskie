import { getTask } from "@/lib/db";
import { fetchTaskAcceptedTypes, lmsBase } from "@/lib/educamos";
import { isUser, json, requireUser } from "@/lib/http";
import { decryptSecret } from "@/lib/secret";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const { id } = await context.params;
  const task = getTask(id);
  if (!task || task.userId !== user.id) return json({ error: "No encontré esa tarea." }, 404);
  if (task.source !== "lms" || !user.educamosUrl || !user.educamosUsername || !user.educamosPasswordEnc) {
    return json({ ok: true, acceptedTypes: [] });
  }
  const classroom = lmsBase(user.educamosUrl, user.lmsUrl);
  if (!classroom) return json({ ok: true, acceptedTypes: [] });
  try {
    const acceptedTypes = await fetchTaskAcceptedTypes({
      lmsUrl: classroom,
      username: user.educamosUsername,
      password: decryptSecret(user.educamosPasswordEnc),
      taskUrl: task.educamosUrl,
    });
    return json({ ok: true, acceptedTypes });
  } catch {
    return json({ ok: true, acceptedTypes: [] });
  }
}
