# JK Bot MD

Bot de WhatsApp basado en **Baileys**, con panel web, emparejamiento por código, administración de grupos, medios, stickers, perfiles y funciones opcionales de IA/Telegram.

> Usa el bot de forma responsable y conforme a las reglas de WhatsApp, la privacidad de las personas y la legislación aplicable. Baileys es una integración no oficial: vincula únicamente números que controles y ten presente el riesgo de restricciones de WhatsApp.

## Requisitos

| Requisito | Versión / uso |
|---|---|
| Node.js | 18 o superior (validado con Node 22) |
| npm | Incluido con Node.js |
| FFmpeg | Conversión de medios y stickers |
| Python | Requerido por `youtube-dl-exec` |
| Almacenamiento persistente | Obligatorio en despliegues para conservar sesiones y datos |

## Instalación local

```bash
git clone https://github.com/jakudoshy/JK-Bot-MD.git
cd JK-Bot-MD
npm ci
cp .env.example .env
```

Edita el archivo `.env` antes de iniciar. Como mínimo:

```env
OWNER_NUMBER=18095551234
ADMIN_USERNAME=un_usuario_privado
ADMIN_PASSWORD=una_contrasena_larga_y_unica
PERSISTENT_DATA_DIR=./bot
PORT=3000
```

No subas `.env`, la carpeta `bot/`, credenciales ni sesiones de WhatsApp al repositorio.

## Inicio y verificación

```bash
npm start
```

El panel estará disponible en `http://localhost:3000` y la comprobación de salud en:

```bash
curl http://localhost:3000/health
# OK
```

Para vincular el número, abre el panel, escribe el número con código de país (sin `+`), genera el código y complétalo en **WhatsApp → Dispositivos vinculados → Vincular con número de teléfono**.

## Variables de entorno

El archivo [`.env.example`](.env.example) documenta todas las variables. Las principales son:

| Variable | Obligatoria | Descripción |
|---|---:|---|
| `OWNER_NUMBER` | Sí | Número(s) del propietario con código de país, separados por comas. |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Sí para usar administración | Credenciales privadas del área administrativa; no existen valores por defecto. |
| `PORT` | No | Puerto HTTP; por defecto `3000`. |
| `PERSISTENT_DATA_DIR` | Sí en producción | Carpeta que almacena sesiones, datos, tokens y perfiles. |
| `TELEGRAM_BOT_TOKEN` | No | Habilita la integración opcional con Telegram. |
| `OPENAI_API_KEY` | No | Habilita las funciones de IA compatibles con OpenAI. |
| `GITHUB_BACKUP_*` / `BACKUP_ENCRYPTION_KEY` | No | Activa respaldo cifrado de estado y sesiones. |

## Despliegue en Railway

1. Crea un servicio desde este repositorio; el proyecto ya incluye `railway.toml` y `nixpacks.toml`.
2. Crea un **Volume** y móntalo en `/data`.
3. Configura `PERSISTENT_DATA_DIR=/data/bot` y las variables privadas desde Railway Variables.
4. Mantén **una sola réplica**: una sesión de WhatsApp y un volumen no deben compartirse entre varias instancias.
5. Despliega y valida `GET /health` antes de vincular el número.

El proceso inicia con `npm start`. FFmpeg y Python se instalan desde la configuración de Nixpacks.

## Respaldo cifrado opcional

Al definir **todas** las variables `GITHUB_BACKUP_TOKEN`, `GITHUB_BACKUP_REPO`, `GITHUB_BACKUP_BRANCH`, `GITHUB_BACKUP_PATH` y `BACKUP_ENCRYPTION_KEY`, el bot restaura un respaldo cifrado al iniciar y actualiza el estado después de cambios. El respaldo incluye `bot_data.json`, credenciales de WhatsApp, archivos subidos, tokens y usuarios premium.

- Usa un token de GitHub de alcance mínimo, limitado a un repositorio privado de respaldo.
- Conserva `BACKUP_ENCRYPTION_KEY` fuera del repositorio y del propio respaldo.
- Una clave perdida impide recuperar el contenido del respaldo.

## Comprobaciones recomendadas

```bash
node --check index.js
find commands lib -type f -name '*.js' -print0 | xargs -0 -n1 node --check
npm audit --omit=dev
```

El proyecto depende de servicios y fuentes de terceros para algunas funciones. Revisa sus condiciones de uso y mantén las dependencias actualizadas antes de exponer el bot a Internet.

## Licencia

MIT
