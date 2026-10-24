import Link from "next/link";

const jumps = [
  ["#inicio", "Inicio"],
  ["#colegio", "Colegio"],
  ["#materias", "Materias"],
  ["#ia", "IA"],
  ["#listo", "Al terminar"],
  ["#ritmo", "El ritmo"],
  ["#extras", "Extras"],
];

export function Presentation() {
  return (
    <main className="present">
      <header className="present-nav">
        <Link href="/" className="gradient-text text-[17px] font-semibold tracking-tight">
          Taskie
        </Link>
        <Link href="/entrar" className="present-cta">
          Crear cuenta
        </Link>
      </header>

      <section className="present-hero">
        <h1>
          <span className="gradient-text font-display present-name">Taskie</span>
          <span className="gradient-text font-display present-slogan">tu compañero de clases que conecta con todo</span>
        </h1>
      </section>

      <section className="present-about" aria-label="Sobre Taskie">
        <h2>Una lista para el día de clases.</h2>
        <p>
          Taskie junta las tareas del colegio en un solo lugar. Ves lo pendiente, lo marcás cuando está listo y seguís.
          Las tareas salen de Educamos, de Microsoft Teams o de Google Classroom.
        </p>
        <nav className="present-jump" aria-label="Funciones">
          {jumps.map(([href, label]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </nav>
      </section>

      <section id="inicio" className="present-feature">
        <div>
          <p className="present-kicker">Inicio</p>
          <h2>Lo de hoy, primero.</h2>
          <p>
            Cada tarjeta trae la materia, el título y la fecha. Lo de hoy queda arriba. Si hay que subir un archivo, tiene su propio grupo.
          </p>
        </div>
        <div className="present-phone">
          <Task title="Causas de la revolución" meta="Historia · Hoy" stripe="#c2410c" />
          <Task title="Irregular verbs" meta="Inglés · Hoy" stripe="#db3e8a" />
          <Task title="Mapa de ríos" meta="Geografía · Mañana" stripe="#0369a1" />
        </div>
      </section>

      <section id="colegio" className="present-feature dark">
        <div>
          <p className="present-kicker">El colegio</p>
          <h2>Educamos, Teams o Classroom.</h2>
          <p>
            Al crear la cuenta elegís de dónde salen las tareas. Taskie entra con tu usuario y trae lo que hay que entregar. La contraseña queda cifrada.
          </p>
        </div>
        <div className="present-logos">
          <img src="/educamos.png" alt="Educamos" />
          <img src="/teams.svg" alt="Microsoft Teams" />
          <img src="/classroom.svg" alt="Google Classroom" />
        </div>
      </section>

      <section id="materias" className="present-feature">
        <div>
          <p className="present-kicker">Materias</p>
          <h2>Una flecha, y aparecen.</h2>
          <p>Biología, matemática, historia. Cada materia se abre en el mismo lugar y muestra sus tareas, sin cambiar de pantalla.</p>
        </div>
        <div className="present-phone">
          <div className="flex items-center justify-between text-left">
            <strong className="text-xl tracking-tight">Matemática</strong>
            <span className="text-sm text-[#6e6e73]">2 por hacer</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#ececee]">
            <div className="h-full w-1/3 rounded-full bg-[#e8a317]" />
          </div>
          <Task title="Ecuaciones de primer grado" meta="Hoy" stripe="#e8a317" />
          <Task title="Problemas de proporcionalidad" meta="Hoy" stripe="#e8a317" />
        </div>
      </section>

      <section id="ia" className="present-feature dark">
        <div>
          <p className="present-kicker">IA</p>
          <h2>Kitty explica la clase.</h2>
          <p>
            Preguntale qué vieron o cómo empezar una tarea. Te lo cuenta con el material del curso. La entrega la escribís vos.
          </p>
        </div>
        <div className="present-chat">
          <p className="present-bubble me">¿Qué vimos en la última clase de matemática?</p>
          <div className="present-bubble kitty">
            <img src="/kitty-head.png" alt="" width={36} height={36} className="size-9 shrink-0 object-contain" />
            <p>Repasaron gráficos. El práctico de funciones está en la fotocopia.</p>
          </div>
        </div>
      </section>

      <section id="listo" className="present-feature">
        <div>
          <p className="present-kicker">Al terminar</p>
          <h2>El check es blanco.</h2>
          <p>Cuando marcás una tarea, el círculo se completa y aparece el check en blanco. En las que ya están hechas, el check usa el color de la materia.</p>
        </div>
        <div className="present-check" aria-hidden>
          ✓
        </div>
      </section>

      <section id="ritmo" className="present-feature dark">
        <div>
          <p className="present-kicker">El ritmo</p>
          <h2>Hoy y esta semana.</h2>
          <p>Dos barras muestran cómo venís con lo que vence. La racha suma cuando entrás un día nuevo.</p>
        </div>
        <div className="present-bars">
          <div className="present-bar" style={{ background: "linear-gradient(165deg, #f3c04a, #e8a317)" }}>
            <span className="text-sm font-bold">Hoy</span>
            <b>3/5</b>
            <div className="present-meter">
              <span style={{ width: "60%" }} />
            </div>
          </div>
          <div className="present-bar" style={{ background: "linear-gradient(165deg, #1c7c6e, #146b22)" }}>
            <span className="text-sm font-bold">Semana</span>
            <b>8/11</b>
            <div className="present-meter">
              <span style={{ width: "72%" }} />
            </div>
          </div>
        </div>
      </section>

      <section id="extras" className="present-extras">
        <h2>Y un poco más.</h2>
        <div className="present-bento">
          <article className="present-tile">
            <h3>Temas</h3>
            <p>Cuaderno, Bosque, Pizarra, Noche, Oro o el check retro. Se eligen en Configuración.</p>
            <div className="present-swatches" aria-hidden>
              <i style={{ background: "#f3eee4", boxShadow: "inset 0 0 0 1px #e7e1d6" }} />
              <i style={{ background: "#1f7a4a" }} />
              <i style={{ background: "#234640" }} />
              <i style={{ background: "#2a2144" }} />
              <i style={{ background: "#b8860b" }} />
            </div>
          </article>
          <article className="present-tile">
            <h3>Avisos</h3>
            <p>Taskie te avisa si hoy queda algo por entregar o si una tarea vence pronto.</p>
          </article>
          <article className="present-tile">
            <h3>En el celular y en la computadora</h3>
            <p>El mismo Taskie en el navegador. También se puede dejar en la pantalla de inicio.</p>
          </article>
          <article className="present-tile">
            <h3>Contraseñas cifradas</h3>
            <p>El usuario y la contraseña del colegio se guardan cifrados y solo se usan para entrar a esa plataforma.</p>
          </article>
          <article className="present-tile wide">
            <h3>Para probar</h3>
            <p>Si todavía no conectás el colegio, podés entrar con tareas de ejemplo y ver la lista, las materias y la IA.</p>
          </article>
        </div>
      </section>

      <section className="present-close">
        <h2>Empezá con Taskie.</h2>
        <p>Creá la cuenta, elegí el colegio y traé las tareas.</p>
        <Link href="/entrar" className="present-cta mt-8">
          Crear cuenta
        </Link>
      </section>
    </main>
  );
}

function Task({ title, meta, stripe }: { title: string; meta: string; stripe: string }) {
  return (
    <div className="present-task" style={{ ["--stripe" as string]: stripe }}>
      <span style={{ color: stripe }}>{meta}</span>
      <strong>{title}</strong>
    </div>
  );
}
