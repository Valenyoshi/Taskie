import { ACHIEVEMENTS, REWARDS, rewardById, type AchievementId } from "./catalog";
import {
  addAchievement,
  addClaim,
  addReward,
  addPoints,
  completeTask as markTaskDone,
  findUserById,
  getTask,
  hasClaim,
  listAchievementIds,
  listRewardIds,
  listTasks,
  markPulled,
  setEquipped,
  setOpenDay,
  spendPoints,
  transaction,
  type Task,
  type User,
} from "./db";
import { POINTS, PULL_COST, rollRarity } from "./game";
import {
  dailyMet,
  daysHitInWeek,
  evaluateGoals,
  onTimeTasks,
  tasksInWeek,
  tasksOnDay,
  weekKeysOf,
  weekPerfect,
} from "./goals";
import { addDays, localDateString } from "./time";

export type Gain = { lines: string[] };

function claim(
  userId: string,
  kind: string,
  periodKey: string,
  points: number,
  label: string,
  lines: string[],
): void {
  if (hasClaim(userId, kind, periodKey)) return;
  if (!addClaim(userId, kind, periodKey, points)) return;
  addPoints(userId, points);
  lines.push(`${label}: +${points} sombreros.`);
}

export function applyMissions(userId: string, lines: string[]): void {
  const user = findUserById(userId);
  if (!user) return;
  const tasks = listTasks(userId);
  const today = localDateString(new Date(), user.timezone);
  for (const start of weekKeysOf(tasks, user.timezone)) {
    for (let i = 0; i < 7; i++) {
      const day = addDays(start, i);
      if (day > today) continue;
      const due = tasksOnDay(tasks, user.timezone, day);
      if (!dailyMet(due)) continue;
      const done = onTimeTasks(due).length;
      claim(userId, "daily", day, POINTS.daily, `Misión diaria (${done}/${due.length})`, lines);
    }
    const weekTasks = tasksInWeek(tasks, user.timezone, start);
    if (!weekPerfect(weekTasks)) continue;
    claim(userId, "weekly", start, POINTS.weekly, "Misión semanal", lines);
    if (daysHitInWeek(tasks, user.timezone, start)) {
      claim(userId, "combo", start, POINTS.combo, "Combo de la semana", lines);
    }
  }
}

function flagsFor(user: User, tasks: Task[]) {
  return evaluateGoals(tasks, user.timezone, user.streak, user.pulled, user.foundSuper);
}

function achievementMet(id: AchievementId, user: User, tasks: Task[]): boolean {
  const flags = flagsFor(user, tasks);
  switch (id) {
    case "first_ontime":
      return flags.firstOnTime;
    case "five_same_day":
      return flags.fiveSameDay;
    case "ten_ontime":
      return flags.tenOnTime;
    case "perfect_week":
      return flags.perfectWeek;
    case "subject_day":
      return flags.subjectDay;
    case "streak_3":
      return flags.streak >= 3;
    case "streak_7":
      return flags.streak >= 7;
    case "streak_14":
      return flags.streak >= 14;
    case "streak_30":
      return flags.streak >= 30;
    case "first_pull":
      return flags.pulled;
    case "super_rare":
      return flags.foundSuper;
  }
}

export function applyAchievements(userId: string, lines: string[]): void {
  let changed = true;
  while (changed) {
    changed = false;
    const user = findUserById(userId);
    if (!user) return;
    const tasks = listTasks(userId);
    const owned = new Set(listAchievementIds(userId));
    for (const achievement of ACHIEVEMENTS) {
      if (owned.has(achievement.id)) continue;
      if (!achievementMet(achievement.id, user, tasks)) continue;
      if (!addAchievement(userId, achievement.id)) continue;
      addPoints(userId, achievement.points);
      lines.push(`Logro ${achievement.name}: +${achievement.points} sombreros.`);
      changed = true;
    }
  }
}

export function touchOpen(userId: string): string[] {
  const lines: string[] = [];
  const user = findUserById(userId);
  if (!user) return lines;
  const today = localDateString(new Date(), user.timezone);
  if (user.lastOpenDate === today) return lines;
  let streak = 1;
  if (user.lastOpenDate && addDays(user.lastOpenDate, 1) === today) streak = user.streak + 1;
  const opened = setOpenDay(userId, streak, today, POINTS.streakOpen);
  if (opened) {
    lines.push(`Taskie · racha de ${streak} ${streak === 1 ? "día" : "días"}. +${POINTS.streakOpen} sombreros.`);
  }
  applyMissions(userId, lines);
  applyAchievements(userId, lines);
  return lines;
}

export function claimLesson(userId: string, subject: string): { first: boolean; points: number } {
  const user = findUserById(userId);
  if (!user) return { first: false, points: 0 };
  const day = localDateString(new Date(), user.timezone);
  const periodKey = `${day}:${subject.trim().toLowerCase()}`;
  if (!addClaim(userId, "lesson", periodKey, POINTS.lesson)) {
    return { first: false, points: 0 };
  }
  addPoints(userId, POINTS.lesson);
  return { first: true, points: POINTS.lesson };
}

export function deliverTask(userId: string, taskId: string): { ok: true; lines: string[] } | { ok: false; error: string } {
  const task = getTask(taskId);
  if (!task || task.userId !== userId) return { ok: false, error: "No encontré esa tarea." };
  if (task.status === "done") return { ok: false, error: "Esa tarea ya está entregada." };
  if (task.source === "lms" && !task.fileName) {
    return { ok: false, error: "Primero subí un archivo." };
  }
  const lines: string[] = [];
  const result = transaction(() => {
    const current = findUserById(userId);
    if (!current) return { ok: false as const, error: "No encontré tu cuenta." };
    const completedAt = new Date().toISOString();
    const onTime = new Date(completedAt).getTime() <= new Date(task.dueAt).getTime();
    if (!markTaskDone(taskId, userId, completedAt, onTime)) {
      return { ok: false as const, error: "Esa tarea ya está entregada." };
    }
    const points = Math.round((onTime ? POINTS.onTime : POINTS.late) * (task.source === "lms" ? 1.25 : 1));
    lines.push(onTime ? `Entrega a tiempo: +${points} sombreros.` : `Entrega tarde: +${points} sombreros.`);
    applyMissions(userId, lines);
    applyAchievements(userId, lines);
    return { ok: true as const, lines };
  });
  return result;
}

export function buyPull(userId: string):
  | { ok: true; lines: string[]; rewardName: string; rarity: string; duplicate: boolean }
  | { ok: false; error: string } {
  const user = findUserById(userId);
  if (!user) return { ok: false, error: "No encontré tu cuenta." };
  if (user.points < PULL_COST) {
    return { ok: false, error: `Te faltan ${PULL_COST - user.points} sombreros para una tirada.` };
  }
  const rarity = rollRarity();
  const pool = REWARDS.filter((reward) => reward.rarity === rarity);
  const reward = pool[Math.floor(Math.random() * pool.length)];
  if (!reward) return { ok: false, error: "La máquina no tiene premios de esa rareza." };

  return transaction(() => {
    const beforeUser = findUserById(userId);
    if (!beforeUser) return { ok: false as const, error: "No encontré tu cuenta." };
    if (!spendPoints(userId, PULL_COST)) {
      return { ok: false as const, error: `Te faltan sombreros para una tirada.` };
    }
    const owned = new Set(listRewardIds(userId));
    const duplicate = owned.has(reward.id);
    const lines = [`Tirada: −${PULL_COST} sombreros.`];
    if (duplicate) {
      addPoints(userId, POINTS.duplicate);
      lines.push(`Te salió otra vez ${reward.name}. Como ya lo tenías, sumás +${POINTS.duplicate} sombreros.`);
    } else {
      addReward(userId, reward.id);
      lines.push(`Te salió ${reward.name} (${rarity === "super" ? "súper raro" : rarity === "rare" ? "raro" : "común"}).`);
    }
    markPulled(userId, rarity === "super");
    applyAchievements(userId, lines);
    return { ok: true as const, lines, rewardName: reward.name, rarity: reward.rarity, duplicate };
  });
}

export function equipReward(userId: string, kind: "theme" | "frame" | "title", rewardId: string | null): { ok: true } | { ok: false; error: string } {
  if (rewardId) {
    const reward = rewardById(rewardId);
    if (!reward || reward.kind !== kind) return { ok: false, error: "Ese premio no se puede poner ahí." };
    if (!listRewardIds(userId).includes(rewardId)) return { ok: false, error: "Todavía no tenés ese premio." };
  }
  setEquipped(userId, kind, rewardId);
  return { ok: true };
}

export function purchaseReward(userId: string, rewardId: string): { ok: true } | { ok: false; error: string } {
  const reward = rewardById(rewardId);
  if (!reward || reward.kind !== "theme" || !reward.cost) {
    return { ok: false, error: "Ese producto no está a la venta." };
  }
  if (listRewardIds(userId).includes(rewardId)) {
    return { ok: false, error: "Ya tenés ese producto." };
  }
  if (!spendPoints(userId, reward.cost)) {
    return { ok: false, error: `Te faltan ${reward.cost - (findUserById(userId)?.points ?? 0)} sombreros.` };
  }
  addReward(userId, rewardId);
  return { ok: true };
}
