import Link from "next/link";
import { redirect } from "next/navigation";
import { subjectColor } from "@/lib/subject-color";
import { getCurrentUser } from "@/lib/session";
import { subjectsData } from "@/lib/view";

export default async function MateriasPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/entrar");
  const data = subjectsData(session.id);
  if (!data) redirect("/entrar");

  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-display text-3xl">Materias</h1>
      {data.subjects.length === 0 ? (
        <p className="rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10">Cuando haya tareas, las vas a ver agrupadas acá.</p>
      ) : (
        data.subjects.map((subject) => (
          <Link
            key={subject.subject}
            href={`/materias/${encodeURIComponent(subject.subject)}`}
            className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10"
            style={{ boxShadow: `inset 6px 0 0 ${subjectColor(subject.subject)}` }}
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-2xl">{subject.subject}</h2>
              <span className="text-sm text-muted-foreground">{subject.pending} por hacer</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-xp"
                style={{ width: `${subject.total ? Math.round((subject.done / subject.total) * 100) : 0}%` }}
              />
            </div>
            <p className="mt-2 text-sm">{subject.done} de {subject.total} entregadas</p>
          </Link>
        ))
      )}
    </div>
  );
}
