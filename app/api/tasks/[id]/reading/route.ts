import { findUserById, getTask, openEducamosLogin, openTeamsRefresh, saveTeamsConnection } from "@/lib/db";
import { isUser, json, requireUser } from "@/lib/http";
import { deliverTask } from "@/lib/progress";
import { loginTeams, teamsReadingIds, teamsReadingReady } from "@/lib/teams";
import { toPublic } from "@/lib/view";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const { id } = await context.params;
  const task = getTask(id);
  if (!task || task.userId !== user.id) return json({ error: "No encontré esa tarea." }, 404);
  if (task.source !== "teams" || !task.reading) return json({ error: "Esa tarea no es una lectura de Teams." }, 400);
  if (task.status === "done") return json({ ready: true });

  const ids = teamsReadingIds(task);
  if (!ids) return json({ error: "No pude abrir esa lectura." }, 400);

  let refresh = openTeamsRefresh(user);
  if (!refresh) {
    const login = openEducamosLogin(user);
    if (!login) return json({ error: "Falta la contraseña de Teams." }, 400);
    const signed = await loginTeams(login.username, login.password);
    if (!signed.ok || !signed.refreshToken) return json({ error: signed.ok ? "No pude entrar a Teams." : signed.error }, 502);
    refresh = signed.refreshToken;
    saveTeamsConnection(user.id, { refreshToken: refresh, account: login.username });
  }

  const check = await teamsReadingReady(refresh, ids.classId, ids.assignmentId);
  if (!check.ok) return json({ error: check.error }, 502);
  if (check.refreshToken !== refresh && user.teamsAccount) {
    saveTeamsConnection(user.id, { refreshToken: check.refreshToken, account: user.teamsAccount });
  }
  if (!check.ready) return json({ ready: false });

  const result = deliverTask(user.id, id);
  if (!result.ok) return json({ ready: true });
  const fresh = findUserById(user.id);
  return json({ ready: true, lines: result.lines, user: fresh ? toPublic(fresh) : null });
}
