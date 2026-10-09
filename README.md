# Taskie

Web para ver las tareas de Educamos, entregarlas y ganar sombreros. Se usa en el navegador de la computadora o del celular, y se puede instalar en la pantalla de inicio.

## Qué tiene

- Cuenta de Taskie y vínculo con la web del colegio (`https://tucolegio.educamos.com`).
- Puntos para subir archivos del aula (`https://lms.educamos.com/tucolegio/my/`). Si no cargás ese enlace, se arma con la dirección del colegio.
- Inicio con las tareas pendientes, la materia, la fecha y las barras del día y de la semana.
- Materias, con las tareas de cada una.
- Sombreros por entregas, racha, misiones y logros.
- La tienda de Bobby, con literas para la mercadería.
- Logros, racha por entrar y la sección IA: chat y repasos cortos.
- Barras diarias y semanales con confeti, sin zoom, y recompensa en sombreros.
- Lecciones preparadas automáticamente con los temas recientes de cada materia.
- Avisos en el dispositivo si hoy quedan tareas o si alguna vence en las próximas horas.

## Cómo correrla

```bash
npm install
npm run dev
```

Abrí [http://127.0.0.1:43123](http://127.0.0.1:43123).

Para ver el juego sin el colegio, en la portada usá **Probar con tareas de ejemplo**.

## Educamos

Cada colegio tiene su propia dirección. En el alta van esa URL, el usuario y la contraseña de Educamos. La contraseña de Taskie se guarda hasheada y la de Educamos, cifrada. Las credenciales se usan únicamente en el servidor para entrar al aula: nunca se envían al modelo de IA ni se muestran en el navegador. El chat también redacta datos privados antes de guardar o enviar un mensaje.

Educamos no publica una API para alumnos. Taskie entra a la web del colegio con tus datos. Si el colegio cambia la página o no deja el acceso automático, la cuenta queda creada, ves el error y podés reintentar con **Actualizar**.

## IA

El chat habla con [FreeLLMAPI](https://freellmapi.co), un enrutador local de modelos gratuitos. En este entorno corre en `http://127.0.0.1:43124`. La cuenta del tablero es `valen@taskie.local` y la clave unificada va en `.env.local`:

```bash
FREELLMAPI_BASE_URL=http://127.0.0.1:43124/v1
FREELLMAPI_API_KEY=freellmapi-tu-clave
FREELLMAPI_MODEL=kilo-auto/free
```

En Lecciones hay uno o dos repasos de menos de 3 minutos por materia, preparados automáticamente con los temas recientes y los apuntes de clase. Si le pedís cómo hacer una tarea, mira solo el título y busca el apunte de esa clase, igual que las lecciones. Si le pedís que te explique un tema, usa ese mismo material. Si le pedís la tarea hecha o las respuestas para entregar, se niega. Las respuestas son breves, ordenadas y no inventan información. Sin ese servicio, el chat responde con tus tareas, materias, fechas y misiones. Gemini sigue como respaldo opcional con `GEMINI_API_KEY`. El ejemplo está en `.env.example`.

## Avisos

Al entrar, Taskie busca de nuevo las tareas del colegio. En Configuración hay un interruptor y un botón **Probar aviso**. Hace falta dar permiso en el navegador. En Android Chrome funcionan en la web y en la app instalada. En iPhone, el aviso push llega cuando el sitio está agregado a la pantalla de inicio. Los recordatorios usan las mismas tareas pendientes que Inicio.

## Recompensas

- Tarea a tiempo: 25 sombreros.
- Tarea tarde: 25 sombreros.
- Día: si completás a tiempo al menos el 60 % de lo que vence hoy, 40 sombreros.
- Semana: si completás a tiempo todo lo que vence esa semana, 100 sombreros.
- Combo, si además cada día con tareas llegó al 60 %: 60 sombreros.
- Entrar un día nuevo: 5 sombreros y un día de racha.
