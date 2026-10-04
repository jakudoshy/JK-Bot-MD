const crypto = require('crypto');

module.exports = async function hashCommand(sock, chatId, msg, q = '') {
    const parts = String(q).trim().split(/\s+/).filter(Boolean);
    const requested = (parts.shift() || 'sha256').toLowerCase();
    const algorithm = ['md5', 'sha1', 'sha256', 'sha512'].includes(requested) ? requested : 'sha256';
    const text = requested === algorithm ? parts.join(' ') : [requested, ...parts].join(' ');
    if (!text) return sock.sendMessage(chatId, { text: '🔐 Uso: /hash [sha256|sha512|sha1|md5] texto\nEjemplo: /hash sha256 hola' }, { quoted: msg });
    const digest = crypto.createHash(algorithm).update(text, 'utf8').digest('hex');
    return sock.sendMessage(chatId, { text: `🔐 *HASH ${algorithm.toUpperCase()}*\n\nTexto: ${text}\n\n${digest}` }, { quoted: msg });
};
