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
        <p className="mt-4 max-w-md text-base text-muted-foreground">Tus tareas de Educamos, con nivel y premios.</p>
      </section>
      <AuthPanel />
    </main>
  );
}
