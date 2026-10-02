export const XP = {
  onTime: 50,
  late: 15,
  daily: 40,
  weekly: 120,
  combo: 80,
  streakOpen: 10,
  duplicate: 20,
} as const;

export const POINTS = {
  onTime: 25,
  late: 25,
  daily: 40,
  weekly: 100,
  combo: 60,
} as const;

export const PULL_COST = 50;
export const TASK_XP = 10;

export function tasksForLevel(level: number): number {
  if (level >= 10) return 5;
  if (level >= 5) return 4;
  return 3;
}

export function levelFromTasks(completed: number): {
  level: number;
  into: number;
  need: number;
} {
  let level = 1;
  let left = Math.max(0, Math.floor(completed));
  while (level < 10000) {
    const tasks = tasksForLevel(level);
    const need = tasks * TASK_XP;
    const into = left * TASK_XP;
    if (left < tasks) return { level, into, need };
    left -= tasks;
    level += 1;
  }
  return { level, into: 0, need: 5 * TASK_XP };
}

export type Rarity = "common" | "rare" | "super";

export function rollRarity(rand = Math.random()): Rarity {
  const n = rand * 100;
  if (n < 60) return "common";
  if (n < 92) return "rare";
  return "super";
}

export function rarityLabel(rarity: Rarity): string {
  if (rarity === "super") return "Súper raro";
  if (rarity === "rare") return "Raro";
  return "Común";
}

export function rarityScore(rarity: Rarity): number {
  if (rarity === "super") return 5;
  if (rarity === "rare") return 2;
  return 1;
}
