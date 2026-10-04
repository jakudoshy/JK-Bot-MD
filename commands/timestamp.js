module.exports = async function timestampCommand(sock, chatId, msg, q = '') {
    const input = String(q).trim();
    const date = input ? new Date(input) : new Date();
    if (Number.isNaN(date.getTime())) {
        return sock.sendMessage(chatId, { text: '❌ Fecha no válida. Ejemplo: /timestamp 2026-10-04 12:30' }, { quoted: msg });
    }
    const unix = Math.floor(date.getTime() / 1000);
    return sock.sendMessage(chatId, { text: `⏱️ *TIMESTAMP*\n\nUnix: ${unix}\nISO: ${date.toISOString()}\nLocal: ${date.toLocaleString('es-ES')}` }, { quoted: msg });
};
