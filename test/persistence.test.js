const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

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
