function parseDate(value) {
    const match = String(value).trim().match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (!match) return null;
    const date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    return date.getFullYear() === Number(match[3]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[1]) ? date : null;
}

module.exports = async function ageCommand(sock, chatId, msg, q = '') {
    const birth = parseDate(q);
    if (!birth || birth > new Date()) return sock.sendMessage(chatId, { text: '🎂 Uso: /age DD/MM/AAAA\nEjemplo: /age 25/12/2000' }, { quoted: msg });
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    const birthday = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
    if (now < birthday) years--;
    const next = new Date(now.getFullYear() + (now >= birthday ? 1 : 0), birth.getMonth(), birth.getDate());
    const days = Math.ceil((next - now) / 86400000);
    return sock.sendMessage(chatId, { text: `🎂 *CALCULADORA DE EDAD*\n\nNacimiento: ${q}\nEdad: *${years} años*\nPróximo cumpleaños: ${days} día(s)` }, { quoted: msg });
};
