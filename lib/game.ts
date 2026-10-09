export const POINTS = {
  onTime: 25,
  late: 25,
  daily: 40,
  weekly: 100,
  combo: 60,
  streakOpen: 5,
  lesson: 3,
  duplicate: 10,
} as const;

export const PULL_COST = 50;

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
