async function kickCommand(sock, from, msg, isAdmin) {
    if (!isAdmin) return await sock.sendMessage(from, { text: '❌ Solo un administrador puede usar este comando.' }, { quoted: msg });
    if (!from.endsWith('@g.us')) return await sock.sendMessage(from, { text: '❌ Este comando solo funciona en grupos.' }, { quoted: msg });

    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant || 
                   msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

    if (!quoted) return await sock.sendMessage(from, { text: '❌ Responde al mensaje de la persona o menciónala para expulsarla.' }, { quoted: msg });

    try {
        await sock.groupParticipantsUpdate(from, [quoted], "remove");
        await sock.sendMessage(from, { text: '✅ Usuario expulsado del grupo. También puedes usar `.ban` o `/ban`.' }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ No pude expulsar al usuario. Comprueba que el bot sea administrador.' }, { quoted: msg });
    }
}

module.exports = kickCommand;
