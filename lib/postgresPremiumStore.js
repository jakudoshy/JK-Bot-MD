const { Pool } = require('pg');

let pool = null;
let writeChain = Promise.resolve();

function connectionString() {
    return process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
}

function enabled() {
    return Boolean(connectionString());
}

function createPool() {
    if (!enabled()) return null;
    return new Pool({
        connectionString: connectionString(),
        max: Number(process.env.SUPABASE_DB_POOL_MAX || 5),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        ssl: process.env.SUPABASE_DB_SSL === 'false' ? false : { rejectUnauthorized: false }
    });
}

async function init() {
    if (!enabled()) return false;
    if (pool) return true;
    pool = createPool();
    await pool.query(`
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
    writeChain = writeChain
        .catch(() => {})
        .then(() => replacePremium(users, tokens))
        .catch(error => console.error('[Supabase] No se pudo guardar Premium:', error.message));
}

async function close() {
    if (pool) await pool.end();
    pool = null;
}

module.exports = { enabled, init, loadPremium, replacePremium, scheduleSave, close };
