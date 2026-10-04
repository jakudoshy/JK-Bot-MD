const DEFAULT_META_AI_JID = '867051314767696@bot';
const TIMEOUT_MS = Math.max(15000, Number(process.env.META_AI_TIMEOUT_MS) || 60000);

const pending = [];
let active = false;

function targetJid() {
    return String(process.env.META_AI_JID || DEFAULT_META_AI_JID).trim();
}

function unwrap(message) {
    return message?.ephemeralMessage?.message || message?.viewOnceMessage?.message || message?.viewOnceMessageV2?.message || message;
}

function textFrom(content) {
    return String(content?.conversation || content?.extendedTextMessage?.text || content?.imageMessage?.caption || content?.videoMessage?.caption || content?.documentMessage?.caption || '').trim();
}

function isMetaMessage(msg) {
    const wanted = targetJid().toLowerCase();
    const remote = String(msg?.key?.remoteJid || '').toLowerCase();
    const participant = String(msg?.key?.participant || '').toLowerCase();
    return remote === wanted || participant === wanted;
}

function finish(request, result) {
    clearTimeout(request.timer);
    request.resolve(result);
}

async function processQueue() {
    if (active || !pending.length) return;
    active = true;
    const request = pending.shift();
    const sock = request.sock;
    try {
        await sock.sendPresenceUpdate?.('composing', targetJid());
        // Baileys can address normal JIDs but does not currently add Meta AI's
        // bot-message secret/node. This send is intentionally best-effort.
        await sock.sendMessage(targetJid(), { text: request.prompt });
        request.timer = setTimeout(() => {
            finish(request, { ok: false, error: 'Meta AI no respondió dentro del tiempo esperado.' });
            active = false;
            processQueue();
        }, TIMEOUT_MS);
    } catch (error) {
        finish(request, { ok: false, error: `No se pudo enviar a Meta AI: ${error.message}` });
        active = false;
        processQueue();
    }
}

function ask(sock, prompt, chatId, quoted) {
    return new Promise((resolve) => {
        pending.push({ sock, prompt, chatId, quoted, resolve, timer: null });
        processQueue();
    });
}

async function handleIncoming(sock, msg, messageContent, downloadContentFromMessage) {
    if (!isMetaMessage(msg) || !active || !pending.length && !active) return false;
    // The active request is not in pending while it is being sent, so locate it
    // through the request attached by processQueue below.
    const request = processQueue.current;
    if (!request) return false;
    const content = unwrap(messageContent);
    const text = textFrom(content);
    if (!text && !content?.imageMessage && !content?.videoMessage && !content?.audioMessage) return false;
    processQueue.current = null;
    if (text) await sock.sendMessage(request.chatId, { text: `🤖 *META AI*\n\n${text}` }, { quoted: request.quoted });
    const mediaType = content?.imageMessage ? 'image' : content?.videoMessage ? 'video' : content?.audioMessage ? 'audio' : null;
    if (mediaType && downloadContentFromMessage) {
        try {
            const stream = await downloadContentFromMessage(content[`${mediaType}Message`], mediaType);
            const chunks = [];
            for await (const chunk of stream) chunks.push(chunk);
            const buffer = Buffer.concat(chunks);
            await sock.sendMessage(request.chatId, { [mediaType]: buffer, caption: text ? `🤖 Meta AI\n\n${text}` : '🤖 Meta AI' }, { quoted: request.quoted });
        } catch (error) {
            await sock.sendMessage(request.chatId, { text: `🤖 Meta AI respondió con multimedia, pero no pude reenviarlo: ${error.message}` }, { quoted: request.quoted });
        }
    }
    finish(request, { ok: true, text, media: Boolean(mediaType) });
    active = false;
    processQueue();
    return true;
}

// Keep the in-flight request accessible without exposing mutable queue state.
const originalProcessQueue = processQueue;
processQueue = async function wrappedQueue() {
    if (active || !pending.length) return;
    processQueue.current = pending[0];
    return originalProcessQueue();
};

module.exports = { ask, handleIncoming, targetJid, DEFAULT_META_AI_JID };
