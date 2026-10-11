'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createWarcraftRecovery, GENERIC_REQUEST_MESSAGE } = require('../lib/warcraftRecovery');

function fixture() {
  let time = 1_800_000_000_000;
  let code = '246810';
  let tokenCounter = 0;
  const recovery = createWarcraftRecovery({
    normalizePhone: value => String(value || '').replace(/\D/g, ''),
    now: () => time,
    randomCode: () => code,
    randomToken: () => `grant-${++tokenCounter}`
  });
  const root = { accounts: { aurora: { username: 'aurora', phone: '5351234567', passwordHash: 'old' } }, webSessions: { a: { username: 'aurora' }, b: { username: 'otro' } } };
  return { recovery, root, setTime(value) { time = value; }, setCode(value) { code = value; } };
}

test('la restauración entrega código al número registrado sin revelar si la cuenta existe y el código solo se usa una vez', async () => {
  const { recovery, root } = fixture();
  const deliveries = [];
  const missing = await recovery.request(root, 'no-existe', 'ip-1', async (...args) => deliveries.push(args));
  assert.equal(missing.ok, true);
  assert.equal(missing.message, GENERIC_REQUEST_MESSAGE);
  assert.equal(deliveries.length, 0);

  const requested = await recovery.request(root, 'aurora', 'ip-1', async (...args) => deliveries.push(args));
  assert.deepEqual(requested, { ok: true, message: GENERIC_REQUEST_MESSAGE });
  assert.deepEqual(deliveries, [['5351234567', '246810']]);

  const verified = recovery.verify(root, 'aurora', '246810');
  assert.equal(verified.ok, true);
  assert.ok(verified.recoveryToken);
  assert.equal(recovery.verify(root, 'aurora', '246810').ok, false, 'el mismo código no se puede canjear dos veces');

  const reset = recovery.reset(root, verified.recoveryToken, 'nueva-clave-segura', value => `hash:${value}`);
  assert.equal(reset.ok, true);
  assert.equal(root.accounts.aurora.passwordHash, 'hash:nueva-clave-segura');
  assert.deepEqual(root.webSessions, { b: { username: 'otro' } }, 'las sesiones abiertas de la cuenta se revocan');
  assert.equal(recovery.reset(root, verified.recoveryToken, 'otra-clave-segura', value => `hash:${value}`).ok, false);
});

test('la restauración limita intentos, bloquea contraseña débil y restringe los envíos por ventana', async () => {
  const { recovery, root, setCode } = fixture();
  let deliveries = 0;
  const send = async () => { deliveries++; };
  await recovery.request(root, 'aurora', 'ip-1', send);
  for (let attempt = 0; attempt < 5; attempt++) assert.equal(recovery.verify(root, 'aurora', '000000').ok, false);
  assert.equal(recovery.verify(root, 'aurora', '246810').ok, false, 'se cierra tras cinco intentos erróneos');

  setCode('135790');
  await recovery.request(root, 'aurora', 'ip-1', send);
  const result = recovery.verify(root, 'aurora', '135790');
  assert.equal(result.ok, true);
  assert.equal(recovery.reset(root, result.recoveryToken, '1234', value => value).ok, false);

  await recovery.request(root, 'aurora', 'ip-1', send);
  await recovery.request(root, 'aurora', 'ip-1', send);
  await recovery.request(root, 'aurora', 'ip-1', send);
  assert.equal(deliveries, 3, 'no excede tres envíos al mismo número en quince minutos');
});

test('un código caducado no autoriza a cambiar la contraseña', async () => {
  const { recovery, root, setTime } = fixture();
  await recovery.request(root, '5351234567', 'ip-1', async () => {});
  setTime(1_800_000_000_000 + 10 * 60 * 1000 + 1);
  assert.equal(recovery.verify(root, '5351234567', '246810').ok, false);
});

test('si WhatsApp no entrega el código, la cuenta no obtiene autorización de recuperación', async () => {
  const { recovery, root } = fixture();
  const result = await recovery.request(root, 'aurora', 'ip-1', async () => { throw new Error('offline'); });
  assert.equal(result.message, GENERIC_REQUEST_MESSAGE);
  assert.equal(recovery.verify(root, 'aurora', '246810').ok, false);
});

test('las rutas HTTP conectan el código con WhatsApp y persisten la contraseña nueva', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
  assert.match(source, /app\.post\('\/api\/warcraft\/recovery\/request-code'/);
  assert.match(source, /warcraftSessionForPhone\(phone\)/);
  assert.match(source, /session\.sock\.sendMessage\(`\$\{phone\}@s\.whatsapp\.net`/);
  assert.match(source, /app\.post\('\/api\/warcraft\/recovery\/verify-code'/);
  assert.match(source, /app\.post\('\/api\/warcraft\/recovery\/reset-password'/);
  assert.match(source, /warcraftRecovery\.reset\(root, req\.body\?\.recoveryToken, req\.body\?\.password, hashWarcraftPassword\)/);
});
