# Taskie

Web para ver las tareas de Educamos, entregarlas y ganar experiencia. Se usa en el navegador de la computadora o del celular, y se puede instalar en la pantalla de inicio.

## Qué tiene

- Cuenta de Taskie y vínculo con la web del colegio (`https://tucolegio.educamos.com`).
- Puntos para subir archivos del aula (`https://lms.educamos.com/tucolegio/my/`). Si no cargás ese enlace, se arma con la dirección del colegio.
- Inicio con las tareas pendientes, la materia, la fecha y las barras del día y de la semana.
- Materias, con las tareas de cada una.
- Experiencia para el nivel. Hasta el nivel 5 hacen falta 3 tareas, del 5 al 9 hacen falta 4 y desde el 10 hacen falta 5.
- Sombreros, aparte de la XP.
- La tienda de Bobby, con literas para la mercadería.
- Logros en el ranking, racha por entrar y un chat para dudas.
- Avisos en el dispositivo si hoy quedan tareas o si alguna vence en las próximas horas.

## Cómo correrla

```bash
npm install
npm run dev
```

Abrí [http://127.0.0.1:43123](http://127.0.0.1:43123).

Para ver el juego sin el colegio, en la portada usá **Probar con tareas de ejemplo**.

## Educamos

Cada colegio tiene su propia dirección. En el alta van esa URL, el usuario y la contraseña de Educamos. La contraseña de Taskie se guarda hasheada y la de Educamos, cifrada. No se muestran de nuevo y no se mandan al chat.

Educamos no publica una API para alumnos. Taskie entra a la web del colegio con tus datos. Si el colegio cambia la página o no deja el acceso automático, la cuenta queda creada, ves el error y podés reintentar con **Actualizar**.

## Chat

El chat habla con [FreeLLMAPI](https://freellmapi.co), un enrutador local de modelos gratuitos. En este entorno corre en `http://127.0.0.1:43124`. La cuenta del tablero es `valen@taskie.local` y la clave unificada va en `.env.local`:

```bash
FREELLMAPI_BASE_URL=http://127.0.0.1:43124/v1
FREELLMAPI_API_KEY=freellmapi-tu-clave
FREELLMAPI_MODEL=kilo-auto/free
```

Si le pedís que te explique un tema, lee el material de tus clases y responde como el profesor: con lo que sí enseñan y sin adelantar lo que no está. Si le pedís que te haga una tarea, un trabajo o las respuestas para entregar, se niega, también cuando el pedido viene disfrazado. Sin ese servicio, el chat responde con tus tareas, materias, fechas y misiones. Gemini sigue como respaldo opcional con `GEMINI_API_KEY`. El ejemplo está en `.env.example`.

## Avisos

En Inicio hay un interruptor y un botón **Probar aviso**. Hace falta dar permiso en el navegador. En Android Chrome funcionan en la web y en la app instalada. En iPhone, el aviso push llega cuando el sitio está agregado a la pantalla de inicio.

## Economía

- Tarea a tiempo: 50 XP y 25 sombreros.
- Tarea tarde: 15 XP y 8 sombreros. No llena las barras.
- Día: si completás a tiempo al menos el 60 % de lo que vence hoy, 40 XP y 40 sombreros.
- Semana: si completás a tiempo todo lo que vence esa semana, 120 XP y 100 sombreros.
- Combo, si además cada día con tareas llegó al 60 %: 80 XP y 60 sombreros.
- Entrar un día nuevo: 10 XP y un día de racha.
