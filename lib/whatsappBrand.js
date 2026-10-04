const BOT_MARK = 'ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ';
const OWNER_MARK = 'ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ';
const BOX_TOP = '╭────────༺ ༻────────╮';
const BOX_SEPARATOR = '├─────────────────────┤';
const BOX_BOTTOM = '╰────────༺ ༻────────╯';

// Small-caps Unicode used by the JK BOT visual identity. Commands, URLs and
// copied codes are protected so they remain executable/readable.
const SMALL_CAPS = {
  a:'ᴀ', b:'ʙ', c:'ᴄ', d:'ᴅ', e:'ᴇ', f:'ꜰ', g:'ɢ', h:'ʜ', i:'ɪ', j:'ᴊ', k:'ᴋ', l:'ʟ', m:'ᴍ',
  n:'ɴ', o:'ᴏ', p:'ᴘ', q:'ǫ', r:'ʀ', s:'ѕ', t:'ᴛ', u:'ᴜ', v:'ᴠ', w:'ᴡ', x:'x', y:'ʏ', z:'ᴢ'
};
function hasBrand(text) {
    return typeof text === 'string' && (
        text.includes(BOT_MARK) || text.includes('JK-BOT-MD') ||
        text.includes('ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ') || text.includes('ᴊᴋ ʙᴏᴛꫂꤪꨤᴼᶠᶜ') ||
        text.includes('ᴊᴋ // ʙᴏᴛ')
    );
}
// Normaliza ejemplos antiguos para que toda la interfaz muestre /comando.
function normalizeCommandReferences(text) {
    if (typeof text !== 'string' || !text) return text;
    return text.replace(/(^|[\s(])(\*)?\.([a-záéíóúñ][\wáéíóúñ-]*)(\*)?/giu, (_, lead, markerStart = '', command, markerEnd = '') => `${lead}${markerStart}/${command}${markerEnd}`);
}
function smallCaps(text) {
    if (typeof text !== 'string' || !text) return text;
    const protectedParts = [];
    const protect = value => `\u0000${protectedParts.push(value) - 1}\u0000`;
    let result = text
      .replace(/https?:\/\/[^\s)]+/gi, protect)
      .replace(/`[^`\n]*`/g, protect)
      .replace(/(?:^|[\s(])\*?\.[a-záéíóúñ][\wáéíóúñ-]*\*?/giu, value => {
          const lead = value.match(/^[\s(]/)?.[0] || '';
          return lead + protect(value.slice(lead.length));
      })
      .replace(/\b[A-Z0-9][A-Z0-9_-]{3,}\b/g, protect);
    result = result.replace(/[A-Za-z]/g, letter => SMALL_CAPS[letter.toLowerCase()] || letter);
    return result.replace(/\u0000(\d+)\u0000/g, (_, index) => protectedParts[Number(index)]);
}
function frameShortText(text) {
    const clean = text.trim();
    const sourceLines = clean.split('\n');
    if (clean.length > 150 || sourceLines.some(line => line.length > 52) || clean.includes('╭─') || clean.includes('╭━') || clean.includes('╭────────')) return smallCaps(clean);
    const lines = smallCaps(clean).split('\n').filter(line => line.trim());
    return [BOX_TOP, ...lines.map(line => `│☞︎ ${line}`), BOX_BOTTOM].join('\n');
}
function decorateText(text) {
    if (typeof text !== 'string' || !text.trim()) return text;
    text = normalizeCommandReferences(text);
    if (hasBrand(text)) return smallCaps(text.trim());
    return frameShortText(text);
}
function decorateCaption(caption) { return decorateText(caption); }
function installWhatsAppBrand(sock) {
    if (!sock || sock.__jkBrandInstalled || typeof sock.sendMessage !== 'function') return sock;
    const originalSendMessage = sock.sendMessage.bind(sock);
    sock.sendMessage = async (jid, content, options) => {
        if (content && typeof content === 'object') {
            const next = { ...content };
            const raw = next.__jkRaw === true;
            delete next.__jkRaw;
            if (!raw && typeof next.text === 'string') next.text = decorateText(next.text);
            if (!raw && typeof next.caption === 'string') next.caption = decorateCaption(next.caption);
            if (next.interactiveMessage?.body?.text) {
                next.interactiveMessage = { ...next.interactiveMessage, body: { ...next.interactiveMessage.body, text: decorateText(next.interactiveMessage.body.text) } };
            }
            content = next;
        }
        return originalSendMessage(jid, content, options);
    };
    sock.__jkBrandInstalled = true;
    return sock;
}
module.exports = { BOT_MARK, OWNER_MARK, smallCaps, normalizeCommandReferences, decorateText, decorateCaption, installWhatsAppBrand };
