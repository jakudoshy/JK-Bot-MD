const crypto = require('crypto');

module.exports = async function uuidCommand(sock, chatId, msg, q = '') {
    const count = Math.min(5, Math.max(1, Number.parseInt(String(q).trim() || '1', 10) || 1));
    const values = Array.from({ length: count }, () => crypto.randomUUID());
    return sock.sendMessage(chatId, { text: `🆔 *UUID${count > 1 ? 'S' : ''} GENERADO${count > 1 ? 'S' : ''}*\n\n${values.join('\n')}` }, { quoted: msg });
};
