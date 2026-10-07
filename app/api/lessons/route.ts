import { buildLesson } from "@/lib/lessons";
import { isUser, json, requireUser } from "@/lib/http";

export async function POST(request: Request) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const body = (await request.json().catch(() => null)) as { subject?: string } | null;
  const subject = body?.subject?.trim() ?? "";
  if (!subject || subject.length > 80) return json({ error: "Elegí una materia." }, 400);
  try {
    const result = await buildLesson(user, subject);
    if (!result.ok) return json({ error: result.error }, 502);
    return json({ ok: true, lesson: result.lesson });
  } catch {
    return json({ error: "No pude armar el repaso." }, 500);
  }
}
