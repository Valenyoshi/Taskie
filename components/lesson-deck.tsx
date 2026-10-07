"use client";

import { useState } from "react";
import { SubjectMark } from "@/components/subject-mark";
import type { Lesson, LessonStep } from "@/lib/lessons";

export function LessonDeck({ subjects }: { subjects: string[] }) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function start(subject: string) {
    setBusy(subject);
    setError(null);
    setLesson(null);
    setDone(false);
    try {
      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subject }),
      });
      const data = (await res.json()) as { error?: string; lesson?: Lesson };
      if (!res.ok || !data.lesson) {
        setError(data.error ?? "No pude armar el repaso.");
        setBusy(null);
        return;
      }
      setLesson(data.lesson);
      setStep(0);
      setPicked(null);
      setChecked(false);
      setScore(0);
    } catch {
      setError("No pude armar el repaso.");
    }
    setBusy(null);
  }

  function reset() {
    setLesson(null);
    setDone(false);
    setError(null);
  }

  if (!lesson) {
    return (
      <div className="lesson-home">
        <p className="text-sm font-semibold text-muted-foreground">Repasos de menos de 3 minutos, con lo que dan en clase.</p>
        {subjects.length === 0 ? (
          <p className="rounded-3xl bg-card px-4 py-6 text-center font-display text-xl">Cuando tengas materias, aparecen acá.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {subjects.map((subject) => (
              <button key={subject} type="button" className="lesson-skill" disabled={busy !== null} onClick={() => void start(subject)}>
                <SubjectMark subject={subject} size={40} />
                <span>{busy === subject ? "Armando…" : subject}</span>
              </button>
            ))}
          </div>
        )}
        {error ? <p className="text-sm font-semibold text-coral">{error}</p> : null}
      </div>
    );
  }

  if (done) {
    const quizzes = lesson.steps.filter((item) => item.kind === "quiz").length;
    return (
      <div className="lesson-done">
        <p className="font-display text-4xl">Repaso listo</p>
        <p className="text-lg">
          {score} de {quizzes} en {lesson.subject}
        </p>
        <button type="button" className="lesson-next" onClick={reset}>
          Otra materia
        </button>
      </div>
    );
  }

  const current = lesson.steps[step] as LessonStep;
  const last = step === lesson.steps.length - 1;

  function advance() {
    if (current.kind === "quiz" && !checked) {
      if (picked === null) return;
      setChecked(true);
      if (picked === current.answer) setScore((value) => value + 1);
      return;
    }
    if (last) {
      setDone(true);
      return;
    }
    setStep((value) => value + 1);
    setPicked(null);
    setChecked(false);
  }

  const correct = current.kind === "quiz" && checked && picked === current.answer;
  const wrong = current.kind === "quiz" && checked && picked !== current.answer;

  return (
    <div className={`lesson-play ${correct ? "is-right" : ""} ${wrong ? "is-wrong" : ""}`}>
      <div className="lesson-top">
        <button type="button" className="lesson-exit" onClick={reset} aria-label="Salir del repaso">
          ×
        </button>
        <div className="lesson-pips" aria-hidden>
          {lesson.steps.map((_, index) => (
            <span key={index} className={index < step ? "done" : index === step ? "now" : ""} />
          ))}
        </div>
      </div>
      <div key={step} className="lesson-card">
      {current.kind === "teach" ? <p className="lesson-tag theory">Teoría</p> : null}
      <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">{lesson.title}</p>
      {current.kind === "teach" ? (
        <p className="font-display text-3xl leading-snug">{current.text}</p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="font-display text-3xl leading-snug">{current.prompt}</p>
          {current.options.map((option, index) => (
              <button
              key={`${option}-${index}`}
              type="button"
              disabled={checked}
              className={`lesson-option ${picked === index ? "picked" : ""} ${checked && index === current.answer ? "answer" : ""}`}
              onClick={() => setPicked(index)}
            >
              {option}
            </button>
          ))}
          {checked ? <p className="text-sm font-semibold">{current.why}</p> : null}
        </div>
      )}
      </div>
      <button type="button" className="lesson-next" disabled={current.kind === "quiz" && picked === null} onClick={advance}>
        {current.kind === "quiz" && !checked ? "Comprobar" : last ? "Terminar" : "Continuar"}
      </button>
    </div>
  );
}
