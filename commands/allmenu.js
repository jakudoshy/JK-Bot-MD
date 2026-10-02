const settings = require('../settings');

async function allMenu(sock, from, msg, session, commands) {
    const categories = {
        '👑 ᴏᴡɴᴇʀ': ['public', 'private', 'mode', 'owner', 'setname', 'block', 'unblock', 'bcgc', 'bcall', 'restart', 'shutdown', 'xrestart', 'xshutdown', 'clear', 'backup', 'restore', 'clone'],
        '👥 ɢʀᴏᴜᴘ': ['kick', 'add', 'promote', 'demote', 'mute', 'unmute', 'tagall', 'hidetag', 'grouplink', 'groupinfo', 'join', 'leave', 'setdesc', 'setppgc', 'getbio', 'getdp', 'accept', 'poll', 'everyonemsg', 'listonline', 'tagme', 'mention', 'kickoffline', 'snipe', 'editmsg', 'react', 'send', 'forward', 'save'],
        '🤖 ᴀɪ': ['ai', 'chatbot', 'gali'],
        '⬇️ ᴅᴏᴡɴʟᴏᴀᴅ': ['song', 'video', 'insta', 'tiktok', 'facebook', 'youtube', 'pinterest', 'twitter', 'reddit', 'spotify', 'mf', 'apk', 'gdrive'],
        '🛠️ ᴛᴏᴏʟs': ['ping', 'dp', 'vv', 'translate', 'base64', 'qr', 'shorturl', 'calc', 'weather', 'github', 'ipinfo', 'tempmail', 'fakeinfo', 'binlookup', 'whois', 'dnslookup', 'portscan', 'screenshot', 'define', 'google', 'wiki', 'yts', 'playstore', 'npm', 'sticker', 'toimg', 'tomp3', 'tts', 'blur', 'invert', 'crop', 'flip', 'grayscale', 'removebg', 'enlarge', 'runtime', 'uptime', 'serverinfo', 'speedtest', 'device'],
        '🎉 ғᴜɴ': ['joke', 'meme', 'dare', 'truth', 'ascii', 'roast', 'compliment', 'ship', 'emojimix', 'character', 'quote', 'fact', 'trivia', 'coinflip', 'roll', 'riddle', 'wouldyourather'],
        '🕌 ɪsʟᴀᴍɪᴄ': ['quran', 'hadith', 'prayer', 'qibla', 'asmaulhusna'],
        '🎌 ᴀɴɪᴍᴇ': ['anime', 'manga'],
        '⚠️ ᴅᴇᴍᴏs ᴅᴇ ᴏᴡɴᴇʀ': ['hack', 'report']
    };
    const available = new Set(Object.keys(commands));
    for (const [category, list] of Object.entries(categories)) {
        categories[category] = list.filter(command => available.has(command));
    }
    const totalCommands = [...new Set(Object.values(categories).flat())].length;
    const prefix = settings.prefix || '.';
    const lines = [
        '╭━━━━━━━━━━━━━━━━━━━━━━╮',
        '┃ 👑 *ᴊᴋ ʙᴏᴛꫂꤪꨤᴼᶠᶜ*',
        '┃ ── COMMAND DIRECTORY ──',
        '╰━━━━━━━━━━━━━━━━━━━━━━╯',
        '',
        `╭─〔 *${totalCommands} COMANDOS DISPONIBLES* 〕`
    ];
    for (const [category, cmds] of Object.entries(categories)) {
        if (!cmds.length) continue;
        lines.push(`│`, `│ ${category}`);
        for (let i = 0; i < cmds.length; i += 5) {
            lines.push(`│ ${cmds.slice(i, i + 5).map(command => `${prefix}${command}`).join('  ·  ')}`);
        }
    }
    lines.push(
        '╰────────────────────',
        '',
        `> ${settings.botName || 'ᴊᴋ ʙᴏᴛꫂꤪꨤᴼᶠᶜ'} · escribe ${prefix}menu para volver`
    );
    const allMenuText = lines.join('\n');
    try {
        await sock.sendMessage(from, { image: { url: settings.startimage }, caption: allMenuText }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: allMenuText }, { quoted: msg });
    }
}

module.exports = allMenu;
