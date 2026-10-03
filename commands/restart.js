module.exports = async function(sock, chatId, msg, isOwner) {
    if (!isOwner) return await sock.sendMessage(chatId, { text: '\u274C Owner only!' }, { quoted: msg });
    
    await sock.sendMessage(chatId, { text: '\u1F504 Restarting bot session...' }, { quoted: msg });
    
    // Railway no reinicia un servicio que termina limpiamente con código 0.
    // Un código de fallo activa el supervisor de Railway/PM2 sin borrar la sesión.
    setTimeout(() => {
        process.exit(1); // Dejar que PM2/Railway reinicie el proceso
    }, 2000);
};
