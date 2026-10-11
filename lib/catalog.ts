import { rarityScore, type Rarity } from "./game";

export type RewardKind = "theme" | "frame" | "title" | "medal";

export type RewardDef = {
  id: string;
  name: string;
  emoji: string;
  kind: RewardKind;
  rarity: Rarity;
  blurb: string;
  theme?: string;
  cost?: number;
};

export const REWARDS: RewardDef[] = [
  {
    id: "check-retro",
    name: "Check Retro Pixel",
    emoji: "✅",
    kind: "theme",
    rarity: "rare",
    blurb: "Un check pixelado para celebrar cada tarea terminada.",
    cost: 100,
  },
  { id: "lapiz", name: "Lápiz", emoji: "✏️", kind: "medal", rarity: "common", blurb: "El de siempre." },
  { id: "regla", name: "Regla", emoji: "📏", kind: "medal", rarity: "common", blurb: "Para la línea recta." },
  { id: "clip", name: "Clip", emoji: "📎", kind: "medal", rarity: "common", blurb: "Del escritorio." },
  { id: "crayon", name: "Crayón", emoji: "🖍️", kind: "medal", rarity: "common", blurb: "De la caja de colores." },
  { id: "cuaderno", name: "Cuaderno", emoji: "📓", kind: "medal", rarity: "common", blurb: "Hojas rayadas." },
  { id: "goma", name: "Goma", emoji: "🧼", kind: "medal", rarity: "common", blurb: "Borra el error." },
  { id: "mochila", name: "Mochila", emoji: "🎒", kind: "medal", rarity: "rare", blurb: "La del recreo." },
  { id: "tubo", name: "Tubo de ensayo", emoji: "🧪", kind: "medal", rarity: "rare", blurb: "Del laboratorio." },
  { id: "abaco", name: "Ábaco", emoji: "🧮", kind: "medal", rarity: "rare", blurb: "Para contar." },
  { id: "paleta", name: "Paleta", emoji: "🎨", kind: "medal", rarity: "rare", blurb: "De plástica." },
  { id: "libro", name: "Libro", emoji: "📗", kind: "medal", rarity: "rare", blurb: "El de lectura." },
  { id: "copa", name: "Copa del aula", emoji: "🏆", kind: "medal", rarity: "super", blurb: "La del estante." },
  { id: "globo", name: "Globo terráqueo", emoji: "🌍", kind: "medal", rarity: "super", blurb: "De geografía." },
  { id: "microscopio", name: "Microscopio", emoji: "🔬", kind: "medal", rarity: "super", blurb: "De ciencias." },
  { id: "manzana", name: "Manzana", emoji: "🍎", kind: "medal", rarity: "super", blurb: "La del escritorio." },
];

export const ACHIEVEMENTS = [
  { id: "first_ontime", name: "Primera entrega a tiempo", detail: "Entregá una tarea antes de que venza.", points: 20 },
  { id: "five_same_day", name: "Cinco en un día", detail: "Completá 5 tareas en el mismo día.", points: 40 },
  { id: "ten_ontime", name: "Diez a tiempo", detail: "Entregá 10 tareas a tiempo.", points: 50 },
  { id: "perfect_week", name: "Semana perfecta", detail: "Completá a tiempo todas las tareas de una semana.", points: 60 },
  { id: "subject_day", name: "Una materia al día", detail: "Cerrá a tiempo todas las tareas que vencen un mismo día de una materia.", points: 30 },
  { id: "streak_3", name: "Racha de 3", detail: "Entrá 3 días seguidos.", points: 15 },
  { id: "streak_7", name: "Racha de 7", detail: "Entrá 7 días seguidos.", points: 35 },
  { id: "streak_14", name: "Racha de 14", detail: "Entrá 14 días seguidos.", points: 70 },
  { id: "streak_30", name: "Racha de 30", detail: "Entrá 30 días seguidos.", points: 150 },
  { id: "first_pull", name: "Primera tirada", detail: "Comprá tu primera tirada.", points: 10 },
  { id: "super_rare", name: "Hallazgo", detail: "Sacá un premio súper raro.", points: 50 },
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
