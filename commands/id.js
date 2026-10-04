function clean(value) {
    return String(value || '').split('@')[0].split(':')[0];
}

module.exports = async function idCommand(sock, chatId, msg) {
    const participant = msg?.key?.participant || (msg?.key?.fromMe ? sock.user?.id : chatId);
    const bot = sock.user?.id || 'No disponible';
    const isGroup = String(chatId).endsWith('@g.us');
    const lines = [
        '╭───〔 🪪 IDENTIFICADORES 〕───╮',
        '│',
        `│ 💬 Chat: ${chatId}`,
        `│ 👤 Usuario: ${participant || 'No disponible'}`,
        `│ 🤖 Bot: ${bot}`,
        `│ 👥 Tipo: ${isGroup ? 'Grupo' : 'Chat privado'}`,
        '│',
        '╰────────────────────────────╯'
    ];
    return sock.sendMessage(chatId, { text: lines.join('\n') }, { quoted: msg });
};
