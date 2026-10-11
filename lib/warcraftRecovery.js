'use strict';

const crypto = require('node:crypto');

const REQUEST_WINDOW_MS = 15 * 60 * 1000;
const CODE_TTL_MS = 10 * 60 * 1000;
const GRANT_TTL_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 3;
const MAX_CODE_ATTEMPTS = 5;
const GENERIC_REQUEST_MESSAGE = 'Si los datos coinciden con una cuenta y el número está disponible, enviaremos el código al WhatsApp vinculado.';

function createWarcraftRecovery({ normalizePhone, now = Date.now, randomCode = () => String(crypto.randomInt(100000, 1000000)), randomToken = () => crypto.randomBytes(32).toString('hex') } = {}) {
  if (typeof normalizePhone !== 'function') throw new TypeError('normalizePhone es obligatorio');

  const pendingCodes = new Map();
  const recoveryGrants = new Map();
  const requestWindows = new Map();
  const codePepper = crypto.randomBytes(32);

  function resolveAccount(root, identifier) {
    const raw = String(identifier || '').trim();
    if (!raw || !root?.accounts) return null;
    const username = raw.toLowerCase();
    if (root.accounts[username]) return root.accounts[username];
    const phone = normalizePhone(raw);
    if (!/^\d{8,15}$/.test(phone)) return null;
    return Object.values(root.accounts).find(account => normalizePhone(account?.phone) === phone) || null;
  }

  function allowRequest(key) {
    const timestamp = now();
    const recent = (requestWindows.get(key) || []).filter(value => timestamp - value < REQUEST_WINDOW_MS);
    if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
      requestWindows.set(key, recent);
      return false;
    }
    recent.push(timestamp);
    requestWindows.set(key, recent);
    return true;
  }

  function digestCode(code) {
    return crypto.createHmac('sha256', codePepper).update(String(code)).digest();
  }

  async function request(root, identifier, _ipAddress, deliver) {
    const account = resolveAccount(root, identifier);
    const phone = account ? normalizePhone(account.phone) : '';
    const allowedByPhone = phone ? allowRequest(`phone:${phone}`) : true;
    if (!account || !/^\d{8,15}$/.test(phone) || !allowedByPhone || typeof deliver !== 'function') {
      return { ok: true, message: GENERIC_REQUEST_MESSAGE };
    }

    const code = String(randomCode());
    if (!/^\d{6}$/.test(code)) throw new Error('El generador de códigos debe producir seis dígitos.');
    try {
      await deliver(phone, code);
    } catch {
      return { ok: true, message: GENERIC_REQUEST_MESSAGE };
    }

    pendingCodes.set(phone, { username: account.username, digest: digestCode(code), expiresAt: now() + CODE_TTL_MS, attempts: 0 });
    return { ok: true, message: GENERIC_REQUEST_MESSAGE };
  }

  function verify(root, identifier, code) {
    const account = resolveAccount(root, identifier);
    const phone = account ? normalizePhone(account.phone) : '';
    const pending = phone && pendingCodes.get(phone);
    if (!account || !pending || pending.username !== account.username || pending.expiresAt <= now()) {
      if (phone) pendingCodes.delete(phone);
      return { ok: false, message: 'Código incorrecto o caducado. Solicita otro.' };
    }

    if (!matchingCodeFromDigest(pending.digest, code)) {
      pending.attempts++;
      if (pending.attempts >= MAX_CODE_ATTEMPTS) pendingCodes.delete(phone);
      return { ok: false, message: 'Código incorrecto o caducado. Solicita otro.' };
    }

    pendingCodes.delete(phone);
    const recoveryToken = String(randomToken());
    recoveryGrants.set(recoveryToken, { username: account.username, phone, expiresAt: now() + GRANT_TTL_MS });
    return { ok: true, recoveryToken, message: 'Código verificado. Ya puedes elegir una contraseña nueva.' };
  }

  function matchingCodeFromDigest(expected, submitted) {
    if (!/^\d{6}$/.test(String(submitted || ''))) return false;
    const actual = digestCode(submitted);
    return Buffer.isBuffer(expected) && expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  }

  function reset(root, recoveryToken, newPassword, hashPassword) {
    const grant = recoveryGrants.get(String(recoveryToken || ''));
    if (!grant || grant.expiresAt <= now()) {
      if (recoveryToken) recoveryGrants.delete(String(recoveryToken));
      return { ok: false, message: 'La autorización caducó. Solicita un nuevo código.' };
    }
    const password = String(newPassword || '');
    if (password.length < 8 || password.length > 128) return { ok: false, message: 'La contraseña debe tener entre 8 y 128 caracteres.' };
    const account = root?.accounts?.[grant.username];
    if (!account || normalizePhone(account.phone) !== grant.phone) {
      recoveryGrants.delete(String(recoveryToken));
      return { ok: false, message: 'La cuenta ya no está disponible. Solicita un nuevo código.' };
    }
    account.passwordHash = hashPassword(password);
    for (const [token, session] of Object.entries(root.webSessions || {})) {
      if (session?.username === account.username) delete root.webSessions[token];
    }
    recoveryGrants.delete(String(recoveryToken));
    return { ok: true, username: account.username, message: 'Contraseña actualizada. Inicia sesión con la nueva contraseña.' };
  }

  return { request, verify, reset };
}

module.exports = { createWarcraftRecovery, GENERIC_REQUEST_MESSAGE, REQUEST_WINDOW_MS, CODE_TTL_MS, MAX_CODE_ATTEMPTS, MAX_REQUESTS_PER_WINDOW };
