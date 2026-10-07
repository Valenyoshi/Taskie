import type { User } from "./db";
import { fetchTeachingNotes, lmsBase } from "./educamos";
import { decryptSecret } from "./secret";

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
    if ((kind === "teach" || kind === "explanation" || kind === "explica" || kind === "text") && teachText.trim()) {
      steps.push({ kind: "teach", text: teachText.trim().slice(0, 320) });
      continue;
    }
    const prompt = typeof row.prompt === "string" ? row.prompt : typeof row.pregunta === "string" ? row.pregunta : "";
    const rawOptions = Array.isArray(row.options) ? row.options : Array.isArray(row.opciones) ? row.opciones : null;
    if (!prompt.trim() || !rawOptions) continue;
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
    signal: AbortSignal.timeout(40000),
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

async function classMaterial(user: User, subject: string): Promise<string> {
  if (user.isDemo || !user.educamosUrl || !user.educamosUsername || !user.educamosPasswordEnc) return "";
  const classroom = lmsBase(user.educamosUrl, user.lmsUrl);
  if (!classroom) return "";
  try {
    const notes = await withDeadline(
      fetchTeachingNotes({
        lmsUrl: classroom,
        username: user.educamosUsername,
        password: decryptSecret(user.educamosPasswordEnc),
        question: `Repaso corto de ${subject}. Qué enseña el profesor y qué todavía no.`,
      }),
      12000,
      { ok: false as const, error: "tardó" },
    );
    return notes.ok ? notes.brief : "";
  } catch {
    return "";
  }
}

export async function buildLesson(user: User, subject: string): Promise<{ ok: true; lesson: Lesson } | { ok: false; error: string }> {
  const clean = subject.trim().slice(0, 80);
  if (!clean) return { ok: false, error: "Elegí una materia." };
  const material = await classMaterial(user, clean);
  const prompt = [
    `Materia: ${clean}.`,
    "Armá un repaso de menos de 3 minutos, con lo que el profesor enseña.",
    "No resuelvas una entrega ni copies una tarea.",
    "JSON con title y steps. Exactamente 2 steps kind teach (text, máximo 2 oraciones) y 4 kind quiz.",
    "Cada quiz tiene prompt, options de 3 textos cortos, answer 0 1 o 2, y why de una oración.",
    material ? `Clases:\n${material.slice(0, 6000)}` : "No hay apuntes. Hacé un repaso breve del nombre de la materia y decilo en el primer teach.",
  ].join("\n");

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await modelJson(attempt === 0 ? prompt : `${prompt}\nEl intento anterior no era JSON válido. Devolvé solo el objeto.`);
      if (!raw) continue;
      const lesson = parseLesson(raw, clean);
      if (lesson) return { ok: true, lesson };
    } catch {
      // Otro intento.
    }
  }
  return { ok: true, lesson: fallbackLesson(clean, material) };
}

function fallbackLesson(subject: string, material: string): Lesson {
  const lines = material
    .split("\n")
    .map((line) => line.replace(/^[-•]\s*/, "").trim())
    .filter((line) => line.length > 24 && !line.startsWith("Materia:"));
  const first = lines[0]?.slice(0, 280) || `En ${subject} repasá lo que el profesor ya explicó.`;
  const second = lines[1]?.slice(0, 280) || "Si algo no apareció en la clase, no lo tomes como si ya lo hubieran dado.";
  return {
    subject,
    title: `Repaso de ${subject}`,
    steps: [
      { kind: "teach", text: first },
      { kind: "teach", text: second },
      {
        kind: "quiz",
        prompt: "¿Para qué es este repaso?",
        options: ["Para copiar la entrega", "Para repasar lo de clase", "Para saltear la materia"],
        answer: 1,
        why: "Es un repaso corto, no la tarea hecha.",
      },
      {
        kind: "quiz",
        prompt: "Si un tema no está en la clase, ¿qué hacés?",
        options: ["Lo estudio igual como si lo hubieran dado", "Lo dejo para cuando lo den", "Lo entrego igual"],
        answer: 1,
        why: "El repaso sigue lo que el profesor ya enseñó.",
      },
      {
        kind: "quiz",
        prompt: `¿De qué materia es este repaso?`,
        options: [subject.slice(0, 80), "De ninguna", "De todas juntas"],
        answer: 0,
        why: `Estás repasando ${subject}.`,
      },
      {
        kind: "quiz",
        prompt: "¿Cuánto debería durar el repaso?",
        options: ["Menos de 3 minutos", "Una hora", "Todo el día"],
        answer: 0,
        why: "Es una lección corta para repasar.",
      },
    ],
  };
}
