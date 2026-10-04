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
    if (result.ok) return;
    return sock.sendMessage(chatId, {
        text: `⚠️ *META AI NO RESPONDIÓ*\n\n${result.error}\n\nJID configurado: ${bridge.targetJid()}\n\nSi ves este mensaje, Baileys probablemente no puede enviar al bot especial de Meta AI desde esta sesión. Para habilitar el transporte compatible configura META_AI_JID=867051314767696@bot y usa una implementación que soporte mensajes bot de WhatsApp.`
    }, { quoted: msg });
};
