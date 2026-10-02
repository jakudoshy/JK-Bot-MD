const settings = require('../settings');
async function ownerCommand(sock, from, msg) {
    const ownerText = [
        '╭━━━━━━━━━━━━━━━━━━━━━━╮',
        '┃ 👑 *ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ*',
        '┃ ── OFFICIAL PROFILE ──',
        '╰━━━━━━━━━━━━━━━━━━━━━━╯',
        '',
        `👤 *Creador:* ${settings.ownerName}`,
        '🔒 *Contacto:* privado',
        '🟢 *Estado:* Operativo',
        '',
        '🔗 *Centro oficial:*',
        '> https://github.com/jakudoshy/JK-Bot-MD'
    ].join('\n');
    await sock.sendMessage(from, { text: ownerText }, { quoted: msg });
}
module.exports = ownerCommand;
