import { autoLessons, buildLesson, cachedAutoLesson, fallbackLesson, hasRecentLessonSubject, subjectChoices } from "@/lib/lessons";
import { listTasks } from "@/lib/db";
import { isUser, json, requireUser } from "@/lib/http";
import { claimLesson } from "@/lib/progress";

export async function GET() {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const subjects = await subjectChoices(user, listTasks(user.id).map((task) => task.subject));
  const lessons = await autoLessons(user, subjects);
  return json({ ok: true, lessons: lessons.map((item) => item.lesson) });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const body = (await request.json().catch(() => null)) as { subject?: string; topic?: string } | null;
  const subject = body?.subject?.trim() ?? "";
  const topic = body?.topic?.trim() ?? "";
  if (!subject || subject.length > 160) return json({ error: "Elegí una materia." }, 400);
  const cached = topic ? cachedAutoLesson(user.id, subject, topic) : null;
  if (!cached && !hasRecentLessonSubject(user, subject)) return json({ error: "No hay material reciente para esa materia." }, 400);
  try {
    const result = cached ? { ok: true as const, lesson: cached } : await buildLesson(user, subject, topic);
    const reward = claimLesson(user.id, subject);
    return json({ ok: true, lesson: result.ok ? result.lesson : fallbackLesson(subject, "", topic), reward });
  } catch {
    const reward = claimLesson(user.id, subject);
    return json({ ok: true, lesson: fallbackLesson(subject, ""), reward });
  }
}
