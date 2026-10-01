import { levelProgress } from "./game";
import { addDays, localDateString, weekStart } from "./time";

export type GoalTask = {
  subject: string;
  dueAt: string;
  status: "pending" | "done";
  completedAt: string | null;
  onTime: boolean | null;
};

export function dueDay(task: GoalTask, timeZone: string): string {
  return localDateString(new Date(task.dueAt), timeZone);
}

export function onTimeTasks(tasks: GoalTask[]): GoalTask[] {
  return tasks.filter((task) => task.status === "done" && task.onTime);
}

export function bestCompletionsSameDay(tasks: GoalTask[], timeZone: string): number {
  const counts = new Map<string, number>();
  for (const task of tasks) {
    if (task.status !== "done" || !task.completedAt) continue;
    const day = localDateString(new Date(task.completedAt), timeZone);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return Math.max(0, ...counts.values(), 0);
}

export function tasksOnDay(tasks: GoalTask[], timeZone: string, day: string): GoalTask[] {
  return tasks.filter((task) => dueDay(task, timeZone) === day);
}

export function dailyMet(tasks: GoalTask[]): boolean {
  if (tasks.length === 0) return false;
  return onTimeTasks(tasks).length / tasks.length >= 0.6;
}

export function tasksInWeek(tasks: GoalTask[], timeZone: string, start: string): GoalTask[] {
  const end = addDays(start, 6);
  return tasks.filter((task) => {
    const day = dueDay(task, timeZone);
    return day >= start && day <= end;
  });
}

export function weekKeysOf(tasks: GoalTask[], timeZone: string): string[] {
  const keys = new Set<string>();
  for (const task of tasks) keys.add(weekStart(dueDay(task, timeZone)));
  return [...keys];
}

export function weekPerfect(tasks: GoalTask[]): boolean {
  return tasks.length > 0 && onTimeTasks(tasks).length === tasks.length;
}

export function daysHitInWeek(tasks: GoalTask[], timeZone: string, start: string): boolean {
  const grouped = new Map<string, GoalTask[]>();
  for (const task of tasksInWeek(tasks, timeZone, start)) {
    const day = dueDay(task, timeZone);
    const list = grouped.get(day) ?? [];
    list.push(task);
    grouped.set(day, list);
  }
  if (grouped.size === 0) return false;
  for (const [, list] of grouped) {
    if (!dailyMet(list)) return false;
  }
  return weekPerfect(tasksInWeek(tasks, timeZone, start));
}

export function subjectDayMet(tasks: GoalTask[], timeZone: string): boolean {
  const groups = new Map<string, GoalTask[]>();
  for (const task of tasks) {
    const key = `${dueDay(task, timeZone)}|${task.subject}`;
    const list = groups.get(key) ?? [];
    list.push(task);
    groups.set(key, list);
  }
  for (const list of groups.values()) {
    if (list.length > 0 && list.every((task) => task.status === "done" && task.onTime)) return true;
  }
  return false;
}

export function subjectDayProgress(tasks: GoalTask[], timeZone: string, today: string): string {
  const todayTasks = tasksOnDay(tasks, timeZone, today);
  const bySubject = new Map<string, GoalTask[]>();
  for (const task of todayTasks) {
    const list = bySubject.get(task.subject) ?? [];
    list.push(task);
    bySubject.set(task.subject, list);
  }
  let best = "";
  let bestRatio = -1;
  for (const [subject, list] of bySubject) {
    const done = onTimeTasks(list).length;
    const ratio = done / list.length;
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = `${subject} ${done}/${list.length}`;
    }
  }
  return best || "Sin materia con tareas hoy";
}

export type GoalFlags = {
  firstOnTime: boolean;
  fiveSameDay: boolean;
  tenOnTime: boolean;
  perfectWeek: boolean;
  subjectDay: boolean;
  streak: number;
  level: number;
  pulled: boolean;
  foundSuper: boolean;
};

export function evaluateGoals(tasks: GoalTask[], timeZone: string, streak: number, xp: number, pulled: boolean, foundSuper: boolean): GoalFlags {
  const weeks = weekKeysOf(tasks, timeZone);
  return {
    firstOnTime: tasks.some((task) => task.onTime),
    fiveSameDay: bestCompletionsSameDay(tasks, timeZone) >= 5,
    tenOnTime: onTimeTasks(tasks).length >= 10,
    perfectWeek: weeks.some((start) => weekPerfect(tasksInWeek(tasks, timeZone, start))),
    subjectDay: subjectDayMet(tasks, timeZone),
    streak,
    level: levelProgress(xp).level,
    pulled,
    foundSuper,
  };
}
