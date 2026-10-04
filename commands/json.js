module.exports = async function jsonCommand(sock, chatId, msg, q = '') {
    const raw = String(q).trim();
    if (!raw) return sock.sendMessage(chatId, { text: '🧩 Uso: /json {"nombre":"Ana","edad":20}' }, { quoted: msg });
    try {
        const parsed = JSON.parse(raw);
        const formatted = JSON.stringify(parsed, null, 2);
        if (formatted.length > 3500) return sock.sendMessage(chatId, { text: '✅ JSON válido, pero es demasiado largo para mostrarlo aquí.' }, { quoted: msg });
        return sock.sendMessage(chatId, { text: `✅ *JSON VÁLIDO*\n\n${formatted}` }, { quoted: msg });
    } catch (error) {
        return sock.sendMessage(chatId, { text: `❌ JSON no válido.\n\nDetalle: ${error.message}` }, { quoted: msg });
    }
};
