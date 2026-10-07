import type { User } from "./db";
import { listEnrolledSubjectNames, lmsBase, topicsForSubject } from "./educamos";
import { decryptSecret } from "./secret";
import { dedupeSubjects } from "./subject-color";

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
  return /para que es este repaso|de que materia es|cuanto deberia durar|cuanto dura el repaso|saltear la materia|copiar la entrega|para que es el repaso/.test(text);
}

async function classTopics(user: User, subject: string): Promise<string[]> {
  if (user.isDemo || !user.educamosUrl || !user.educamosUsername || !user.educamosPasswordEnc) return [];
  const classroom = lmsBase(user.educamosUrl, user.lmsUrl);
  if (!classroom) return [];
  try {
    return await withDeadline(
      topicsForSubject({
        lmsUrl: classroom,
        username: user.educamosUsername,
        password: decryptSecret(user.educamosPasswordEnc),
        subject,
      }),
      7000,
      [] as string[],
    );
  } catch {
    return [];
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

export async function buildLesson(user: User, subject: string): Promise<{ ok: true; lesson: Lesson } | { ok: false; error: string }> {
  const clean = subject.trim().slice(0, 160);
  if (!clean) return { ok: false, error: "Elegí una materia." };
  const topics = await classTopics(user, clean);
  const prompt = [
    `Materia: ${clean}.`,
    topics.length ? `Temas de la clase, en orden:\n${topics.map((topic) => `- ${topic}`).join("\n")}` : `No hay índice. Inventá un repaso breve y real de ${clean}, de secundaria.`,
    "Las preguntas tienen que ser sobre esos temas. Prohibido preguntar para qué es el repaso, de qué materia es o cuánto dura.",
    "No resuelvas una entrega.",
    "JSON con title y steps. 2 steps con type teach y text. 4 steps con type quiz, prompt, options de 3, answer 0 1 o 2, y why.",
  ].join("\n");

  try {
    const raw = await modelJson(prompt);
    const lesson = raw ? parseLesson(raw, clean) : null;
    if (lesson) return { ok: true, lesson };
  } catch {
    // Si el modelo no devuelve un repaso usable, se arma con los temas de la clase.
  }
  return { ok: true, lesson: fallbackLesson(clean, topics) };
}

export function fallbackLesson(subject: string, topics: string[]): Lesson {
  const useful = [...new Set(topics.map((topic) => topic.trim()).filter((topic) => topic.length > 2))].slice(0, 6);
  const focus = useful.length > 0 ? useful : [subject];
  const teach = useful.length
    ? `En ${subject} están viendo ${focus.slice(0, 3).join(", ")}.`
    : `Repaso de ${subject}: quedate con las ideas que el profesor ya explicó en clase.`;
  const second = focus[3]
    ? `Más adelante en la misma materia aparece ${focus.slice(3).join(", ")}.`
    : `Esos temas van en el orden de la clase. Lo que todavía no dieron, no lo tomes como visto.`;
  const quizzes = [0, 1, 2, 3].map((index) => {
    const correct = focus[index % focus.length] ?? subject;
    const others = focus.filter((topic) => topic !== correct);
    const wrongs = [others[0] ?? "Un tema de otra materia", others[1] ?? "Algo que todavía no dieron"];
    const options = [correct, wrongs[0], wrongs[1]];
    return {
      kind: "quiz" as const,
      prompt: `Sobre ${subject}: ¿cuál de estos temas está en la clase?`,
      options,
      answer: 0,
      why: `${correct} es parte de lo que están viendo.`,
    };
  });
  return {
    subject,
    title: focus[0] && focus[0] !== subject ? focus[0] : `Repaso de ${subject}`,
    steps: [
      { kind: "teach", text: teach },
      { kind: "teach", text: second },
      ...quizzes,
    ],
  };
}
