const bridge = require('../lib/metaAiBridge');

module.exports = async function metaCommand(sock, chatId, msg, q = '') {
    const prompt = String(q).trim();
    if (!prompt) {
        return sock.sendMessage(chatId, {
            text: '🤖 *META AI*\n\nUso: /hi tu pregunta\nEjemplo: /hi ¿Cómo estás?\n\nTambién funcionan /meta y /ia.\n\n⚠️ Este puente usa el chat de Meta AI vinculado a la sesión del bot.'
        }, { quoted: msg });
    }
    await sock.sendPresenceUpdate?.('composing', chatId);
    await sock.sendMessage(chatId, { text: '🤖 *Generando respuesta con Meta AI…*\n\n⏳ Enviando tu pregunta y esperando respuesta.' }, { quoted: msg });
    const result = await bridge.ask(sock, prompt, chatId, msg);
    if (result.ok) {
        return sock.sendMessage(chatId, { text: `🤖 *META AI*\n\n${result.text}` }, { quoted: msg });
    }
    return sock.sendMessage(chatId, {
        text: `⚠️ *META AI NO RESPONDIÓ*\n\n${result.error}\n\nJID configurado: ${bridge.targetJid()}\n\nPuente: ${bridge.bridgeUrl()}\n\nComprueba que el dispositivo Whatsmeow esté vinculado y ejecutándose.`
    }, { quoted: msg });
};
