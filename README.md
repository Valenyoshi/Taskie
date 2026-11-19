# Taskie

Web para ver las tareas de Educamos y entregarlas. Se usa en el navegador de la computadora o del celular, y se puede instalar en la pantalla de inicio.

## Qué tiene

- Cuenta de Taskie y vínculo con la web del colegio (`https://tucolegio.educamos.com`).
- Puntos para subir archivos del aula. El enlace se arma solo con la dirección del colegio (`tucolegio.educamos.com` pasa a `https://lms.educamos.com/tucolegio`).
- Inicio con el calendario de entregas, las tareas pendientes, la materia, la fecha y las barras del día y de la semana.
- Materias, con las tareas de cada una.
- Temas en Configuración: el aspecto de la app, sin tienda.
- Logros, racha por entrar y la sección IA: chat y Paper Quiz.
- Barras diarias y semanales.
- Paper Quiz: un juego de preguntas al estilo Kahoot, dibujado a mano, con los temas de cada materia.
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
- **Microsoft Teams.** Van el usuario y la contraseña de Microsoft del colegio, igual que en Educamos. Taskie entra a Teams con esos datos y trae las tareas de cada clase. Si una tarea es una lectura, se abre la página de Teams para grabarla y, cuando Teams la marca entregada, Taskie la tilda sola. La contraseña queda cifrada en el cofre del alumno y solo se envía a Microsoft.
- **Google Classroom.** Se autoriza en la página de Google mediante OAuth y se leen las clases y tareas con la API oficial. Taskie no solicita ni guarda la contraseña de Google. La verificación en dos pasos sigue funcionando. Las cuentas existentes se reconectan desde **Configuración → Conectar con Google**.

## Configurar Google Classroom

1. En [Google Cloud Console](https://console.cloud.google.com/) creá o elegí un proyecto y habilitá **Google Classroom API**.
2. Configurá la pantalla de consentimiento de Google Auth Platform. Agregá los permisos `classroom.courses.readonly` y `classroom.coursework.me.readonly`. Si la app está en pruebas, agregá tu cuenta como usuario de prueba. Un colegio puede requerir que su administrador autorice Taskie.
3. Creá un cliente OAuth de tipo **Aplicación web**. Registrá como URI de redirección `http://127.0.0.1:43123/api/auth/google/callback` para desarrollo. En producción, usá `https://TU-DOMINIO/api/auth/google/callback`.
4. Copiá las tres variables de Google de `.env.example` a `.env.local`, completalas y reiniciá el servidor. `GOOGLE_REDIRECT_URI` debe coincidir exactamente con el URI registrado y con el dominio desde el que abrís Taskie (localhost y 127.0.0.1 no son intercambiables para las cookies). No publiques el secreto.
5. Creá una cuenta con Classroom o entrá con tu nombre y contraseña de Taskie y usá **Configuración → Conectar con Google**. Elegí la cuenta del colegio y aceptá los dos permisos.

Las clases vacías son válidas. Si Google revoca o vence el permiso, Taskie pide reconectar desde Configuración sin recrear la cuenta. En modo de pruebas de Google, los permisos pueden vencer a los siete días. Para acceso público, completá la verificación que solicite Google.

Verificación del cambio: `npm ci`, `npx tsc --noEmit`, `node --test tests/classroom.test.cjs`. Las pruebas simulan Google: no usan cuentas ni credenciales reales. Para la prueba real hacen falta las credenciales anteriores y una cuenta de alumno con acceso a Classroom.

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
- **Google Classroom.** Solo pide permisos de lectura de clases y del trabajo propio del alumno. El token de renovación se guarda cifrado en el cofre del alumno; los tokens de acceso quedan en memoria. El flujo valida estado, sesión, vencimiento y PKCE. Al conectar una cuenta antigua se elimina su contraseña de Google guardada.
- **Disco.** `data/` queda con permisos `700` y los archivos con `600`.

La clave maestra se crea sola en `data/master.key`. En producción conviene ponerla en `TASKIE_MASTER_KEY` (32 bytes en hex o base64) y no dejarla en el disco junto a la base. Si se pierde la clave maestra, no se pueden recuperar las credenciales guardadas.

Taskie entra a Educamos por el alumno, así que el servidor necesita la contraseña en memoria durante ese momento. Por eso no es un cifrado de extremo a extremo en sentido estricto: quien controle el servidor encendido podría leerla. Lo que sí garantiza es que una copia robada de la base no sirve sin la clave maestra.

Educamos no publica una API para alumnos. Taskie entra a la web del colegio con tus datos. Si el colegio cambia la página o no deja el acceso automático, la cuenta queda creada, ves el error y podés reintentar con **Actualizar**.

## IA

El chat habla con [Pollinations](https://pollinations.ai), un servicio gratuito que no pide cuenta ni clave. El modelo es GPT-OSS 20B (`openai-fast`). Si ese servicio no responde, Taskie prueba Dots (`dots-studio/dots-3-note-preview:free`) en Kilo Gateway, también sin clave.

Nemotron y `kilo-auto` quedaron afuera: a menudo dejaban la respuesta vacía o inventaban datos del libro. Si un modelo solo devuelve su razonamiento interno y no un texto, Taskie lo saltea y prueba el siguiente.

### Modelos

- Chat, Paper Quiz y el clasificador que frena los pedidos de "haceme la tarea": `openai-fast` en Pollinations.
- Respaldo: `dots-studio/dots-3-note-preview:free` en Kilo.

Para usar otro enrutador compatible con OpenAI, poné `FREELLMAPI_BASE_URL` y `FREELLMAPI_API_KEY` en `.env.local`. `FREELLMAPI_MODEL`, `FREELLMAPI_LIGHT_MODEL` y `FREELLMAPI_BACKUP_MODEL` cambian los modelos y aceptan varios separados por comas.

Cuando le preguntás por una tarea, Taskie lee la consigna desde el aula, junto con los archivos adjuntos en Word (`.docx`) o PDF. También lee los apuntes de clase que vienen en esos formatos. Del archivo saca la indicación, las preguntas, la forma de entrega y la fecha, y avisa si esa fecha no coincide con la del aula. Los `.doc` viejos de Word no se leen.

Además entra a la clase del aula donde está la tarea y lee lo que dice: la explicación, las preguntas, los apuntes o archivos de esa clase y un resumen de la clase anterior. Así puede contestar «¿de qué trata la tarea del video?» aunque la entrega solo diga «subí el video». Si la tarea viene de Educamos sin enlace al aula, busca en el curso de esa materia la actividad con el nombre más parecido.

Las preguntas de datos no pasan por el modelo: qué vence hoy, mañana o esta semana, qué está pendiente o atrasado, lo más urgente, cuándo vence una tarea, qué materias hay y la racha. Taskie las contesta al instante con lo cargado de Educamos, así las fechas y los números siempre coinciden.

Si le pedís cómo hacer una tarea, mira solo el título y busca el apunte de esa clase. Si le pedís que te explique un tema, usa ese mismo material. Si le pedís la tarea hecha o las respuestas para entregar, se niega. Las respuestas son breves, ordenadas y no inventan información. Sin ese servicio, el chat responde con tus tareas, materias, fechas y misiones. Gemini sigue como respaldo opcional con `GEMINI_API_KEY`. El ejemplo está en `.env.example`.

## Paper Quiz

En IA, la pestaña **Paper Quiz** es un juego de preguntas al estilo Kahoot. Elegís una materia y Taskie arma 6 preguntas de 4 opciones con lo que haya en el aula: apuntes de clase, consignas (también las de Word y PDF), tus tareas y los títulos de los temas recientes. Si una materia no tiene apuntes escritos, las preguntas salen de los conceptos básicos de esos temas, al nivel de tu año.

Cada pregunta dura 20 segundos. Cuanto antes contestás, más puntos ganás (hasta 1000), y las respuestas seguidas suman extra. Al final ves el puntaje, una medalla, tu récord en esa materia y la respuesta correcta de cada pregunta. Se juega tocando las opciones o con las teclas 1 a 4.

El quiz no te hace la tarea: descarta las preguntas que repiten una consigna que todavía no entregaste. Si el modelo no responde, arma preguntas de completar con frases del material. Tutoría y las secciones administrativas (programas, rúbricas, autorizaciones) no entran.

## Avisos

En Configuración, el interruptor de **Notificaciones** activa los avisos en ese dispositivo: pide permiso al navegador, lo suscribe y manda un aviso de prueba desde el servidor. El interruptor solo aparece encendido si ese dispositivo está suscripto de verdad. Cada vez que abrís la app, la suscripción se renueva sola.

Taskie avisa lo que vence hoy (desde las 8), lo que vence mañana (desde las 18) y cada tarea en sus últimas 3 horas. Nunca avisa entre las 22 y las 8. Antes de avisar, trae las tareas nuevas de Educamos cada 3 horas, aunque no abras la app. En Android Chrome funcionan en la web y en la app instalada. En iPhone hay que agregar Taskie a la pantalla de inicio y activarlos desde ahí.

## Calendario

En **Inicio**, arriba de las tareas, está el mes. Un punto del color de la materia marca cada día con entregas. Arriba dice cuál es la próxima. Si pasás el mouse por un día con entregas, o lo tocás, se abre una ventana con lo que hay que hacer. El número del día atrasado va en rojo.

## Entregas del aula

En **Para subir** están los puntos de entrega del aula. Cada tarjeta lee en el aula qué pide la entrega:

- **Archivo:** elegís el archivo (con los formatos y el tamaño que acepta el aula) y tocás el círculo. Taskie lo sube, guarda la entrega y, si el aula pide confirmar, toca **Enviar tarea**. Solo la marca como hecha cuando el aula la muestra como enviada.
- **Texto o enlace:** escribís el texto o pegás el enlace (por ejemplo, de un video) y tocás el círculo.
- **Cerrada:** si el aula ya no deja entregar, lo avisa y podés marcarla como hecha.

Las tareas de **Por hacer** no llevan archivo: se marcan como hechas.

## Racha

Entrar un día nuevo suma un día de racha. Si falta un día, vuelve a empezar. El aspecto de la app se elige en Configuración.
