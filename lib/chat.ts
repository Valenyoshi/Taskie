import { listTasks, type Task, type User } from "./db";
import { levelFromTasks, PULL_COST } from "./game";
import { dueLabel, localDateString, weekStart, addDays } from "./time";

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
    `Alumno: ${user.name}. Nivel ${level.level} (${level.into}/${level.need} XP), ${user.points} puntos, racha ${user.streak}.`,
    `Cada 2 tareas alcanzan para un giro de ${PULL_COST} puntos.`,
    lines.length ? lines.join("\n") : "No hay tareas cargadas.",
  ].join("\n");
}

export function localAnswer(message: string, user: User, tasks: Task[] = listTasks(user.id)): string {
  const q = fold(message);
  const today = localDateString(new Date(), user.timezone);
  const todayTasks = tasks.filter((task) => localDateString(new Date(task.dueAt), user.timezone) === today);
  const pending = tasks.filter((task) => task.status === "pending");
  const level = levelFromTasks(tasks.filter((task) => task.status === "done").length);
  const intro = process.env.GEMINI_API_KEY
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
      ? `${intro}Tenés ${user.points} puntos. Ya te alcanza para una tirada de ${PULL_COST}.`
      : `${intro}Tenés ${user.points} puntos. Te faltan ${missing} para una tirada de ${PULL_COST}. Cada 2 tareas alcanzan.`;
  }

  if (/nivel|xp|experiencia|racha/.test(q)) {
    return `${intro}Estás en nivel ${level.level}, con ${level.into} de ${level.need} XP. La barra se llena con los trabajos: hasta el nivel 5 son 3, después 4 y desde el 10 son 5. La racha es de ${user.streak} días.`;
  }

  const next = pending[0];
  return `${intro}Puedo decirte qué vence hoy, de qué materia es y cómo vas con los puntos. ${
    next ? `Lo próximo es ${next.title}, de ${next.subject}.` : "No tenés tareas pendientes."
  }`;
}

export async function answerWithModel(message: string, history: { role: "user" | "assistant"; content: string }[], user: User): Promise<string> {
  const tasks = listTasks(user.id);
  const fallback = () => localAnswer(message, user, tasks);
  const key = process.env.GEMINI_API_KEY;
  if (!key) return fallback();

  const system = [
    "Sos un compañero de estudio. Hablás de vos, en español claro y corto.",
    "Ayudás con las tareas de este alumno: qué tiene que hacer, de qué materia es, cómo organizarse y dudas de estudio.",
    "No inventes notas, fechas ni tareas que no estén en el resumen. No pidas ni repitas contraseñas.",
    "Resumen de la cuenta:",
    taskSnapshot(user, tasks),
  ].join("\n");

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
