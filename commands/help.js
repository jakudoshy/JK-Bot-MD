const HELP = {
    menu: 'Muestra el menú principal.',
    allmenu: 'Muestra todos los comandos disponibles.',
    anime: 'Busca información de un anime. Ejemplo: /anime Naruto',
    angry: 'Envía una reacción anime. En grupos puedes mencionar a alguien.',
    note: 'Guarda recordatorios personales. Usa /note para ver la ayuda.',
    remind: 'Programa un aviso. Ejemplo: /remind 30 estudiar',
    time: 'Muestra la hora de una ciudad o zona horaria. Ejemplo: /time Madrid',
    id: 'Muestra el ID del chat, del bot y del usuario.',
    translate: 'Traduce texto o un mensaje respondido. Ejemplo: /translate hola en',
    qr: 'Crea un código QR. Ejemplo: /qr https://ejemplo.com',
    sticker: 'Responde a una imagen o vídeo con /sticker para convertirlo.',
    calc: 'Calcula operaciones. Ejemplo: /calc (25*4)/2',
    weather: 'Consulta el clima. Ejemplo: /weather Madrid',
    poll: 'Crea una encuesta. Ejemplo: /poll ¿Te gusta?|Sí|No',
};

function menu() {
    return [
        '╭───〔 🧭 AYUDA RÁPIDA 〕───╮',
        '│',
        '│ 📚 /help [comando] · Ayuda detallada',
        '│ 🏠 /menu · Menú principal',
        '│ ⚡ /start · Iniciar el bot',
        '│ 📝 /note · Notas personales',
        '│ ⏰ /remind · Recordatorios',
        '│ 🌍 /time · Hora mundial',
        '│ 🪪 /id · IDs del chat',
        '│ 🤖 /ai · Preguntar a la IA configurada',
        '│',
        '│ Escribe /help nombre para ver ejemplos.',
        '╰────────────────────────╯'
    ].join('\n');
}

module.exports = async function helpCommand(sock, chatId, msg, q = '') {
    const command = String(q).trim().toLowerCase().replace(/^\//, '');
    if (!command) return sock.sendMessage(chatId, { text: menu() }, { quoted: msg });
    const description = HELP[command];
    if (!description) {
        return sock.sendMessage(chatId, { text: `❌ No tengo ayuda para /${command}.\n\nUsa /help para ver los comandos principales.` }, { quoted: msg });
    }
    return sock.sendMessage(chatId, { text: `╭───〔 ❔ AYUDA 〕───╮\n│\n│ Comando: /${command}\n│ ${description}\n│\n╰────────────────────╯` }, { quoted: msg });
};

module.exports.help = HELP;
