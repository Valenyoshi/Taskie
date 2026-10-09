import type { User } from "./db";
import { listEnrolledSubjectNames, lmsBase, notesForSubject, topicsForSubject } from "./educamos";
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
    if ((kind === "teach" || kind === "explanation" || kind === "explica" || kind === "text") && teachText.trim() && !sillyPrompt(teachText)) {
      steps.push({ kind: "teach", text: teachText.trim().slice(0, 320) });
      continue;
    }
    const prompt = typeof row.prompt === "string" ? row.prompt : typeof row.pregunta === "string" ? row.pregunta : "";
    const rawOptions = Array.isArray(row.options) ? row.options : Array.isArray(row.opciones) ? row.opciones : null;
    if (!prompt.trim() || !rawOptions || sillyPrompt(prompt)) continue;
    const options = rawOptions
      .map((option) => (typeof option === "string" ? option : typeof option === "object" && option && "text" in option ? String((option as { text?: unknown }).text ?? "") : ""))
      .map((option) => option.trim())
      .filter(Boolean)
      .slice(0, 3);
    while (options.length < 3) options.push(options.length === 1 ? "Ninguna de esas" : "No está en la clase");
    let answer = Number(row.answer ?? row.correcta);
    if (typeof row.answer === "string" && /^[abc]$/i.test(row.answer.trim())) answer = row.answer.trim().toLowerCase().charCodeAt(0) - 97;
    if (!Number.isInteger(answer) || answer < 0 || answer > 2) answer = 0;
    steps.push({
      kind: "quiz",
      prompt: prompt.trim().slice(0, 220),
      options: options.map((option) => option.slice(0, 120)),
      answer,
      why: typeof row.why === "string" ? row.why.trim().slice(0, 220) : "",
    });
  }
  const teaches = steps.filter((step) => step.kind === "teach");
  const quizzes = steps.filter((step) => step.kind === "quiz");
  if (quizzes.length < 3) return null;
  if (teaches.length === 0) teaches.push({ kind: "teach", text: `Repaso corto de ${subject}.` });
  const picked = [...teaches.slice(0, 2), ...quizzes.slice(0, 4)];
  steps.length = 0;
  steps.push(...picked);
  const title = typeof data.title === "string" && data.title.trim() ? data.title.trim().slice(0, 80) : subject;
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
  const notes = await classNotes(user, clean, focus);
  const prompt = [
    `Materia: ${clean}.`,
    focus ? `Tema elegido por el alumno: ${focus}. Priorizá ese tema si aparece en el material.` : "",
    notes
      ? `Texto que puso el profesor. Explicá solo esto, como lo explicaría él:\n${notes.slice(0, 2800)}`
      : `No hay apunte del profesor. No inventes la clase.`,
    "La teoría tiene que explicar esa información, en 2 pasos type teach.",
    "Las preguntas tienen que comprobar datos de ese texto. 4 pasos type quiz, con options de 3, answer 0 1 o 2, y why.",
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
  const sentences = notes
    .split(/(?<=[.!?;])\s+|\n+/)
    .map((line) => line.replace(/^[-•]\s*/, "").trim())
    .filter((line) => line.length > 40 && !sillyPrompt(line));
  const chunks = (sentences.length > 0 ? sentences : [`No encontré un apunte del profesor en ${subject} para explicar.`]).slice(0, 3);
  return {
    subject,
    title: topic || subject,
    steps: chunks.map((text) => ({ kind: "teach" as const, text: text.slice(0, 320) })),
  };
}

type AutoLesson = { subject: string; title: string; lesson: Lesson };

const autoLessonCache = new Map<string, { at: number; lessons: AutoLesson[] }>();

async function lessonTopics(user: User, subject: string): Promise<string[]> {
  const now = new Date();
  const today = localDateString(now, user.timezone);
  const start = addDays(today, -7);
  const recent = listTasks(user.id)
    .filter((task) => {
      const day = localDateString(new Date(task.dueAt), user.timezone);
      return task.subject === subject && day >= start && day <= today;
    })
    .map((task) => task.title.trim())
    .filter(Boolean);
  const topics = new Set(recent);
  if (!user.isDemo && user.educamosUrl && user.educamosUsername && user.educamosPasswordEnc) {
    try {
      const classroom = lmsBase(user.educamosUrl, user.lmsUrl);
      if (classroom) {
        for (const topic of await topicsForSubject({
          lmsUrl: classroom,
          username: user.educamosUsername,
          password: decryptSecret(user.educamosPasswordEnc),
          subject,
        })) {
          topics.add(topic);
        }
      }
    } catch {
      // Las tareas recientes alcanzan para mostrar una propuesta si el aula no responde.
    }
  }
  return [...topics].slice(0, 2);
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
        const choices = topics.length > 0 ? topics : [subject];
        return Promise.all(
          choices.slice(0, 2).map(async (topic) => {
            const result = await buildLesson(user, subject, topic);
            return result.ok ? { subject, title: result.lesson.title, lesson: result.lesson } : null;
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
