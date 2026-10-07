'use strict';
const { canonicalCommand, spanishCommand } = require('../lib/spanishCommands');
const HELP = {
  menu: 'Muestra el menú principal y las funciones del bot.', allmenu: 'Muestra todas las secciones y comandos disponibles.',
  warcraft: 'Abre el selector de secciones del Warcraft RPG. Ejemplo: /warcraft combate.', loginw: 'Inicia sesión con la cuenta Warcraft vinculada a tu número. Ejemplo: /login usuario contraseña.',
  song: 'Busca una canción y envía el audio. Ejemplo: /cancion nombre de la canción o pega un enlace de YouTube.',
  welcome: 'Activa o desactiva la bienvenida y el menú automático del grupo. Ejemplo: /bienvenida on.', setwelcome: 'Guarda el mensaje y activa la bienvenida automática. Ejemplo: /set_bienvenida Hola @user, bienvenido a @grupo.',
  close: 'Cierra el grupo para que solo escriban los administradores. Ejemplo: /cerrar_grupo.', open: 'Abre el grupo para todos. Ejemplo: /abrir_grupo.',
  antilink: 'Elimina enlaces en el grupo. Ejemplo: /anti_enlaces on.', antispam: 'Elimina mensajes repetidos o excesivamente largos. Ejemplo: /antispam on.',
  antiporno: 'Elimina mensajes con términos de contenido sexual explícito. Ejemplo: /antiporno on.', antifoto: 'Elimina fotos de participantes que no sean administradores. Ejemplo: /antifoto on.',
  antivideo: 'Elimina vídeos de participantes que no sean administradores. Ejemplo: /antivideo on.', antiaudio: 'Elimina audios de participantes que no sean administradores. Ejemplo: /antiaudio on.',
  antisticker: 'Elimina stickers de participantes que no sean administradores. Ejemplo: /antisticker on.', antidocumento: 'Elimina documentos de participantes que no sean administradores. Ejemplo: /anti_documentos on.',
  note: 'Guarda notas personales. Ejemplo: /nota agregar comprar agua.', remind: 'Programa un aviso. Ejemplo: /recordar 30 estudiar.', time: 'Muestra la hora de una ciudad o zona horaria. Ejemplo: /hora Madrid.',
  id: 'Muestra el ID del chat, del bot y del usuario.', translate: 'Traduce un texto. Ejemplo: /traducir hola en.', qr: 'Crea un código QR. Ejemplo: /codigo_qr https://ejemplo.com.',
  sticker: 'Convierte una imagen o vídeo en sticker. Ejemplo: responde a una imagen con /sticker.', calc: 'Calcula operaciones. Ejemplo: /calcular (25*4)/2.', weather: 'Consulta el clima. Ejemplo: /clima Madrid.', poll: 'Crea una encuesta. Ejemplo: /encuesta ¿Te gusta?|Sí|No.'
};
function menu() { return ['╭───〔 ❔ AYUDA RÁPIDA 〕───╮','│','│ 📚 /warcraft · selector de comandos del RPG','│ 🛡️ /seguridad · protecciones para grupos','│ 👋 /bienvenida · mensaje y menú automáticos','│ 🎵 /cancion · buscar música y enviar audio','│ 📖 /ayuda comando · ayuda y ejemplos','│ ⚡ /todos · lista de comandos en español','│','│ Los nombres ingleses antiguos siguen funcionando como alias.','╰────────────────────────╯'].join('\n'); }
module.exports = async function helpCommand(sock, chatId, msg, q = '') {
 const input = String(q).trim().toLowerCase().replace(/^\//, '');
 if (!input) return sock.sendMessage(chatId, { text: menu() }, { quoted: msg });
 const command = canonicalCommand(input); const description = HELP[command];
 if (!description) return sock.sendMessage(chatId, { text: `❌ No tengo una guía detallada para /${input}.\n\nUsa /ayuda para ver los módulos.` }, { quoted: msg });
 return sock.sendMessage(chatId, { text: `╭───〔 ❔ AYUDA 〕───╮\n│\n│ Comando: /${spanishCommand(command)}\n│ ${description}\n│\n╰────────────────────╯` }, { quoted: msg });
};
module.exports.help = HELP;
