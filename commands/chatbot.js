module.exports = async function(sock, chatId, msg, session, args = []) {
    const action = String(args[0] || '').toLowerCase();
    if (!session) return sock.sendMessage(chatId, { text: '❌ No hay una sesión activa.' }, { quoted: msg });

    if (action === 'on' || action === 'activar') {
        if (typeof session.setAIEnabled === 'function') session.setAIEnabled(true);
        else session.aiEnabled = true;
        return sock.sendMessage(chatId, { text: '🤖 Chatbot IA activado. Responderé mensajes privados y haré preguntas cuando falte contexto.' }, { quoted: msg });
    }
    if (action === 'off' || action === 'desactivar') {
        if (typeof session.setAIEnabled === 'function') session.setAIEnabled(false);
        else session.aiEnabled = false;
        return sock.sendMessage(chatId, { text: '⏸️ Chatbot IA desactivado.' }, { quoted: msg });
    }
    return sock.sendMessage(chatId, {
        text: `🤖 *Configuración del chatbot*\n\nEstado: ${session.aiEnabled ? '✅ activado' : '⏸️ desactivado'}\n\n.chatbot on — activar respuestas automáticas\n.chatbot off — desactivar respuestas\n.aiclear — borrar el contexto de esta conversación`
    }, { quoted: msg });
};
