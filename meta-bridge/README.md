# JK Meta AI Bridge

Sidecar Go basado en [wa-metaai](https://github.com/amita-seal/wa-metaai) y `go.mau.fi/whatsmeow`.

Su única función es mantener una sesión adicional de WhatsApp y enviar/recibir mensajes del JID especial de Meta AI (`867051314767696@bot`). El bot principal Node.js/Baileys conserva todos los comandos y llama a este servicio por `http://127.0.0.1:8788/v1/chat/completions`.

## Vinculación

Configura `WA_PHONE` con solo dígitos y ejecuta el servicio. En el primer arranque imprimirá un código:

1. Abre WhatsApp del número del bot.
2. Ve a **Ajustes → Dispositivos vinculados → Vincular dispositivo con número de teléfono**.
3. Introduce el código que aparece en los logs.
4. Conserva el volumen donde se crea `wametaai.db`; así no tendrás que vincularlo de nuevo.

El sidecar usa una sesión adicional del mismo número; no reemplaza la sesión Baileys.
