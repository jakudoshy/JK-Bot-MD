# ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ

Bot de automatización para WhatsApp basado en **Baileys**, creado y personalizado para **ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ**.

Incluye comandos de grupos, descargas, stickers, economía, perfiles, IA, herramientas de red, Premium, múltiples sesiones, Telegram opcional y un dashboard web rojo con estilo hacker.

## Identidad

- **Bot:** ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ
- **Autor:** ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ
- **Repositorio:** https://github.com/jakudoshy/JK-Bot-MD
- **Versión:** 4.0.0

## Funciones principales

- Vinculación de WhatsApp mediante código de emparejamiento.
- Administración de grupos, permisos, bienvenida, despedida, antienlace y modo solo-admin.
- Menús y comandos Owner disponibles únicamente para el número WhatsApp `+5350898613`; las funciones Owner también requieren Premium activo.
- Descargas de YouTube, TikTok, Instagram, Facebook, Spotify, APK y otras fuentes.
- Stickers, conversión multimedia, edición de imágenes y utilidades.
- Economía, perfiles, juegos y comandos interactivos.
- IA opcional mediante OpenAI-compatible API.
- Panel web con estadísticas, bots conectados, Premium, difusión y promoción.
- Respaldo cifrado AES-256-GCM opcional en un repositorio privado separado (no el repositorio de código).
- Persistencia del estado completo de la web y del bot en PostgreSQL/Supabase, con migración automática desde los JSON existentes.
- IA conversacional con contexto temporal, preguntas de aclaración, generación de imágenes y cortos MP4 de 5 segundos.
- Todos los comandos usan el prefijo `/` y los menús muestran ejemplos listos para copiar.

## Instalación

Requiere **Node.js 18+**, FFmpeg y Python disponible para algunas herramientas multimedia.

```bash
git clone https://github.com/jakudoshy/JK-Bot-MD.git
cd JK-Bot-MD
npm ci
cp .env.example .env
# Edita .env y configura ADMIN_USERNAME y ADMIN_PASSWORD.
npm start
```

Después abre el panel en `http://localhost:3000` y vincula el número desde **Vincular WhatsApp**.

## Configuración mínima

```env
# El Owner WhatsApp está fijado al número autorizado 5350898613.
# OWNER_NUMBER se conserva solo por compatibilidad con instalaciones antiguas.
OWNER_NUMBER=5350898613
ADMIN_USERNAME=tu_usuario_admin
ADMIN_PASSWORD=pon_una_clave_privada_en_Railway
PORT=3000
# Usa una ruta absoluta en un volumen persistente; no la pongas dentro del repositorio.
PERSISTENT_DATA_DIR=/data/bot
```

No publiques `.env`, credenciales de WhatsApp, tokens de GitHub ni claves de cifrado. La web guarda los cambios en el servidor: al configurar PostgreSQL, toda la información persistente de la aplicación (incluidos ajustes, cuentas/datos de Warcraft y usuarios/tokens Premium) se conserva en `jkbot_app_state` y se vuelve a cargar tras reiniciar o desplegar una nueva versión. Sin PostgreSQL, el respaldo local queda en `PERSISTENT_DATA_DIR` y solo sobrevive si esa ruta está en un volumen persistente. La web no depende de `localStorage` para el estado administrativo.

En Railway, configura una base PostgreSQL y enlaza su variable privada `DATABASE_URL` al servicio del bot para persistir los datos de la web en ese servidor independiente. Además, monta un volumen en `/data` y configura `PERSISTENT_DATA_DIR=/data/bot`; Railway inyecta `RAILWAY_VOLUME_MOUNT_PATH` cuando el volumen está conectado. Baileys guarda sus credenciales en `auth_info` dentro de esa ruta. El respaldo cifrado de Telegram también incluye esos archivos y los restaura antes de iniciar WhatsApp. Así, actualizar el repositorio no debe pedir otra vinculación; si la sesión actual nunca llegó a una copia o fue revocada, habrá que vincular una vez para crearla. PostgreSQL no almacena archivos subidos, que siguen necesitando volumen. No guardes datos runtime ni respaldos en `jakudoshy/JK-Bot-MD`: el código omite automáticamente cualquier respaldo de GitHub que apunte a ese repositorio.

### PostgreSQL en Railway o Supabase

Para que los datos de la web sobrevivan incluso cuando se reemplaza el contenedor, configura en el servicio del bot una conexión privada PostgreSQL. En Railway, añade un servicio PostgreSQL y enlaza su variable `DATABASE_URL` al bot. En Supabase, usa la cadena privada/directa:

```env
SUPABASE_DB_URL=postgresql://postgres:<PASSWORD>@db.<PROJECT-REF>.supabase.co:5432/postgres?sslmode=require
SUPABASE_DB_POOL_MAX=5
SUPABASE_DB_SSL=true
```

La aplicación crea automáticamente `jkbot_app_state`, `jkbot_premium_users` y `jkbot_premium_tokens` al iniciar. En la primera ejecución migra el JSON local (y, si existe, el Premium previo) a PostgreSQL. Desde entonces `jkbot_app_state` es la fuente principal de verdad para el estado completo de la web y del bot, y cada guardado actualiza esa copia remota. Las tablas Premium separadas se mantienen por compatibilidad con versiones anteriores.

También puedes ejecutar manualmente [`supabase/schema.sql`](supabase/schema.sql) desde el SQL Editor de Supabase. Usa la conexión privada/directa de PostgreSQL únicamente en el servidor; no pongas `SUPABASE_DB_URL`, la contraseña de la base de datos ni una service-role key en `index.html` o en el navegador.

PostgreSQL conserva el estado JSON de la aplicación. Las credenciales de sesión de WhatsApp de Baileys quedan en `PERSISTENT_DATA_DIR/auth_info` y, si el backup Telegram está configurado, también dentro del documento cifrado fijado; el volumen Railway es la copia primaria recomendada. Los archivos subidos solo se conservan en un volumen. No elimines el volumen al actualizar el código.

### Alternativa gratuita: respaldo cifrado en un canal privado de Telegram

Si no vas a usar una base PostgreSQL, el estado completo de la web puede guardarse como un documento cifrado en un canal privado dedicado. La aplicación consulta el mensaje fijado para restaurar el último estado; no necesita leer el historial ni depende de las actualizaciones pendientes de Telegram. Para activarlo, crea un bot con `@BotFather` y añádelo al canal como administrador con permiso para publicar y fijar mensajes. Configura `TELEGRAM_BOT_TOKEN` y `TELEGRAM_BACKUP_CHAT_ID` como variables privadas del servicio, no en Git ni en mensajes. Para `TELEGRAM_BACKUP_CHAT_ID` puedes pegar el enlace de un mensaje del canal privado, con formato `https://t.me/c/<id_del_canal>/<id_del_mensaje>`; la aplicación extrae el ID automáticamente. El enlace de invitación `t.me/+...` no sirve para identificar el canal. No hace falta usar un número virtual para esta opción.

Las copias comprimen y cifran con AES-256-GCM el estado JSON de la web y los archivos de sesión `auth_info` de Baileys; no incluyen los archivos subidos. El bot restaura `auth_info` antes de arrancar las sesiones. El snapshot también contiene `premiumTokens` y `premiumUsers`, así que un token creado en la web sigue siendo reclamable por WhatsApp con `/reclamar <token>` después de un redeploy. El documento actual se actualiza en el sitio y se conserva una copia anterior fijada. Mantén el canal privado, desactiva el borrado automático y conserva el mismo token del bot, que también se usa para descifrar copias anteriores. No publiques ni compartas ese token: quien obtenga el token y el archivo podría descifrar la sesión de WhatsApp. La Bot API permite descargar hasta 20 MB; el código limita cada copia a 19 MB comprimidos. Si la copia antigua no contenía `auth_info` y ya no existe una sesión local, vincula el teléfono una vez después del despliegue para que la próxima copia la incluya. Una sesión revocada o cerrada por WhatsApp no puede recuperarse.

### Comandos de IA

Con `OPENAI_API_KEY` configurada, el bot incluye:

```text
/ai tu pregunta              Respuesta con contexto temporal
/chatbot on                  Activa respuestas automáticas en chats privados
/chatbot off                 Desactiva las respuestas automáticas
/aiclear                     Borra el contexto de la conversación
/imagen descripción          Genera una imagen y la envía por WhatsApp
/videoia descripción         Genera una imagen y crea un corto MP4 animado de 5 segundos
```

La función `/videoia` actual crea un corto animado a partir de una imagen generada y necesita `ffmpeg` en el servidor. Para video generativo real hay que configurar un proveedor que entregue una API y sus credenciales, sin exponerlas al usuario.

### Comandos útiles

```text
/help [comando]                 Ayuda rápida y ejemplos
/start                          Abre el menú principal
/id                             Muestra IDs del chat y del usuario
/time Madrid                    Consulta la hora de una ciudad
/note add texto                 Guarda una nota personal
/note list                      Lista tus notas
/note done 1                    Marca una nota como completada
/note del 1                     Elimina una nota
/remind 30 revisar la tarea     Programa un recordatorio
```

Las notas se guardan por usuario en el almacenamiento persistente del bot. `/time` funciona sin API externa y acepta ciudades como Madrid, México, Cuba, Lima, Bogotá, Miami, Londres y Tokyo.

### Prefijos y grupos

Todos los comandos de WhatsApp del bot usan exclusivamente el prefijo slash `/`:

```text
/menú
/menu
/ban
```

`ban` y `kick` son equivalentes. En un grupo, el administrador debe responder al mensaje de la persona o mencionarla. El bot también debe ser administrador para poder expulsarla.

Los tokens generados desde el panel se guardan con su hash para validación y con su valor completo en el almacén privado cifrado/no público, por lo que permanecen visibles para el administrador después de una actualización. Cada token nuevo permite hasta **5 personas**: `reclamado 1/5`, `2/5`, `3/5`, `4/5` y `5/5`. La misma persona no puede consumir dos cupos y los tokens antiguos se migran automáticamente al formato nuevo.

## Panel web

La interfaz usa un diseño propio rojo/hacker con:

- Pantalla de arranque y estado del sistema.
- Vinculación independiente de WhatsApp.
- Login administrativo protegido por Socket.IO.
- Estadísticas de sesiones y bots.
- Generación y gestión de acceso Premium.
- Difusión y promoción disponibles para el administrador autenticado.

> Nota de mantenimiento: los datos persistentes del bot se conservan fuera del código fuente.
> Las actualizaciones del código no deben reemplazar el almacenamiento persistente.

## Uso responsable

Usa el bot respetando las reglas de WhatsApp, la privacidad de las personas y las leyes aplicables. Las herramientas de automatización, difusión y pruebas deben utilizarse únicamente con autorización.

## Licencia

MIT
