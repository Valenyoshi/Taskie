import { TaskCard } from "@/components/task-card";
import { NotifyCard } from "@/components/notify-card";
import { SyncButton } from "@/components/sync-button";
import { getCurrentUser } from "@/lib/session";
import { homeData } from "@/lib/view";
import { redirect } from "next/navigation";

export default async function InicioPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/entrar");
  const data = homeData(session.id);
  if (!data) redirect("/entrar");
  const { user, missions, pending, done } = data;
  const dailyWidth = Math.round(missions.dailyRatio * 100);

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Nivel {user.level}</p>
            <p className="font-display text-3xl">{user.into}/{user.need} XP</p>
          </div>
          <p className="text-right">
            <span className="block text-sm text-muted-foreground">Puntos</span>
            <span className="font-display text-3xl text-points">{user.points}</span>
          </p>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-xp" style={{ width: `${Math.round((user.into / user.need) * 100)}%` }} />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Racha de {user.streak} {user.streak === 1 ? "día" : "días"}. La XP no se gasta.</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <h2 className="font-display text-xl">Hoy</h2>
          {missions.dailyTotal === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Hoy no vence ninguna tarea, así que no hay bonus.</p>
          ) : (
            <>
              <p className="mt-1 text-sm">
                {missions.dailyDone} de {missions.dailyTotal} a tiempo. La meta es el 60%.
              </p>
              <div className="relative mt-3 h-3 rounded-full bg-muted">
                <div className="absolute inset-y-0 left-0 rounded-full bg-xp" style={{ width: `${dailyWidth}%` }} />
                <div className="absolute inset-y-[-4px] w-0.5 bg-foreground" style={{ left: "60%" }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{missions.dailyClaimed ? "Bonus del día cobrado." : missions.dailyMet ? "Llegaste a la meta." : "Todavía no llega al 60%."}</p>
            </>
          )}
        </article>
        <article className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <h2 className="font-display text-xl">Semana</h2>
          {missions.weeklyTotal === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Esta semana no hay tareas cargadas.</p>
          ) : (
            <>
              <p className="mt-1 text-sm">
                {missions.weeklyDone} de {missions.weeklyTotal} a tiempo. El bonus pide todas.
              </p>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-points"
                  style={{ width: `${Math.round((missions.weeklyDone / missions.weeklyTotal) * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {missions.comboClaimed
                  ? "Combo de la semana cobrado."
                  : missions.weeklyClaimed
                    ? "Semana completa."
                    : "Si cerrás la diaria y la semanal, hay puntos extra."}
              </p>
            </>
          )}
        </article>
      </section>

      {user.isDemo ? (
        <p className="rounded-xl bg-secondary px-4 py-3 text-sm">
          Estás con tareas de ejemplo para ver el juego. Cuando crees tu cuenta con Educamos, se reemplazan por las del colegio.
        </p>
      ) : null}
      {user.syncError ? <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{user.syncError}</p> : null}
      <SyncButton />
      <NotifyCard enabled={user.notificationsEnabled} />

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl">Por hacer</h2>
        {pending.length === 0 ? (
          <p className="rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10">No tenés tareas pendientes.</p>
        ) : (
          pending.map((task) => <TaskCard key={task.id} task={task} />)
        )}
      </section>

      {done.length > 0 ? (
        <details className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <summary className="cursor-pointer font-medium">Entregadas ({done.length})</summary>
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
