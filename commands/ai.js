async function aiCommand(sock, from, msg, isAdmin, session, args = []) {
    const prompt = Array.isArray(args) ? args.join(' ').trim() : String(args || '').trim();
    if (!session || typeof session.getAIResponse !== 'function') {
        return sock.sendMessage(from, { text: '❌ El módulo IA no está disponible en esta sesión.' }, { quoted: msg });
    }
    const answer = await session.getAIResponse(from, prompt, 'Eres el módulo IA de JK BOT. Ayuda con respuestas prácticas, seguras y claras.');
    return sock.sendMessage(from, { text: `🤖 *ᴊᴋ ʙᴏᴛꫂꤪꨤᴼᶠᶜ · IA*\n\n${answer}\n\n_ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ_` }, { quoted: msg });
}
module.exports = aiCommand;
