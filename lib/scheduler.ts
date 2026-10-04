import { hasNotification, listPush, listTasks, listUsers, logNotification } from "./db";
import { sendPush } from "./push";
import { localDateString, localHour, pendingIsCurrent } from "./time";

const globalForScheduler = globalThis as unknown as { rachaScheduler?: boolean };

export function startScheduler(): void {
  if (globalForScheduler.rachaScheduler) return;
  globalForScheduler.rachaScheduler = true;
  const tick = () => {
    void runReminders().catch((error) => {
      console.error("No se pudieron revisar los recordatorios", error);
    });
  };
  setTimeout(tick, 8000);
  setInterval(tick, 15 * 60 * 1000);
}

export async function runReminders(now = new Date()): Promise<void> {
  for (const user of listUsers()) {
    if (!user.notificationsEnabled) continue;
    const subs = listPush(user.id);
    if (subs.length === 0) continue;
    const today = localDateString(now, user.timezone);
    const hour = localHour(now, user.timezone);
    const tasks = listTasks(user.id).filter(
      (task) => task.status === "pending" && pendingIsCurrent(task.dueAt, user.timezone, now),
    );
    const dueToday = tasks.filter((task) => localDateString(new Date(task.dueAt), user.timezone) === today);

    if (hour >= 8 && hour <= 20 && dueToday.length > 0 && !hasNotification(user.id, "digest", today)) {
      const subjects = [...new Set(dueToday.map((task) => task.subject))];
      const body = subjects.slice(0, 4).join(", ");
      for (const sub of subs) {
        try {
          await sendPush(sub, {
            title: dueToday.length === 1 ? "Hoy tenés 1 tarea" : `Hoy tenés ${dueToday.length} tareas`,
            body,
          });
        } catch {
          // Un aviso que falla no frena al resto.
        }
      }
      logNotification(user.id, "digest", today, today);
    }

    for (const task of tasks) {
      const due = new Date(task.dueAt).getTime();
      const delta = due - now.getTime();
      if (delta <= 0 || delta > 6 * 60 * 60 * 1000) continue;
      const ref = `${task.id}:${today}`;
      if (hasNotification(user.id, "soon", ref)) continue;
      for (const sub of subs) {
        try {
          await sendPush(sub, {
            title: `Entrega pronto: ${task.title}`,
            body: `${task.subject}. Sigue pendiente.`,
          });
        } catch {
          // Un aviso que falla no frena al resto.
        }
      }
      logNotification(user.id, "soon", ref, today);
    }
  }
}
