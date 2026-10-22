import { redirect } from "next/navigation";
import { AuthPanel } from "@/components/auth-panel";
import { SchoolIcon } from "@/components/school-icon";
import { getCurrentUser } from "@/lib/session";

const floats = [
  { id: "lapiz", className: "left-6 top-16 float-a" },
  { id: "mochila", className: "right-8 top-24 float-b" },
  { id: "manzana", className: "bottom-16 left-10 float-b hidden md:block" },
  { id: "libro", className: "bottom-24 right-12 float-a hidden md:block" },
];

export default async function EntrarPage() {
  const user = await getCurrentUser();
  if (user) redirect("/inicio");

  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute -left-16 top-10 size-56 rounded-full bg-coral/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 bottom-10 size-64 rounded-full bg-pine/20 blur-3xl" />
      {floats.map((item) => (
        <div key={item.id} className={`pointer-events-none absolute opacity-80 ${item.className}`}>
          <SchoolIcon id={item.id} size={64} />
        </div>
      ))}
      <div className="relative mx-auto grid min-h-dvh max-w-5xl items-center gap-8 px-5 py-16 md:grid-cols-2">
        <section>
          <p className="font-display text-5xl leading-none text-coral sm:text-6xl">Taskie</p>
          <h1 className="gradient-text mt-3 font-display text-5xl leading-none">Las tareas del colegio, con otro nivel.</h1>
        </section>
        <AuthPanel />
      </div>
    </main>
  );
}
