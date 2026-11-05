# Taskie

Web para ver las tareas de Educamos y entregarlas. Se usa en el navegador de la computadora o del celular, y se puede instalar en la pantalla de inicio.

## Qué tiene

- Cuenta de Taskie y vínculo con la web del colegio (`https://tucolegio.educamos.com`).
- Puntos para subir archivos del aula. El enlace se arma solo con la dirección del colegio (`tucolegio.educamos.com` pasa a `https://lms.educamos.com/tucolegio`).
- Inicio con las tareas pendientes, la materia, la fecha y las barras del día y de la semana.
- Materias, con las tareas de cada una.
- Temas en Configuración: el aspecto de la app, sin tienda.
- Logros, racha por entrar y la sección IA: chat y repasos cortos.
- Barras diarias y semanales.
- Lecciones preparadas automáticamente con los temas recientes de cada materia.
- Avisos en el dispositivo si hoy quedan tareas o si alguna vence en las próximas horas.

## Cómo correrla

```bash
npm install
npm run dev
```

Abrí [http://127.0.0.1:43123](http://127.0.0.1:43123).

Para ver el juego sin el colegio, en la portada usá **Probar con tareas de ejemplo**.

## Colegio: Educamos, Teams o Classroom

Al crear la cuenta se elige de dónde salen las tareas.

- **Educamos y Moodle.** Van la dirección del colegio, el usuario y la contraseña. El aula de Moodle se arma sola con esa dirección.
- **Microsoft Teams.** Van el usuario y la contraseña de Microsoft del colegio, igual que en Educamos. Taskie entra a Teams con esos datos y trae las tareas de cada clase. La contraseña queda cifrada en el cofre del alumno y solo se envía a Microsoft.
- **Google Classroom.** Van el correo y la contraseña de Google del colegio. Taskie abre Classroom con esos datos y trae las tareas de cada clase. La contraseña queda cifrada y solo se escribe en la página de Google. Si Google pide un código extra, hay que entrar sin ese código o desactivarlo para esa cuenta. En el servidor hace falta Chrome.

## Educamos

Cada colegio tiene su propia dirección. En el alta van esa URL, el usuario y la contraseña de Educamos. Las credenciales se usan únicamente en el servidor para entrar al aula: nunca se envían al modelo de IA ni se muestran en el navegador.

## Seguridad

- **Cofre por alumno.** Cada cuenta tiene su propia clave de datos de 256 bits, guardada envuelta (cifrada) con una clave derivada por HKDF-SHA256 de la clave maestra y del id del alumno.
- **Credenciales del colegio.** El usuario y la contraseña de Educamos o de Teams se cifran con AES-256-GCM, con IV aleatorio, relleno a bloques de 64 bytes para ocultar el largo, y datos asociados que atan cada valor a su alumno y a su campo. Copiar un valor a otra fila o a otro campo hace fallar el descifrado. La contraseña de Teams solo se envía a Microsoft.
- **Índice ciego.** Para iniciar sesión con el usuario de Educamos se guarda solo una huella HMAC-SHA256, no el usuario.
- **Chat cifrado.** Los mensajes y los títulos de las conversaciones se guardan con la misma clave del alumno.
- **Sesiones.** La cookie es `HttpOnly`, `SameSite=Lax` y `Secure` bajo HTTPS. En la base solo queda el SHA-256 del token.
- **Inicio de sesión.** Las comparaciones son de tiempo constante, el error es genérico y hay un límite de 8 intentos cada 15 minutos por usuario.
- **IA.** Toda consulta pasa por `lib/ai-shield.ts`. Ahí se tachan la contraseña y el usuario de Educamos, los tokens, las sesiones y las claves de API, y el nombre del alumno se cambia por "el alumno". Si después de eso queda una credencial, la consulta no se envía. Solo se aceptan servicios HTTPS (o `localhost`), sin redirecciones.
- **Educamos.** Solo por HTTPS. La contraseña se envía únicamente al mismo sitio del formulario o a un dominio `educamos.com`.
- **Google Classroom.** La contraseña se escribe solo en `accounts.google.com`. No se manda a la IA ni se muestra en la app.
- **Disco.** `data/` queda con permisos `700` y los archivos con `600`.

La clave maestra se crea sola en `data/master.key`. En producción conviene ponerla en `TASKIE_MASTER_KEY` (32 bytes en hex o base64) y no dejarla en el disco junto a la base. Si se pierde la clave maestra, no se pueden recuperar las credenciales guardadas.

Taskie entra a Educamos por el alumno, así que el servidor necesita la contraseña en memoria durante ese momento. Por eso no es un cifrado de extremo a extremo en sentido estricto: quien controle el servidor encendido podría leerla. Lo que sí garantiza es que una copia robada de la base no sirve sin la clave maestra.

Educamos no publica una API para alumnos. Taskie entra a la web del colegio con tus datos. Si el colegio cambia la página o no deja el acceso automático, la cuenta queda creada, ves el error y podés reintentar con **Actualizar**.

## IA

El chat habla con [FreeLLMAPI](https://freellmapi.co), un enrutador local de modelos gratuitos. En este entorno corre en `http://127.0.0.1:43124`. La cuenta del tablero es `valen@taskie.local` y la clave unificada va en `.env.local`:

```bash
FREELLMAPI_BASE_URL=http://127.0.0.1:43124/v1
FREELLMAPI_API_KEY=freellmapi-tu-clave
```

### Modelos

Taskie usa Kilo Gateway dentro de FreeLLMAPI, que no pide cuenta ni clave. En el tablero de FreeLLMAPI, Kilo se agrega en **Keys** sin clave.

- Chat, lecciones y el clasificador que frena los pedidos de "haceme la tarea": `nvidia/nemotron-3-ultra-550b-a55b:free`.
- Respaldo: `kilo-auto/free`. Cambia de modelo en cada consulta, por eso no va primero.

Las preguntas de datos no pasan por el modelo: qué vence hoy, mañana o esta semana, qué está pendiente o atrasado, lo más urgente, cuándo vence una tarea, qué materias hay y la racha. Taskie las contesta al instante con lo cargado de Educamos, así las fechas y los números siempre coinciden.

Para cambiar los modelos, usá `FREELLMAPI_MODEL` (chat), `FREELLMAPI_LIGHT_MODEL` (clasificador) y `FREELLMAPI_BACKUP_MODEL`. Cada una acepta varios modelos separados por comas.

En Lecciones hay uno o dos repasos de menos de 3 minutos por materia, preparados automáticamente con los temas recientes y los apuntes de clase. Si le pedís cómo hacer una tarea, mira solo el título y busca el apunte de esa clase, igual que las lecciones. Si le pedís que te explique un tema, usa ese mismo material. Si le pedís la tarea hecha o las respuestas para entregar, se niega. Las respuestas son breves, ordenadas y no inventan información. Sin ese servicio, el chat responde con tus tareas, materias, fechas y misiones. Gemini sigue como respaldo opcional con `GEMINI_API_KEY`. El ejemplo está en `.env.example`.

## Avisos

Al entrar, Taskie busca de nuevo las tareas del colegio. En Configuración hay un interruptor y un botón **Probar aviso**. Hace falta dar permiso en el navegador. En Android Chrome funcionan en la web y en la app instalada. En iPhone, el aviso push llega cuando el sitio está agregado a la pantalla de inicio. Los recordatorios usan las mismas tareas pendientes que Inicio.

## Racha

Entrar un día nuevo suma un día de racha. Si falta un día, vuelve a empezar. El aspecto de la app se elige en Configuración.
