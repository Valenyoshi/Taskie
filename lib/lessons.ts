import type { User } from "./db";
import { listEnrolledSubjectNames, lmsBase, notesForSubject, recentClassTopics } from "./educamos";
import { decryptSecret } from "./secret";
import { dedupeSubjects } from "./subject-color";
import { listTasks } from "./db";
import { addDays, localDateString } from "./time";

export type TeachStep = { kind: "teach"; text: string };
export type QuizStep = { kind: "quiz"; prompt: string; options: string[]; answer: number; why: string };
export type LessonStep = TeachStep | QuizStep;

export type Lesson = {
  subject: string;
  title: string;
  steps: LessonStep[];
};

function cleanLessonText(value: string): string {
  return value
    .replace(/Ã¡/g, "á")
    .replace(/Ã©/g, "é")
    .replace(/Ã­/g, "í")
    .replace(/Ã³/g, "ó")
    .replace(/Ãº/g, "ú")
    .replace(/Ã±/g, "ñ")
    .replace(/Â¿/g, "¿")
    .replace(/Â¡/g, "¡")
    .replace(/â€™/g, "’")
    .replace(/â€œ|â€/g, '"')
    .replace(/\uFFFD|�|□|◻|◼/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/\s+/g, " ")
    .normalize("NFC")
    .trim();
}

function readableLessonText(value: string): boolean {
  const clean = cleanLessonText(value);
  return clean.length >= 3 && !/[�□◻◼]/.test(value);
}

function parseLesson(raw: string, subject: string): Lesson | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let data: { title?: unknown; steps?: unknown };
  try {
    data = JSON.parse(raw.slice(start, end + 1)) as { title?: unknown; steps?: unknown };
  } catch {
    return null;
  }
  if (!Array.isArray(data.steps)) return null;
  const steps: LessonStep[] = [];
  for (const step of data.steps) {
    if (!step || typeof step !== "object") return null;
    const row = step as {
      kind?: unknown;
      type?: unknown;
      text?: unknown;
      prompt?: unknown;
      pregunta?: unknown;
      options?: unknown;
      opciones?: unknown;
      answer?: unknown;
      correcta?: unknown;
      why?: unknown;
    };
    const kind = String(row.kind ?? row.type ?? "").toLowerCase();
    const teachText = typeof row.text === "string" ? row.text : typeof row.prompt === "string" && /teach|explica|texto/.test(kind) ? row.prompt : "";
    const cleanTeach = cleanLessonText(teachText);
    if (
      (kind === "teach" || kind === "explanation" || kind === "explica" || kind === "text") &&
      readableLessonText(teachText) &&
      !sillyPrompt(cleanTeach) &&
      !looksLikeQuestion(cleanTeach)
    ) {
      steps.push({ kind: "teach", text: cleanTeach.slice(0, 320) });
      continue;
    }
    const prompt = typeof row.prompt === "string" ? row.prompt : typeof row.pregunta === "string" ? row.pregunta : "";
    const cleanPrompt = cleanLessonText(prompt);
    const rawOptions = Array.isArray(row.options) ? row.options : Array.isArray(row.opciones) ? row.opciones : null;
    if (!readableLessonText(prompt) || !rawOptions || sillyPrompt(cleanPrompt)) continue;
    const options = rawOptions
      .map((option) => (typeof option === "string" ? option : typeof option === "object" && option && "text" in option ? String((option as { text?: unknown }).text ?? "") : ""))
      .map((option) => cleanLessonText(option))
      .filter(Boolean)
      .slice(0, 3);
    while (options.length < 3) options.push(options.length === 1 ? "Ninguna de esas" : "No está en la clase");
    let answer = Number(row.answer ?? row.correcta);
    if (typeof row.answer === "string" && /^[abc]$/i.test(row.answer.trim())) answer = row.answer.trim().toLowerCase().charCodeAt(0) - 97;
    if (!Number.isInteger(answer) || answer < 0 || answer > 2) answer = 0;
    steps.push({
      kind: "quiz",
      prompt: cleanPrompt.slice(0, 220),
      options: options.map((option) => option.slice(0, 120)),
      answer,
      why: typeof row.why === "string" ? cleanLessonText(row.why).slice(0, 220) : "",
    });
  }
  const teaches = steps.filter((step) => step.kind === "teach");
  const quizzes = steps.filter((step) => step.kind === "quiz");
  if (quizzes.length < 3) return null;
  if (teaches.length === 0) teaches.push({ kind: "teach", text: `Repaso corto de ${subject}.` });
  const picked = [...teaches.slice(0, 2), ...quizzes.slice(0, 4)];
  steps.length = 0;
  steps.push(...picked);
  const title = typeof data.title === "string" && readableLessonText(data.title) ? cleanLessonText(data.title).slice(0, 80) : subject;
  return { subject, title, steps };
}

async function modelJson(prompt: string): Promise<string | null> {
  const base = process.env.FREELLMAPI_BASE_URL?.replace(/\/$/, "");
  const key = process.env.FREELLMAPI_API_KEY;
  if (!base || !key) return null;
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(22000),
    body: JSON.stringify({
      model: process.env.FREELLMAPI_MODEL || "kilo-auto/free",
      messages: [
        {
          role: "system",
          content:
            "Respondé solo con JSON válido, sin markdown. El repaso dura menos de 3 minutos. No escribas la tarea del alumno ni las respuestas de una entrega.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { choices?: { message?: { content?: string; reasoning?: string } }[] };
  const message = data.choices?.[0]?.message;
  return message?.content?.trim() || message?.reasoning?.trim() || null;
}

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

function sillyPrompt(value: string): boolean {
  const text = value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  return /para que es este repaso|para que es el repaso|de que materia es|cuanto deberia durar|cuanto dura el repaso|saltear la materia|copiar la entrega|no se ha visto|no se vio|todavia no|que no vieron|esta en la clase|cual de estos temas|tema de otra materia|algo que todavia/.test(text);
}

function looksLikeQuestion(value: string): boolean {
  return /[¿?]/.test(value) || /^(qu[eé]|c[oó]mo|cu[aá]l|por qu[eé]|verdadero|falso)\b/i.test(value.trim());
}

async function classNotes(user: User, subject: string, query = ""): Promise<string> {
  if (user.isDemo || !user.educamosUrl || !user.educamosUsername || !user.educamosPasswordEnc) return "";
  const classroom = lmsBase(user.educamosUrl, user.lmsUrl);
  if (!classroom) return "";
  try {
    return await withDeadline(
      notesForSubject({
        lmsUrl: classroom,
        username: user.educamosUsername,
        password: decryptSecret(user.educamosPasswordEnc),
        subject,
        query,
        requireText: true,
      }),
      14000,
      "",
    );
  } catch {
    return "";
  }
}

export async function subjectChoices(user: User, fromTasks: string[]): Promise<string[]> {
  const names = new Set(fromTasks.map((subject) => subject.trim()).filter(Boolean));
  if (!user.isDemo && user.educamosUrl && user.educamosUsername && user.educamosPasswordEnc) {
    const classroom = lmsBase(user.educamosUrl, user.lmsUrl);
    if (classroom) {
      try {
        const enrolled = await withDeadline(
          listEnrolledSubjectNames({
            lmsUrl: classroom,
            username: user.educamosUsername,
            password: decryptSecret(user.educamosPasswordEnc),
          }),
          8000,
          [] as string[],
        );
        for (const name of enrolled) names.add(name);
      } catch {
        // Si el aula no abre, quedan las materias que ya tienen tareas.
      }
    }
  }
  return dedupeSubjects([...names]);
}

export async function buildLesson(user: User, subject: string, topic = ""): Promise<{ ok: true; lesson: Lesson } | { ok: false; error: string }> {
  const clean = subject.trim().slice(0, 160);
  if (!clean) return { ok: false, error: "Elegí una materia." };
  const focus = topic.trim().slice(0, 160);
  const rawNotes = await classNotes(user, clean, focus);
  const notes = NON_LESSON_CONTENT.test(rawNotes) ? "" : rawNotes;
  const prompt = [
    `Materia: ${clean}.`,
    focus ? `Tema elegido por el alumno: ${focus}. Priorizá ese tema si aparece en el material.` : "",
    notes
      ? `Texto que puso el profesor. Explicá solo esto, como lo explicaría él:\n${cleanLessonText(notes).slice(0, 2800)}`
      : `No hay apunte del profesor. No inventes la clase.`,
    "La teoría tiene que enseñar esa información en 2 pasos type teach, con afirmaciones claras y completas. Nunca escribas preguntas en los pasos teach.",
    "Después agregá 4 pasos type quiz para comprobar datos del texto, con options de 3, answer 0 1 o 2, y why.",
    "Prohibido preguntar qué no se vio, qué tema está en la clase, para qué es el repaso o de qué materia es.",
    "No escribas la entrega.",
  ].join("\n");

  if (!notes) return { ok: true, lesson: lessonFromNotes(clean, "", focus) };
  try {
    const raw = await modelJson(prompt);
    const lesson = raw ? parseLesson(raw, clean) : null;
    if (lesson && lesson.steps.some((step) => step.kind === "teach" && step.text.length > 40)) return { ok: true, lesson };
  } catch {
    // Si el modelo no explica el apunte, se muestran las frases del profesor.
  }
  return { ok: true, lesson: lessonFromNotes(clean, notes, focus) };
}

export function fallbackLesson(subject: string, notes: string, topic = ""): Lesson {
  return lessonFromNotes(subject, notes, topic);
}

function lessonFromNotes(subject: string, notes: string, topic = ""): Lesson {
  const source = readableLessonText(notes) ? cleanLessonText(notes) : "";
  const sentences = source
    .split(/(?<=[.!?;])\s+|\n+/)
    .map((line) => line.replace(/^[-•]\s*/, "").trim())
    .filter((line) => line.length > 40 && !sillyPrompt(line) && !looksLikeQuestion(line));
  const chunks = (sentences.length > 0 ? sentences : [`No encontré un apunte del profesor en ${subject} para explicar.`]).slice(0, 3);
  const teaches: LessonStep[] = chunks.slice(0, 2).map((text) => ({ kind: "teach" as const, text: text.slice(0, 320) }));
  const quizzes: LessonStep[] = sentences.length
    ? chunks.map((text, index) => ({
        kind: "quiz" as const,
        prompt: `Según la clase, ¿qué idea aparece en el apunte ${index + 1}?`,
        options: [
          cleanLessonText(text).slice(0, 110),
          "Una idea que no aparece en el material.",
          "No se puede saber con esta clase.",
        ],
        answer: 0,
        why: "Esa idea está escrita en el material de la clase.",
      }))
    : [];
  return {
    subject,
    title: topic || subject,
    steps: [...teaches, ...quizzes],
  };
}

type AutoLesson = { subject: string; title: string; lesson: Lesson };

const autoLessonCache = new Map<string, { at: number; lessons: AutoLesson[] }>();
const NON_LESSON_TITLE =
  /diagn[oó]stic|presentaci[oó]n|acuerdo pedag[oó]gico|bienvenid|actividad inicial|r[uú]brica|evaluaci[oó]n|grupos?\b|player\b|material gris|gu[ií]a\s+(?:para\s+el\s+)?proyecto/i;
const NON_LESSON_CONTENT =
  /nombre\s+y\s+apellido|profesor(?:a)?\s*:|formato\s+a\s+presentar|envi[aá]ndolo\s+a|subobjetivos|objetivo\s*[_—-]{2,}|[\w.+-]+@[\w.-]+\.[a-z]{2,}/i;

async function lessonTopics(user: User, subject: string): Promise<string[]> {
  if (user.isDemo || !user.educamosUrl || !user.educamosUsername || !user.educamosPasswordEnc) return [];
  try {
    const classroom = lmsBase(user.educamosUrl, user.lmsUrl);
    if (!classroom) return [];
    const topics = await recentClassTopics({
      lmsUrl: classroom,
      username: user.educamosUsername,
      password: decryptSecret(user.educamosPasswordEnc),
      subject,
    });
    return topics.filter((topic) => !NON_LESSON_TITLE.test(topic)).slice(-2);
  } catch {
    return [];
  }
}

export async function autoLessons(user: User, subjects: string[]): Promise<AutoLesson[]> {
  const key = user.id;
  const cached = autoLessonCache.get(key);
  if (cached && Date.now() - cached.at < 10 * 60 * 1000) return cached.lessons;
  const unique = dedupeSubjects(subjects).slice(0, 12);
  const lessons = (
    await Promise.all(
      unique.map(async (subject) => {
        const topics = await lessonTopics(user, subject);
        if (topics.length === 0) return [];
        return Promise.all(
          topics.map(async (topic) => {
            const result = await buildLesson(user, subject, topic);
            if (!result.ok || !result.lesson.steps.some((step) => step.kind === "quiz")) return null;
            return { subject, title: result.lesson.title, lesson: result.lesson };
          }),
        );
      }),
    )
  )
    .flat()
    .filter((item): item is AutoLesson => item !== null);
  autoLessonCache.set(key, { at: Date.now(), lessons });
  return lessons;
}

export function cachedAutoLesson(userId: string, subject: string, title: string): Lesson | null {
  const cached = autoLessonCache.get(userId);
  return cached?.lessons.find((item) => item.subject === subject && item.title === title)?.lesson ?? null;
}

export function hasRecentLessonSubject(user: User, subject: string): boolean {
  const today = localDateString(new Date(), user.timezone);
  const start = addDays(today, -7);
  return listTasks(user.id).some((task) => {
    const day = localDateString(new Date(task.dueAt), user.timezone);
    return task.subject === subject && day >= start && day <= today && !NON_LESSON_TITLE.test(task.title);
  });
}
