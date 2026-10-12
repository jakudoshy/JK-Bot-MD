# Estado de la web JK Bot

- [x] `/jkbot` conserva el sitio y sus funciones; `/` mantiene su ruta y contenido.
- [x] Auto Reacción se retiró del portal, la consola de creador, la API web y sus recursos asociados, según lo solicitado.
- [x] El encabezado usa la misma imagen local de JK Bot que la portada, recortada en un avatar circular; no se añadieron fotos nuevas.
- [x] Warcraft comparte cuenta, personajes, progreso, inventario, oro y estado con WhatsApp; el perfil muestra estadísticas, talentos y poderes.
- [x] WoW permanece dentro de la página: no solicita pantalla completa ni bloquea la orientación; ofrece «Volver al sitio» y salida con Escape.
- [x] Con el juego abierto, el cliente vuelve a consultar el estado cada cinco segundos sin recargar la página y conserva el foco, los borradores y la posición.
- [x] La progresión de talentos y poderes se aplica en el motor compartido, incluidos Caballero de la Muerte y Paladín.
- [x] El código admite persistencia en PostgreSQL y respaldo cifrado de estado/sesiones en Telegram; para activarla, el hosting debe tener configuradas sus variables privadas.
