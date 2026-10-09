"use client";

import { useEffect, useState } from "react";
import { RewardPopup } from "@/components/reward-popup";
import { SubjectMark } from "@/components/subject-mark";
import type { Lesson, LessonStep } from "@/lib/lessons";

type LessonReward = { first: boolean; points: number };

export function LessonDeck({ streak }: { streak: number }) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [available, setAvailable] = useState<Lesson[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [reward, setReward] = useState<LessonReward | null>(null);

  useEffect(() => {
    let alive = true;
    void fetch("/api/lessons")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { lessons?: Lesson[] } | null) => {
        if (!alive) return;
        setAvailable(data?.lessons ?? []);
        setLoadingAvailable(false);
      })
      .catch(() => {
        if (alive) setLoadingAvailable(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function start(subject: string, topic = "") {
    setBusy(subject);
    setError(null);
    setLesson(null);
    setDone(false);
    setReward(null);
    try {
      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subject, topic }),
      });
      const data = (await res.json()) as { error?: string; lesson?: Lesson; reward?: LessonReward };
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
      setReward(data.reward?.first ? data.reward : null);
    } catch {
      setError("No pude armar el repaso.");
    }
    setBusy(null);
  }

  function reset() {
    setLesson(null);
    setDone(false);
    setError(null);
    setReward(null);
  }

  if (!lesson) {
    return (
      <div className="lesson-home">
        <p className="text-sm font-semibold text-muted-foreground">
          Elegí un tema de lo trabajado en los últimos días. Los repasos ya están preparados.
        </p>
        {loadingAvailable ? (
          <div className="rounded-3xl bg-card px-4 py-8 text-center font-display text-xl">Preparando tus lecciones…</div>
        ) : available.length === 0 ? (
          <p className="rounded-3xl bg-card px-4 py-6 text-center font-display text-xl">
            No encontré tareas de los últimos 7 días para preparar un repaso.
          </p>
        ) : available.length > 0 ? (
          <div className="grid gap-3">
            {available.map((item) => (
              <button
                key={`${item.subject}-${item.title}`}
                type="button"
                className="lesson-skill min-h-0"
                disabled={busy !== null}
                onClick={() => void start(item.subject, item.title)}
              >
                <SubjectMark subject={item.subject} size={40} />
                <span className="text-sm text-muted-foreground">{item.subject}</span>
                <span>{busy === item.subject ? "Abriendo…" : item.title}</span>
              </button>
            ))}
          </div>
        ) : null}
        {error ? <p className="text-sm font-semibold text-coral">{error}</p> : null}
      </div>
    );
  }

  const rewardPopup = reward ? (
    <RewardPopup
      open
      title="¡Lección empezada!"
      description={`Completá el repaso de ${lesson.subject} y seguí sumando.`}
      streak={streak}
      points={reward.points}
      onClose={() => setReward(null)}
    />
  ) : null;

  if (done) {
    const quizzes = lesson.steps.filter((item) => item.kind === "quiz").length;
    return (
      <>
        <div className="lesson-done">
          <div className="lesson-done-badge" aria-hidden>
            🏆
          </div>
          <p className="font-display text-4xl">Repaso listo</p>
          <p className="text-lg">
            {score} de {quizzes} en {lesson.subject}
          </p>
          <button type="button" className="lesson-next" onClick={reset}>
            Otra materia
          </button>
        </div>
        {rewardPopup}
      </>
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
    <>
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
          <span className="lesson-step-count">
            {step + 1}/{lesson.steps.length}
          </span>
        </div>
        <div key={step} className="lesson-card">
          {current.kind === "teach" ? <p className="lesson-tag theory">Idea clave</p> : null}
          <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">{lesson.title}</p>
          {current.kind === "teach" ? (
            <p className="font-sans text-xl leading-relaxed font-semibold break-words sm:text-2xl">{current.text}</p>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="font-sans text-xl leading-relaxed font-semibold break-words sm:text-2xl">{current.prompt}</p>
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
              {checked ? (
                <p className={`lesson-feedback ${correct ? "right" : "wrong"}`} aria-live="polite">
                  <strong>{correct ? "¡Correcto!" : "Casi."}</strong> {current.why}
                </p>
              ) : null}
            </div>
          )}
        </div>
        <button type="button" className="lesson-next" disabled={current.kind === "quiz" && picked === null} onClick={advance}>
          {current.kind === "quiz" && !checked ? "Comprobar" : last ? "Terminar" : "Continuar"}
        </button>
      </div>
      {rewardPopup}
    </>
  );
}
