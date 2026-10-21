"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Course = { id: string; label: string };

export function CoursePicker({ courses, selected }: { courses: Course[]; selected: string[] | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>(selected ?? []);

  async function choose(ids: string[]) {
    if (ids.length === 0) {
      setError("Elegí al menos un curso.");
      return;
    }
    setBusy(true);
    setError(null);
    const response = await fetch("/api/courses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setError(data.error ?? "No pude guardar el curso.");
      return;
    }
    router.refresh();
  }

  if (courses.length < 2) return null;

  const same = (ids: string[]) => selected !== null && selected.length === ids.length && ids.every((id) => selected.includes(id));

  return (
    <section className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10" aria-label="Cursos">
      <p className="font-display text-2xl leading-none">
        {courses.length === 2 ? "Estás en dos cursos" : "Estás en más de un curso"}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">Elegí uno o los dos. Las tareas del que no elijas dejan de mostrarse.</p>
      {courses.length === 2 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant={same([courses[0].id]) ? "default" : "outline"} disabled={busy} onClick={() => void choose([courses[0].id])}>
            Solo {courses[0].label}
          </Button>
          <Button variant={same([courses[1].id]) ? "default" : "outline"} disabled={busy} onClick={() => void choose([courses[1].id])}>
            Solo {courses[1].label}
          </Button>
          <Button
            variant={same(courses.map((course) => course.id)) ? "default" : "outline"}
            disabled={busy}
            onClick={() => void choose(courses.map((course) => course.id))}
          >
            Los dos
          </Button>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {courses.map((course) => {
            const on = picked.includes(course.id);
            return (
              <button
                key={course.id}
                type="button"
                aria-pressed={on}
                onClick={() => setPicked((current) => (on ? current.filter((id) => id !== course.id) : [...current, course.id]))}
                className={`rounded-xl px-3 py-2 text-left text-sm font-semibold ring-1 ring-foreground/10 ${on ? "bg-primary text-primary-foreground" : "bg-background"}`}
              >
                {course.label}
              </button>
            );
          })}
          <Button className="mt-1 w-fit" disabled={busy} onClick={() => void choose(picked)}>
            Ver {picked.length === courses.length ? "todos" : "estos"}
          </Button>
        </div>
      )}
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
