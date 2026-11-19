import Link from "next/link";

const slips = [
  { subject: "Lengua", title: "El texto expositivo", when: "Mañana", color: "#7c3aed" },
  { subject: "Inglés", title: "Reading practice", when: "Hoy", color: "#db3e8a" },
  { subject: "Historia", title: "La revolución", when: "Atrasada", color: "#e8a317" },
];

const notes = [
  { title: "Inicio", tone: "pink", text: "El calendario marca cuándo entregar. Abajo quedan las tareas de hoy, con la materia y la fecha." },
  { title: "El colegio", tone: "coral", text: "Educamos, Teams o Classroom. Taskie trae las entregas del colegio. Classroom se conecta con tu autorización en Google." },
  { title: "Materias", tone: "green", text: "Cada materia se abre en el mismo lugar y muestra solo sus tareas." },
  { title: "Kitty", tone: "lilac", text: "Preguntale qué vieron o cómo empezar. Te lo cuenta con el material del curso. La entrega la escribís vos." },
  { title: "Apuntes", tone: "gold", text: "Pedile un resumen, un esquema o un mapa mental. Queda guardado para repasarlo después." },
  { title: "Avisos", tone: "teal", text: "Si hoy queda algo, o si una tarea vence pronto, Taskie te avisa." },
];

export function Presentation() {
  return (
    <main className="present">
      <header className="present-nav">
        <Link href="/" className="gradient-text">
          Taskie
        </Link>
        <Link href="/entrar" className="present-cta">
          Crear cuenta
        </Link>
      </header>

      <section className="present-hero">
        <div className="present-doodles" aria-hidden>
          <span className="float-a present-doodle star" />
        </div>
        <p className="present-kicker">Para el colegio, no para perderse</p>
        <h1 className="gradient-text">Taskie</h1>
        <p>Las tareas del colegio, en un solo lugar. Las ves, las marcás cuando están listas y seguís.</p>
        <div className="present-actions">
          <Link href="/entrar" className="present-cta">
            Crear cuenta
          </Link>
          <Link href="/entrar" className="present-quiet">
            Ya tengo cuenta
          </Link>
        </div>
        <ul className="present-slips" aria-label="Así se ven las tareas">
          {slips.map((slip) => (
            <li key={slip.subject} style={{ boxShadow: `inset 6px 0 0 ${slip.color}` }}>
              <span style={{ color: slip.color }}>{slip.subject}</span>
              <strong>{slip.title}</strong>
              <em>{slip.when}</em>
            </li>
          ))}
        </ul>
      </section>

      <section className="present-notes" aria-label="Qué tiene Taskie">
        <h2>Qué podés hacer</h2>
        <ul>
          {notes.map((note) => (
            <li key={note.title} className={note.tone}>
              <h3>{note.title}</h3>
              <p>{note.text}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
