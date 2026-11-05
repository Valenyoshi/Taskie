import { scrubForAi, withAiShield } from "./ai-shield";
import { classroomLogin } from "./credentials";
import { visibleTasks } from "./courses";
import type { User } from "./db";
import { fetchTaskInstructions, listEnrolledSubjectNames, notesForSubject, recentClassTopics } from "./educamos";
import { freeLlmReply } from "./free-llm";
import { dedupeSubjects, subjectKey } from "./subject-color";

export type QuizQuestion = { prompt: string; options: string[]; answer: number; why: string };
export type PaperQuiz = { subject: string; topics: string[]; questions: QuizQuestion[] };

const QUESTIONS = 6;
const ADMIN_TITLE =
  /diagn[oó]stic|presentaci[oó]n|acuerdo|bienvenid|r[uú]brica|evaluaci[oó]n|autorizaci|autorizados|ficha|normas de convivencia|actualizaci[oó]n de datos|instalador|programa\b|canva|player\b|grupos?\b/i;
const ADMIN_SUBJECT = /tutor[ií]a|preceptor|secretar|administraci/i;
const RULES_LINE =
  /pautas|carpeta|firmad|\bnotas?\b|evaluad|evaluaci[oó]n|profesor|formato|entreg|trabajos? pr[aá]cticos?|clases|asistencia|cuadernillo|calificaci/i;
const ADMIN_TEXT = /autorizaci[oó]n|nombre\s+y\s+apellido|dni\s*n|firma del|ficha de salud|r[uú]brica/i;

function withDeadline<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}

function clean(value: string): string {
  return value.replace(/\uFFFD/g, "").replace(/\s+/g, " ").normalize("NFC").trim();
}

function sameSubject(a: string, b: string): boolean {
  const left = subjectKey(a);
  const right = subjectKey(b);
  return Boolean(left && right) && (left === right || left.startsWith(`${right} `) || right.startsWith(`${left} `));
}

export async function quizSubjects(user: User): Promise<string[]> {
  const names = visibleTasks(user).map((task) => task.subject);
  const login = classroomLogin(user);
  if (login) names.push(...(await withDeadline(listEnrolledSubjectNames(login), 8000, [] as string[])));
  return dedupeSubjects(names).filter((name) => !ADMIN_SUBJECT.test(name));
}

type Material = { topics: string[]; text: string; year: string; asks: string[] };

const ASK_LINE = /[¿?]|^\s*(?:\d+[.)-]\s*)?(?:mencion|explic|describ|nombr|indic|defin|respond|enumer|investig|compar|justific|realiz|elabor|cont[aá]|identific)/i;

function asksIn(text: string): string[] {
  return text
    .split(/\n+|(?<=[.?!])\s+(?=\d+[.)-]|[¿A-ZÁÉÍÓÚ])/)
    .map(clean)
    .filter((line) => line.length > 12 && ASK_LINE.test(line));
}

function contentWords(value: string): Set<string> {
  return new Set(
    (value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().match(/[a-zñ]{4,}/g) ?? []).filter((word) => !STOP.has(word)),
  );
}

/**
 * Una pregunta del quiz que repite una consigna pendiente le estaría resolviendo la tarea al alumno.
 * También sirve para descartar preguntas casi iguales entre sí.
 */
function copiesHomework(question: QuizQuestion, asks: string[]): boolean {
  const words = contentWords(question.prompt);
  if (words.size === 0) return false;
  return asks.some((ask) => {
    const other = contentWords(ask);
    let shared = 0;
    for (const word of words) if (other.has(word)) shared++;
    return shared >= 2 && shared / Math.min(words.size, other.size) >= 0.5;
  });
}

async function quizMaterial(user: User, subject: string): Promise<Material> {
  const tasks = visibleTasks(user)
    .filter((task) => sameSubject(task.subject, subject))
    .sort((a, b) => new Date(b.dueAt).getTime() - new Date(a.dueAt).getTime());
  const fromTasks = tasks
    .slice(0, 6)
    .map((task) => clean(`${task.title}. ${task.description}`))
    .filter((line) => line.length > 3);
  const year = tasks.map((task) => task.subject.match(/\b(\d)\s*[º°]/)?.[1]).find(Boolean) ?? "";
  const pendingText = tasks.filter((task) => task.status === "pending").map((task) => task.description);
  const login = classroomLogin(user);
  if (!login) {
    return { topics: tasks.slice(0, 6).map((task) => clean(task.title)), text: fromTasks.join("\n"), year, asks: pendingText.flatMap(asksIn) };
  }

  const topics = (await withDeadline(recentClassTopics({ ...login, subject }), 12000, [] as string[]))
    .map(clean)
    .filter((topic) => topic.length > 2 && !ADMIN_TITLE.test(topic))
    .slice(-6);
  const withFiles = tasks.filter((task) => task.educamosUrl).slice(0, 2);
  const [notes, ...consignas] = await Promise.all([
    withDeadline(notesForSubject({ ...login, subject, query: topics.slice(-2).join(" "), requireText: true }), 14000, ""),
    ...withFiles.map((task) =>
      withDeadline(fetchTaskInstructions({ ...login, taskUrl: task.educamosUrl, taskTitle: task.title }), 14000, ""),
    ),
  ]);
  const asks = [
    ...pendingText,
    ...consignas.filter((_, index) => withFiles[index].status === "pending"),
  ].flatMap(asksIn);
  const pieces = [notes, ...consignas, ...fromTasks].map(clean).filter((piece) => piece.length > 40 && !ADMIN_TEXT.test(piece));
  return { topics, text: pieces.join("\n\n").slice(0, 7000), year, asks };
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

/** Mezcla las opciones para que la correcta no quede siempre en el mismo lugar. */
export function shuffleQuestion(question: QuizQuestion): QuizQuestion {
  const order = shuffle(question.options.map((_, index) => index));
  return { ...question, options: order.map((index) => question.options[index]), answer: order.indexOf(question.answer) };
}

function parseQuestions(raw: string): QuizQuestion[] {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return [];
  }
  const list = (data as { questions?: unknown; preguntas?: unknown }).questions ?? (data as { preguntas?: unknown }).preguntas;
  if (!Array.isArray(list)) return [];
  const out: QuizQuestion[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const prompt = clean(String(row.prompt ?? row.question ?? row.pregunta ?? ""));
    const rawOptions = Array.isArray(row.options) ? row.options : Array.isArray(row.opciones) ? row.opciones : [];
    const options = rawOptions.map((option) => clean(String(option ?? ""))).filter(Boolean);
    let answer = Number(row.answer ?? row.correcta);
    if (typeof row.answer === "string" && /^[a-d]$/i.test(row.answer.trim())) answer = row.answer.trim().toLowerCase().charCodeAt(0) - 97;
    const distinct = new Set(options.map((option) => option.toLowerCase())).size === options.length;
    if (prompt.length < 8 || prompt.length > 200 || options.length !== 4 || !distinct) continue;
    if (!Number.isInteger(answer) || answer < 0 || answer > 3) continue;
    if (options.some((option) => option.length > 90)) continue;
    out.push({ prompt, options, answer, why: clean(String(row.why ?? row.porque ?? "")).slice(0, 200) });
  }
  return out;
}

function halves<T>(items: T[]): [T[], T[]] {
  if (items.length < 2) return [items, items];
  const middle = Math.ceil(items.length / 2);
  return [items.slice(0, middle), items.slice(middle)];
}

function splitMaterial(material: Material): [Material, Material] {
  const [firstTopics, secondTopics] = halves(material.topics);
  const parts = material.text.split(/(?<=[.!?])\s+/);
  const [firstText, secondText] = parts.length > 6 ? halves(parts).map((part) => part.join(" ")) : [material.text, material.text];
  return [
    { ...material, topics: firstTopics, text: firstText },
    { ...material, topics: secondTopics, text: secondText },
  ];
}

async function modelBatch(subject: string, material: Material, count: number): Promise<QuizQuestion[]> {
  const prompt = [
    `Materia: ${subject}. Alumnos de ${material.year ? `${material.year}° año de ` : ""}secundaria (12 a 14 años si es primer año): preguntas a su nivel, nada universitario.`,
    material.topics.length ? `Temas recientes de la clase: ${material.topics.join("; ")}.` : "",
    material.text ? `Material del aula:\n${material.text}` : "No hay material escrito, solo los temas.",
    `Armá ${count} preguntas de opción múltiple para un juego tipo Kahoot que repase esos temas.`,
    "Cada pregunta tiene exactamente 4 opciones cortas (menos de 60 caracteres) y una sola correcta.",
    "Usá el material cuando lo haya. Si solo hay títulos de temas, preguntá los conceptos básicos de esos temas para ese año.",
    "Prohibido preguntar por fechas de entrega, nombres de profesores, notas, rúbricas, autorizaciones o datos del curso.",
    "No copies las preguntas de una consigna ni respondas lo que el alumno tiene que entregar: preguntá sobre los conceptos.",
    material.asks.length
      ? `Estas preguntas son de una tarea que el alumno todavía no entregó. No las hagas ni hagas parecidas, ni con otras palabras; preguntá sobre otras ideas del tema:\n${material.asks.slice(0, 12).map((ask) => `- ${ask.slice(0, 160)}`).join("\n")}`
      : "",
    'Respondé solo con JSON: {"questions":[{"prompt":"...","options":["...","...","...","..."],"answer":0,"why":"una frase de menos de 15 palabras"}]}',
  ]
    .filter(Boolean)
    .join("\n");
  const reply = await freeLlmReply(
    [
      { role: "system", content: "Sos un profe que arma quizzes cortos y claros en español rioplatense. Respondé solo con JSON válido, sin markdown." },
      { role: "user", content: scrubForAi(prompt) },
    ],
    { timeoutMs: 70000, perModelMs: 42000 },
  );
  return parseQuestions(reply?.content || reply?.reasoning || "");
}

/** Dos pedidos en paralelo, uno por mitad del material: el modelo gratis escribe lento y así tarda la mitad. */
async function modelQuestions(user: User, subject: string, material: Material): Promise<QuizQuestion[]> {
  const [first, second] = splitMaterial(material);
  const batches = await withAiShield(user, () =>
    Promise.all([modelBatch(subject, first, 4), modelBatch(subject, second, 4)].map((batch) => batch.catch(() => [] as QuizQuestion[]))),
  );
  const kept: QuizQuestion[] = [];
  for (const question of batches.flat()) {
    if (!copiesHomework(question, kept.map((item) => item.prompt))) kept.push(question);
  }
  return kept;
}

const STOP = new Set(
  "porque cuando donde entre sobre desde hasta tambien siempre ademas aunque mientras durante tienen puede pueden debemos deben otros otras estos estas todas todos cada parte forma manera".split(" "),
);

/** Sin modelo: preguntas de completar con palabras clave del propio material. */
function clozeQuestions(material: Material): QuizQuestion[] {
  const sentences = material.text
    .split(/(?<=[.!?])\s+/)
    .map((line) => clean(line).replace(/^(?:[A-ZÁÉÍÓÚÑ]{2,}[\s,:-]+){2,}/, ""))
    .filter((line) => line.length > 50 && line.length < 200 && !/^[-•*]|\s-\S|[¿?]/.test(line) && !RULES_LINE.test(line))
    .filter((line) => line.replace(/[^A-ZÁÉÍÓÚÑ]/g, "").length < line.length / 3);
  const keyword = (line: string) =>
    (line.match(/[A-Za-zÁÉÍÓÚÑáéíóúñ]{7,}/g) ?? [])
      .filter((word) => !STOP.has(word.toLowerCase()))
      .sort((a, b) => b.length - a.length)[0];
  const pool = [...new Set(sentences.map(keyword).filter((word): word is string => Boolean(word)).map((word) => word.toLowerCase()))];
  const out: QuizQuestion[] = [];
  for (const line of shuffle(sentences)) {
    const word = keyword(line);
    if (!word) continue;
    const others = shuffle(pool.filter((item) => item !== word.toLowerCase())).slice(0, 3);
    if (others.length < 3) break;
    out.push({
      prompt: `Completá: «${line.replace(word, "____")}»`,
      options: [word.toLowerCase(), ...others],
      answer: 0,
      why: `La frase del material dice «${word}».`,
    });
    if (out.length === QUESTIONS) break;
  }
  return out;
}

const quizCache = new Map<string, { at: number; quiz: PaperQuiz }>();

export async function buildPaperQuiz(
  user: User,
  subject: string,
  fresh = false,
): Promise<{ ok: true; quiz: PaperQuiz } | { ok: false; error: string }> {
  const name = subject.trim().slice(0, 160);
  if (!name) return { ok: false, error: "Elegí una materia." };
  const key = `${user.id}|${subjectKey(name)}`;
  const cached = quizCache.get(key);
  if (!fresh && cached && Date.now() - cached.at < 20 * 60 * 1000) {
    return { ok: true, quiz: { ...cached.quiz, questions: shuffle(cached.quiz.questions).map(shuffleQuestion) } };
  }
  const material = await quizMaterial(user, name);
  if (!material.text && material.topics.length === 0) {
    return { ok: false, error: `Todavía no hay temas de ${name} para armar un quiz.` };
  }
  const fromModel = await modelQuestions(user, name, material).catch(() => [] as QuizQuestion[]);
  let questions = fromModel.filter((question) => !copiesHomework(question, material.asks));
  if (questions.length < QUESTIONS) {
    const seen = new Set(questions.map((question) => question.prompt));
    const extra = clozeQuestions(material).filter((question) => !seen.has(question.prompt) && !copiesHomework(question, material.asks));
    questions = [...questions, ...extra.slice(0, QUESTIONS - questions.length)];
  }
  if (questions.length < 3) {
    return { ok: false, error: `No pude armar preguntas de ${name} con lo que hay en el aula. Probá con otra materia.` };
  }
  const quiz = { subject: name, topics: material.topics, questions: questions.slice(0, QUESTIONS).map(shuffleQuestion) };
  quizCache.set(key, { at: Date.now(), quiz });
  return { ok: true, quiz };
}
