import { HatIcon } from "@/components/school-icon";
import { GoalBars } from "@/components/goal-bars";
import { StreakFlame } from "@/components/streak-flame";
import { SyncButton } from "@/components/sync-button";
import { TaskCard } from "@/components/task-card";
import { getCurrentUser } from "@/lib/session";
import { homeData } from "@/lib/view";
import { redirect } from "next/navigation";

export default async function InicioPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/entrar");
  const data = homeData(session.id);
  if (!data) redirect("/entrar");
  const { user, missions, pending, done } = data;
  const homework = pending.filter((task) => task.kind === "tarea");
  const uploads = pending.filter((task) => task.kind === "archivo");

  return (
    <div className="flex flex-col gap-4">
      <StreakFlame days={user.streak} />
      <section className="points-corral rise-in">
        <HatIcon />
        <span>
          <span className="points-value">{user.points}</span>
          <span className="points-label">{user.points === 1 ? "sombrero" : "sombreros"}</span>
        </span>
      </section>

      <GoalBars
        dailyClosed={missions.dailyClosed}
        dailyTotal={missions.dailyTotal}
        weeklyClosed={missions.weeklyClosed}
        weeklyTotal={missions.weeklyTotal}
      />

      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">Por hacer</h2>
        <SyncButton autoSync={!user.isDemo} />
      </div>
      {user.syncError ? <p className="text-sm text-destructive">{user.syncError}</p> : null}

      {homework.length === 0 ? (
        <p className="rounded-2xl bg-card px-4 py-6 text-center font-display text-xl ring-1 ring-foreground/10">Nada pendiente</p>
      ) : (
        <div className="task-stack flex flex-col gap-3">
          {homework.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}

      {uploads.length > 0 ? (
        <>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl">Para subir</h2>
          </div>
          <div className="task-stack flex flex-col gap-3">
            {uploads.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </>
      ) : user.isDemo ? null : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl">Para subir</h2>
          </div>
          <p className="rounded-2xl bg-card px-4 py-6 text-center text-sm ring-1 ring-foreground/10">
            No hay puntos de entrega. Actualizá para traer los del aula.
          </p>
        </>
      )}

      {done.length > 0 ? (
        <details className="rounded-2xl bg-card px-4 py-3 ring-1 ring-foreground/10">
          <summary className="cursor-pointer font-medium">Hechas · {done.length}</summary>
          <div className="mt-3 flex flex-col gap-3">
            {done.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </details>
      ) : null}

    </div>
  );
}

