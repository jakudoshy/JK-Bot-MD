# Plan de continuación — JK Bot y Warcraft

## Alcance vigente
- Mantener `/jkbot` como acceso al sitio JK Bot sin sustituir la portada `/`.
- Auto Reacción queda retirada del portal, la consola administrativa, la API web y sus recursos asociados.
- El avatar del encabezado reutiliza el archivo local de JK Bot que ya aparece en la portada.
- Warcraft se abre integrado en la página y en la orientación elegida por el dispositivo; no se solicita fullscreen ni se bloquea la orientación. El usuario puede volver con el botón «Volver al sitio» o con Escape.
- Mientras la partida está abierta, sincronizar el perfil cada cinco segundos sin recargar el documento y restaurar foco, borradores y posición de lectura.
- Conservar el guardado compartido de Warcraft con WhatsApp y los mecanismos de persistencia en PostgreSQL y respaldo cifrado de Telegram; la activación del servicio depende de variables privadas configuradas en el hosting.

## Validación
- Ejecutar `npm test`, `node --check` en el servidor y el cliente de Warcraft, y `git diff --check` antes de publicar cambios.
