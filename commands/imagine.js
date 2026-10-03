module.exports = async function imagine(sock, from, msg, session, args = []) {
    const prompt = Array.isArray(args) ? args.join(' ').trim() : String(args || '').trim();
    if (!prompt) {
        return sock.sendMessage(from, { text: '🖼️ Uso: */imagen descripción*\nEjemplo: */imagen un gato astronauta sobre La Habana, estilo cinematográfico*' }, { quoted: msg });
    }
    if (!session || typeof session.generateAIImage !== 'function') {
        return sock.sendMessage(from, { text: '❌ La generación de imágenes no está disponible en esta sesión.' }, { quoted: msg });
    }
    await sock.sendMessage(from, { text: '🎨 Generando tu imagen… espera unos segundos.' }, { quoted: msg });
    try {
        const image = await session.generateAIImage(prompt);
        await sock.sendMessage(from, { image, caption: `🖼️ *Imagen generada*\n\n${prompt}` }, { quoted: msg });
    } catch (error) {
        console.error('[AI Image]', error.message);
        await sock.sendMessage(from, { text: `❌ No pude generar la imagen: ${error.message}` }, { quoted: msg });
    }
};
