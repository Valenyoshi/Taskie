import Link from "next/link";
import { redirect } from "next/navigation";
import { TaskCard } from "@/components/task-card";
import { getCurrentUser } from "@/lib/session";
import { subjectTasks } from "@/lib/view";

export default async function SubjectPage({ params }: { params: Promise<{ subject: string }> }) {
  const session = await getCurrentUser();
  if (!session) redirect("/entrar");
  const { subject: raw } = await params;
  const subject = decodeURIComponent(raw);
  const data = subjectTasks(session.id, subject);
  if (!data) redirect("/entrar");

  return (
    <div className="flex flex-col gap-3">
      <Link href="/materias" className="text-sm text-primary">
        Todas las materias
      </Link>
      <h1 className="font-display text-3xl">{subject}</h1>
      {data.tasks.length === 0 ? (
        <p className="rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10">No hay tareas de esta materia.</p>
      ) : (
        data.tasks.map((task) => <TaskCard key={task.id} task={task} />)
      )}
    </div>
  );
}
