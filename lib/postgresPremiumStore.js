const { Pool } = require('pg');

let pool = null;
let writeChain = Promise.resolve();
let appStateWriteChain = Promise.resolve();

function connectionString() {
    return process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
}

function enabled() {
    return Boolean(connectionString());
}

function createPool() {
    if (!enabled()) return null;
    const sslOverride = process.env.POSTGRES_SSL ?? process.env.SUPABASE_DB_SSL;
    const useSsl = sslOverride === 'true' || (sslOverride !== 'false' && Boolean(process.env.SUPABASE_DB_URL));
    return new Pool({
        connectionString: connectionString(),
        max: Number(process.env.SUPABASE_DB_POOL_MAX || 5),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        ssl: useSsl ? { rejectUnauthorized: false } : false
    });
}

async function init() {
    if (!enabled()) return false;
    if (pool) return true;
    pool = createPool();
    await pool.query(`
        CREATE TABLE IF NOT EXISTS jkbot_app_state (
            id SMALLINT PRIMARY KEY CHECK (id = 1),
            data JSONB NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS jkbot_premium_users (
            jid TEXT PRIMARY KEY,
            data JSONB NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS jkbot_premium_tokens (
            token_id TEXT PRIMARY KEY,
            data JSONB NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS jkbot_premium_users_updated_idx
            ON jkbot_premium_users (updated_at);
        CREATE INDEX IF NOT EXISTS jkbot_premium_tokens_updated_idx
            ON jkbot_premium_tokens (updated_at);
    `);
    return true;
}

async function loadAppState() {
    if (!pool) return { state: null, hasData: false };
    const result = await pool.query('SELECT data FROM jkbot_app_state WHERE id = 1');
    const state = result.rows[0]?.data;
    return {
        state: state && typeof state === 'object' && !Array.isArray(state) ? state : null,
        hasData: Boolean(state && typeof state === 'object' && !Array.isArray(state))
    };
}

async function replaceAppState(state) {
    if (!pool) return false;
    const snapshot = JSON.stringify(state || {});
    await pool.query(
        `INSERT INTO jkbot_app_state (id, data, updated_at)
         VALUES (1, $1::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [snapshot]
    );
    return true;
}

function scheduleAppStateSave(state) {
    if (!pool) return;
    let snapshot;
    try {
        // Freeze each queued write so later in-memory changes cannot alter an earlier save.
        snapshot = JSON.stringify(state || {});
    } catch (error) {
        console.error('[PostgreSQL] No se pudo serializar el estado de la aplicación:', error.message);
        return;
    }
    appStateWriteChain = appStateWriteChain
        .catch(() => {})
        .then(() => pool.query(
            `INSERT INTO jkbot_app_state (id, data, updated_at)
             VALUES (1, $1::jsonb, NOW())
             ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
            [snapshot]
        ))
        .catch(error => console.error('[PostgreSQL] No se pudo guardar el estado de la aplicación:', error.message));
}

async function loadPremium() {
    if (!pool) return { users: {}, tokens: {}, hasData: false };
    const [usersResult, tokensResult] = await Promise.all([
        pool.query('SELECT jid, data FROM jkbot_premium_users'),
        pool.query('SELECT token_id, data FROM jkbot_premium_tokens')
    ]);
    const users = Object.fromEntries(usersResult.rows.map(row => [row.jid, row.data]));
    const tokens = Object.fromEntries(tokensResult.rows.map(row => [row.token_id, row.data]));
    return {
        users,
        tokens,
        hasData: usersResult.rowCount > 0 || tokensResult.rowCount > 0
    };
}

async function replacePremium(users = {}, tokens = {}) {
    if (!pool) return false;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM jkbot_premium_users');
        await client.query('DELETE FROM jkbot_premium_tokens');
        for (const [jid, data] of Object.entries(users || {})) {
            await client.query(
                `INSERT INTO jkbot_premium_users (jid, data, updated_at)
                 VALUES ($1, $2::jsonb, NOW())
                 ON CONFLICT (jid) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
                [String(jid), JSON.stringify(data)]
            );
        }
        for (const [tokenId, data] of Object.entries(tokens || {})) {
            await client.query(
                `INSERT INTO jkbot_premium_tokens (token_id, data, updated_at)
                 VALUES ($1, $2::jsonb, NOW())
                 ON CONFLICT (token_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
                [String(tokenId), JSON.stringify(data)]
            );
        }
        await client.query('COMMIT');
        return true;
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
    } finally {
        client.release();
    }
}

function scheduleSave(users, tokens) {
    if (!pool) return;
    const userSnapshot = JSON.stringify(users || {});
    const tokenSnapshot = JSON.stringify(tokens || {});
    writeChain = writeChain
        .catch(() => {})
        .then(() => replacePremium(JSON.parse(userSnapshot), JSON.parse(tokenSnapshot)))
        .catch(error => console.error('[Supabase] No se pudo guardar Premium:', error.message));
}

async function flush() {
    await Promise.all([writeChain, appStateWriteChain]);
}

async function close() {
    if (pool) {
        await flush();
        await pool.end();
    }
    pool = null;
}

module.exports = {
    enabled,
    init,
    loadAppState,
    replaceAppState,
    scheduleAppStateSave,
    loadPremium,
    replacePremium,
    scheduleSave,
    flush,
    close
};
