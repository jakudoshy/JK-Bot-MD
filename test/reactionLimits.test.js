'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const limits = require('../lib/reactionLimits');

function state() { return { reactionTokens: {}, reactionUsage: {} }; }

 test('el cupo base es una reacción al día y el contador se reinicia al cambiar el día UTC', () => {
  const data = state();
  assert.deepEqual(limits.getReactionQuota(data, 'Jugador', Date.parse('2026-10-07T23:59:00Z')), {
    day: '2026-10-07', used: 0, limit: 1, remaining: 1, hasToken: false
  });
  data.reactionUsage.jugador = { day: '2026-10-07', count: 1 };
  assert.equal(limits.getReactionQuota(data, 'jugador', Date.parse('2026-10-07T23:59:00Z')).remaining, 0);
  assert.equal(limits.getReactionQuota(data, 'jugador', Date.parse('2026-10-08T00:01:00Z')).remaining, 1);
});

test('el administrador genera tokens persistentes, canjeables una vez y con cupo diario de diez', () => {
  const data = state();
  const generated = limits.createReactionToken(data, Date.parse('2026-10-07T12:00:00Z'));
  assert.match(generated.token, /^JKREACTION-[A-F0-9]{16}$/);
  assert.equal(limits.reactionTokenSnapshot(data)[0].value, generated.token);
  const result = limits.claimReactionToken(data, 'Jugador', generated.token.toLowerCase(), Date.parse('2026-10-07T12:01:00Z'));
  assert.equal(result.alreadyClaimed, false);
  assert.deepEqual(result.quota, { day: '2026-10-07', used: 0, limit: 10, remaining: 10, hasToken: true });
  assert.equal(limits.claimReactionToken(data, 'jugador', generated.token, Date.parse('2026-10-07T12:02:00Z')).alreadyClaimed, true);
  assert.throws(() => limits.claimReactionToken(data, 'otra_cuenta', generated.token), /ya fue canjeado/i);
});

test('el cupo reserva y revierte usos; no permite superar diez en el día', () => {
  const data = state();
  const created = limits.createReactionToken(data);
  limits.claimReactionToken(data, 'jugador', created.token);
  let reservation;
  for (let i = 0; i < 10; i++) reservation = limits.reserveReactionUse(data, 'jugador', Date.parse('2026-10-07T12:00:00Z'));
  assert.equal(limits.getReactionQuota(data, 'jugador', Date.parse('2026-10-07T12:00:00Z')).remaining, 0);
  assert.throws(() => limits.reserveReactionUse(data, 'jugador', Date.parse('2026-10-07T12:00:00Z')), error => error.status === 429 && error.quota.limit === 10);
  assert.equal(limits.rollbackReactionUse(data, 'jugador', reservation), true);
  assert.equal(limits.getReactionQuota(data, 'jugador', Date.parse('2026-10-07T12:00:00Z')).remaining, 1);
});

test('un token mal formado o eliminado no concede cupo ampliado', () => {
  const data = state();
  assert.throws(() => limits.claimReactionToken(data, 'jugador', 'no-es-token'), /formato válido/i);
  const created = limits.createReactionToken(data);
  delete data.reactionTokens[created.id];
  assert.throws(() => limits.claimReactionToken(data, 'jugador', created.token), /no existe/i);
});

test('revierte correctamente dos reservas que fallan en orden inverso', () => {
  const data = state();
  const now = Date.parse('2026-10-07T12:00:00Z');
  const token = limits.createReactionToken(data, now);
  limits.claimReactionToken(data, 'jugador', token.token, now);
  const first = limits.reserveReactionUse(data, 'jugador', now);
  const second = limits.reserveReactionUse(data, 'jugador', now);
  assert.equal(limits.rollbackReactionUse(data, 'jugador', first), true);
  assert.equal(limits.rollbackReactionUse(data, 'jugador', second), true);
  assert.equal(limits.getReactionQuota(data, 'jugador', now).used, 0);
});
