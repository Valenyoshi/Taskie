import { aiFetch, scrubForAi, withAiShield } from "./ai-shield";
import { plainChatText } from "./plain-text";
import { classroomLogin } from "./credentials";
import { visibleTasks } from "./courses";
import { type Task, type User } from "./db";
import { freeLlmConfigured, freeLlmReply } from "./free-llm";
import { asksForLesson, fetchTaskInstructions, findTaskInClassroom, notesForSubject, previousClassNotes } from "./educamos";
import { selectedCourseKeys } from "./courses";
import { asksToDoHomework, blockedAnswer, explainsHow, homeworkBlock, isGreeting } from "./no-homework";
import { localDateString, pendingIsCurrent, weekStart, addDays } from "./time";

function currentTasks(user: User): Task[] {
  return visibleTasks(user).filter(
    (task) => task.status === "done" || pendingIsCurrent(task.dueAt, user.timezone) || Boolean(task.courseKey),
  );
}

function fold(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function sanitizeChatText(value: string): string {
  return scrubForAi(value).slice(0, 4000);
}

function safeHistory(history: { role: "user" | "assistant"; content: string }[]) {
  return history.slice(-10).map((item) => ({ ...item, content: sanitizeChatText(item.content) }));
}

/** "Lengua Extranjera: Inglés" → "Inglés", "Matemática 1º ES-F" → "Matemática". */
export function subjectName(subject: string): string {
  const piece = subject.includes(":") ? subject.split(":").pop()!.trim() : subject.trim();
  return piece.replace(/\s+\d+\s*[º°].*$/u, "").trim() || piece;
}

function taskName(title: string): string {
  return title
    .replace(/^entregar en este espacio:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function isLate(task: Task, now = new Date()): boolean {
  return task.status === "pending" && new Date(task.dueAt).getTime() < now.getTime();
}

function byDue(a: Task, b: Task): number {
  return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
}

function dayText(iso: string, timeZone: string, now = new Date()): string {
  const day = localDateString(new Date(iso), timeZone);
  const today = localDateString(now, timeZone);
  if (day === today) return "hoy";
  if (day === addDays(today, 1)) return "mañana";
  const parts = new Intl.DateTimeFormat("es-AR", { timeZone, weekday: "long", day: "numeric", month: "numeric" }).formatToParts(
    new Date(iso),
  );
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  const date = `${part("day")}/${part("month")}`;
  return day < today ? `el ${date}` : `el ${part("weekday")} ${date}`;
}

function dueText(task: Task, timeZone: string, now = new Date()): string {
  if (task.status === "done") return task.onTime ? "entregada a tiempo" : "entregada tarde";
  const when = dayText(task.dueAt, timeZone, now);
  return isLate(task, now) ? `venció ${when}` : `vence ${when}`;
}

function taskLine(task: Task, timeZone: string): string {
  return `• ${taskName(task.title)} (${subjectName(task.subject)}), ${dueText(task, timeZone)}.`;
}

function listLines(tasks: Task[], timeZone: string, max = 6): string {
  const lines = tasks.slice(0, max).map((task) => taskLine(task, timeZone));
  if (tasks.length > max) lines.push(`• Y ${tasks.length - max} más.`);
  return lines.join("\n");
}

function nextLine(upcoming: Task[], timeZone: string): string {
  const next = upcoming[0];
  return next
    ? `Lo próximo es ${taskName(next.title)} (${subjectName(next.subject)}), que ${dueText(next, timeZone)}.`
    : "No tenés nada por vencer.";
}

export function taskSnapshot(user: User, tasks: Task[]): string {
  const lines = [...tasks].sort(byDue).map((task) => {
    const state = task.status === "done" ? "hecha" : isLate(task) ? "atrasada" : "pendiente";
    return `- ${subjectName(task.subject)}: ${taskName(task.title)}. ${state}, ${dueText(task, user.timezone)}.`;
  });
  return [
    `Hoy es ${new Intl.DateTimeFormat("es-AR", { timeZone: user.timezone, weekday: "long", day: "numeric", month: "long" }).format(new Date())}.`,
    `La racha es de ${plural(user.streak, "día", "días")}.`,
    lines.length ? lines.join("\n") : "No hay tareas cargadas.",
  ].join("\n");
}

function greetingReply(message: string): string {
  const q = fold(message);
  if (/gracias/.test(q)) return "De nada. Si necesitás algo más, preguntame.";
  if (/chau|adios/.test(q)) return "Chau. Éxitos con las tareas.";
  return "Hola. Preguntame qué tenés pendiente o pedime que te explique cómo hacer una tarea.";
}

function asksWhen(q: string): boolean {
  return /\b(cuando|que dia|para cuando|fecha|vence|vencen|plazo|hasta cuando)\b/.test(q);
}

function asksUrgent(q: string): boolean {
  return /urgente|prioridad|primero|que hago ahora|que sigue|lo proximo|proxima tarea|mas cerca/.test(q);
}

/** Preguntas de datos (fechas, pendientes, materias, racha) que se contestan con lo cargado de Educamos, sin modelo. */
export function factAnswer(message: string, user: User, tasks: Task[] = currentTasks(user)): string | null {
  const q = fold(message);
  if (explainsHow(message) || taskHowToRequest(message) || (explainsTopic(message) && !asksUrgent(q))) return null;
  if (isGreeting(message)) return greetingReply(message);
  const zone = user.timezone;
  const today = localDateString(new Date(), zone);
  const pending = tasks.filter((task) => task.status === "pending");
  const upcoming = pending.filter((task) => !isLate(task)).sort(byDue);
  const late = pending.filter((task) => isLate(task)).sort((a, b) => byDue(b, a));
  const lateNote = late.length ? ` Además tenés ${plural(late.length, "atrasada", "atrasadas")}.` : "";

  const aboutTasks = /\b(tengo|tenes|hay|vence|vencen|entrega\w*|tareas?|trabajos?|pendientes?|falta|atrasad\w*|examen\w*|prueba\w*)\b/.test(q);
  const tomorrow = /\bmanana\b/.test(q) && !/\bhoy\b/.test(q);
  if ((/\bhoy\b/.test(q) || tomorrow) && aboutTasks) {
    const day = tomorrow ? addDays(today, 1) : today;
    const label = tomorrow ? "Mañana" : "Hoy";
    const dayTasks = tasks.filter((task) => localDateString(new Date(task.dueAt), zone) === day).sort(byDue);
    if (dayTasks.length === 0) return `${label} no vence ninguna tarea. ${nextLine(upcoming.filter((task) => localDateString(new Date(task.dueAt), zone) > day), zone)}${lateNote}`;
    return [`${label} ${dayTasks.length === 1 ? "vence una" : `vencen ${dayTasks.length}`}:`, listLines(dayTasks, zone)].join("\n");
  }

  if (/atrasad|vencid/.test(q) && !/pendient|falta/.test(q)) {
    if (late.length === 0) return `No tenés tareas atrasadas. ${nextLine(upcoming, zone)}`;
    const oldest = /mas (vieja|antigua)|primera/.test(q);
    if (oldest || /mas (reciente|nueva)|ultima/.test(q)) {
      const task = oldest ? late[late.length - 1] : late[0];
      return `La atrasada ${oldest ? "más vieja" : "más reciente"} es ${taskName(task.title)} (${subjectName(task.subject)}), que ${dueText(task, zone)}. En total tenés ${plural(late.length, "atrasada", "atrasadas")}.`;
    }
    return [`Tenés ${plural(late.length, "tarea atrasada", "tareas atrasadas")}:`, listLines(late, zone, 8)].join("\n");
  }

  if (/pendient|sin entregar|que tengo que entregar|que me falta/.test(q)) {
    if (pending.length === 0) return "No tenés tareas pendientes.";
    const parts = [`Tenés ${plural(pending.length, "tarea sin entregar", "tareas sin entregar")}.`];
    if (upcoming.length) parts.push("", "Por entregar:", listLines(upcoming, zone));
    if (late.length) parts.push("", "Atrasadas:", listLines(late, zone));
    return parts.join("\n");
  }

  if (/semana/.test(q) && aboutTasks) {
    const start = weekStart(today);
    const end = addDays(start, 6);
    const week = tasks
      .filter((task) => {
        const day = localDateString(new Date(task.dueAt), zone);
        return day >= start && day <= end;
      })
      .sort(byDue);
    if (week.length === 0) return `Esta semana no vence ninguna tarea. ${nextLine(upcoming, zone)}${lateNote}`;
    return [`Esta semana ${week.length === 1 ? "vence una" : `vencen ${week.length}`}:`, listLines(week, zone, 8)].join("\n");
  }

  if (asksUrgent(q)) {
    if (pending.length === 0) return "No tenés tareas pendientes.";
    const first = upcoming[0];
    const lines = first ? [nextLine(upcoming, zone)] : ["No tenés nada por vencer."];
    if (late.length) lines.push("", `Atrasadas (conviene ponerse al día):`, listLines(late, zone, 3));
    return lines.join("\n");
  }

  if (asksWhen(q)) {
    const named = tasksForQuestion(message, tasks, 5);
    if (named.length === 1) {
      const task = named[0];
      return `${taskName(task.title)} (${subjectName(task.subject)}) ${dueText(task, zone)}.`;
    }
    if (named.length > 1) return listLines(named, zone);
  }

  if (/\b(que|cuales|cuantas|mis) (materias|asignaturas)\b|\bmaterias tengo\b/.test(q)) {
    const subjects = [...new Set([...tasks].sort(byDue).map((task) => subjectName(task.subject)))];
    if (subjects.length === 0) return "Todavía no hay tareas cargadas de ninguna materia.";
    const withPending = new Set(pending.map((task) => subjectName(task.subject)));
    return [
      `Tenés tareas de ${plural(subjects.length, "materia", "materias")}:`,
      ...subjects.map((name) => `• ${name}${withPending.has(name) ? "" : " (sin pendientes)"}`),
    ].join("\n");
  }

  if (/racha/.test(q)) {
    return user.streak > 0
      ? `Tu racha es de ${plural(user.streak, "día", "días")}. Se mantiene si entrás cada día.`
      : "Todavía no tenés racha. Empieza cuando entrás un día y seguís al día siguiente.";
  }

  if (/chatbot|para que serv|que podes hacer|que haces|como me ayud/.test(q)) {
    return "Te digo qué tareas tenés, cuándo vencen y cómo hacerlas. No te escribo la entrega.";
  }

  if (/\bnivel\b|\bxp\b|\bexperiencia\b/.test(q)) {
    return `Taskie ya no usa niveles ni XP. Tu progreso es la racha de ${plural(user.streak, "día", "días")} y las tareas que vas entregando.`;
  }

  return null;
}

export function localAnswer(message: string, user: User, tasks: Task[] = currentTasks(user)): string {
  const fact = factAnswer(message, user, tasks);
  if (fact) return fact;
  if (isGreeting(message)) return greetingReply(message);
  const zone = user.timezone;
  const pending = tasks.filter((task) => task.status === "pending");
  const upcoming = pending.filter((task) => !isLate(task)).sort(byDue);

  if (asksWhen(fold(message))) {
    return `No encontré esa tarea. ${nextLine(upcoming, zone)} Si me decís el nombre o la materia, te paso la fecha.`;
  }

  if (explainsHow(message) || taskHowToRequest(message)) {
    const named = tasksForQuestion(message, tasks);
    if (named.length === 0) {
      return "Decime qué tarea o de qué materia, por ejemplo «el proyecto atlas» o «los ejercicios de programación», y te explico cómo hacerla.";
    }
    return named
      .map((task) => `${taskName(task.title)} es de ${subjectName(task.subject)} y ${dueText(task, zone)}. No pude leer la consigna: abrila en el aula virtual y fijate qué pide y qué hay que entregar.`)
      .join("\n");
  }

  return pending.length
    ? `No te entendí bien. Puedo decirte qué tenés pendiente, cuándo vence cada tarea y cómo hacerla. ${nextLine(upcoming, zone)}`
    : "No te entendí bien. Ahora no tenés tareas pendientes; preguntame lo que quieras de tus materias.";
}

function studySystem(user: User, tasks: Task[], classes = ""): string {
  return [
    "Si te piden que expliques cómo hacer una tarea, qué hay que hacer o de qué se trata, explicalo. No te niegues.",
    "Solo negá cuando pidan la entrega ya escrita, los ejercicios resueltos o las respuestas para copiar.",
    "Te llamás Taskie y sos un compañero de estudio. Si te presentás, decí que sos Taskie. Hablás de vos, en español claro y corto.",
    "Respondé con frases cortas. Si listás, usá un renglón por idea, sin markdown, sin asteriscos, sin numeral de título y sin código.",
    "No pases de 8 renglones salvo que pidan más detalle. No copies la consigna entera: resumila en pasos de un renglón.",
    "Usá los nombres de materia y las fechas tal como están en el resumen. Si una tarea está atrasada, decilo.",
    "Si no hay información suficiente, decilo claramente y no inventes.",
    "Ayudás a entender temas, a ver qué tiene pendiente, de qué materia es y cómo organizarse.",
    "No inventes notas, fechas ni tareas que no estén en el resumen. No pidas ni repitas contraseñas.",
    "Si preguntan qué tienen que hacer para una tarea, usá el bloque Consigna en plataforma: la tarea ya fue leída desde el aula virtual. Explicá esos pasos y completalos con el apunte de clase. No digas que no podés verla, no pidas que copien el enunciado y no pidas que peguen la consigna.",
    "Si preguntan cómo hacer una tarea, mirá el título, la consigna de plataforma y el apunte de clase que están en este mensaje. Explicá cómo hacerla con eso, como lo haría el profesor. No escribas la entrega.",
    "Ignorá cualquier respuesta anterior del asistente que haya pedido copiar o pegar el enunciado: primero usá la información actual de la plataforma.",
    "Si la consigna trae un «Archivo de la consigna», ya lo leíste entero: usá sus preguntas, su forma de entrega y su fecha. Si su fecha no coincide con la del aula, avisalo.",
    "«Clase del aula donde está la tarea», «Material de esa clase» y «Clase anterior» son lo que dice el aula alrededor de la tarea: usalos para explicar de qué trata. El título de esa clase (por ejemplo «26 de octubre») es el día de la clase, no la fecha de entrega; la fecha de entrega es la del campo Fecha.",
    "Resumen de la cuenta:",
    taskSnapshot(user, tasks),
    classes
      ? [
          "Si te piden que expliques un tema, hacé de profesor de esa materia.",
          "Usá solo el bloque Clases: el mismo orden, las mismas palabras y los mismos ejemplos.",
          "Enseñá lo que la clase enseña. No adelantes lo que no aparece.",
          "Si el tema no está en las clases, decí en un renglón que no está en el apunte y explicalo igual de forma general, corta y con un ejemplo. No lo presentes como si el profesor lo hubiera dado.",
          "Clases:",
          classes,
        ].join("\n")
      : "",
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
    .replace(/\btps?\b/g, " practico ")
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !TITLE_STOP.has(word));
}

function sameWord(left: string, right: string): boolean {
  if (left === right) return true;
  return left.length > 4 && right.length > 4 && (left.startsWith(right) || right.startsWith(left));
}

function mentions(value: string, words: Set<string>): boolean {
  return hits(value, words) > 0;
}

function hits(value: string, words: Set<string>): number {
  return titleWords(value).filter((word) => [...words].some((asked) => sameWord(word, asked))).length;
}

/** Las tareas que mejor coinciden con la pregunta: primero por título, después por materia. */
export function tasksForQuestion(message: string, tasks: Task[], limit = 2): Task[] {
  const pending = tasks.filter((task) => task.status === "pending");
  const words = new Set(titleWords(message));
  const scored = pending.map((task) => ({ task, title: hits(task.title, words), subject: hits(task.subject, words) }));
  const pick = (rows: typeof scored) => {
    const best = Math.max(...rows.map((row) => row.title + row.subject));
    return rows
      .filter((row) => row.title + row.subject === best)
      .map((row) => row.task)
      .sort((a, b) => Number(isLate(a)) - Number(isLate(b)) || (isLate(a) ? byDue(b, a) : byDue(a, b)))
      .slice(0, limit);
  };
  const byTitle = scored.filter((row) => row.title > 0);
  if (byTitle.length > 0) return pick(byTitle);
  const bySubject = scored.filter((row) => row.subject > 0);
  if (bySubject.length > 0) return pick(bySubject);
  return [];
}

function subjectForQuestion(message: string, tasks: Task[]): string {
  const words = new Set(titleWords(message));
  const ranked = [...new Set(tasks.map((task) => task.subject))]
    .map((subject) => ({ subject, hits: titleWords(subject).filter((word) => [...words].some((asked) => sameWord(word, asked))).length }))
    .filter((item) => item.hits > 0)
    .sort((a, b) => b.hits - a.hits);
  return ranked[0]?.subject ?? "";
}

function taskClassBlock(task: Task, instructions: string, notes: string, timeZone: string): string {
  const platform = instructions.trim() || "No encontré una consigna escrita en la página de la plataforma.";
  const apunte = notes.trim() && !isOutline(notes) ? notes.trim() : "No encontré un apunte de esa clase.";
  return [
    `Tarea: ${taskName(task.title)}`,
    `Materia: ${subjectName(task.subject)}`,
    `Fecha: ${dueText(task, timeZone)}`,
    "Consigna en plataforma:",
    platform,
    "Apunte de la clase:",
    apunte,
  ].join("\n");
}

/** Educamos devuelve la lista de secciones del aula cuando no hay un apunte escrito. */
function isOutline(notes: string): boolean {
  const pieces = notes.split(/\.\s+/).map((piece) => piece.trim()).filter(Boolean);
  if (pieces.length < 3) return false;
  const average = pieces.reduce((sum, piece) => sum + piece.length, 0) / pieces.length;
  return average < 40;
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

/** Nombra una tarea pendiente por su título: "la tarea del video", "el TP 5", "proyecto atlas". */
function namesTask(message: string, tasks: Task[]): boolean {
  if (!/\b(tarea|tp|trabajo|entrega|actividad|proyecto|examen|exposici|practico|consigna)/.test(fold(message))) return false;
  const words = new Set(titleWords(message));
  return tasks.some((task) => task.status === "pending" && hits(task.title, words) > 0);
}

async function classNotes(user: User, message: string, tasks: Task[]): Promise<string> {
  if (!asksForLesson(message) && !namesTask(message, tasks)) return "";
  const chosen = tasksForQuestion(message, tasks);
  const subject = chosen.length > 0 ? "" : subjectForQuestion(message, tasks);
  if (chosen.length === 0 && !subject) return "";
  const login = classroomLogin(user);
  if (chosen.length === 0) {
    const notes = login ? await withDeadline(notesForSubject({ ...login, subject }), 16000, "") : "";
    const written = notes.trim() && !isOutline(notes) ? notes.trim() : "No encontré un apunte de esa clase.";
    return [`Materia: ${subjectName(subject)}`, "Apunte de la clase:", written].join("\n");
  }
  const blocks = await withDeadline(
    (async () => {
      const rows: string[] = [];
      for (const task of chosen) {
        const [instructions, notes] = login
          ? await Promise.all([
              /\/mod\/assign\/view\.php/i.test(task.educamosUrl ?? "")
                ? fetchTaskInstructions({ ...login, taskUrl: task.educamosUrl, taskTitle: task.title })
                : findTaskInClassroom({ ...login, subject: task.subject, title: task.title }),
              notesForSubject({
                ...login,
                subject: task.subject,
                query: task.title,
                courseKeys: task.courseKey ? [task.courseKey] : selectedCourseKeys(user),
              }),
            ])
          : ["", ""];
        rows.push(taskClassBlock(task, instructions, notes, user.timezone));
      }
      return rows.join("\n\n");
    })(),
    22000,
    chosen.map((task) => taskClassBlock(task, "", "", user.timezone)).join("\n\n"),
  );
  return blocks;
}

function isFollowUp(message: string): boolean {
  const q = fold(message).trim();
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length > 7) return false;
  return /\b(esa|ese|eso|misma|mismo|anterior)\b/.test(q);
}

function conversationQuestion(message: string, history: { role: "user" | "assistant"; content: string }[]): string {
  if (!isFollowUp(message)) return message;
  const previousQuestions = history
    .filter((item) => item.role === "user")
    .slice(-2)
    .map((item) => item.content);
  return [...previousQuestions, message].join(" ");
}

function wantsClassRecap(message: string): boolean {
  const q = fold(message);
  return /clase anterior|lo que vi|lo que vimos|que vimos|que vi\b|que dimos|me olvide|resumen de la clase/.test(q)
    || (/resum/.test(q) && /clase|matematic|lengua|biolog|histori|geograf|ingles|fisica|quimica|natural|program/.test(q) && !/tengo que hacer|hay que hacer|que pide/.test(q));
}

function compactTaskRequest(message: string): boolean {
  if (wantsClassRecap(message)) return false;
  return /que es lo que tengo que hacer|que tengo que hacer|que hay que hacer|que pide|resum|resumido|breve|corto/.test(fold(message));
}

type TaskBlock = {
  title: string;
  subject: string;
  due: string;
  /** Texto propio de la consigna, sin el material relacionado. */
  consigna: string;
  /** Consigna completa, con el material relacionado. */
  platform: string;
  /** Archivo adjunto (Word o PDF) que ya se leyó desde el aula. */
  file: { name: string; text: string } | null;
  /** Lo que dice el aula alrededor de la tarea: la clase donde está, su material y la clase anterior. */
  context: { label: string; text: string }[];
  notes: string;
};

const CONTEXT_MARK = /\s*(?=(?:Material relacionado|Clase del aula donde está la tarea|En esa clase también dice|Material de esa clase|Clase anterior) — )/;

function parseBlocks(classes: string): TaskBlock[] {
  return classes
    .split(/\n(?=Tarea: )/)
    .filter((block) => block.includes("Tarea: "))
    .map((block) => {
      const field = (name: string) => block.match(new RegExp(`^${name}:\\s*(.+)$`, "m"))?.[1]?.trim() ?? "";
      const rawPlatform = (block.match(/Consigna en plataforma:\n([\s\S]*?)(?=\nApunte de la clase:|$)/)?.[1] ?? "").trim();
      const platform = /no encontr[eé] una consigna/i.test(rawPlatform) ? "" : rawPlatform.replace(/\s+/g, " ");
      const rawNotes = (block.match(/Apunte de la clase:\n([\s\S]*)$/)?.[1] ?? "").trim();
      const [head, ...rest] = `\n${platform}`.split(CONTEXT_MARK);
      const own = (head ?? "").trim().replace(/^Actividad del aula que coincide — [^:]{1,120}:\s*/, "");
      const context = rest
        .map((piece) => piece.match(/^(.+?) — ([\s\S]+)$/))
        .filter((match): match is RegExpMatchArray => Boolean(match))
        .map((match) => ({ label: match[1], text: match[2].trim() }));
      const fileMatch = own.match(/Archivo de la consigna — (.+?\.(?:docx|pdf)): ([\s\S]*)$/i);
      return {
        title: field("Tarea") || "la tarea",
        subject: field("Materia"),
        due: field("Fecha"),
        consigna: own.split(/\s*Archivo de la consigna — /)[0].trim(),
        platform,
        file: fileMatch ? { name: fileMatch[1].trim(), text: fileMatch[2].trim() } : null,
        context,
        notes: /no encontr[eé] un apunte/i.test(rawNotes) ? "" : rawNotes,
      };
    });
}

function attachmentName(consigna: string): string {
  const whole = consigna.match(/^(.{1,140}?\.(?:docx?|pdf|pptx?|xlsx?|odt))(?=\s|$)/i)?.[1];
  if (whole) return whole.trim();
  return consigna.match(/([^.]*?\S\.(?:docx?|pdf|pptx?|xlsx?|odt))(?=\s|$)/i)?.[1]?.trim() ?? "";
}

/** Separa la consigna en renglones cortos y saca fechas que ya mostramos aparte. */
function consignaLines(consigna: string): string[] {
  return consigna
    .replace(/fecha l[ií]mite:?\s*[\d/.-]+/gi, "")
    .split(/(?<=[.!?])\s+|\s+·\s+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 3)
    .filter((line) => !/^entrega:?\s*(hoy|\d)/i.test(line) && !/^\d{1,2} de [a-záéíóú]+\.?$/i.test(line))
    .filter((line) => !(line === line.toUpperCase() && line.length < 40))
    .map((line) => line.replace(/^(?:[A-ZÁÉÍÓÚÑ]{2,}\s+)+(?=[A-ZÁÉÍÓÚÑ][a-záéíóúñ])/u, ""))
    .map((line) => (/[.!?:]$/.test(line) ? line : `${line}.`))
    .slice(0, 6);
}

const EXERCISE_START =
  "Crear|Solicitar|Pedir|Mostrar|Calcular|Un|Una|Luego|El|La|Los|Las|Si|En|Hacer|Escribir|Leer|Ingresar|Realizar|Indicar|Determinar|Dado|Dados|Diseñar|Simular|Programar|Armar|Elegir";

function exercisesIn(platform: string): string[] {
  const named = [
    ...platform.matchAll(
      new RegExp(`Ejercicio\\s+(\\d+)\\s*[—–-]\\s*(.{2,60}?)(?=\\s+(?:${EXERCISE_START})\\b|\\s+Ejercicio\\s+\\d|\\s+\\d+\\.\\s|$)`, "g"),
    ),
  ].map((match) => `Ejercicio ${match[1]}: ${match[2].replace(/\s+/g, " ").trim()}`);
  const found = named.length
    ? named
    : [...platform.matchAll(new RegExp(`\\b\\d+\\.\\s+(.{2,60}?)(?=\\s+(?:${EXERCISE_START})\\b)`, "g"))].map((match) =>
        match[1].replace(/\s+/g, " ").trim(),
      );
  return found.filter((value, index, all) => all.indexOf(value) === index);
}

function blockHeader(block: TaskBlock): string {
  const subject = block.subject ? ` es de ${block.subject}` : "";
  const due = block.due ? `${subject ? " y" : ""} ${block.due}` : "";
  return `«${block.title}»${subject}${due}.`;
}

const ASK_START =
  /^(?:¿|(?:menciona|mencioná|explica|explicá|describe|describí|nombra|nombrá|indica|indicá|compara|compará|completa|completá|define|definí|enumera|enumerá|justifica|justificá|responde|respondé|escribe|escribí|elabora|elaborá|investiga|investigá|busca|buscá|dibuja|dibujá|realiza|realizá|identifica|identificá|da|dá)(?![\p{L}]))/iu;
const QUESTIONNAIRE = /\b(cuestionario|preguntas|actividades)\s*:/i;

function sentenceCase(value: string): string {
  if (value !== value.toUpperCase()) return value;
  const lower = value.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** Lo que pide un archivo de consigna: la indicación, las preguntas y cómo se entrega. */
function fileSummary(block: TaskBlock): string[] {
  const text = block.file?.text.replace(/\s+/g, " ") ?? "";
  if (!text) return [];
  const marker = [...text.matchAll(new RegExp(QUESTIONNAIRE.source, "gi"))].pop();
  const questions = marker?.index !== undefined ? text.slice(marker.index) : text;
  const pieces = questions
    .split(/(?=¿)|(?<=[.?!])\s+/)
    .map((piece) => piece.trim())
    .filter(Boolean);
  const asks = pieces
    .filter((piece) => ASK_START.test(piece) && piece.length < 220)
    .filter((piece, index, all) => all.indexOf(piece) === index);
  const instruction = text.match(/\bconsignas?\s*:\s*([^.]{10,240}\.)/i)?.[1]?.trim();
  const delivery = text.match(/[^.?!:]*\b(?:entreg\w*|formato pdf)\b[^.?!¿]*/i)?.[0]?.replace(/^.*?:\s*/, "").trim();
  const out = [`Leí el archivo «${block.file!.name}».`];
  if (instruction) out.push(`Consigna: ${instruction}`);
  if (asks.length) {
    out.push(`Preguntas (${asks.length}):`, ...asks.slice(0, 10).map((ask) => `• ${ask}`));
    if (asks.length > 10) out.push(`• Y ${asks.length - 10} más en el archivo.`);
  } else if (!instruction) {
    out.push(...consignaLines(text).slice(0, 5).map((line) => `• ${line}`));
  }
  if (delivery) {
    out.push(`Entrega: ${sentenceCase(delivery).replace(/[.\s]*$/, ".")}`);
    const fileDate = delivery.match(/\b(\d{1,2})\/(\d{1,2})\b/);
    const platformDate = block.due.match(/\b(\d{1,2})\/(\d{1,2})\b/);
    if (fileDate && platformDate && (Number(fileDate[1]) !== Number(platformDate[1]) || Number(fileDate[2]) !== Number(platformDate[2]))) {
      out.push(`Ojo: el archivo dice ${fileDate[1]}/${fileDate[2]} y en el aula ${block.due}. Guiate por la fecha más cercana.`);
    }
  }
  return out;
}

/** Renglones de un texto del aula, respetando preguntas numeradas. */
function classLines(text: string, limit: number): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?:])\s+(?=[A-ZÁÉÍÓÚÑ¿\d])|\s+(?=\d{1,2}[.)-]\s)|\s*[•·]\s*|\s+-\s+/u)
    .map((line) =>
      line
        .replace(/^(?:[A-ZÁÉÍÓÚÑ\d]+\s+)+(?=[A-ZÁÉÍÓÚÑ¿][a-záéíóúñ])/u, "")
        .replace(/\s+([?.,:;!])/g, "$1")
        .trim(),
    )
    .filter((line) => line.length > 3 && !(line === line.toUpperCase() && line.length < 40))
    .filter((line, index, all) => all.indexOf(line) === index)
    .slice(0, limit);
}

/** Lo que encontró en la clase del aula donde está la tarea. */
function contextSummary(block: TaskBlock): string[] {
  if (!block.context.length) return [];
  const out = ["En el aula, la clase de esta tarea dice:"];
  for (const item of block.context) {
    const [name, ...body] = item.text.split(/:\s+/);
    const text = body.join(": ").trim() || name;
    const title = body.length ? name.trim() : "";
    if (item.label === "Clase del aula donde está la tarea") {
      if (title) out.push(`${title}:`);
      const all = classLines(text, 60);
      const questions = all.filter((line) => line.startsWith("¿"));
      const intro = all.filter((line) => !line.startsWith("¿") && !/^(buen[oa]s|hola|hoy\b)/i.test(line) && !/:$/.test(line));
      const shown = questions.length >= 3 ? [...intro.slice(0, 3), ...questions.slice(0, 10)] : intro.slice(0, 8);
      out.push(...shown.map((line) => `• ${line}`));
      if (questions.length > 10) out.push(`• Y ${questions.length - 10 === 1 ? "1 pregunta más" : `${questions.length - 10} preguntas más`} en el aula.`);
    } else if (item.label === "En esa clase también dice") {
      out.push(...classLines(item.text, 4).map((line) => `• ${line}`));
    } else if (item.label === "Material de esa clase" || item.label === "Material relacionado") {
      out.push(`Material: ${title || "de la clase"}${body.length ? ` — ${text.slice(0, 220)}${text.length > 220 ? "…" : ""}` : ""}`);
    } else if (item.label === "Clase anterior") {
      out.push(`Clase anterior${title ? ` (${title})` : ""}: ${text.slice(0, 260)}${text.length > 260 ? "…" : ""}`);
    }
  }
  return out.length > 1 ? out : [];
}

function consignaSummary(block: TaskBlock): string[] {
  const exercises = exercisesIn(block.platform);
  const file = attachmentName(block.consigna);
  const lines = consignaLines(file ? block.consigna.replace(file, "") : block.consigna).filter((line) => !/^\d+ de [a-z]/i.test(line));
  const read = fileSummary(block);
  const around = contextSummary(block);
  if (read.length) return [...read, ...(lines.length ? ["En el aula también dice:", ...lines.map((line) => `• ${line}`)] : []), ...around];
  const out: string[] = [];
  if (file) out.push(`La consigna está en el archivo «${file}». Abrilo desde el aula virtual.`);
  if (lines.length) out.push("Lo que pide:", ...lines.map((line) => `• ${line}`));
  if (exercises.length) {
    out.push(`Ejercicios (${exercises.length}):`, ...exercises.slice(0, 10).map((item) => `• ${item}`));
    if (exercises.length > 10) out.push(`• Y ${exercises.length - 10} más en la consigna.`);
  }
  out.push(...around);
  if (!out.length) out.push("La consigna no tiene texto en la plataforma. Abrila en el aula virtual: puede venir en un archivo adjunto o la explicó el profe en clase.");
  return out;
}

function compactTaskAnswer(classes: string): string {
  const blocks = parseBlocks(classes);
  if (!blocks.length) return "";
  return blocks.map((block) => [blockHeader(block), ...consignaSummary(block)].join("\n")).join("\n\n");
}

function taskHowToRequest(message: string): boolean {
  return /como (puedo hacer|hacer|se hace|la hago|lo hago|las hago|los hago|hago|empiezo|arranco|resuelvo|armo|preparo)|por donde empiezo|no entiendo como|ayudame con/.test(
    fold(message),
  );
}

function isProgrammingBlock(block: TaskBlock): boolean {
  return /program|pseint|algoritm|scratch/.test(fold(`${block.subject} ${block.consigna}`));
}

function plainTaskHelp(classes: string): string {
  const blocks = parseBlocks(classes);
  return blocks
    .map((block) => {
      const summary = consignaSummary(block);
      const hasText = !/^La consigna no tiene texto/.test(summary[0]);
      const steps = hasText
        ? [
            "Para hacerla:",
            "• Leé la consigna completa y marcá qué hay que entregar y en qué formato.",
            block.notes ? "• Repasá el apunte de esa clase en el aula virtual." : "• Repasá lo que vieron en clase sobre ese tema.",
            "• Hacé un borrador, revisalo con la consigna al lado y subilo antes de la fecha.",
          ]
        : [];
      return [blockHeader(block), ...summary, ...steps].join("\n");
    })
    .join("\n\n");
}

function exerciseHint(title: string): string {
  const name = fold(title);
  if (/datos personales/.test(name)) return "pedí nombre, edad y curso, y mostralos";
  if (/area|rectangulo/.test(name)) return "pedí base y altura, multiplicalas y mostrá el área";
  if (/minutos|conversor/.test(name)) return "dividí por 60; el cociente son las horas y el resto, los minutos";
  if (/compra|vuelto/.test(name)) return "sumá los precios y restá el total del dinero recibido";
  if (/mayor de edad/.test(name)) return "pedí la edad y usá Si edad >= 18";
  if (/positivo|negativo/.test(name)) return "usá Si para comparar el número con 0";
  if (/mayor/.test(name)) return "compará los dos números y contemplá si son iguales";
  if (/vidas|continuar/.test(name)) return "usá una condición según la cantidad de vidas";
  if (/puntos|acumul|suma/.test(name)) return "usá una variable acumuladora que empiece en 0";
  if (/contar|del 1 al/.test(name)) return "usá un bucle Para que vaya de 1 a 10";
  if (/tabla/.test(name)) return "usá un bucle Para que multiplique de 1 a 10";
  if (/bienvenida|subprograma|funcion/.test(name)) return "armá un subproceso y llamalo desde el principal";
  if (/arreglo|lista|cinco numeros/.test(name)) return "guardá los valores en un arreglo y recorrelo con un bucle";
  return "";
}

function taskGuideAnswer(classes: string): string {
  const block = parseBlocks(classes)[0];
  if (!block || !isProgrammingBlock(block)) return "";
  const exercises = exercisesIn(block.platform);
  const shown = exercises.slice(0, 10).map((item) => {
    const hint = exerciseHint(item);
    const label = item.replace(/^Ejercicio (\d+): (.+)$/, "Ejercicio $1 ($2)");
    return `• ${label}${hint ? `: ${hint}.` : "."}`;
  });
  const delivery = consignaLines(block.consigna).find((line) => /pdf|subi|entreg/i.test(line));
  return [
    blockHeader(block),
    "Para hacerla:",
    "• Abrí PSeInt y hacé un algoritmo aparte para cada ejercicio.",
    "• En cada uno pensá qué datos pedís, qué cálculo o condición usás y qué mostrás.",
    ...(shown.length ? [`Ejercicios (${exercises.length}):`, ...shown] : []),
    ...(exercises.length > 10 ? [`• Y ${exercises.length - 10} más en la consigna.`] : []),
    "• Probá cada algoritmo con los ejemplos de la consigna antes de entregarlo.",
    delivery ? `• Entrega: ${delivery}` : "• Juntá los ejercicios en un PDF y subilo a la entrega.",
  ].join("\n");
}

function explainsTopic(message: string): boolean {
  const q = fold(message);
  return (
    /explic|ensen|que es |que son |que significa|no entiendo|como se usa|como funciona/.test(q) &&
    !taskHowToRequest(message) &&
    !/tarea|trabajo|entrega|consigna|ejercicio|practico|proyecto|examen|prueba|actividad/.test(q)
  );
}

function topicAnswer(classes: string, message: string): string {
  const block = parseBlocks(classes)[0];
  const subject = block?.subject || classes.match(/^Materia:\s*(.+)$/m)?.[1]?.trim() || "";
  const notes = block?.notes || (classes.match(/Apunte de la clase:\n([\s\S]*)$/)?.[1] ?? "").trim();
  if (notes && !/no encontr[eé] un apunte/i.test(notes)) {
    return [`Esto dice el apunte de clase${subject ? ` de ${subject}` : ""}:`, notes.replace(/\s+/g, " ").slice(0, 900)].join("\n");
  }
  const topic = message
    .replace(/^.*?(explic\w*|ense[nñ]\w*|qu[eé] (?:es|son|significa)|no entiendo)\s+(?:(?:el|la|los|las|lo de|qu[eé] es)\s+)?/i, "")
    .replace(/[?¿!.]+/g, "")
    .trim();
  const related = block?.due ? ` Ese tema entra en «${block.title}», que ${block.due}.` : "";
  return `No encontré un apunte${topic ? ` sobre ${topic}` : " de ese tema"} en el aula${subject ? ` de ${subject}` : ""}, y sin el servicio de IA conectado no puedo explicarlo con mis palabras.${related}`;
}

async function answerWithFreeLlm(
  message: string,
  history: { role: "user" | "assistant"; content: string }[],
  system: string,
): Promise<string | null> {
  const reply = await freeLlmReply(
    [
      { role: "system", content: system },
      ...history.slice(-10).map((item) => ({ role: item.role, content: item.content })),
      { role: "user", content: message },
    ],
    { timeoutMs: 30000 },
  );
  return reply?.content || null;
}

export function answerWithModel(
  message: string,
  history: { role: "user" | "assistant"; content: string }[],
  user: User,
): Promise<string> {
  return withAiShield(user, () => shieldedAnswer(message, history, user));
}

async function shieldedAnswer(message: string, history: { role: "user" | "assistant"; content: string }[], user: User): Promise<string> {
  const safeMessage = sanitizeChatText(message);
  const safePrevious = safeHistory(history);
  const tasks = currentTasks(user);
  if (!asksToDoHomework(safeMessage) && !wantsClassRecap(safeMessage)) {
    const fact = factAnswer(safeMessage, user, tasks);
    if (fact) return fact;
  }
  const refused = await homeworkBlock(safeMessage, safePrevious);
  if (refused) return refused;
  if (wantsClassRecap(safeMessage)) {
    const subject = subjectForQuestion(safeMessage, tasks);
    const login = classroomLogin(user);
    const notes = subject && login
      ? await withDeadline(
          previousClassNotes({
            ...login,
            subject,
            courseKeys: selectedCourseKeys(user),
            timeZone: user.timezone,
          }),
          40000,
          "",
        )
      : "";
    const pending = tasks.filter(
      (task) =>
        task.status === "pending" &&
        pendingIsCurrent(task.dueAt, user.timezone) &&
        subject &&
        mentions(task.subject, new Set(titleWords(safeMessage))),
    );
    const reminder = pending.length
      ? `\n\nTambién tenés pendiente:\n${pending
          .slice(0, 2)
          .map((task) => taskLine(task, user.timezone))
          .join("\n")}`
      : "";
    if (!notes.trim()) {
      return `No encontré el apunte de la clase anterior${subject ? ` de ${subjectName(subject)}` : ""}.${reminder}`;
    }
    return `${notes.split(subject).join(subjectName(subject))}${reminder}`;
  }
  const lookupMessage = conversationQuestion(safeMessage, safePrevious);
  const dateOnly = asksWhen(fold(safeMessage)) && !explainsHow(safeMessage) && !taskHowToRequest(safeMessage);
  const classes = dateOnly ? "" : await classNotes(user, lookupMessage, tasks);
  const topic = explainsTopic(safeMessage);
  const guide = classes && taskHowToRequest(safeMessage) ? taskGuideAnswer(classes) : "";
  const compact = classes && !guide && compactTaskRequest(safeMessage) ? compactTaskAnswer(classes) : "";
  const help =
    !guide && !compact && !topic && classes && (taskHowToRequest(safeMessage) || explainsHow(safeMessage))
      ? plainTaskHelp(classes)
      : "";
  const lesson = () => (topic ? topicAnswer(classes, safeMessage) : plainTaskHelp(classes) || topicAnswer(classes, safeMessage));
  const fallback = () =>
    guide ||
    compact ||
    help ||
    (classes && asksForLesson(safeMessage) ? lesson() : localAnswer(safeMessage, user, tasks));
  const system = scrubForAi(studySystem(user, tasks, classes)).slice(0, 16000);
  const keep = (answer: string) => {
    const blocked = blockedAnswer(safeMessage, answer);
    if (blocked) return blocked;
    if (guide) return guide;
    if (compact) return compact;
    if (
      classes &&
      /no puedo ver|desde afuera|copi(a|á)|peg(a|á)|enunciado exacto|consigna completa|pasame el enunciado/.test(
        fold(answer),
      )
    ) {
      return lesson();
    }
    return plainChatText(answer);
  };

  try {
    const free = await answerWithFreeLlm(safeMessage, safePrevious, system);
    if (free) return keep(free);
  } catch {
    // Si el servicio gratuito no responde, seguimos con Gemini o con los datos locales.
  }

  const key = process.env.GEMINI_API_KEY;
  const triedFree = freeLlmConfigured();
  if (!triedFree && !key) return fallback();
  if (!key) {
    if (isGreeting(safeMessage)) return greetingReply(safeMessage);
    return fallback();
  }

  const contents = [
    ...safePrevious.map((item) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.content }],
    })),
    { role: "user", parts: [{ text: safeMessage }] },
  ];

  for (const model of ["gemini-2.5-flash", "gemini-2.0-flash"]) {
    try {
      const res = await aiFetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        timeoutMs: 20000,
        body: {
          systemInstruction: { parts: [{ text: system }] },
          contents,
        },
      });
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
  if (isGreeting(safeMessage)) return greetingReply(safeMessage);
  return fallback();
}
