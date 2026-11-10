# Taskie

Web para ver las tareas de Educamos y entregarlas. Se usa en el navegador de la computadora o del celular, y se puede instalar en la pantalla de inicio.

## Qué tiene

- Cuenta de Taskie y vínculo con la web del colegio (`https://tucolegio.educamos.com`).
- Puntos para subir archivos del aula. El enlace se arma solo con la dirección del colegio (`tucolegio.educamos.com` pasa a `https://lms.educamos.com/tucolegio`).
- Inicio con las tareas pendientes, la materia, la fecha y las barras del día y de la semana.
- Materias, con las tareas de cada una.
- Temas en Configuración: el aspecto de la app, sin tienda.
- Logros, racha por entrar y la sección IA: chat y Paper Quiz.
- Barras diarias y semanales.
- Paper Quiz: un juego de preguntas al estilo Kahoot, dibujado a mano, con los temas de cada materia.
- Avisos en el dispositivo si hoy quedan tareas o si alguna vence en las próximas horas.
- Eventos: las noticias del tablón de Educamos, un calendario con las fechas de entrega y tu correo para leer y responder mails.

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

## Eventos

**Eventos** es una sola pantalla, de arriba hacia abajo:

- **Calendario:** el mes, con un punto del color de la materia en cada día que hay que entregar. Arriba dice cuál es la próxima. Si pasás el mouse por un día con entregas, o lo tocás, se abre una ventana con lo que hay que hacer. El número del día atrasado va en rojo.
- **Tablón de eventos:** las noticias de Educamos de este ciclo lectivo, prendidas como notas en un corcho. La flecha **Leer más** abre el texto, los enlaces, las imágenes y el adjunto (imagen o PDF). Taskie las lee sin marcarlas como leídas en Educamos y las guarda 15 minutos en memoria.
- **Correo:** vinculás un correo y ves la bandeja de entrada, abrís cada mail y lo respondés. La respuesta sale desde tu correo, con el mensaje original citado.

Cómo se vincula el correo:

- **Gmail, Google Workspace, Yahoo e iCloud:** con una contraseña de aplicación (Google, por ejemplo, la da en `myaccount.google.com/apppasswords` cuando tenés la verificación en 2 pasos). Taskie reconoce el proveedor solo, también por el registro MX de dominios propios.
- **Otros proveedores:** completás los servidores IMAP (puerto 993) y SMTP (465 o 587). Solo se aceptan servidores públicos y conexiones cifradas.
- **Microsoft 365 y Outlook** (como el correo del colegio): Microsoft no deja entrar con contraseña. Taskie usa el inicio de sesión por código de Microsoft, que necesita una app registrada en Microsoft Entra: poné su id en `MICROSOFT_CLIENT_ID` (app pública con permisos delegados `Mail.ReadWrite`, `Mail.Send` y `User.Read`, y «Allow public client flows» activado). Algunos colegios no permiten apps externas en el correo; en ese caso lo tiene que aprobar el administrador.

La contraseña o el permiso de Microsoft se guardan cifrados con la clave de tu cuenta y se borran al desvincular el correo.

## Entregas del aula

En **Para subir** están los puntos de entrega del aula. Cada tarjeta lee en el aula qué pide la entrega:

- **Archivo:** elegís el archivo (con los formatos y el tamaño que acepta el aula) y tocás el círculo. Taskie lo sube, guarda la entrega y, si el aula pide confirmar, toca **Enviar tarea**. Solo la marca como hecha cuando el aula la muestra como enviada.
- **Texto o enlace:** escribís el texto o pegás el enlace (por ejemplo, de un video) y tocás el círculo.
- **Cerrada:** si el aula ya no deja entregar, lo avisa y podés marcarla como hecha.

Las tareas de **Por hacer** no llevan archivo: se marcan como hechas.

## Racha

Entrar un día nuevo suma un día de racha. Si falta un día, vuelve a empezar. El aspecto de la app se elige en Configuración.
