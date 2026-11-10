import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthPanel } from "@/components/auth-panel";
import { getCurrentUser } from "@/lib/session";

export default async function EntrarPage() {
  const user = await getCurrentUser();
  if (user) redirect("/inicio");

  return (
    <main className="relative min-h-dvh">
      <div className="relative mx-auto grid min-h-dvh max-w-5xl items-center gap-8 px-5 py-16 md:grid-cols-2">
        <section>
          <p className="font-display text-5xl leading-none text-coral sm:text-6xl">Taskie</p>
          <h1 className="mt-3 max-w-md text-lg leading-snug" style={{ fontFamily: "var(--font-app), sans-serif" }}>
            Las tareas del colegio, en un solo lugar.
          </h1>
          <Link href="/" className="mt-4 inline-block text-sm font-semibold text-muted-foreground">
            Ver la presentación
          </Link>
        </section>
        <AuthPanel />
      </div>
    </main>
  );
}
