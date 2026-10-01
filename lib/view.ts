import { ACHIEVEMENTS, REWARDS, frameClass, kindLabel, rewardById, scoreRewards, themeKey } from "./catalog";
import { findUserById, hasClaim, listAchievementIds, listRewardIds, listTasks, listUsers, type Task, type User } from "./db";
import { levelProgress, PULL_COST, rarityLabel } from "./game";
import {
  bestCompletionsSameDay,
  onTimeTasks,
  subjectDayProgress,
  tasksInWeek,
  tasksOnDay,
} from "./goals";
import { dueLabel, localDateString, weekStart } from "./time";

export type PublicUser = {
  id: string;
  name: string;
  username: string;
  xp: number;
  points: number;
  streak: number;
  level: number;
  into: number;
  need: number;
  notificationsEnabled: boolean;
  equippedTheme: string | null;
  equippedFrame: string | null;
  equippedTitle: string | null;
  titleName: string | null;
  theme: string;
  frameClassName: string;
  syncError: string | null;
  isDemo: boolean;
  educamosUsername: string | null;
  educamosUrl: string | null;
};

export type TaskView = {
  id: string;
  subject: string;
  title: string;
  description: string;
  dueAt: string;
  dueLabel: string;
  status: "pending" | "done";
  onTime: boolean | null;
  needsFile: boolean;
  fileName: string | null;
  educamosUrl: string | null;
  pending: boolean;
};

export type MissionView = {
  dailyDone: number;
  dailyTotal: number;
  dailyRatio: number;
  dailyMet: boolean;
  dailyClaimed: boolean;
  weeklyDone: number;
  weeklyTotal: number;
  weeklyMet: boolean;
  weeklyClaimed: boolean;
  comboClaimed: boolean;
  comboReady: boolean;
};

export function toPublic(user: User): PublicUser {
  const level = levelProgress(user.xp);
  const title = user.equippedTitle ? rewardById(user.equippedTitle) : undefined;
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    xp: user.xp,
    points: user.points,
    streak: user.streak,
    level: level.level,
    into: level.into,
    need: level.need,
    notificationsEnabled: user.notificationsEnabled,
    equippedTheme: user.equippedTheme,
    equippedFrame: user.equippedFrame,
    equippedTitle: user.equippedTitle,
    titleName: title?.name ?? null,
    theme: themeKey(user.equippedTheme),
    frameClassName: frameClass(user.equippedFrame),
    syncError: user.syncError,
    isDemo: user.isDemo,
    educamosUsername: user.educamosUsername,
    educamosUrl: user.educamosUrl,
  };
}

export function toTask(task: Task, timeZone: string): TaskView {
  return {
    id: task.id,
    subject: task.subject,
    title: task.title,
    description: task.description,
    dueAt: task.dueAt,
    dueLabel: dueLabel(task.dueAt, timeZone),
    status: task.status,
    onTime: task.onTime,
    needsFile: task.needsFile,
    fileName: task.fileName,
    educamosUrl: task.educamosUrl,
    pending: task.status === "pending",
  };
}

export function missionView(user: User, tasks: Task[]): MissionView {
  const today = localDateString(new Date(), user.timezone);
  const start = weekStart(today);
  const dueToday = tasksOnDay(tasks, user.timezone, today);
  const week = tasksInWeek(tasks, user.timezone, start);
  const dailyDone = onTimeTasks(dueToday).length;
  const weeklyDone = onTimeTasks(week).length;
  return {
    dailyDone,
    dailyTotal: dueToday.length,
    dailyRatio: dueToday.length ? dailyDone / dueToday.length : 0,
    dailyMet: dueToday.length > 0 && dailyDone / dueToday.length >= 0.6,
    dailyClaimed: hasClaim(user.id, "daily", today),
    weeklyDone,
    weeklyTotal: week.length,
    weeklyMet: week.length > 0 && weeklyDone === week.length,
    weeklyClaimed: hasClaim(user.id, "weekly", start),
    comboClaimed: hasClaim(user.id, "combo", start),
    comboReady: week.length > 0 && weeklyDone === week.length,
  };
}

export function homeData(userId: string) {
  const user = findUserById(userId);
  if (!user) return null;
  const tasks = listTasks(userId);
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
    case "level_5":
      return `nivel ${Math.min(5, levelProgress(user.xp).level)}/5`;
    case "level_10":
      return `nivel ${Math.min(10, levelProgress(user.xp).level)}/10`;
    case "level_20":
      return `nivel ${Math.min(20, levelProgress(user.xp).level)}/20`;
    case "perfect_week":
      return `${weekDone}/${weekTotal || 0} esta semana`;
    case "subject_day":
      return subjectDayProgress(tasks, user.timezone, today);
    default:
      return "";
  }
}

export function rankingData(userId: string) {
  const me = findUserById(userId);
  if (!me) return null;
  const rows = listUsers().map((user) => {
    const ids = listRewardIds(user.id);
    return {
      id: user.id,
      name: user.name,
      xp: user.xp,
      level: levelProgress(user.xp).level,
      prizeScore: scoreRewards(ids),
      prizes: ids.length,
      me: user.id === userId,
    };
  });
  const byXp = [...rows].sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name, "es"));
  const byPrizes = [...rows].sort((a, b) => b.prizeScore - a.prizeScore || b.xp - a.xp || a.name.localeCompare(b.name, "es"));
  return { user: toPublic(me), byXp, byPrizes, alone: rows.length === 1 };
}
