# ᴊᴋ ʙᴏᴛꫂꤪꨤᴼᶠᶜ

Bot de automatización para WhatsApp basado en **Baileys**, creado y personalizado para **ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꨤᴼᶠᶜ**.

Incluye comandos de grupos, descargas, stickers, economía, perfiles, IA, herramientas de red, Premium, múltiples sesiones, Telegram opcional y un dashboard web rojo con estilo hacker.

## Identidad

- **Bot:** ᴊᴋ ʙᴏᴛꫂꤪꨤᴼᶠᶜ
- **Autor:** ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꨤᴼᶠᶜ
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
- Respaldo cifrado AES-256-GCM opcional en GitHub.
- Persistencia Premium en PostgreSQL/Supabase con migración automática desde los JSON existentes.
- IA conversacional con contexto temporal, preguntas de aclaración, generación de imágenes y cortos MP4 de 5 segundos.

## Instalación

Requiere **Node.js 18+**, FFmpeg y Python disponible para algunas herramientas multimedia.

```bash
git clone https://github.com/jakudoshy/JK-Bot-MD.git
cd JK-Bot-MD
npm ci
cp .env.example .env
# Edita .env y configura ADMIN_USERNAME; la contraseña del panel es `04060120**`
npm start
```

Después abre el panel en `http://localhost:3000` y vincula el número desde **Vincular WhatsApp**.

## Configuración mínima

```env
# El Owner WhatsApp está fijado al número autorizado 5350898613.
# OWNER_NUMBER se conserva solo por compatibilidad con instalaciones antiguas.
OWNER_NUMBER=5350898613
ADMIN_USERNAME=tu_usuario_admin
ADMIN_PASSWORD=04060120**
PORT=3000
# Usa una ruta absoluta en un volumen persistente; no la pongas dentro del repositorio.
PERSISTENT_DATA_DIR=/data/bot
```

No publiques `.env`, credenciales de WhatsApp, tokens de GitHub ni claves de cifrado. Sin Supabase, los usuarios Premium y los tokens completos se guardan únicamente en el servidor, en `premium_data.json` dentro de `PERSISTENT_DATA_DIR`; con Supabase configurado, PostgreSQL es la fuente principal y ese JSON queda como respaldo local. La web no los escribe en `localStorage` y sí los vuelve a cargar al recargar el panel. En Railway es obligatorio montar un volumen persistente en `/data` y configurar `PERSISTENT_DATA_DIR=/data/bot` para conservar sesiones y archivos, o configurar el respaldo cifrado de GitHub con **todas** sus variables (`GITHUB_BACKUP_TOKEN`, `GITHUB_BACKUP_REPO`, `GITHUB_BACKUP_BRANCH`, `GITHUB_BACKUP_PATH` y `BACKUP_ENCRYPTION_KEY`).

### PostgreSQL en Supabase

Para que el Premium sobreviva incluso cuando se reemplaza el contenedor, configura en el servicio donde ejecutas el bot la cadena privada de PostgreSQL de Supabase:

```env
SUPABASE_DB_URL=postgresql://postgres:<PASSWORD>@db.<PROJECT-REF>.supabase.co:5432/postgres?sslmode=require
SUPABASE_DB_POOL_MAX=5
SUPABASE_DB_SSL=true
```

La aplicación crea automáticamente `jkbot_premium_users` y `jkbot_premium_tokens` al iniciar. En la primera ejecución sube los usuarios y tokens existentes desde `premium_data.json`; después, PostgreSQL pasa a ser la fuente de verdad. Cada alta, reclamación, modificación o eliminación del panel se sincroniza automáticamente con Supabase.

También puedes ejecutar manualmente [`supabase/schema.sql`](supabase/schema.sql) desde el SQL Editor de Supabase. Usa la conexión privada/directa de PostgreSQL únicamente en el servidor; no pongas `SUPABASE_DB_URL`, la contraseña de la base de datos ni una service-role key en `index.html` o en el navegador.

Supabase guarda el estado Premium, pero las credenciales de sesión de WhatsApp de Baileys y los archivos subidos siguen necesitando un volumen persistente (`PERSISTENT_DATA_DIR`) o un respaldo de archivos. La actualización del código no debe borrar ese volumen.

### Comandos de IA

Con `OPENAI_API_KEY` configurada, el bot incluye:

```text
.ai tu pregunta              Respuesta con contexto temporal
.chatbot on                  Activa respuestas automáticas en chats privados
.chatbot off                 Desactiva las respuestas automáticas
.aiclear                     Borra el contexto de la conversación
.imagen descripción          Genera una imagen y la envía por WhatsApp
.videoia descripción         Genera una imagen y crea un corto MP4 animado de 5 segundos
```

La función `.videoia` actual crea un corto animado a partir de una imagen generada y necesita `ffmpeg` en el servidor. No llama directamente a Meta AI: Meta no ofrece una API pública universal para que cualquier bot de WhatsApp genere videos. Para video generativo real habría que conectar un proveedor de video que entregue una API y sus credenciales, sin exponerlas al usuario.

Los tokens generados desde el panel se guardan con su hash para validación y con su valor completo en el almacén privado cifrado/no público, por lo que permanecen visibles para el administrador después de una actualización. Los tokens creados antes de esta corrección solo pueden mostrar la vista previa, porque su valor original no se puede reconstruir desde un hash.

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
