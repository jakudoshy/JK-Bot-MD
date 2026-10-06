const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');
const zlib = require('zlib');

const MARKER = 'JK-BOT-MD-STATE:v1:';
const MAGIC = Buffer.from('JKTBOT01');
const MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024;
// Keep below Telegram's Bot API download limit so every uploaded snapshot can be restored.
const MAX_SNAPSHOT_BYTES = 19 * 1024 * 1024;

function normalizeTelegramChatId(value) {
    const input = String(value || '').trim();
    if (!input) return '';
    if (/^-?\d+$/.test(input) || /^@[A-Za-z0-9_]+$/.test(input)) return input;

    let match = input.match(/^(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me)\/c\/(\d+)(?:\/\d+)?\/?(?:[?#].*)?$/i);
    if (match) return `-100${match[1]}`;

    if (/^(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me)\/(?:\+[A-Za-z0-9_-]+|joinchat\/[A-Za-z0-9_-]+)\/?(?:[?#].*)?$/i.test(input)) {
        throw new Error('El enlace de invitación no contiene el ID del canal. Usa el enlace de un mensaje (t.me/c/...) o el ID numérico.');
    }

    match = input.match(/^(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me)\/([A-Za-z0-9_]+)(?:\/\d+)?\/?(?:[?#].*)?$/i);
    if (match && match[1].toLowerCase() !== 'c' && match[1].toLowerCase() !== 'joinchat') return `@${match[1]}`;

    throw new Error('TELEGRAM_BACKUP_CHAT_ID debe ser un ID numérico, @usuario público o enlace de mensaje t.me/c/<id>/<mensaje>.');
}

function createApi(token, chatId) {
    const apiUrl = `https://api.telegram.org/bot${token}`;
    async function call(method, body) {
        const response = await axios.post(`${apiUrl}/${method}`, body, { timeout: 30000 });
        if (!response.data?.ok) throw new Error(response.data?.description || `Telegram API ${method} falló`);
        return response.data.result;
    }
    return {
        getChat: () => call('getChat', { chat_id: chatId }),
        sendDocument: async (buffer, filename, caption) => {
            const form = new FormData();
            form.append('chat_id', String(chatId));
            form.append('document', buffer, { filename, contentType: 'application/octet-stream' });
            form.append('caption', caption);
            form.append('disable_notification', 'true');
            const response = await axios.post(`${apiUrl}/sendDocument`, form, {
                headers: form.getHeaders(),
                maxBodyLength: MAX_SNAPSHOT_BYTES + 128 * 1024,
                timeout: 60000
            });
            if (!response.data?.ok) throw new Error(response.data?.description || 'Telegram no aceptó la copia');
            return response.data.result;
        },
        editDocument: async (messageId, buffer, caption) => {
            const form = new FormData();
            form.append('chat_id', String(chatId));
            form.append('message_id', String(messageId));
            form.append('media', JSON.stringify({ type: 'document', media: 'attach://document', caption }));
            form.append('document', buffer, { filename: 'jkbot-state.enc', contentType: 'application/octet-stream' });
            const response = await axios.post(`${apiUrl}/editMessageMedia`, form, {
                headers: form.getHeaders(),
                maxBodyLength: MAX_SNAPSHOT_BYTES + 128 * 1024,
                timeout: 60000
            });
            if (!response.data?.ok) throw new Error(response.data?.description || 'Telegram no pudo actualizar la copia fijada');
            return response.data.result;
        },
        pinMessage: (messageId) => call('pinChatMessage', {
            chat_id: chatId,
            message_id: messageId,
            disable_notification: true
        }),
        unpinMessage: (messageId) => call('unpinChatMessage', {
            chat_id: chatId,
            message_id: messageId
        }),
        downloadFile: async (fileId) => {
            const file = await call('getFile', { file_id: fileId });
            if (!file?.file_path) throw new Error('Telegram no devolvió la ruta de la copia');
            if (Number(file.file_size || 0) > MAX_DOWNLOAD_BYTES) {
                throw new Error('La copia supera el límite de descarga de la Bot API de Telegram');
            }
            const response = await axios.get(`${apiUrl.replace('api.telegram.org', 'api.telegram.org/file')}/${file.file_path}`, {
                responseType: 'arraybuffer',
                timeout: 60000,
                maxContentLength: MAX_DOWNLOAD_BYTES
            });
            return Buffer.from(response.data);
        }
    };
}

function deriveKey(token) {
    return crypto.createHash('sha256').update('JK-Bot-MD Telegram backup v1\0').update(token).digest();
}

function encryptSnapshot(snapshot, token) {
    const compressed = zlib.gzipSync(Buffer.from(JSON.stringify(snapshot), 'utf8'));
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(token), iv);
    const ciphertext = Buffer.concat([cipher.update(compressed), cipher.final()]);
    const encrypted = Buffer.concat([MAGIC, iv, cipher.getAuthTag(), ciphertext]);
    if (encrypted.length > MAX_SNAPSHOT_BYTES) {
        throw new Error(`La copia comprimida supera el límite seguro de Telegram (${MAX_SNAPSHOT_BYTES} bytes)`);
    }
    return encrypted;
}

function decryptSnapshot(encrypted, token) {
    if (!Buffer.isBuffer(encrypted)) encrypted = Buffer.from(encrypted);
    if (encrypted.length < MAGIC.length + 12 + 16 + 1 || !encrypted.subarray(0, MAGIC.length).equals(MAGIC)) {
        throw new Error('La copia fijada no tiene un formato JK-Bot-MD válido');
    }
    const ivStart = MAGIC.length;
    const tagStart = ivStart + 12;
    const bodyStart = tagStart + 16;
    const decipher = crypto.createDecipheriv('aes-256-gcm', deriveKey(token), encrypted.subarray(ivStart, tagStart));
    decipher.setAuthTag(encrypted.subarray(tagStart, bodyStart));
    const compressed = Buffer.concat([decipher.update(encrypted.subarray(bodyStart)), decipher.final()]);
    const state = JSON.parse(zlib.gunzipSync(compressed).toString('utf8'));
    if (!state || typeof state !== 'object' || Array.isArray(state)) throw new Error('La copia no contiene un estado de aplicación válido');
    return state;
}

function createTelegramBackupStore({ token, chatId, api, logger = console, debounceMs = 2000, minIntervalMs = 10000 } = {}) {
    const botToken = String(token || '').trim();
    const targetChat = normalizeTelegramChatId(chatId);
    const telegramApi = api || (botToken && targetChat ? createApi(botToken, targetChat) : null);
    let pendingSnapshot = null;
    let timer = null;
    let queue = Promise.resolve();
    let lastSentAt = 0;
    let lastError = null;

    function enabled() {
        return Boolean(botToken && targetChat && telegramApi);
    }

    async function uploadSnapshot(json) {
        const state = JSON.parse(json);
        const buffer = encryptSnapshot(state, botToken);
        const before = await telegramApi.getChat();
        if (Number(before.message_auto_delete_time || 0) > 0) {
            throw new Error('El canal de respaldo tiene borrado automático; desactívalo antes de guardar copias');
        }
        const previous = before.pinned_message;
        const previousIsBackup = Boolean(previous?.caption?.startsWith(MARKER) && previous.document?.file_id);
        const captionPrefix = `${MARKER}${new Date().toISOString()}`;
        const roleMatch = previous?.caption?.match(/\|role=(current|previous)\|prev=(\d+)$/);
        const previousId = previousIsBackup ? Number(previous.message_id) : 0;
        if (previousIsBackup && roleMatch?.[1] === 'current' && Number(roleMatch[2]) > 0) {
            await telegramApi.editDocument(previousId, buffer, `${captionPrefix}|role=current|prev=${Number(roleMatch[2])}`);
        } else {
            const fallbackId = previousIsBackup ? previousId : 0;
            const sent = await telegramApi.sendDocument(buffer, 'jkbot-state.enc', `${captionPrefix}|role=current|prev=${fallbackId}`);
            if (!sent?.message_id) throw new Error('Telegram no devolvió el ID del documento de respaldo');
            await telegramApi.pinMessage(sent.message_id);
        }
        lastSentAt = Date.now();
        logger.log('[Telegram backup] Estado de la web guardado y copia más reciente fijada.');
    }

    function dispatchPending() {
        if (pendingSnapshot === null) return queue;
        const snapshot = pendingSnapshot;
        pendingSnapshot = null;
        queue = queue.then(async () => {
            await uploadSnapshot(snapshot);
            lastError = null;
        }).catch(error => {
            lastError = error;
            if (pendingSnapshot === null) pendingSnapshot = snapshot;
            logger.error(`[Telegram backup] No se pudo guardar la copia: ${error.message}`);
        });
        return queue;
    }

    function scheduleSave(state, { immediate = false } = {}) {
        if (!enabled()) return;
        pendingSnapshot = JSON.stringify(state);
        if (timer) clearTimeout(timer);
        timer = null;
        if (immediate) {
            dispatchPending();
            return;
        }
        const waitForRateLimit = Math.max(0, minIntervalMs - (Date.now() - lastSentAt));
        timer = setTimeout(() => {
            timer = null;
            dispatchPending();
        }, Math.max(debounceMs, waitForRateLimit));
        timer.unref?.();
    }

    async function flush() {
        if (timer) clearTimeout(timer);
        timer = null;
        dispatchPending();
        await queue;
        if (lastError) {
            const error = lastError;
            lastError = null;
            throw error;
        }
    }

    async function restore() {
        if (!enabled()) return { hasData: false, state: null };
        const chat = await telegramApi.getChat();
        if (Number(chat.message_auto_delete_time || 0) > 0) {
            throw new Error('El canal de respaldo tiene borrado automático; desactívalo antes de restaurar');
        }
        const pinned = chat.pinned_message;
        if (!pinned?.caption?.startsWith(MARKER) || !pinned.document?.file_id) {
            return { hasData: false, state: null };
        }
        const file = await telegramApi.downloadFile(pinned.document.file_id);
        return { hasData: true, state: decryptSnapshot(file, botToken), messageId: pinned.message_id };
    }

    return { enabled, scheduleSave, flush, restore };
}

module.exports = {
    createTelegramBackupStore,
    normalizeTelegramChatId,
    encryptSnapshot,
    decryptSnapshot,
    MARKER,
    MAX_SNAPSHOT_BYTES,
    MAX_DOWNLOAD_BYTES
};
