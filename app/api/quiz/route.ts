import { isUser, json, requireUser } from "@/lib/http";
import { buildPaperQuiz, quizSubjects } from "@/lib/paper-quiz";
import { claimLesson } from "@/lib/progress";

export async function GET() {
  const user = await requireUser();
  if (!isUser(user)) return user;
  return json({ ok: true, subjects: await quizSubjects(user) });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const body = (await request.json().catch(() => null)) as { subject?: string; fresh?: boolean } | null;
  const subject = body?.subject?.trim() ?? "";
  if (!subject || subject.length > 160) return json({ error: "Elegí una materia." }, 400);
  const result = await buildPaperQuiz(user, subject, body?.fresh === true).catch(() => null);
  if (!result) return json({ error: "No pude armar el quiz. Probá de nuevo en un rato." }, 502);
  if (!result.ok) return json({ error: result.error }, 422);
  claimLesson(user.id, subject);
  return json({ ok: true, quiz: result.quiz });
}
