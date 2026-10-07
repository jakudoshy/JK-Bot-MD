# Plan de implementación — nueva web JK Bot

## Alcance aprobado
- Crear una entrada web nueva en `/jkbot`, separada visualmente de la portada actual y servida por el mismo backend Express para compartir cuentas Warcraft, sesión vinculada de WhatsApp y progreso persistente.
- Mantener todas las funciones actuales del sitio copiando/renderizando la plantilla presente; no reemplazar ni romper la ruta `/`.
- En la página nueva, añadir menú de tres puntos con accesos a Jugar WoW, Auto Reacción y Mi cuenta.
- Auto Reacción: aceptar un enlace a una publicación concreta de Canal WhatsApp y un emoji, mostrar consentimiento explícito y enviar una sola reacción desde la sesión activa del número de la cuenta autenticada.
- Warcraft: mantener el juego web con botones y el estado compartido con WhatsApp; la cuenta debe mostrar vida, oro, talentos disponibles/usados y poderes. Añadir poderes de clase que se desbloqueen por nivel (incluidos DK y Paladín).
- Jugar WoW debe intentar orientación horizontal nativa desde el gesto de entrada sin solicitar pantalla completa; si el navegador lo bloquea, aplicar una vista CSS apaisada y mantener el juego cargado.

## Decisiones de arquitectura
- `GET /jkbot` renderiza la misma plantilla HTML actual más las extensiones JK Bot; las rutas API y `botData` siguen siendo el backend compartido elegido por el usuario.
- No se crea una segunda sesión Baileys ni una segunda base de progreso. Auto Reacción usa exclusivamente el socket asociado al teléfono autenticado.
- Las cuentas y los personajes continúan guardándose con los mecanismos existentes de `botData`/Telegram.
- Las habilidades nuevas se derivan del nivel/clase del personaje y se validan en el motor, por lo que WhatsApp y web usan las mismas reglas.
- No se invoca Fullscreen API. La Screen Orientation API se intenta solo tras interacción directa; un fallback CSS garantiza una vista legible cuando el navegador no admite el bloqueo.

## Estructura
- `index.js`: ruta `/jkbot` y endpoint autenticado `/api/reactions/channel`.
- `lib/jkbotPage.js`: extensión segura de la plantilla para la página nueva, conservando la portada.
- `lib/channelReactions.js`: validación de enlaces/emojis y envío de reacción con Baileys.
- `lib/warcraft.js`: contador de talentos gastados y poderes progresivos por nivel.
- `lib/warcraftWeb.js`: serialización de progresión de habilidades para la interfaz.
- `public/reactions/`: formulario, estados y estilos de Auto Reacción.
- `public/warcraft/game-ui.js` y `.css`: cuenta, resumen de talentos/poderes, entrada de juego y orientación.
- `test/`: regresiones de motor, API/adaptador, página nueva, interfaz de reacciones y rotación.

## Diseño
- **Movimiento:** panel de control sci-fi sobrio, integrado en la identidad neón oscura ya existente de JK Bot y en el acabado de fantasía oscura del juego.
- **Principios:** conservar el aspecto y comportamiento actuales; separar módulos por navegación clara; mostrar errores y estados de conexión con honestidad; priorizar interacción táctil móvil.
- **Color:** respetar la marca existente del portal (negro/grafito con neón rojo/fucsia); usar oro cálido para progreso/recompensas Warcraft y turquesa para Auto Reacción, sin confundir módulos.
- **Distribución:** página actual completa bajo la nueva ruta, con el menú de tres puntos como selector de módulos; cada modo ocupa su propia superficie sin mezclar acciones.
- **Motivos:** marca JK Bot, badges de estado de sesión y tarjetas visuales de personaje/objetivo.
- **Interacción/animación:** botones con estados de carga/deshabilitado, transiciones breves y respeto a `prefers-reduced-motion`; el juego no queda en blanco durante la rotación.
- **Tipografía:** conservar las familias y jerarquías presentes en el sitio actual, manteniendo lectura móvil.
- **Marca:** “JK Bot”, un panel único para la comunidad y su juego; personalidad directa, práctica y cercana.
- **Voz:** CTAs concisos (“Jugar WoW”, “Enviar reacción”); mensajes que explican qué ocurrió y cómo continuar.
