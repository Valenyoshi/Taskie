import { findUserById, insertTask, removeMissingEducamos, setSyncResult } from "./db";
import { decryptSecret } from "./secret";
import { fetchEducamosTasks } from "./educamos";

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

  if (!result.ok) {
    setSyncResult(userId, result.error);
    return { ok: false, error: result.error };
  }

  const now = new Date().toISOString();
  for (const task of result.tasks) {
    insertTask({
      id: crypto.randomUUID(),
      userId,
      externalId: task.externalId,
      subject: task.subject,
      title: task.title,
      description: task.description,
      dueAt: task.dueAt,
      source: "educamos",
      educamosUrl: task.url,
      needsFile: task.needsFile,
      createdAt: now,
    });
  }
  if (result.tasks.length > 0) {
    removeMissingEducamos(userId, result.tasks.map((task) => task.externalId));
  }
  setSyncResult(userId, null);
  return { ok: true, count: result.tasks.length };
}
