import { redirect } from "next/navigation";
import { AuthPanel } from "@/components/auth-panel";
import { getCurrentUser } from "@/lib/session";

export default async function EntrarPage() {
  const user = await getCurrentUser();
  if (user) redirect("/inicio");

  return (
    <main className="mx-auto grid min-h-dvh max-w-5xl items-center gap-10 px-5 py-10 md:grid-cols-2">
      <section>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Racha</p>
        <h1 className="mt-3 font-display text-5xl leading-none">Las tareas del colegio, con nivel.</h1>
        <p className="mt-4 max-w-md text-base text-muted-foreground">
          Entrá con tu cuenta de Educamos. Entregá a tiempo, llená la barra del día y usá los puntos en la máquina de
          premios. La misma web funciona en la computadora y se puede dejar en la pantalla de inicio del celular.
        </p>
        <ul className="mt-6 space-y-2 text-sm">
          <li>Inicio con las tareas que faltan y las barras diaria y semanal.</li>
          <li>Materias, premios, ranking y un chat para dudas.</li>
          <li>Avisos cuando hoy todavía te queda algo por entregar.</li>
        </ul>
      </section>
      <AuthPanel />
    </main>
  );
}
