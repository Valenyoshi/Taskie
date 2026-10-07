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
    const row = step as { kind?: unknown; text?: unknown; prompt?: unknown; options?: unknown; answer?: unknown; why?: unknown };
    if (row.kind === "teach" && typeof row.text === "string" && row.text.trim()) {
      steps.push({ kind: "teach", text: row.text.trim().slice(0, 320) });
      continue;
    }
    if (row.kind !== "quiz" || typeof row.prompt !== "string" || !Array.isArray(row.options)) return null;
    const options = row.options.filter((option): option is string => typeof option === "string" && option.trim().length > 0).slice(0, 3);
    const answer = Number(row.answer);
    if (options.length !== 3 || !Number.isInteger(answer) || answer < 0 || answer > 2) return null;
    steps.push({
      kind: "quiz",
      prompt: row.prompt.trim().slice(0, 220),
      options: options.map((option) => option.trim().slice(0, 120)),
      answer,
      why: typeof row.why === "string" ? row.why.trim().slice(0, 220) : "",
    });
  }
  const quizzes = steps.filter((step) => step.kind === "quiz").length;
  const teaches = steps.filter((step) => step.kind === "teach").length;
  if (teaches < 1 || teaches > 2 || quizzes < 3 || quizzes > 5) return null;
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
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() || null;
}

async function classMaterial(user: User, subject: string): Promise<string> {
  if (user.isDemo || !user.educamosUrl || !user.educamosUsername || !user.educamosPasswordEnc) return "";
  const classroom = lmsBase(user.educamosUrl, user.lmsUrl);
  if (!classroom) return "";
  try {
    const notes = await fetchTeachingNotes({
      lmsUrl: classroom,
      username: user.educamosUsername,
      password: decryptSecret(user.educamosPasswordEnc),
      question: `Repaso corto de ${subject}. Qué enseña el profesor y qué todavía no.`,
    });
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
  return { ok: false, error: "No pude armar el repaso. Probá de nuevo." };
}
