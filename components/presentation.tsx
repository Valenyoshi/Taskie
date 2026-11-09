import Link from "next/link";

const points = [
  ["Inicio", "Lo de hoy queda arriba, con la materia y la fecha. Si hay que subir un archivo, tiene su propio grupo."],
  ["El colegio", "Educamos, Teams o Classroom. Taskie entra con tu usuario y trae lo que hay que entregar. La contraseña queda cifrada."],
  ["Materias", "Cada materia se abre en el mismo lugar y muestra sus tareas."],
  ["Kitty", "Preguntale qué vieron o cómo empezar una tarea. Te lo cuenta con el material del curso. La entrega la escribís vos."],
  ["Eventos", "El calendario marca cuándo hay que entregar, y el tablón muestra las noticias del colegio."],
  ["Avisos", "Taskie avisa si hoy queda algo por entregar o si una tarea vence pronto."],
];

export function Presentation() {
  return (
    <main className="present">
      <header className="present-nav">
        <Link href="/">Taskie</Link>
        <Link href="/entrar" className="present-cta">
          Crear cuenta
        </Link>
      </header>

      <section className="present-hero">
        <h1>Taskie</h1>
        <p>Las tareas del colegio, en un solo lugar. Las ves, las marcás cuando están listas y seguís.</p>
        <Link href="/entrar" className="present-cta">
          Crear cuenta
        </Link>
      </section>

      <section className="present-list" aria-label="Qué tiene Taskie">
        <h2>Qué podés hacer</h2>
        <ul>
          {points.map(([title, text]) => (
            <li key={title}>
              <strong>{title}.</strong> {text}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
