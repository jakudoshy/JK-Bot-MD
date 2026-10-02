const settings = require('../settings');

async function ownerCommand(sock, from, msg) {
    const ownerText = [
        '╭━━━━━━━━━━━━━━━━━━━━━━╮',
        '┃ 👑 *ᴊᴋ ʙᴏᴛꫂꤪꨤᴼᶠᶜ*',
        '┃ ── OFFICIAL PROFILE ──',
        '╰━━━━━━━━━━━━━━━━━━━━━━╯',
        '',
        `👤 *Creador:* ${settings.ownerName}`,
        `📱 *Contacto:* +${settings.ownerNumber || 'configura OWNER_NUMBER'}`,
        '🟢 *Estado:* Operativo 24/7',
        '',
        '🔗 *Centro oficial:*',
        '> https://github.com/jakudoshy/JK-Bot-MD'
    ].join('\n');
    await sock.sendMessage(from, { text: ownerText }, { quoted: msg });
}

module.exports = ownerCommand;
