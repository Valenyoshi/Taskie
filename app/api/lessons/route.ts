import { buildLesson, fallbackLesson } from "@/lib/lessons";
import { isUser, json, requireUser } from "@/lib/http";
import { claimLesson } from "@/lib/progress";

export async function POST(request: Request) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const body = (await request.json().catch(() => null)) as { subject?: string } | null;
  const subject = body?.subject?.trim() ?? "";
  if (!subject || subject.length > 160) return json({ error: "Elegí una materia." }, 400);
  try {
    const result = await buildLesson(user, subject);
    const reward = claimLesson(user.id, subject);
    return json({ ok: true, lesson: result.ok ? result.lesson : fallbackLesson(subject, ""), reward });
  } catch {
    const reward = claimLesson(user.id, subject);
    return json({ ok: true, lesson: fallbackLesson(subject, ""), reward });
  }
}
