const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { createTelegramBackupStore, normalizeTelegramChatId, MARKER } = require('../lib/telegramBackupStore');

let appState = null;
let poolOptions = null;
const originalLoad = Module._load;
class MockPool {
    constructor(options) { poolOptions = options; }
    async query(sql, params = []) {
        if (sql.includes('SELECT data FROM jkbot_app_state')) {
            return { rows: appState ? [{ data: appState }] : [], rowCount: appState ? 1 : 0 };
        }
        if (sql.includes('INSERT INTO jkbot_app_state')) {
            appState = JSON.parse(params[0]);
            return { rows: [], rowCount: 1 };
        }
        if (sql.includes('SELECT jid, data FROM jkbot_premium_users')) return { rows: [], rowCount: 0 };
        if (sql.includes('SELECT token_id, data FROM jkbot_premium_tokens')) return { rows: [], rowCount: 0 };
        return { rows: [], rowCount: 0 };
    }
    async end() {}
}

process.env.DATABASE_URL = 'postgres://test.invalid/jkbot';
Module._load = function(request, parent, isMain) {
    if (request === 'pg') return { Pool: MockPool };
    return originalLoad.call(this, request, parent, isMain);
};
const store = require('../lib/postgresPremiumStore');
Module._load = originalLoad;

test('PostgreSQL conserva y restaura el estado completo y las escrituras en cola', async () => {
    appState = null;
    await store.init();
    assert.equal(poolOptions.ssl, false, 'Railway DATABASE_URL no debe forzar TLS por defecto');
    assert.deepEqual(await store.loadAppState(), { state: null, hasData: false });

    const initial = { adminSettings: { theme: 'red' }, premiumTokens: { tokenA: { uses: 1 } } };
    await store.replaceAppState(initial);
    assert.deepEqual(await store.loadAppState(), { state: initial, hasData: true });

    const changing = { adminSettings: { theme: 'red' }, version: 1 };
    store.scheduleAppStateSave(changing);
    changing.version = 2;
    store.scheduleAppStateSave(changing);
    await store.flush();
    assert.equal((await store.loadAppState()).state.version, 2);

    await store.close();
});

test('el backup cifrado no puede apuntar al repositorio de código JK-Bot-MD', () => {
    process.env.GITHUB_BACKUP_TOKEN = 'test-token';
    process.env.GITHUB_BACKUP_REPO = 'Jakudoshy/jk-bot-md.git';
    process.env.BACKUP_ENCRYPTION_KEY = 'test-encryption-key';
    const backup = require('../lib/githubBackup');
    assert.equal(backup.targetsCodeRepository(), true);
    assert.equal(backup.enabled(), false);
});

test('Telegram guarda cifrado el estado completo, fija la copia y la restaura sin leer historial', async () => {
    const token = 'test-telegram-token';
    const files = new Map();
    const messages = new Map();
    const pinnedIds = new Set();
    let pinnedMessage = null;
    let nextMessageId = 1;
    const api = {
        async getChat() { return { type: 'channel', message_auto_delete_time: 0, pinned_message: pinnedMessage }; },
        async sendDocument(buffer, filename, caption) {
            const id = nextMessageId++;
            files.set(String(id), Buffer.from(buffer));
            messages.set(id, { message_id: id, caption, document: { file_id: String(id) } });
            return { message_id: id, filename, caption };
        },
        async pinMessage(messageId) {
            pinnedIds.add(messageId);
            pinnedMessage = messages.get(messageId);
            return true;
        },
        async editDocument(messageId, buffer, caption) {
            files.set(String(messageId), Buffer.from(buffer));
            const message = messages.get(messageId);
            message.caption = caption;
            return message;
        },
        async unpinMessage(messageId) { pinnedIds.delete(messageId); return true; },
        async downloadFile(fileId) { return files.get(String(fileId)); }
    };
    const logs = { log() {}, warn() {}, error(message) { throw new Error(message); } };
    const store = createTelegramBackupStore({ token, chatId: '-100123', api, logger: logs, debounceMs: 0, minIntervalMs: 0 });
    const state = { users: { userA: { progress: 42 } }, tokens: { secret: 'value' } };

    store.scheduleSave(state, { immediate: true });
    await store.flush();
    const uploaded = files.get(String(pinnedMessage.message_id));
    assert.ok(pinnedMessage.caption.startsWith(MARKER));
    assert.equal(uploaded.includes(Buffer.from('secret')), false, 'el archivo almacenado no debe exponer el JSON en texto plano');
    let latestState = state;
    for (let version = 2; version <= 3; version++) {
        latestState = { ...state, version };
        store.scheduleSave(latestState, { immediate: true });
        await store.flush();
    }
    assert.deepEqual([...pinnedIds].sort(), [1, 2], 'debe conservar fijada la copia anterior y actualizar la actual en el lugar');
    assert.equal(files.size, 2, 'no debe crear un mensaje por cada guardado');
    assert.deepEqual(await store.restore(), { hasData: true, state: latestState, messageId: pinnedMessage.message_id });
});

test('Telegram rechaza canales configurados con borrado automático', async () => {
    const api = {
        async getChat() { return { type: 'channel', message_auto_delete_time: 86400 }; },
        async sendDocument() { throw new Error('no debe enviar'); },
        async pinMessage() {},
        async unpinMessage() {},
        async downloadFile() { throw new Error('no debe descargar'); }
    };
    const store = createTelegramBackupStore({ token: 'test-token', chatId: '-100456', api, logger: { log() {}, warn() {}, error() {} }, debounceMs: 0, minIntervalMs: 0 });
    await assert.rejects(store.restore(), /borrado automático/);
});

test('Telegram convierte enlaces de mensaje en chat_id y explica que el enlace de invitación no sirve', () => {
    assert.equal(normalizeTelegramChatId('https://t.me/c/1234567890/55'), '-1001234567890');
    assert.equal(normalizeTelegramChatId('t.me/c/1234567890/55?single'), '-1001234567890');
    assert.equal(normalizeTelegramChatId('https://t.me/my_public_channel/55'), '@my_public_channel');
    assert.equal(normalizeTelegramChatId('-1001234567890'), '-1001234567890');
    assert.throws(() => normalizeTelegramChatId('https://t.me/+inviteHash'), /enlace de invitación/);
});
