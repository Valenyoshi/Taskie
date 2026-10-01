import { insertTask } from "./db";
import { addDays, endOfLocalDay, localDateString, weekStart } from "./time";

export function seedDemoTasks(userId: string, timeZone: string, now = new Date()): void {
  const today = localDateString(now, timeZone);
  const start = weekStart(today);
  const end = addDays(start, 6);
  const tomorrow = addDays(today, 1);
  const later = addDays(today, 3);
  const extra1 = tomorrow <= end ? tomorrow : today;
  const extra2 = later <= end ? later : end;
  const overdue = addDays(today, -8);
  const soon = new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString();
  const endToday = endOfLocalDay(today, timeZone);
  const createdAt = now.toISOString();

  const tasks: Array<{
    externalId: string;
    subject: string;
    title: string;
    description: string;
    dueAt: string;
    needsFile: boolean;
  }> = [
    {
      externalId: "demo-fracciones",
      subject: "Matemática",
      title: "Problemas de proporcionalidad",
      description: "Resolvé los 8 problemas de la fotocopia. Dejá el planteo, no solo el resultado.",
      dueAt: endToday,
      needsFile: true,
    },
    {
      externalId: "demo-cuento",
      subject: "Lengua",
      title: "Comentario de un cuento",
      description: "Una carilla sobre el narrador y el final. Podés entregarla escrita o en archivo.",
      dueAt: endToday,
      needsFile: true,
    },
    {
      externalId: "demo-revolucion",
      subject: "Historia",
      title: "Causas de la revolución",
      description: "Listá tres causas y explicá una con un ejemplo del texto.",
      dueAt: endToday,
      needsFile: false,
    },
    {
      externalId: "demo-celula",
      subject: "Biología",
      title: "Partes de la célula",
      description: "Completá el esquema: membrana, núcleo y mitocondria, con una frase cada uno.",
      dueAt: endToday,
      needsFile: true,
    },
    {
      externalId: "demo-verbs",
      subject: "Inglés",
      title: "Irregular verbs",
      description: "Estudiá la lista 1 a 15 y escribí una oración con cinco de ellos.",
      dueAt: endToday,
      needsFile: false,
    },
    {
      externalId: "demo-rios",
      subject: "Geografía",
      title: "Mapa de ríos",
      description: "Marcá en el mapa los ríos que vimos en clase y subí una foto o el archivo.",
      dueAt: endToday,
      needsFile: true,
    },
    {
      externalId: "demo-ecuaciones",
      subject: "Matemática",
      title: "Ecuaciones de primer grado",
      description: "Ejercicios 4 a 12. Verificá el resultado en dos de ellos.",
      dueAt: endToday,
      needsFile: false,
    },
    {
      externalId: "demo-noticia",
      subject: "Ciudadanía",
      title: "Noticia de la semana",
      description: "Elegí una noticia y escribí qué hecho cuenta y qué opinión agrega el medio.",
      dueAt: endToday,
      needsFile: true,
    },
    {
      externalId: "demo-lectura",
      subject: "Lengua",
      title: "Lectura en voz alta",
      description: "Prepará el fragmento de la página 22. Esta entrega vence dentro de unas horas.",
      dueAt: soon,
      needsFile: false,
    },
    {
      externalId: "demo-linea",
      subject: "Historia",
      title: "Línea de tiempo",
      description: "Ocho hechos en orden, con el año y una frase de contexto.",
      dueAt: endOfLocalDay(extra1, timeZone),
      needsFile: true,
    },
    {
      externalId: "demo-lab",
      subject: "Biología",
      title: "Informe del laboratorio",
      description: "Qué hicimos, qué observamos y una conclusión de cinco líneas.",
      dueAt: endOfLocalDay(extra2, timeZone),
      needsFile: true,
    },
    {
      externalId: "demo-essay",
      subject: "Inglés",
      title: "Essay atrasado",
      description: "El párrafo ya venció la semana pasada. Si lo entregás ahora suma menos.",
      dueAt: endOfLocalDay(overdue, timeZone),
      needsFile: true,
    },
  ];

  for (const task of tasks) {
    insertTask({
      id: crypto.randomUUID(),
      userId,
      externalId: task.externalId,
      subject: task.subject,
      title: task.title,
      description: task.description,
      dueAt: task.dueAt,
      source: "demo",
      educamosUrl: null,
      needsFile: task.needsFile,
      createdAt,
    });
  }
}
