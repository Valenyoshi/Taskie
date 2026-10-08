import { listTasks, type Task, type User } from "./db";
import { asksForLesson, fetchTaskInstructions, lmsBase, notesForSubject } from "./educamos";
import { levelFromTasks, PULL_COST } from "./game";
import { blockedAnswer, homeworkBlock, isGreeting } from "./no-homework";
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
    "Si te piden que expliques cómo hacer una tarea, qué hay que hacer o de qué se trata, explicalo. No te niegues.",
    "Solo negá cuando pidan la entrega ya escrita, los ejercicios resueltos o las respuestas para copiar.",
    "Sos un compañero de estudio. Hablás de vos, en español claro y corto.",
    "Ayudás a entender temas, a ver qué tiene pendiente, de qué materia es y cómo organizarse.",
    "No inventes notas, fechas ni tareas que no estén en el resumen. No pidas ni repitas contraseñas.",
    "Si preguntan qué tienen que hacer para una tarea, usá el bloque Consigna en plataforma: la tarea ya fue leída desde el aula virtual. Explicá esos pasos y completalos con el apunte de clase. No digas que no podés verla, no pidas que copien el enunciado y no pidas que peguen la consigna.",
    "Si preguntan cómo hacer una tarea, mirá el título, la consigna de plataforma y el apunte de clase que están en este mensaje. Explicá cómo hacerla con eso, como lo haría el profesor. No escribas la entrega.",
    "Ignorá cualquier respuesta anterior del asistente que haya pedido copiar o pegar el enunciado: primero usá la información actual de la plataforma.",
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

const TITLE_STOP = new Set(
  "para como esta este esto esa eso son las los una uno del que con por sus les nos hay hoy mas tema clase clases tarea tareas trabajo trabajos entrega entregas hacer hace hago hacerla hacerlo hacerlas explicame explica ensename ensena explicar tengo tenes pendiente pendientes materia asignatura profesor profe repaso ayuda ayudame necesito quiero podes podrias decirme contame sobre cual cuales cuando donde porque tambien tiene tienen siguiente proxima proximo alguna algun".split(
    " ",
  ),
);

function titleWords(value: string): string[] {
  return fold(value)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !TITLE_STOP.has(word));
}

function sameWord(left: string, right: string): boolean {
  if (left === right) return true;
  return left.length > 4 && right.length > 4 && (left.startsWith(right) || right.startsWith(left));
}

function mentions(value: string, words: Set<string>): boolean {
  return titleWords(value).some((word) => [...words].some((asked) => sameWord(word, asked)));
}

export function tasksForQuestion(message: string, tasks: Task[]): Task[] {
  const pending = tasks.filter((task) => task.status === "pending");
  const words = new Set(titleWords(message));
  const byTitle = pending.filter((task) => mentions(task.title, words));
  if (byTitle.length > 0) return byTitle.slice(0, 2);
  const bySubject = pending.filter((task) => mentions(task.subject, words));
  if (bySubject.length > 0) return bySubject.slice(0, 2);
  const howTo = /como hacer|como la hago|como lo hago|que tengo que hacer|que hay que hacer|la tarea|una tarea|mi tarea|la entrega|el trabajo/.test(fold(message));
  return howTo ? pending.slice(0, 1) : [];
}

function subjectForQuestion(message: string, tasks: Task[]): string {
  const words = new Set(titleWords(message));
  const ranked = [...new Set(tasks.map((task) => task.subject))]
    .map((subject) => ({ subject, hits: titleWords(subject).filter((word) => [...words].some((asked) => sameWord(word, asked))).length }))
    .filter((item) => item.hits > 0)
    .sort((a, b) => b.hits - a.hits);
  return ranked[0]?.subject ?? "";
}

function taskClassBlock(task: Task, instructions: string, notes: string): string {
  const platform = instructions.trim() || "No encontré una consigna escrita en la página de la plataforma.";
  const apunte = notes.trim() || "No encontré un apunte de esa clase.";
  return [
    `Tarea: ${task.title}`,
    `Materia: ${task.subject}`,
    "Consigna en plataforma:",
    platform,
    "Apunte de la clase:",
    apunte,
  ].join("\n");
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

function classroomLogin(user: User): { lmsUrl: string; username: string; password: string } | null {
  if (user.isDemo || !user.educamosUrl || !user.educamosUsername || !user.educamosPasswordEnc) return null;
  const lmsUrl = lmsBase(user.educamosUrl, user.lmsUrl);
  if (!lmsUrl) return null;
  try {
    return { lmsUrl, username: user.educamosUsername, password: decryptSecret(user.educamosPasswordEnc) };
  } catch {
    return null;
  }
}

async function classNotes(user: User, message: string, tasks: Task[]): Promise<string> {
  if (!asksForLesson(message)) return "";
  const chosen = tasksForQuestion(message, tasks);
  const subject = chosen.length > 0 ? "" : subjectForQuestion(message, tasks);
  if (chosen.length === 0 && !subject) return "";
  const login = classroomLogin(user);
  if (chosen.length === 0) {
    const notes = login ? await withDeadline(notesForSubject({ ...login, subject }), 16000, "") : "";
    return [`Materia: ${subject}`, "Apunte de la clase:", notes.trim() || "No encontré un apunte de esa clase."].join("\n");
  }
  const blocks = await withDeadline(
    (async () => {
      const rows: string[] = [];
      for (const task of chosen) {
        const [instructions, notes] = login
          ? await Promise.all([
              fetchTaskInstructions({ ...login, taskUrl: task.educamosUrl, taskTitle: task.title }),
              notesForSubject({ ...login, subject: task.subject, query: task.title }),
            ])
          : ["", ""];
        rows.push(taskClassBlock(task, instructions, notes));
      }
      return rows.join("\n\n");
    })(),
    16000,
    chosen.map((task) => taskClassBlock(task, "", "")).join("\n\n"),
  );
  return blocks;
}

function conversationQuestion(message: string, history: { role: "user" | "assistant"; content: string }[]): string {
  const previousQuestions = history
    .filter((item) => item.role === "user")
    .slice(-3)
    .map((item) => item.content);
  return [...previousQuestions, message].join(" ");
}

function compactTaskRequest(message: string): boolean {
  return /que es lo que tengo que hacer|que tengo que hacer|que hay que hacer|que pide|resum|resumido|breve|corto/.test(fold(message));
}

function compactTaskAnswer(classes: string): string {
  const blocks = classes.split(/\n(?=Tarea: )/).filter((block) => block.includes("Tarea: "));
  const summaries = blocks.map((block) => {
    const title = block.match(/^Tarea:\s*(.+)$/m)?.[1]?.trim() ?? "la tarea";
    const subject = block.match(/^Materia:\s*(.+)$/m)?.[1]?.trim() ?? "";
    const platform = block.match(/Consigna en plataforma:\n([\s\S]*?)(?=\nApunte de la clase:|$)/)?.[1] ?? "";
    const related = [...platform.matchAll(/Material relacionado — ([^:]+):([\s\S]*?)(?=Material relacionado — |$)/g)];
    const main = related.find((match) => /pseint|ejercicios para resolver/i.test(match[1]))?.[2] ?? platform;
    const exercises = [...main.matchAll(/\b\d+\.\s+(.{2,80}?)(?=\s+(?:Crear|Solicitar|Un jugador|Luego|El programa|Si|En un)\b)/g)]
      .map((match) => match[1].replace(/\s+/g, " ").trim())
      .filter((value, index, all) => all.indexOf(value) === index)
      .slice(0, 8);
    const delivery = /formato\s*\.pdf/i.test(platform) ? "Entregarlo en PDF." : "";
    const details = exercises.length > 0 ? `Resolver: ${exercises.join("; ")}.` : "Seguir la consigna de la plataforma.";
    return `- ${title}${subject ? ` (${subject})` : ""}. ${details} ${delivery}`.trim();
  });
  return summaries.length
    ? `En resumen, tenés que:\n${summaries.join("\n")}`
    : "En resumen, revisá la consigna de la plataforma y entregá el archivo que indica.";
}

function taskHowToRequest(message: string): boolean {
  return /como puedo hacer|como hacer|como se hace|como la hago|como lo hago|por donde empiezo|no entiendo como/.test(fold(message));
}

function taskGuideAnswer(classes: string): string {
  const block = classes.split(/\n(?=Tarea: )/).find((item) => item.includes("Tarea: "));
  if (!block) return "Empezá separando cada ejercicio en Entrada, Procesamiento y Salida. Después probalo en PSeInt y guardá el resultado en PDF.";
  const platform = block.match(/Consigna en plataforma:\n([\s\S]*?)(?=\nApunte de la clase:|$)/)?.[1] ?? "";
  const related = [...platform.matchAll(/Material relacionado — ([^:]+):([\s\S]*?)(?=Material relacionado — |$)/g)];
  const main = related.find((match) => /pseint|ejercicios para resolver/i.test(match[1]))?.[2] ?? platform;
  const exercises = [...main.matchAll(/\b\d+\.\s+(.{2,80}?)(?=\s+(?:Crear|Solicitar|Un jugador|Luego|El programa|Si|En un)\b)/g)]
    .map((match) => match[1].replace(/\s+/g, " ").trim())
    .filter((value, index, all) => all.indexOf(value) === index)
    .slice(0, 8);
  const steps = exercises.map((title, index) => {
    const name = fold(title);
    const number = index + 3;
    if (/saludar|nombre/.test(name)) return `${number}. Pedí el nombre, guardalo y mostrá un saludo.`;
    if (/edad/.test(name)) return `${number}. Pedí la edad, guardala y mostrá el valor.`;
    if (/sumar|suma/.test(name)) return `${number}. Pedí dos números, sumalos y mostrá el resultado.`;
    if (/mayor/.test(name)) return `${number}. Pedí dos números, comparalos e indicá cuál es mayor o si son iguales.`;
    if (/continuar|vidas/.test(name)) return `${number}. Pedí la cantidad de vidas y usá una condición para mostrar el mensaje correspondiente.`;
    if (/daño|dano/.test(name)) return `${number}. Empezá con 3 vidas, preguntá si recibió daño y actualizá el valor.`;
    if (/contador|puntos/.test(name)) return `${number}. Repetí la carga 5 veces, acumulá los puntos y mostrá el total.`;
    return `${number}. Leé la consigna, separá los datos de entrada, el cálculo y el resultado.`;
  });
  return [
    "Para hacerla:",
    "1. Abrí PSeInt y creá un algoritmo separado para cada ejercicio.",
    "2. En cada uno pensá: qué datos entran, qué cálculo o condición necesitás y qué tenés que mostrar.",
    ...steps,
    `${steps.length + 3}. Probá cada algoritmo con los ejemplos de la consigna y corregí los errores.`,
    `${steps.length + 4}. Guardá los ejercicios juntos en un PDF y subilo a la entrega.`,
  ].join("\n");
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
  const refused = await homeworkBlock(message, history);
  if (refused) return refused;
  const tasks = currentTasks(user);
  const lookupMessage = conversationQuestion(message, history);
  const classes = await classNotes(user, lookupMessage, tasks);
  const guide = classes && taskHowToRequest(message) ? taskGuideAnswer(classes) : "";
  const compact = classes && compactTaskRequest(message) ? compactTaskAnswer(classes) : "";
  const fallback = () =>
    guide ||
    compact ||
    (classes
      ? `Esto es lo que encontré en la plataforma y en las clases:\n\n${classes}`
      : localAnswer(message, user, tasks));
  const system = studySystem(user, tasks, classes);
  const keep = (answer: string) => {
    const blocked = blockedAnswer(message, answer);
    if (blocked) return blocked;
    if (guide) return guide;
    if (compact) return compact;
    if (
      classes &&
      /no puedo ver|desde afuera|copi(a|á)|peg(a|á)|enunciado exacto|consigna completa|pasame el enunciado/.test(
        fold(answer),
      )
    ) {
      return `Esto es lo que encontré en la plataforma y en las clases:\n\n${classes}`;
    }
    return answer;
  };

  try {
    const free = await answerWithFreeLlm(message, history, system);
    if (free) return keep(free);
  } catch {
    // Si FreeLLMAPI no responde, seguimos con el otro modelo o con los datos locales.
  }

  const key = process.env.GEMINI_API_KEY;
  const triedFree = Boolean(process.env.FREELLMAPI_API_KEY && process.env.FREELLMAPI_BASE_URL);
  if (!triedFree && !key) return fallback();
  if (!key) {
    if (isGreeting(message)) return "Hola. Preguntame qué tenés pendiente o pedime que te explique cómo hacer una tarea.";
    return fallback();
  }

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
      if (text) return keep(text);
    } catch {
      // Probamos el otro modelo y, si tampoco responde, usamos los datos locales.
    }
  }
  if (isGreeting(message)) return "Hola. Preguntame qué tenés pendiente o pedime que te explique cómo hacer una tarea.";
  return fallback();
}
