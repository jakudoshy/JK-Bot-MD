const settings = require('../settings');

async function allMenu(sock, from, msg, session, commands) {
    const categories = [
        ['⌁ ʀᴇᴅ ᴄᴏʀᴇ', ['ai', 'chatbot', 'translate', 'qr', 'weather', 'github', 'shorturl', 'calc']],
        ['✦ ɢᴜᴀʀᴅ ᴍᴏᴅᴇ', ['antibug', 'antilink', 'antidelete', 'anticall', 'ghostmode', 'private', 'backup', 'restore']],
        ['◇ ʟɪɴᴋ ʟᴀʙ', ['song', 'video', 'tiktok', 'youtube', 'spotify', 'gdrive', 'apk', 'sticker']],
        ['▣ ɢʀᴏᴜᴘ ᴄᴏɴᴛʀᴏʟ', ['groupinfo', 'grouplink', 'tagall', 'hidetag', 'welcome', 'promote', 'demote', 'mute', 'unmute', 'poll']],
        ['◈ ᴘʀᴏғɪʟᴇ ʟᴏᴜɴɢᴇ', ['profile', 'getbio', 'getdp', 'logo', 'meme', 'quote', 'status']],
        ['⟡ ᴍɪɴɪ ᴘʟᴀʏ', ['joke', 'truth', 'dare', 'riddle', 'trivia', 'roll', 'ship', 'emojimix']],
        ['⧉ ᴏᴡɴᴇʀ ᴢᴏɴᴇ', ['owner', 'ownermenu', 'mode', 'setname', 'restart', 'shutdown', 'clear']]
    ];
    const available = new Set(Object.keys(commands));
    const active = categories.map(([name, list]) => [name, list.filter(command => available.has(command))]).filter(([, list]) => list.length);
    const totalCommands = [...new Set(active.flatMap(([, list]) => list))].length;
    const prefix = settings.prefix || '.';
    const lines = [
        '╭─⟦ JK // CORE ⟧',
        '│ ᴊᴋ // ʙᴏᴛ',
        '│ simple · fast · different',
        '╰──────────────────',
        '',
        `╭─⟦ ${totalCommands} MODULES READY ⟧`
    ];
    for (const [category, cmds] of active) {
        lines.push(`│`, `│ ${category}`);
        for (let i = 0; i < cmds.length; i += 4) {
            lines.push(`│ ${cmds.slice(i, i + 4).map(command => `${prefix}${command}`).join('  ·  ')}`);
        }
    }
    lines.push(
        '╰──────────────────',
        '',
        `> ${settings.botName || 'ᴊᴋ // ʙᴏᴛ'} · ${prefix}menu`
    );
    await sock.sendMessage(from, { text: lines.join('\n') }, { quoted: msg });
}

module.exports = allMenu;
