import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { rankingData } from "@/lib/view";

export default async function RankingPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/entrar");
  const data = rankingData(session.id);
  if (!data) redirect("/entrar");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-3xl">Ranking</h1>
        <p className="text-sm text-muted-foreground">Solo cuentas de esta web. No se ven contraseñas ni tareas.</p>
      </div>
      {data.alone ? (
        <p className="rounded-xl bg-secondary px-4 py-3 text-sm">
          Por ahora estás solo. Cuando tus compañeros creen su cuenta en esta misma web, aparecen acá.
        </p>
      ) : null}
      <Board title="Más XP" rows={data.byXp.map((row, index) => ({ ...row, place: index + 1, score: `${row.xp} XP` }))} />
      <Board
        title="Más premios"
        rows={data.byPrizes.map((row, index) => ({
          ...row,
          place: index + 1,
          score: `${row.prizeScore} pts de premio`,
        }))}
      />
    </div>
  );
}

function Board({
  title,
  rows,
}: {
  title: string;
  rows: { id: string; place: number; name: string; level: number; score: string; me: boolean }[];
}) {
  return (
    <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <h2 className="font-display text-2xl">{title}</h2>
      <ol className="mt-3 flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row.id} className={`flex items-center justify-between rounded-lg px-3 py-2 ${row.me ? "bg-primary/10" : "bg-muted"}`}>
            <span>
              <span className="mr-2 text-muted-foreground">{row.place}</span>
              {row.name}
              <span className="ml-2 text-xs text-muted-foreground">nivel {row.level}</span>
            </span>
            <span className="text-sm font-medium">{row.score}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
