"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SubjectMark } from "@/components/subject-mark";

type QuizQuestion = { prompt: string; options: string[]; answer: number; why: string };
type Quiz = { subject: string; topic: string; summary: string; topics: string[]; questions: QuizQuestion[] };
type Result = { picked: number | null; correct: boolean; points: number };
type Phase = "lobby" | "topics" | "loading" | "countdown" | "brief" | "question" | "reveal" | "final";

const LIMIT_MS = 20000;
const TILES = [
  { color: "red", label: "Triángulo", path: "M12 3.4 21.2 19.9 2.9 19.5Z" },
  { color: "blue", label: "Rombo", path: "M12.1 2.6 21.3 12.2 11.8 21.4 2.8 11.7Z" },
  { color: "yellow", label: "Círculo", path: "M12 3.1c5.1-.1 9 3.9 8.9 8.9 0 5.1-4 8.9-9 8.8-4.9 0-8.8-4.1-8.7-9 .1-4.8 3.9-8.6 8.8-8.7Z" },
  { color: "green", label: "Cuadrado", path: "M3.9 4.2 20.3 3.7 19.9 20.2 3.6 19.8Z" },
] as const;
const LOADING_LINES = ["Leyendo tus clases…", "Escribiendo las preguntas…", "Sacándole punta al lápiz…", "Mezclando las respuestas…"];

function Shape({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" className="pq-shape" aria-hidden>
      <path d={path} />
    </svg>
  );
}

function bestKey(subject: string) {
  return `paper-quiz-best:${subject.toLowerCase()}`;
}

export function PaperQuiz() {
  const [subjects, setSubjects] = useState<string[] | null>(null);
  const [listError, setListError] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [topicList, setTopicList] = useState<string[] | null>(null);
  const [topicError, setTopicError] = useState("");
  const [phase, setPhase] = useState<Phase>("lobby");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [error, setError] = useState("");
  const [count, setCount] = useState(3);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [left, setLeft] = useState(LIMIT_MS);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [best, setBest] = useState(0);
  const [loadingLine, setLoadingLine] = useState(0);
  const startedAt = useRef(0);

  const loadSubjects = useCallback(async () => {
    setListError("");
    setSubjects(null);
    try {
      const response = await fetch("/api/quiz");
      const data = (await response.json().catch(() => ({}))) as { subjects?: string[]; error?: string };
      if (!response.ok) throw new Error(data.error || "No pude cargar tus materias.");
      setSubjects(data.subjects ?? []);
    } catch (problem) {
      setListError(problem instanceof Error ? problem.message : "No pude cargar tus materias.");
      setSubjects([]);
    }
  }, []);

  useEffect(() => {
    void loadSubjects();
  }, [loadSubjects]);

  async function openSubject(subject: string) {
    setSubjectName(subject);
    setTopicList(null);
    setTopicError("");
    setError("");
    setPhase("topics");
    try {
      const response = await fetch(`/api/quiz?subject=${encodeURIComponent(subject)}`);
      const data = (await response.json().catch(() => ({}))) as { topics?: string[]; error?: string };
      if (!response.ok) throw new Error(data.error || "No pude cargar los temas.");
      setTopicList(data.topics ?? []);
    } catch (problem) {
      setTopicError(problem instanceof Error ? problem.message : "No pude cargar los temas.");
      setTopicList([]);
    }
  }

  async function start(subject: string, fresh = false, topic = "") {
    setError("");
    setPhase("loading");
    setLoadingLine(0);
    try {
      const response = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, topic, fresh }),
      });
      const data = (await response.json().catch(() => ({}))) as { quiz?: Quiz; error?: string };
      if (!response.ok || !data.quiz) throw new Error(data.error || "No pude armar el quiz.");
      setQuiz(data.quiz);
      setIndex(0);
      setScore(0);
      setStreak(0);
      setResults([]);
      setPicked(null);
      setBest(Number(window.localStorage.getItem(bestKey(data.quiz.subject)) ?? 0) || 0);
      setCount(3);
      setPhase("countdown");
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "No pude armar el quiz.");
      setSubjectName(subject);
      setPhase("topics");
    }
  }

  useEffect(() => {
    if (phase !== "loading") return;
    const timer = window.setInterval(() => setLoadingLine((line) => (line + 1) % LOADING_LINES.length), 2600);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "countdown" || !quiz) return;
    if (count === 0) {
      if (quiz.summary) {
        setPhase("brief");
        return;
      }
      startedAt.current = performance.now();
      setLeft(LIMIT_MS);
      setPhase("question");
      return;
    }
    const timer = window.setTimeout(() => setCount((value) => value - 1), 750);
    return () => window.clearTimeout(timer);
  }, [phase, count, quiz]);

  function beginQuestions() {
    startedAt.current = performance.now();
    setLeft(LIMIT_MS);
    setPhase("question");
  }

  const choose = useCallback(
    (option: number | null) => {
      if (phase !== "question" || !quiz) return;
      const elapsed = Math.min(LIMIT_MS, performance.now() - startedAt.current);
      const correct = option !== null && option === quiz.questions[index].answer;
      const bonus = correct ? Math.min(streak, 5) * 100 : 0;
      const points = correct ? Math.round(1000 * (1 - elapsed / LIMIT_MS / 2)) + bonus : 0;
      setPicked(option);
      setScore((value) => value + points);
      setStreak((value) => (correct ? value + 1 : 0));
      setResults((list) => [...list, { picked: option, correct, points }]);
      setPhase("reveal");
    },
    [phase, quiz, index, streak],
  );

  useEffect(() => {
    if (phase !== "question") return;
    const timer = window.setInterval(() => {
      const remaining = LIMIT_MS - (performance.now() - startedAt.current);
      if (remaining <= 0) choose(null);
      else setLeft(remaining);
    }, 100);
    return () => window.clearInterval(timer);
  }, [phase, choose]);

  const next = useCallback(() => {
    if (!quiz) return;
    if (index + 1 >= quiz.questions.length) {
      if (score > best) window.localStorage.setItem(bestKey(quiz.subject), String(score));
      setPhase("final");
      return;
    }
    setIndex((value) => value + 1);
    setPicked(null);
    startedAt.current = performance.now();
    setLeft(LIMIT_MS);
    setPhase("question");
  }, [quiz, index, score, best]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(event.target.tagName)) return;
      if (phase === "question" && /^[1-4]$/.test(event.key)) choose(Number(event.key) - 1);
      if (phase === "reveal" && event.key === "Enter") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, choose, next]);

  function backToLobby() {
    setPhase("lobby");
    setQuiz(null);
  }

  if (phase === "loading") {
    return (
      <div className="pq">
        <div className="pq-sheet pq-center" role="status" aria-live="polite">
          <svg viewBox="0 0 120 60" className="pq-scribble" aria-hidden>
            <path pathLength={100} d="M6 40c10-22 18-24 22-6s12 18 18-2 14-20 20-2 12 18 20 0 14-18 22-4" />
          </svg>
          <p className="pq-title-sm">{LOADING_LINES[loadingLine]}</p>
          <p className="pq-muted">Puede tardar unos segundos.</p>
        </div>
      </div>
    );
  }

  if (phase === "countdown" && quiz) {
    return (
      <div className="pq">
        <div className="pq-sheet pq-center">
          <p className="pq-muted">{quiz.subject}</p>
          {quiz.topic ? <p className="pq-title-sm">{quiz.topic}</p> : null}
          <div key={count} className="pq-count" aria-live="assertive">
            <svg viewBox="0 0 100 100" aria-hidden>
              <path d="M50 8c24-1 43 18 42 42-1 23-19 41-43 41C26 91 8 72 9 49 10 26 28 8 52 9" />
            </svg>
            <span>{count || "¡Ya!"}</span>
          </div>
          <p className="pq-title-sm">{quiz.questions.length} preguntas · 20 segundos cada una</p>
        </div>
      </div>
    );
  }

  if (phase === "brief" && quiz) {
    return (
      <div className="pq">
        <div className="pq-sheet">
          <p className="pq-muted">{quiz.topic || quiz.subject}</p>
          <h3 className="pq-title-sm">Lo más importante</h3>
          <p className="mt-3 text-base leading-relaxed">{quiz.summary}</p>
        </div>
        <button type="button" className="pq-button" onClick={beginQuestions}>
          A las preguntas
        </button>
      </div>
    );
  }

  if ((phase === "question" || phase === "reveal") && quiz) {
    const question = quiz.questions[index];
    const result = phase === "reveal" ? results[results.length - 1] : null;
    const seconds = Math.ceil(left / 1000);
    return (
      <div className="pq">
        <div className="pq-bar">
          <button type="button" className="pq-link" onClick={backToLobby}>
            Abandonar
          </button>
          <span className="pq-chip">
            {index + 1} de {quiz.questions.length}
          </span>
          <span className="pq-chip pq-score">{score.toLocaleString("es-AR")} pts</span>
        </div>

        <div className="pq-sheet pq-question">
          <p className="pq-subject">{quiz.topic || quiz.subject}</p>
          <h3>{question.prompt}</h3>
          {phase === "question" ? (
            <div className="pq-timer" aria-label={`Quedan ${seconds} segundos`}>
              <div className="pq-track">
                <div className={`pq-timer-fill ${seconds <= 5 ? "low" : ""}`} style={{ width: `${(left / LIMIT_MS) * 100}%` }} />
              </div>
              <span className={seconds <= 5 ? "low" : ""}>{seconds}</span>
            </div>
          ) : null}
        </div>

        {result ? (
          <div className={`pq-banner ${result.correct ? "right" : "wrong"}`} aria-live="polite">
            <strong>{result.correct ? "¡Correcto!" : result.picked === null ? "¡Se acabó el tiempo!" : "Casi…"}</strong>
            <span>{result.correct ? `+${result.points} pts${streak > 1 ? ` · racha de ${streak}` : ""}` : `Era: ${question.options[question.answer]}`}</span>
            {question.why ? <p>{question.why}</p> : null}
          </div>
        ) : null}

        <div className="pq-tiles">
          {question.options.map((option, optionIndex) => {
            const tile = TILES[optionIndex];
            const isAnswer = phase === "reveal" && optionIndex === question.answer;
            const isMiss = phase === "reveal" && optionIndex === picked && optionIndex !== question.answer;
            const dim = phase === "reveal" && !isAnswer && !isMiss;
            return (
              <button
                key={optionIndex}
                type="button"
                className={`pq-tile ${tile.color} ${isAnswer ? "is-answer" : ""} ${isMiss ? "is-miss" : ""} ${dim ? "is-dim" : ""}`}
                disabled={phase !== "question"}
                onClick={() => choose(optionIndex)}
                aria-label={`${tile.label}: ${option}`}
              >
                <Shape path={tile.path} />
                <span>{option}</span>
                {isAnswer ? (
                  <svg viewBox="0 0 24 24" className="pq-mark" aria-hidden>
                    <path d="M4 13.5c2.2 1.6 3.6 3.2 4.8 5.2C11.6 12.4 15.4 7.6 20.5 4" />
                  </svg>
                ) : null}
                {isMiss ? (
                  <svg viewBox="0 0 24 24" className="pq-mark" aria-hidden>
                    <path d="M5 5.4c4.6 4.2 9.3 8.8 14 13.4M18.6 5c-4.4 4.6-8.8 9.3-13.4 14" />
                  </svg>
                ) : null}
              </button>
            );
          })}
        </div>

        {phase === "reveal" ? (
          <button type="button" className="pq-button" onClick={next} autoFocus>
            {index + 1 >= quiz.questions.length ? "Ver resultado" : "Siguiente pregunta"}
          </button>
        ) : (
          <p className="pq-muted pq-hint">Tocá una opción, o usá las teclas 1 a 4.</p>
        )}
      </div>
    );
  }

  if (phase === "final" && quiz) {
    const right = results.filter((item) => item.correct).length;
    const total = quiz.questions.length;
    const medal = right >= total - 1 ? "gold" : right >= Math.ceil(total / 2) ? "silver" : "bronze";
    const record = score > best;
    return (
      <div className="pq">
        <div className="pq-sheet pq-center pq-final">
          <svg viewBox="0 0 80 96" className={`pq-medal ${medal}`} aria-hidden>
            <path className="ribbon" d="M24 4 34 38M56 4 46 38" />
            <path className="disc" d="M40 34c15-.4 27 11.6 26.6 26.4C66.2 75 54 86.4 39.6 86 25 85.6 13.6 73.8 14 59.4 14.4 45.4 26 34.2 40 34Z" />
            <path className="star" d="m40 47 4.4 8.6 9.4 1.3-6.8 6.5 1.7 9.4L40 68.3l-8.6 4.5 1.6-9.4-6.8-6.5 9.4-1.3Z" />
          </svg>
          <p className="pq-subject">{quiz.topic ? `${quiz.subject} · ${quiz.topic}` : quiz.subject}</p>
          <p className="pq-big">{score.toLocaleString("es-AR")} pts</p>
          <p className="pq-title-sm">
            {right} de {total} bien{record ? " · ¡nuevo récord!" : best ? ` · tu récord: ${best.toLocaleString("es-AR")}` : ""}
          </p>
        </div>

        <ol className="pq-review">
          {quiz.questions.map((question, questionIndex) => {
            const item = results[questionIndex];
            return (
              <li key={questionIndex} className={item?.correct ? "right" : "wrong"}>
                <span className="pq-review-mark" aria-label={item?.correct ? "Bien" : "Mal"}>
                  {item?.correct ? "✓" : "✗"}
                </span>
                <div>
                  <p>{question.prompt}</p>
                  <p className="pq-muted">Respuesta: {question.options[question.answer]}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="pq-actions">
          <button type="button" className="pq-button" onClick={() => start(quiz.subject, true, quiz.topic)}>
            Jugar otra vez
          </button>
          <button type="button" className="pq-button ghost" onClick={() => void openSubject(quiz.subject)}>
            Otro tema
          </button>
          <button type="button" className="pq-button ghost" onClick={backToLobby}>
            Otra materia
          </button>
        </div>
      </div>
    );
  }

  if (phase === "topics") {
    return (
      <div className="pq">
        <div className="pq-head">
          <button type="button" className="pq-link pq-back" onClick={backToLobby}>
            Materias
          </button>
          <p className="pq-title-sm">{subjectName}</p>
          <p className="pq-muted">Elegí un tema, o jugá de toda la materia.</p>
        </div>

        {error ? (
          <p className="pq-note wrong" role="alert">
            {error}
          </p>
        ) : null}

        <div className="pq-cards pq-topics">
          <button type="button" className="pq-card wide" onClick={() => start(subjectName)}>
            <span>Toda la materia</span>
          </button>
          {topicList === null
            ? [0, 1, 2].map((item) => <div key={item} className="pq-card topic is-ghost" />)
            : topicList.map((topic) => (
                <button key={topic} type="button" className="pq-card topic" onClick={() => start(subjectName, false, topic)}>
                  <span>{topic}</span>
                </button>
              ))}
        </div>
        {topicList !== null && topicList.length === 0 ? (
          <p className="pq-muted">{topicError || "No encontré temas sueltos. Podés jugar de toda la materia."}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="pq">
      <div className="pq-head">
        <h2 className="pq-title">
          Paper Quiz
          <svg viewBox="0 0 200 14" aria-hidden>
            <path d="M3 9c30-6 62-7 96-3 30 3 60 2 98-4" />
          </svg>
        </h2>
        <p className="pq-muted">Elegí una materia. Después podés jugar de un tema o de toda la materia.</p>
      </div>

      {error ? (
        <p className="pq-note wrong" role="alert">
          {error}
        </p>
      ) : null}

      {subjects === null ? (
        <div className="pq-cards" aria-busy>
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="pq-card is-ghost" />
          ))}
        </div>
      ) : listError ? (
        <div className="pq-sheet pq-center">
          <p className="pq-title-sm">{listError}</p>
          <button type="button" className="pq-button" onClick={() => void loadSubjects()}>
            Reintentar
          </button>
        </div>
      ) : subjects.length === 0 ? (
        <div className="pq-sheet pq-center">
          <p className="pq-title-sm">Todavía no hay materias para jugar.</p>
          <p className="pq-muted">Sincronizá Educamos desde Materias y volvé acá.</p>
        </div>
      ) : (
        <div className="pq-cards">
          {subjects.map((subject) => (
            <button key={subject} type="button" className="pq-card" onClick={() => void openSubject(subject)}>
              <SubjectMark subject={subject} />
              <span>{subject}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
