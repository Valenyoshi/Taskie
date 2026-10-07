import { listTasks, type Task, type User } from "./db";
import { asksForLesson, fetchTeachingNotes, lmsBase } from "./educamos";
import { levelFromTasks, PULL_COST } from "./game";
import { decryptSecret } from "./secret";
import { dueLabel, localDateString, pendingIsCurrent, weekStart, addDays } from "./time";

function currentTasks(user: User): Task[] {
  return listTasks(user.id).filter((task) => task.status === "done" || pendingIsCurrent(task.dueAt, user.timezone));
}

function fold(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function taskSnapshot(user: User, tasks: Task[]): string {
  const today = localDateString(new Date(), user.timezone);
  const start = weekStart(today);
  const end = addDays(start, 6);
  const lines = tasks.map((task) => {
    const day = localDateString(new Date(task.dueAt), user.timezone);
    const when = day >= start && day <= end ? "esta semana" : day < start ? "de antes" : "más adelante";
    const state = task.status === "done" ? (task.onTime ? "entregada a tiempo" : "entregada tarde") : "pendiente";
    return `- ${task.subject}: ${task.title}. ${state}. ${dueLabel(task.dueAt, user.timezone)}. (${when})`;
  });
  const level = levelFromTasks(tasks.filter((task) => task.status === "done").length);
  return [
    `Alumno: ${user.name}. Nivel ${level.level} (${level.into}/${level.need} XP), ${user.points} sombreros, racha ${user.streak}.`,
    `Cada 2 tareas alcanzan para un giro de ${PULL_COST} sombreros.`,
    lines.length ? lines.join("\n") : "No hay tareas cargadas.",
  ].join("\n");
}

export function localAnswer(message: string, user: User, tasks: Task[] = currentTasks(user)): string {
  const q = fold(message);
  const today = localDateString(new Date(), user.timezone);
  const todayTasks = tasks.filter((task) => localDateString(new Date(task.dueAt), user.timezone) === today);
  const pending = tasks.filter((task) => task.status === "pending");
  const level = levelFromTasks(tasks.filter((task) => task.status === "done").length);
  const intro = process.env.FREELLMAPI_API_KEY || process.env.GEMINI_API_KEY
    ? ""
    : "El modelo gratuito todavía no está conectado, así que te respondo con lo que hay en tu cuenta. ";

  if (/hoy|vence|pendient|tarea/.test(q)) {
    if (todayTasks.length === 0) {
      return `${intro}Hoy no vence ninguna tarea. Tenés ${pending.length} pendiente${pending.length === 1 ? "" : "s"} en total.`;
    }
    const list = todayTasks
      .map((task) => `${task.subject}: ${task.title} (${task.status === "done" ? "lista" : "sin entregar"})`)
      .join(" ");
    const done = todayTasks.filter((task) => task.onTime).length;
    return `${intro}Hoy vencen ${todayTasks.length}. A tiempo van ${done}. ${list}`;
  }

  if (/semana/.test(q)) {
    const start = weekStart(today);
    const end = addDays(start, 6);
    const week = tasks.filter((task) => {
      const day = localDateString(new Date(task.dueAt), user.timezone);
      return day >= start && day <= end;
    });
    const list = week.map((task) => `${task.subject}: ${task.title}`).join("; ");
    return `${intro}Esta semana hay ${week.length} tareas. ${list || "Nada cargado en estos días."}`;
  }

  if (/materia|asignatura/.test(q)) {
    const subjects = [...new Set(tasks.map((task) => task.subject))];
    return `${intro}Tus materias con tareas son: ${subjects.join(", ") || "ninguna todavía"}.`;
  }

  if (/punto|tirada|maquina|máquina/.test(q)) {
    const missing = Math.max(0, PULL_COST - user.points);
    return missing === 0
      ? `${intro}Tenés ${user.points} sombreros. Ya te alcanza para una tirada de ${PULL_COST}.`
      : `${intro}Tenés ${user.points} sombreros. Te faltan ${missing} para una tirada de ${PULL_COST}. Cada 2 tareas alcanzan.`;
  }

  if (/nivel|xp|experiencia|racha/.test(q)) {
    return `${intro}Estás en nivel ${level.level}, con ${level.into} de ${level.need} XP. La barra se llena con los trabajos: hasta el nivel 5 son 3, después 4 y desde el 10 son 5. La racha es de ${user.streak} días.`;
  }

  const next = pending[0];
  return `${intro}Puedo decirte qué vence hoy, de qué materia es y cómo vas con los sombreros. ${
    next ? `Lo próximo es ${next.title}, de ${next.subject}.` : "No tenés tareas pendientes."
  }`;
}

function studySystem(user: User, tasks: Task[], classes = ""): string {
  return [
    "Sos un compañero de estudio. Hablás de vos, en español claro y corto.",
    "Ayudás con las tareas de este alumno: qué tiene que hacer, de qué materia es, cómo organizarse y dudas de estudio.",
    "No inventes notas, fechas ni tareas que no estén en el resumen. No pidas ni repitas contraseñas.",
    classes
      ? [
          "Si te piden que expliques un tema, hacé de profesor de esa materia.",
          "Usá solo el bloque Clases: el mismo orden, las mismas palabras y los mismos ejemplos.",
          "Enseñá lo que la clase enseña. No adelantes lo que no aparece.",
          "Si el tema no está en las clases, decilo. No lo presentes como si el profesor lo hubiera dado.",
          "Clases:",
          classes,
        ].join("\n")
      : "",
    "Resumen de la cuenta:",
    taskSnapshot(user, tasks),
  ]
    .filter(Boolean)
    .join("\n");
}

async function classNotes(user: User, message: string): Promise<string> {
  if (!asksForLesson(message) || user.isDemo || !user.educamosUrl || !user.educamosUsername || !user.educamosPasswordEnc) {
    return "";
  }
  const classroom = lmsBase(user.educamosUrl, user.lmsUrl);
  if (!classroom) return "";
  let password = "";
  try {
    password = decryptSecret(user.educamosPasswordEnc);
  } catch {
    return "No pude abrir las clases. No inventes que las leíste.";
  }
  try {
    const notes = await fetchTeachingNotes({
      lmsUrl: classroom,
      username: user.educamosUsername,
      password,
      question: message,
    });
    if (!notes.ok) return `No pude leer las clases (${notes.error}). No inventes que las viste.`;
    if (!notes.brief.trim()) return "En el aula no hay material de clase para leer. Decilo, y no inventes una explicación del profesor.";
    return notes.brief;
  } catch {
    return "No pude leer las clases. No inventes que las viste.";
  }
}

async function answerWithFreeLlm(
  message: string,
  history: { role: "user" | "assistant"; content: string }[],
  system: string,
): Promise<string | null> {
  const base = process.env.FREELLMAPI_BASE_URL?.replace(/\/$/, "");
  const key = process.env.FREELLMAPI_API_KEY;
  if (!base || !key) return null;
  const model = process.env.FREELLMAPI_MODEL || "kilo-auto/free";
  const messages = [
    { role: "system", content: system },
    ...history.slice(-10).map((item) => ({ role: item.role, content: item.content })),
    { role: "user", content: message },
  ];
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    signal: AbortSignal.timeout(25000),
    body: JSON.stringify({ model, messages }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content?.trim();
  return text || null;
}

export async function answerWithModel(message: string, history: { role: "user" | "assistant"; content: string }[], user: User): Promise<string> {
  const tasks = currentTasks(user);
  const fallback = () => localAnswer(message, user, tasks);
  const classes = await classNotes(user, message);
  const system = studySystem(user, tasks, classes);

  try {
    const free = await answerWithFreeLlm(message, history, system);
    if (free) return free;
  } catch {
    // Si FreeLLMAPI no responde, seguimos con el otro modelo o con los datos locales.
  }

  const key = process.env.GEMINI_API_KEY;
  const triedFree = Boolean(process.env.FREELLMAPI_API_KEY && process.env.FREELLMAPI_BASE_URL);
  if (!triedFree && !key) return fallback();
  if (!key) return `El modelo no respondió. ${fallback()}`;

  const contents = [
    ...history.slice(-10).map((item) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.content }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  for (const model of ["gemini-2.5-flash", "gemini-2.0-flash"]) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: AbortSignal.timeout(20000),
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents,
          }),
        },
      );
      if (!res.ok) continue;
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
      if (text) return text;
    } catch {
      // Probamos el otro modelo y, si tampoco responde, usamos los datos locales.
    }
  }
  return `El modelo no respondió. ${fallback()}`;
}
