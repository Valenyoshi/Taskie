import { rarityScore, type Rarity } from "./game";

export type RewardKind = "theme" | "frame" | "title" | "medal";

export type RewardDef = {
  id: string;
  name: string;
  kind: RewardKind;
  rarity: Rarity;
  blurb: string;
  theme?: string;
};

export const REWARDS: RewardDef[] = [
  { id: "tema-cuaderno", name: "Tema cuaderno", kind: "theme", rarity: "common", theme: "cuaderno", blurb: "Papel crema y tinta." },
  { id: "tema-pizarra", name: "Tema pizarra", kind: "theme", rarity: "common", theme: "pizarra", blurb: "El verde del aula." },
  { id: "marco-lino", name: "Marco de lino", kind: "frame", rarity: "common", blurb: "Un borde sencillo." },
  { id: "marco-tiza", name: "Marco de tiza", kind: "frame", rarity: "common", blurb: "Trazo claro." },
  { id: "titulo-al-dia", name: "Al día", kind: "title", rarity: "common", blurb: "Se muestra bajo tu nombre." },
  { id: "medalla-lapiz", name: "Medalla lápiz", kind: "medal", rarity: "common", blurb: "La primera del estuche." },
  { id: "tema-bosque", name: "Tema bosque", kind: "theme", rarity: "rare", theme: "bosque", blurb: "Verde profundo." },
  { id: "tema-noche", name: "Tema noche", kind: "theme", rarity: "rare", theme: "noche", blurb: "Para estudiar tarde." },
  { id: "marco-bronce", name: "Marco bronce", kind: "frame", rarity: "rare", blurb: "Brilla un poco." },
  { id: "titulo-constante", name: "Constante", kind: "title", rarity: "rare", blurb: "Se nota la racha." },
  { id: "medalla-brujula", name: "Medalla brújula", kind: "medal", rarity: "rare", blurb: "No se te pasa una entrega." },
  { id: "tema-oro", name: "Tema oro", kind: "theme", rarity: "super", theme: "oro", blurb: "El cuaderno de gala." },
  { id: "marco-oro", name: "Marco oro", kind: "frame", rarity: "super", blurb: "Se ve desde el fondo del aula." },
  { id: "titulo-leyenda", name: "Leyenda del curso", kind: "title", rarity: "super", blurb: "Pocas personas lo tienen." },
  { id: "medalla-sol", name: "Medalla sol", kind: "medal", rarity: "super", blurb: "Una de las raras." },
];

export const ACHIEVEMENTS = [
  { id: "first_ontime", name: "Primera entrega a tiempo", detail: "Entregá una tarea antes de que venza.", xp: 40, points: 20 },
  { id: "five_same_day", name: "Cinco en un día", detail: "Completá 5 tareas en el mismo día.", xp: 80, points: 40 },
  { id: "ten_ontime", name: "Diez a tiempo", detail: "Entregá 10 tareas a tiempo.", xp: 100, points: 50 },
  { id: "perfect_week", name: "Semana perfecta", detail: "Completá a tiempo todas las tareas de una semana.", xp: 120, points: 60 },
  { id: "subject_day", name: "Una materia al día", detail: "Cerrá a tiempo todas las tareas que vencen un mismo día de una materia.", xp: 60, points: 30 },
  { id: "streak_3", name: "Racha de 3", detail: "Entrá 3 días seguidos.", xp: 30, points: 15 },
  { id: "streak_7", name: "Racha de 7", detail: "Entrá 7 días seguidos.", xp: 70, points: 35 },
  { id: "streak_14", name: "Racha de 14", detail: "Entrá 14 días seguidos.", xp: 140, points: 70 },
  { id: "streak_30", name: "Racha de 30", detail: "Entrá 30 días seguidos.", xp: 300, points: 150 },
  { id: "first_pull", name: "Primera tirada", detail: "Comprá tu primera tirada.", xp: 20, points: 10 },
  { id: "super_rare", name: "Hallazgo", detail: "Sacá un premio súper raro.", xp: 100, points: 50 },
  { id: "level_5", name: "Nivel 5", detail: "Llegá al nivel 5.", xp: 50, points: 25 },
  { id: "level_10", name: "Nivel 10", detail: "Llegá al nivel 10.", xp: 80, points: 40 },
  { id: "level_20", name: "Nivel 20", detail: "Llegá al nivel 20.", xp: 150, points: 75 },
] as const;

export type AchievementId = (typeof ACHIEVEMENTS)[number]["id"];

export function rewardById(id: string): RewardDef | undefined {
  return REWARDS.find((reward) => reward.id === id);
}

export function themeKey(rewardId: string | null): string {
  const reward = rewardId ? rewardById(rewardId) : undefined;
  return reward?.theme ?? "cuaderno";
}

export function frameClass(rewardId: string | null): string {
  switch (rewardId) {
    case "marco-lino":
      return "ring-stone-500";
    case "marco-tiza":
      return "ring-zinc-200";
    case "marco-bronce":
      return "ring-amber-700";
    case "marco-oro":
      return "ring-yellow-400";
    default:
      return "ring-border";
  }
}

export function scoreRewards(ids: string[]): number {
  return ids.reduce((sum, id) => {
    const reward = rewardById(id);
    return sum + (reward ? rarityScore(reward.rarity) : 0);
  }, 0);
}

export function kindLabel(kind: RewardKind): string {
  switch (kind) {
    case "theme":
      return "Tema";
    case "frame":
      return "Marco";
    case "title":
      return "Título";
    case "medal":
      return "Medalla";
  }
}
