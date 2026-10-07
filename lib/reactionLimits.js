'use strict';

const crypto = require('node:crypto');

const DEFAULT_DAILY_LIMIT = 1;
const TOKEN_DAILY_LIMIT = 10;
const TOKEN_PREFIX = 'JKREACTION-';

function ensureReactionState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) throw new TypeError('Se requiere el estado persistente de JK Bot.');
  if (!state.reactionTokens || typeof state.reactionTokens !== 'object' || Array.isArray(state.reactionTokens)) state.reactionTokens = {};
  if (!state.reactionUsage || typeof state.reactionUsage !== 'object' || Array.isArray(state.reactionUsage)) state.reactionUsage = {};
  return state;
}

function normalizeReactionToken(value) {
  return String(value || '').trim().replace(/\s+/g, '').toUpperCase();
}

function hashReactionToken(value) {
  return crypto.createHash('sha256').update(normalizeReactionToken(value)).digest('hex');
}

function utcDay(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10);
}

function normalizedUsername(value) {
  return String(value || '').trim().toLowerCase();
}

function activeTokenForUser(state, username) {
  const normalized = normalizedUsername(username);
  if (!normalized) return null;
  return Object.entries(state.reactionTokens).find(([, token]) => token && token.enabled !== false && normalizedUsername(token.claimedBy) === normalized) || null;
}

function getReactionQuota(state, username, now = Date.now()) {
  ensureReactionState(state);
  const account = normalizedUsername(username);
  const day = utcDay(now);
  const usage = account ? state.reactionUsage[account] : null;
  const used = usage?.day === day ? Math.max(0, Number(usage.count) || 0) : 0;
  const hasToken = Boolean(activeTokenForUser(state, account));
  const limit = hasToken ? TOKEN_DAILY_LIMIT : DEFAULT_DAILY_LIMIT;
  return { day, used, limit, remaining: Math.max(0, limit - used), hasToken };
}

function createReactionToken(state, now = Date.now()) {
  ensureReactionState(state);
  const token = `${TOKEN_PREFIX}${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
  const id = hashReactionToken(token);
  state.reactionTokens[id] = {
    value: token,
    preview: `${token.slice(0, 15)}…`,
    createdAt: new Date(now).toISOString(),
    claimedBy: null,
    claimedAt: null,
    enabled: true
  };
  return { id, token, createdAt: state.reactionTokens[id].createdAt };
}

function claimReactionToken(state, username, value, now = Date.now()) {
  ensureReactionState(state);
  const account = normalizedUsername(username);
  if (!account) throw Object.assign(new Error('Inicia sesión para activar el token.'), { code: 'LOGIN_REQUIRED', status: 401 });
  const normalized = normalizeReactionToken(value);
  if (!new RegExp(`^${TOKEN_PREFIX}[A-F0-9]{16}$`).test(normalized)) {
    throw Object.assign(new Error('El token de reacción no tiene un formato válido.'), { code: 'INVALID_TOKEN', status: 400 });
  }
  const id = hashReactionToken(normalized);
  const entry = state.reactionTokens[id];
  if (!entry || entry.enabled === false) {
    throw Object.assign(new Error('El token no existe o fue desactivado.'), { code: 'TOKEN_NOT_FOUND', status: 404 });
  }
  const previous = activeTokenForUser(state, account);
  if (previous && previous[0] !== id) {
    throw Object.assign(new Error('Esta cuenta ya tiene un token de reacción activo.'), { code: 'TOKEN_ALREADY_ACTIVE', status: 409 });
  }
  if (entry.claimedBy && normalizedUsername(entry.claimedBy) !== account) {
    throw Object.assign(new Error('Este token ya fue canjeado por otra cuenta.'), { code: 'TOKEN_ALREADY_CLAIMED', status: 409 });
  }
  const alreadyClaimed = normalizedUsername(entry.claimedBy) === account;
  entry.claimedBy = account;
  entry.claimedAt ||= new Date(now).toISOString();
  return { alreadyClaimed, quota: getReactionQuota(state, account, now) };
}

function reserveReactionUse(state, username, now = Date.now()) {
  ensureReactionState(state);
  const account = normalizedUsername(username);
  if (!account) throw Object.assign(new Error('Inicia sesión para reaccionar.'), { code: 'LOGIN_REQUIRED', status: 401 });
  const quota = getReactionQuota(state, account, now);
  if (quota.remaining <= 0) {
    throw Object.assign(new Error(`Ya usaste tus ${quota.limit} reacciones de hoy. El cupo se renueva mañana (UTC).`), {
      code: 'DAILY_LIMIT', status: 429, quota
    });
  }
  const count = quota.used + 1;
  state.reactionUsage[account] = { day: quota.day, count };
  return { day: quota.day, count, limit: quota.limit, hasToken: quota.hasToken };
}

function rollbackReactionUse(state, username, reservation) {
  ensureReactionState(state);
  const account = normalizedUsername(username);
  const current = state.reactionUsage[account];
  if (!current || current.day !== reservation?.day || Number(current.count) <= 0) return false;
  current.count = Math.max(0, Number(current.count) - 1);
  if (!current.count) delete state.reactionUsage[account];
  return true;
}

function reactionTokenSnapshot(state) {
  ensureReactionState(state);
  return Object.entries(state.reactionTokens).map(([id, token]) => ({
    id,
    value: token.value || null,
    preview: token.preview || null,
    createdAt: token.createdAt || null,
    claimedBy: token.claimedBy || null,
    claimedAt: token.claimedAt || null,
    active: token.enabled !== false
  })).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

module.exports = {
  DEFAULT_DAILY_LIMIT,
  TOKEN_DAILY_LIMIT,
  ensureReactionState,
  normalizeReactionToken,
  hashReactionToken,
  getReactionQuota,
  createReactionToken,
  claimReactionToken,
  reserveReactionUse,
  rollbackReactionUse,
  reactionTokenSnapshot
};
