import { visibleTasks } from "./courses";
import { findUserById, hasNotification, listPush, listUsers, logNotification, type Task, type User } from "./db";
import { sendPush } from "./push";
import { syncUser } from "./sync";
import { addDays, localDateString, localHour } from "./time";

const globalForScheduler = globalThis as unknown as { rachaScheduler?: boolean };
const SYNC_EVERY_MS = 3 * 60 * 60 * 1000;

export function startScheduler(): void {
  if (globalForScheduler.rachaScheduler) return;
  globalForScheduler.rachaScheduler = true;
  let running = false;
  const tick = () => {
    if (running) return;
    running = true;
    void runReminders()
      .catch((error) => {
        console.error("No se pudieron revisar los recordatorios", error);
      })
      .finally(() => {
        running = false;
      });
  };
  setTimeout(tick, 8000);
  setInterval(tick, 15 * 60 * 1000);
}

function list(tasks: Task[]): string {
  const lines = tasks.slice(0, 3).map((task) => `${task.subject.replace(/\s+\d+\s*[º°].*$/, "")}: ${task.title}`);
  if (tasks.length > 3) lines.push(`y ${tasks.length - 3} más`);
  return lines.join(" · ");
}

async function notify(user: User, kind: string, ref: string, day: string, payload: { title: string; body: string; tag: string }) {
  if (hasNotification(user.id, kind, ref)) return;
  let delivered = 0;
  for (const sub of listPush(user.id)) {
    try {
      if ((await sendPush(sub, { ...payload, url: "/inicio" })) === "sent") delivered += 1;
    } catch {
      // Un aviso que falla no frena al resto.
    }
  }
  if (delivered > 0) logNotification(user.id, kind, ref, day);
}

/**
 * Avisos: lo que vence hoy (desde las 8), lo que vence mañana (desde las 18) y cada tarea en sus
 * últimas 3 horas. Nunca de noche. Antes de avisar, trae las tareas nuevas del colegio cada 3 horas.
 */
export async function runReminders(now = new Date()): Promise<void> {
  for (const listed of listUsers()) {
    if (!listed.notificationsEnabled || listed.isDemo) continue;
    if (listPush(listed.id).length === 0) continue;
    const hour = localHour(now, listed.timezone);
    if (hour < 8 || hour > 21) continue;

    const lastSync = listed.lastSyncAt ? new Date(listed.lastSyncAt).getTime() : 0;
    if (listed.platform !== "classroom" && now.getTime() - lastSync > SYNC_EVERY_MS) {
      await syncUser(listed.id).catch(() => null);
    }
    const user = findUserById(listed.id) ?? listed;
    const today = localDateString(now, user.timezone);
    const tomorrow = addDays(today, 1);
    const pending = visibleTasks(user).filter((task) => task.status === "pending");
    const dueOn = (day: string) => pending.filter((task) => localDateString(new Date(task.dueAt), user.timezone) === day);

    const dueToday = dueOn(today);
    if (dueToday.length > 0) {
      await notify(user, "digest", today, today, {
        title: dueToday.length === 1 ? "Hoy vence 1 tarea" : `Hoy vencen ${dueToday.length} tareas`,
        body: list(dueToday),
        tag: `today-${today}`,
      });
    }

    const dueTomorrow = dueOn(tomorrow);
    if (hour >= 18 && dueTomorrow.length > 0) {
      await notify(user, "tomorrow", tomorrow, today, {
        title: dueTomorrow.length === 1 ? "Mañana vence 1 tarea" : `Mañana vencen ${dueTomorrow.length} tareas`,
        body: list(dueTomorrow),
        tag: `tomorrow-${tomorrow}`,
      });
    }

    for (const task of pending) {
      const left = new Date(task.dueAt).getTime() - now.getTime();
      if (left <= 0 || left > 3 * 60 * 60 * 1000) continue;
      const hours = Math.max(1, Math.round(left / (60 * 60 * 1000)));
      await notify(user, "soon", `${task.id}:${today}`, today, {
        title: `Vence en ${hours === 1 ? "1 hora" : `${hours} horas`}: ${task.title}`,
        body: `${task.subject.replace(/\s+\d+\s*[º°].*$/, "")}. Todavía figura pendiente.`,
        tag: `soon-${task.id}`,
      });
    }
  }
}
