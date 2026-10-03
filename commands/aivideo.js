module.exports = async function aiVideo(sock, from, msg, session, args = []) {
    const prompt = Array.isArray(args) ? args.join(' ').trim() : String(args || '').trim();
    if (!prompt) {
        return sock.sendMessage(from, { text: '🎬 Uso: *.videoia descripción*\nEjemplo: *.videoia un coche futurista avanzando bajo la lluvia*' }, { quoted: msg });
    }
    if (!session || typeof session.generateAIShortVideo !== 'function') {
        return sock.sendMessage(from, { text: '❌ El video IA no está disponible en esta sesión.' }, { quoted: msg });
    }
    await sock.sendMessage(from, { text: '🎬 Creando un corto de 5 segundos… espera unos segundos.' }, { quoted: msg });
    try {
        const video = await session.generateAIShortVideo(prompt);
        await sock.sendMessage(from, { video, mimetype: 'video/mp4', caption: `🎬 *Corto de 5 segundos*\n\n${prompt}` }, { quoted: msg });
    } catch (error) {
        console.error('[AI Video]', error.message);
        await sock.sendMessage(from, { text: `❌ No pude crear el corto: ${error.message}` }, { quoted: msg });
    }
};
