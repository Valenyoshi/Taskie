import { findUserById, getTask, openEducamosLogin, openTeamsRefresh, saveTeamsConnection, type User } from "@/lib/db";
import { isUser, json, requireUser } from "@/lib/http";
import { deliverTask } from "@/lib/progress";
import { loginTeams, teamsReadingIds, teamsReadingReady, teamsReadingText } from "@/lib/teams";
import { toPublic } from "@/lib/view";

async function readingRefresh(user: User): Promise<{ ok: true; refresh: string } | { ok: false; error: string; status: number }> {
  const refresh = openTeamsRefresh(user);
  if (refresh) return { ok: true, refresh };
  const login = openEducamosLogin(user);
  if (!login) return { ok: false, error: "Falta la contraseña de Teams.", status: 400 };
  const signed = await loginTeams(login.username, login.password);
  if (!signed.ok || !signed.refreshToken) {
    return { ok: false, error: signed.ok ? "No pude entrar a Teams." : signed.error, status: 502 };
  }
  saveTeamsConnection(user.id, { refreshToken: signed.refreshToken, account: login.username });
  return { ok: true, refresh: signed.refreshToken };
}

function rememberRefresh(user: User, previous: string, next: string) {
  if (next !== previous && user.teamsAccount) saveTeamsConnection(user.id, { refreshToken: next, account: user.teamsAccount });
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const { id } = await context.params;
  const task = getTask(id);
  if (!task || task.userId !== user.id) return json({ error: "No encontré esa tarea." }, 404);
  if (task.source !== "teams" || !task.reading) return json({ error: "Esa tarea no es una lectura de Teams." }, 400);
  const ids = teamsReadingIds(task);
  if (!ids) return json({ error: "No pude abrir esa lectura." }, 400);
  const refresh = await readingRefresh(user);
  if (!refresh.ok) return json({ error: refresh.error }, refresh.status);
  const page = await teamsReadingText(refresh.refresh, ids.classId, ids.assignmentId);
  if (!page.ok) return json({ error: page.error }, 502);
  rememberRefresh(user, refresh.refresh, page.refreshToken);
  return json({ ok: true, text: page.text });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const { id } = await context.params;
  const task = getTask(id);
  const body = (await request.json().catch(() => null)) as { finished?: boolean } | null;
  if (!task || task.userId !== user.id) return json({ error: "No encontré esa tarea." }, 404);
  if (task.source !== "teams" || !task.reading) return json({ error: "Esa tarea no es una lectura de Teams." }, 400);
  if (task.status === "done") return json({ ready: true });
  if (body?.finished === true) {
    const result = deliverTask(user.id, id);
    if (!result.ok) return json({ ready: true });
    const fresh = findUserById(user.id);
    return json({ ready: true, lines: result.lines, user: fresh ? toPublic(fresh) : null });
  }

  const ids = teamsReadingIds(task);
  if (!ids) return json({ error: "No pude abrir esa lectura." }, 400);
  const refresh = await readingRefresh(user);
  if (!refresh.ok) return json({ error: refresh.error }, refresh.status);
  const check = await teamsReadingReady(refresh.refresh, ids.classId, ids.assignmentId);
  if (!check.ok) return json({ error: check.error }, 502);
  rememberRefresh(user, refresh.refresh, check.refreshToken);
  if (!check.ready) return json({ ready: false });

  const result = deliverTask(user.id, id);
  if (!result.ok) return json({ ready: true });
  const fresh = findUserById(user.id);
  return json({ ready: true, lines: result.lines, user: fresh ? toPublic(fresh) : null });
}
