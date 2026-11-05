import { classroomLogin } from "@/lib/credentials";
import { getTask } from "@/lib/db";
import { fetchSubmissionRules, type SubmissionRules } from "@/lib/educamos";
import { isUser, json, requireUser } from "@/lib/http";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const { id } = await context.params;
  const task = getTask(id);
  if (!task || task.userId !== user.id) return json({ error: "No encontré esa tarea." }, 404);
  const unknown: SubmissionRules = { mode: "unknown", acceptedTypes: [], maxBytes: null };
  const login = task.source === "lms" ? classroomLogin(user) : null;
  if (!login) return json({ ok: true, ...unknown });
  const rules = await fetchSubmissionRules({ ...login, taskUrl: task.educamosUrl }).catch(() => unknown);
  return json({ ok: true, ...rules });
}
