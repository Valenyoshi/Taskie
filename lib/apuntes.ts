import { classroomLogin } from "./credentials";
import { selectedCourseKeys } from "./courses";
import { saveApunte, type ApunteKind, type Task, type User } from "./db";
import { notesForSubject } from "./educamos";
import { freeLlmReply } from "./free-llm";
import { scrubForAi } from "./ai-shield";

export type { MindBranch, MindMap } from "./apunte-format";
export { parseMind } from "./apunte-format";

function fold(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function studyKind(message: string): ApunteKind | null {
  const q = fold(message);
  if (/para entregar|para copiar|para pegar|para subir/.test(q)) return null;
  if (/mapa mental/.test(q)) return "mapa";
  if (/\besquema\b/.test(q)) return "esquema";
  if (/resumen|resumi/.test(q)) return "resumen";
  return null;
}

export function studyTopic(message: string): string {
  const match = message.match(/(?:mapa mental|esquema|resumen\w*)\s+(?:de|del|sobre|acerca de)\s+(.+)/i);
  const raw = (match?.[1] ?? message)
    .replace(/[¿?¡!]/g, " ")
    .replace(/\b(por favor|haceme|hazme|hace|armame|armar|quiero|necesito|podes|podrias)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return raw.slice(0, 120);
}

function subjectOf(message: string, tasks: Task[]): string {
  const q = fold(message);
  const names = [...new Set(tasks.map((task) => task.subject))];
  const ranked = names
    .map((subject) => ({ subject, size: fold(subject).split(/\s+/).filter((word) => word.length > 3 && q.includes(word)).length }))
    .filter((item) => item.size > 0)
    .sort((a, b) => b.size - a.size);
  return ranked[0]?.subject ?? "";
}

function plain(value: string): string {
  return value
    .replace(/\uFFFD/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function titled(body: string, fallback: string): { title: string; body: string } {
  const lines = body.split("\n");
  const first = lines[0]?.match(/^t[ií]tulo:\s*(.+)$/i)?.[1]?.trim();
  if (!first) return { title: fallback, body };
  return { title: first.slice(0, 140), body: lines.slice(1).join("\n").trim() || body };
}

const KIND_LABEL: Record<ApunteKind, string> = {
  resumen: "resumen",
  esquema: "esquema",
  mapa: "mapa mental",
};

function promptFor(kind: ApunteKind, topic: string, subject: string, notes: string): string {
  const shape =
    kind === "mapa"
      ? [
          "Formato exacto, sin markdown:",
          "Título: el tema en pocas palabras",
          "Centro: la misma idea, más corta",
          "• una rama principal",
          "  – una idea corta de esa rama",
          "Entre 4 y 6 ramas, con 2 ideas cada una. Solo lo más importante.",
        ]
      : kind === "esquema"
        ? [
            "Formato exacto, sin markdown:",
            "Título: el tema en pocas palabras",
            "• idea principal",
            "  – un detalle corto",
            "Entre 4 y 6 ideas, con 1 o 2 detalles. Solo lo más importante.",
          ]
        : [
            "Formato exacto, sin markdown:",
            "Título: el tema en pocas palabras",
            "Después, dos párrafos cortos con la idea central y por qué importa. Sin datos sueltos ni citas.",
          ];
  return [
    `Armá un ${KIND_LABEL[kind]} de estudio para secundaria sobre: ${topic}.`,
    subject ? `Materia: ${subject}.` : "",
    notes
      ? `Usá este material del aula y no inventes lo que no esté:\n${notes.slice(0, 3500)}`
      : "No hay apunte del aula. Explicalo de forma general, corta, y decí en la primera oración que es un repaso general, no lo que dio el profesor.",
    "No escribas la entrega, no resuelvas ejercicios y no des respuestas para copiar.",
    ...shape,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function maybeStudyNote(message: string, user: User, tasks: Task[]): Promise<string | null> {
  const kind = studyKind(message);
  if (!kind) return null;
  const topic = studyTopic(message);
  if (topic.length < 3 || /^(mis\s+)?(tareas?|pendientes?|entregas?|trabajos?)$/.test(fold(topic))) {
    if (topic.length < 3) {
      return "Decime de qué tema. Por ejemplo: «haceme un resumen de la célula» o «un mapa mental de la revolución de mayo».";
    }
    return null;
  }
  const subject = subjectOf(message, tasks);
  const login = classroomLogin(user);
  const notes = login && subject
    ? await notesForSubject({
        ...login,
        subject,
        query: topic,
        courseKeys: selectedCourseKeys(user),
      }).catch(() => "")
    : "";
  const reply = await freeLlmReply(
    [
      {
        role: "system",
        content: "Armás apuntes de estudio en español claro, cortos, para un alumno de secundaria. Respondé solo en el formato pedido, sin markdown.",
      },
      { role: "user", content: scrubForAi(promptFor(kind, topic, subject, notes.trim())) },
    ],
    { timeoutMs: 45000 },
  );
  const body = plain(reply?.content || "");
  if (body.length < 40) return "No pude armar ese apunte. Probá de nuevo diciendo el tema con más claridad.";
  const named = titled(body, topic);
  const saved = saveApunte(user.id, { kind, subject, title: named.title, body: named.body || body });
  const label = KIND_LABEL[kind];
  return `Guardé el ${label} «${saved.title}» en Apuntes.\n\n${saved.body}`;
}
