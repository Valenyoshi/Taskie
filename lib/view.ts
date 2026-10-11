import { ACHIEVEMENTS, REWARDS, frameClass, kindLabel, rewardById, themeKey } from "./catalog";
import { findUserById, hasClaim, listAchievementIds, listRewardIds, listTasks, type Task, type User } from "./db";
import { PULL_COST, rarityLabel } from "./game";
import {
  bestCompletionsSameDay,
  onTimeTasks,
  subjectDayProgress,
  tasksInWeek,
} from "./goals";
import { addDays, dueLabel, localDateString, pendingIsCurrent, weekStart } from "./time";

export type PublicUser = {
  id: string;
  name: string;
  username: string;
  points: number;
  streak: number;
  notificationsEnabled: boolean;
  equippedTheme: string | null;
  equippedFrame: string | null;
  equippedTitle: string | null;
  titleName: string | null;
  theme: string;
  frameClassName: string;
  syncError: string | null;
  isDemo: boolean;
  educamosUrl: string | null;
};

export type TaskView = {
  id: string;
  subject: string;
  title: string;
  description: string;
  dueAt: string;
  dueLabel: string;
  shortDue: string;
  status: "pending" | "done";
  onTime: boolean | null;
  needsFile: boolean;
  kind: "tarea" | "archivo";
    countsDaily: boolean;
    countsWeekly: boolean;
  fileName: string | null;
  educamosUrl: string | null;
  pending: boolean;
};

export type MissionView = {
  dailyDone: number;
  dailyTotal: number;
  dailyRatio: number;
  dailyClosed: number;
  dailyMet: boolean;
  dailyClaimed: boolean;
  weeklyDone: number;
  weeklyTotal: number;
  weeklyClosed: number;
  weeklyMet: boolean;
  weeklyClaimed: boolean;
  comboClaimed: boolean;
  comboReady: boolean;
};

export function toPublic(user: User): PublicUser {
  const title = user.equippedTitle ? rewardById(user.equippedTitle) : undefined;
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    points: user.points,
    streak: user.streak,
    notificationsEnabled: user.notificationsEnabled,
    equippedTheme: user.equippedTheme,
    equippedFrame: user.equippedFrame,
    equippedTitle: user.equippedTitle,
    titleName: title?.name ?? null,
    theme: themeKey(user.equippedTheme),
    frameClassName: frameClass(user.equippedFrame),
    syncError: user.syncError,
    isDemo: user.isDemo,
    educamosUrl: user.educamosUrl,
  };
}

function shortDue(iso: string, timeZone: string, now = new Date()): string {
  const dueDay = localDateString(new Date(iso), timeZone);
  const today = localDateString(now, timeZone);
  if (new Date(iso).getTime() < now.getTime() && dueDay < today) return "Atrasada";
  if (dueDay === today) return "Hoy";
  if (dueDay === addDays(today, 1)) return "Mañana";
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", timeZone }).format(new Date(iso));
}

export function toTask(task: Task, timeZone: string): TaskView {
  return {
    id: task.id,
    subject: task.subject,
    title: task.title,
    description: task.description,
    dueAt: task.dueAt,
    dueLabel: dueLabel(task.dueAt, timeZone),
    shortDue: shortDue(task.dueAt, timeZone),
    status: task.status,
    onTime: task.onTime,
    needsFile: task.needsFile,
    kind: task.source === "lms" ? "archivo" : "tarea",
    countsDaily: (() => {
      const due = localDateString(new Date(task.dueAt), timeZone);
      const today = localDateString(new Date(), timeZone);
      return due <= today && due >= addDays(today, -3);
    })(),
    countsWeekly: (() => {
      const due = localDateString(new Date(task.dueAt), timeZone);
      const today = localDateString(new Date(), timeZone);
      const start = weekStart(today);
      const end = addDays(start, 6);
      return due >= start && due <= end;
    })(),
    fileName: task.fileName,
    educamosUrl: task.educamosUrl,
    pending: task.status === "pending",
  };
}

function doneOn(task: Task, timeZone: string): string | null {
  if (task.status !== "done" || !task.completedAt) return null;
  return localDateString(new Date(task.completedAt), timeZone);
}

function countsForDay(task: Task, timeZone: string, today: string): boolean {
  const due = localDateString(new Date(task.dueAt), timeZone);
  if (due > today || due < addDays(today, -3)) return false;
  if (task.status !== "done") return true;
  return doneOn(task, timeZone) === today;
}

function countsForWeek(task: Task, timeZone: string, today: string): boolean {
  const start = weekStart(today);
  const end = addDays(start, 6);
  const due = localDateString(new Date(task.dueAt), timeZone);
  if (due < start || due > end) return false;
  if (task.status !== "done") return true;
  return true;
}

export function missionView(user: User, tasks: Task[]): MissionView {
  const today = localDateString(new Date(), user.timezone);
  const start = weekStart(today);
  const dueToday = tasks.filter((task) => countsForDay(task, user.timezone, today));
  const week = tasks.filter((task) => countsForWeek(task, user.timezone, today));
  const dailyDone = onTimeTasks(dueToday).length;
  const weeklyDone = onTimeTasks(week).length;
  const dailyClosed = dueToday.filter((task) => task.status === "done").length;
  const weeklyClosed = week.filter((task) => task.status === "done").length;
  return {
    dailyDone,
    dailyTotal: dueToday.length,
    dailyRatio: dueToday.length ? dailyDone / dueToday.length : 0,
    dailyClosed,
    dailyMet: dueToday.length > 0 && dailyDone / dueToday.length >= 0.6,
    dailyClaimed: hasClaim(user.id, "daily", today),
    weeklyDone,
    weeklyTotal: week.length,
    weeklyClosed,
    weeklyMet: week.length > 0 && weeklyDone === week.length,
    weeklyClaimed: hasClaim(user.id, "weekly", start),
    comboClaimed: hasClaim(user.id, "combo", start),
    comboReady: week.length > 0 && weeklyDone === week.length,
  };
}

export function homeData(userId: string) {
  const user = findUserById(userId);
  if (!user) return null;
  const tasks = listTasks(userId).filter(
    (task) => task.status === "done" || pendingIsCurrent(task.dueAt, user.timezone),
  );
  const views = tasks.map((task) => toTask(task, user.timezone));
  return {
    user: toPublic(user),
    missions: missionView(user, tasks),
    pending: views.filter((task) => task.pending),
    done: views.filter((task) => !task.pending),
    pullCost: PULL_COST,
  };
}

export function subjectsData(userId: string) {
  const home = homeData(userId);
  if (!home) return null;
  const map = new Map<string, { subject: string; total: number; done: number; pending: number }>();
  for (const task of [...home.pending, ...home.done]) {
    const row = map.get(task.subject) ?? { subject: task.subject, total: 0, done: 0, pending: 0 };
    row.total += 1;
    if (task.pending) row.pending += 1;
    else row.done += 1;
    map.set(task.subject, row);
  }
  return { user: home.user, subjects: [...map.values()].sort((a, b) => a.subject.localeCompare(b.subject, "es")) };
}

export function subjectTasks(userId: string, subject: string) {
  const home = homeData(userId);
  if (!home) return null;
  const all = [...home.pending, ...home.done].filter((task) => task.subject === subject);
  return { user: home.user, subject, tasks: all };
}

export function rewardsData(userId: string) {
  const user = findUserById(userId);
  if (!user) return null;
  const tasks = listTasks(userId);
  const owned = new Set(listRewardIds(userId));
  const unlocked = new Set(listAchievementIds(userId));
  const today = localDateString(new Date(), user.timezone);
  const start = weekStart(today);
  const week = tasksInWeek(tasks, user.timezone, start);
  const items = REWARDS.map((reward) => ({
    ...reward,
    owned: owned.has(reward.id),
    equipped:
      (reward.kind === "theme" && user.equippedTheme === reward.id) ||
      (reward.kind === "frame" && user.equippedFrame === reward.id) ||
      (reward.kind === "title" && user.equippedTitle === reward.id),
    rarityLabel: rarityLabel(reward.rarity),
    kindLabel: kindLabel(reward.kind),
  }));
  const achievements = ACHIEVEMENTS.map((achievement) => ({
    ...achievement,
    unlocked: unlocked.has(achievement.id),
    progress: progressLabel(achievement.id, user, tasks, week.length, onTimeTasks(week).length),
  }));
  return { user: toPublic(user), items, achievements, pullCost: PULL_COST, missing: Math.max(0, PULL_COST - user.points) };
}

function progressLabel(id: string, user: User, tasks: Task[], weekTotal: number, weekDone: number): string {
  const today = localDateString(new Date(), user.timezone);
  switch (id) {
    case "five_same_day":
      return `${Math.min(5, bestCompletionsSameDay(tasks, user.timezone))}/5`;
    case "ten_ontime":
      return `${Math.min(10, onTimeTasks(tasks).length)}/10`;
    case "streak_3":
      return `${Math.min(3, user.streak)}/3`;
    case "streak_7":
      return `${Math.min(7, user.streak)}/7`;
    case "streak_14":
      return `${Math.min(14, user.streak)}/14`;
    case "streak_30":
      return `${Math.min(30, user.streak)}/30`;
    case "perfect_week":
      return `${weekDone}/${weekTotal || 0} esta semana`;
    case "subject_day":
      return subjectDayProgress(tasks, user.timezone, today);
    default:
      return "";
  }
}
