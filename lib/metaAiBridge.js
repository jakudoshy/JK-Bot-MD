const DEFAULT_META_AI_JID = '867051314767696@bot';
const DEFAULT_BRIDGE_URL = 'http://127.0.0.1:8788';
const TIMEOUT_MS = Math.max(15000, Number(process.env.META_AI_TIMEOUT_MS) || 120000);

function targetJid() {
    return String(process.env.META_AI_JID || DEFAULT_META_AI_JID).trim();
}

function bridgeUrl() {
    return String(process.env.META_AI_BRIDGE_URL || DEFAULT_BRIDGE_URL).replace(/\/$/, '');
}

async function ask(_sock, prompt) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const response = await fetch(`${bridgeUrl()}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                model: 'meta-ai',
                stream: false,
                messages: [{ role: 'user', content: String(prompt) }]
            }),
            signal: controller.signal
        });
        const raw = await response.text();
        let data;
        try { data = JSON.parse(raw); } catch { data = {}; }
        if (!response.ok) return { ok: false, error: data?.error?.message || raw || `HTTP ${response.status}` };
        const text = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || '';
        if (!String(text).trim()) return { ok: false, error: 'El puente Whatsmeow no recibió texto de Meta AI.' };
        return { ok: true, text: String(text).trim(), media: false };
    } catch (error) {
        const reason = error.name === 'AbortError'
            ? 'Meta AI tardó demasiado en responder.'
            : `No se pudo conectar con el puente Whatsmeow: ${error.message}`;
        return { ok: false, error: reason };
    } finally {
        clearTimeout(timer);
    }
}

// Kept as a no-op compatibility hook: responses now arrive through the HTTP bridge,
// not through the Baileys event stream.
async function handleIncoming() { return false; }

module.exports = { ask, handleIncoming, targetJid, bridgeUrl, DEFAULT_META_AI_JID };
