const BOT_MARK = 'ᴊᴋ ʙᴏᴛꫂꤪꨤᴼᶠᶜ';
const OWNER_MARK = 'ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꨤᴼᶠᶜ';
const BOX_TOP = '╭─〔 JK BOT // STATUS 〕';
const BOX_BOTTOM = '╰────────────────────';

function hasBrand(text) {
    return typeof text === 'string' && (text.includes(BOT_MARK) || text.includes('JK-BOT-MD'));
}

function frameShortText(text) {
    const clean = text.trim();
    if (clean.length > 220 || clean.includes('╭─') || clean.includes('╭━')) return clean;
    return `${BOX_TOP}\n│ ${clean.replace(/\n/g, '\n│ ')}\n${BOX_BOTTOM}`;
}

function decorateText(text) {
    if (typeof text !== 'string' || !text.trim() || hasBrand(text)) return text;
    return `${frameShortText(text)}\n\n> ${BOT_MARK} • ${OWNER_MARK}`;
}

function decorateCaption(caption) {
    if (typeof caption !== 'string' || !caption.trim() || hasBrand(caption)) return caption;
    return `${frameShortText(caption)}\n\n> ${BOT_MARK} • ${OWNER_MARK}`;
}

function installWhatsAppBrand(sock) {
    if (!sock || sock.__jkBrandInstalled || typeof sock.sendMessage !== 'function') return sock;
    const originalSendMessage = sock.sendMessage.bind(sock);
    sock.sendMessage = async (jid, content, options) => {
        if (content && typeof content === 'object') {
            const next = { ...content };
            if (typeof next.text === 'string') next.text = decorateText(next.text);
            if (typeof next.caption === 'string') next.caption = decorateCaption(next.caption);
            content = next;
        }
        return originalSendMessage(jid, content, options);
    };
    sock.__jkBrandInstalled = true;
    return sock;
}

module.exports = { BOT_MARK, OWNER_MARK, decorateText, decorateCaption, installWhatsAppBrand };
