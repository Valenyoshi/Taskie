import { dropOldUntracked, findUserById, insertTask, setSyncResult } from "./db";
import { decryptSecret } from "./secret";
import { fetchEducamosTasks, fetchLmsUploads, lmsBase } from "./educamos";
import { localDateString, zonedTimeToUtc } from "./time";

export async function syncUser(userId: string): Promise<{ ok: boolean; error?: string; count?: number }> {
  const user = findUserById(userId);
  if (!user) return { ok: false, error: "No encontré tu cuenta." };
  if (user.isDemo || !user.educamosUrl || !user.educamosUsername || !user.educamosPasswordEnc) {
    const error = user.isDemo
      ? "Esta cuenta de prueba usa tareas de ejemplo, no las de un colegio."
      : "Falta la URL, el usuario o la contraseña de Educamos.";
    setSyncResult(userId, error);
    return { ok: false, error };
  }

  let password = "";
  try {
    password = decryptSecret(user.educamosPasswordEnc);
  } catch {
    const error = "No pude leer la contraseña guardada de Educamos. Volvé a crear la cuenta.";
    setSyncResult(userId, error);
    return { ok: false, error };
  }

  const result = await fetchEducamosTasks({
    url: user.educamosUrl,
    username: user.educamosUsername,
    password,
    timeZone: user.timezone,
  });
  const classroom = lmsBase(user.educamosUrl, user.lmsUrl);
  const uploads = classroom
    ? await fetchLmsUploads({
        lmsUrl: classroom,
        username: user.educamosUsername,
        password,
        timeZone: user.timezone,
      })
    : { ok: true as const, tasks: [] };

  if (!result.ok && !uploads.ok) {
    setSyncResult(userId, result.error);
    return { ok: false, error: result.error };
  }

  const now = new Date().toISOString();
  const tasks = [
    ...(result.ok ? result.tasks.map((task) => ({ ...task, source: "educamos" })) : []),
    ...(uploads.ok ? uploads.tasks.map((task) => ({ ...task, source: "lms" })) : []),
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
