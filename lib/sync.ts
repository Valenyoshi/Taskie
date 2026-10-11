import { educamosLogin, hasEducamosLogin } from "./credentials";
import { dropOldUntracked, findUserById, insertTask, listTasks, setSyncResult } from "./db";
import { fetchEducamosTasks, fetchLmsAssignmentStatuses, fetchLmsUploads, lmsBase } from "./educamos";
import { localDateString, zonedTimeToUtc } from "./time";

export async function syncUser(userId: string): Promise<{ ok: boolean; error?: string; count?: number }> {
  const user = findUserById(userId);
  if (!user) return { ok: false, error: "No encontré tu cuenta." };
  if (!hasEducamosLogin(user)) {
    const error = user.isDemo
      ? "Esta cuenta de prueba usa tareas de ejemplo, no las de un colegio."
      : "Falta la URL, el usuario o la contraseña de Educamos.";
    setSyncResult(userId, error);
    return { ok: false, error };
  }

  const login = educamosLogin(user);
  if (!login) {
    const error = "No pude abrir las credenciales cifradas de Educamos. Volvé a crear la cuenta.";
    setSyncResult(userId, error);
    return { ok: false, error };
  }
  const { username, password } = login;

  const result = await fetchEducamosTasks({
    url: user.educamosUrl,
    username,
    password,
    timeZone: user.timezone,
  });
  const classroom = lmsBase(user.educamosUrl, user.lmsUrl);
  const uploads = classroom
    ? await fetchLmsUploads({
        lmsUrl: classroom,
        username,
        password,
        timeZone: user.timezone,
      })
    : { ok: true as const, tasks: [] };
  const existingLms = classroom
    ? listTasks(userId)
        .filter((task) => task.source === "lms" && task.externalId && task.educamosUrl)
        .map((task) => ({ externalId: task.externalId as string, url: task.educamosUrl, task }))
    : [];
  const checkedLms = classroom
    ? await fetchLmsAssignmentStatuses({
        lmsUrl: classroom,
        username,
        password,
        tasks: existingLms.map(({ externalId, url }) => ({ externalId, url })),
      })
    : [];
  const checkedById = new Map(checkedLms.map((item) => [item.externalId, item.status]));

  if (!result.ok && !uploads.ok) {
    setSyncResult(userId, result.error);
    return { ok: false, error: result.error };
  }

  const now = new Date().toISOString();
  const tasks = [
    ...(result.ok ? result.tasks.map((task) => ({ ...task, source: "educamos" })) : []),
    ...(uploads.ok ? uploads.tasks.map((task) => ({ ...task, source: "lms" })) : []),
    ...existingLms
      .filter(({ externalId }) => checkedById.has(externalId))
      .map(({ task, externalId }) => ({
        externalId,
        subject: task.subject,
        title: task.title,
        description: task.description,
        dueAt: task.dueAt,
        status: checkedById.get(externalId) ?? task.status,
        needsFile: task.needsFile,
        url: task.educamosUrl,
        source: "lms",
      })),
  ];
  for (const task of tasks) {
    insertTask({
      id: crypto.randomUUID(),
      userId,
      externalId: task.externalId,
      subject: task.subject,
      title: task.title,
      description: task.description,
      dueAt: task.dueAt,
      status: task.status,
      source: task.source,
      educamosUrl: task.url,
      needsFile: task.source === "lms" ? true : task.needsFile,
      createdAt: now,
    });
  }
  const today = localDateString(new Date(), user.timezone);
  dropOldUntracked(userId, zonedTimeToUtc(today, "00:00:00", user.timezone).toISOString());
  const error = !result.ok ? result.error : !uploads.ok ? uploads.error : null;
  setSyncResult(userId, error);
  return error ? { ok: false, error, count: tasks.length } : { ok: true, count: tasks.length };
}
