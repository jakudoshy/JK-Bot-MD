# Plan de implementación — Warcraft para JK Bot

## Alcance de esta entrega
- Añadir un núcleo RPG persistente dentro de WhatsApp con `/warcraft` y comandos derivados.
- Clases iniciales: warrior, mago y pícaro; nivel 1–80; XP progresiva; oro; equipo; inventario; tienda; misiones; mazmorras; talentos; GS; guilds.
- Añadir autenticación web independiente para cuentas Warcraft: registro con teléfono, usuario, contraseña y código enviado al chat privado de WhatsApp; inicio de sesión; recuperación básica preparada.
- Añadir comercio web de dos jugadores mediante ID temporal, usando inventario y oro persistentes.
- Retirar del panel administrativo el visor/contador de mensajes recibidos y conservar sesiones, usuarios, premium, difusión y control de bots.

## Decisiones técnicas
- Reutilizar `botData` y `saveBotData()` para no introducir una base externa obligatoria en esta primera fase.
- Guardar contraseñas con `crypto.scryptSync`, nunca en texto plano.
- Mantener el panel administrativo y el menú Warcraft como áreas separadas en la interfaz.
- El código OTP solo se envía mediante una sesión de WhatsApp activa cuyo número coincida con el teléfono registrado; no se muestra en la web.
- El comercio web expira por tiempo, queda limitado a dos participantes y valida cada ítem contra el inventario actual.

## Estructura
- `lib/warcraft.js`: reglas de juego, estado, progresión, objetos, misiones y comercio.
- `commands/warcraft.js`: comandos conversacionales del RPG.
- `index.js`: registro del comando, API de cuentas/comercio y eliminación del stream de mensajes del panel.
- `index.html`: menú independiente y cliente web Warcraft; panel admin sin mensajes recibidos.

## Estilo
- Fantasía oscura con acentos rojo-escarlata alineados con JK Bot, paneles tipo pergamino tecnológico y tarjetas de clase.
- Interacciones cortas y copiables: cada respuesta de WhatsApp muestra el siguiente comando exacto.
- La web usa una zona propia, accesible desde las tres líneas, sin mezclarla con la consola administrativa.

## Evolución posterior
- Persistencia SQL para mayor concurrencia.
- Guilds con invitaciones y banco, subastas completas, grupos de mazmorra en tiempo real, más clases/zonas y árbol visual de talentos.
