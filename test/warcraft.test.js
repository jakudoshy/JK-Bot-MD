'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const game = require('../lib/warcraft');
const { canonicalCommand, spanishCommand } = require('../lib/spanishCommands');

function playerAtLevel(level = 1) {
  const data = { warcraft: { players: {}, accounts: {}, trades: {}, guilds: {}, sessions: {}, combat: {}, duels: {}, duelRequests: {}, pendingPurchases: {}, parties: {}, auctions: {}, mail: {}, battlegrounds: {}, world: {} } };
  const player = game.createPlayer(data, '5350000000@s.whatsapp.net', 'Tester', 'warrior').player;
  player.level = level;
  player.gold = 100000;
  game.recalc(player);
  return { data, player };
}

test('acepta clases con sus nombres en español', () => {
  const data = {} ;
  const result = game.createPlayer(data, '15550001234@s.whatsapp.net', 'Espartaco', 'guerrero');
  assert.equal(result.player.classKey, 'warrior');
});

test('encuentra el personaje usando la sesión de WhatsApp aunque difiera el teléfono de la cuenta', () => {
  const data = {};
  const player = game.createPlayer(data, '5350000099@s.whatsapp.net', 'Nara', 'mago').player;
  const root = game.ensureRoot(data);
  root.sessions['5350000099'] = 'nara';
  const account = { username: 'nara', phone: '5350000010' };
  assert.equal(game.playerForAccount(root, account), player);
});

test('crea el personaje con el teléfono vinculado aunque WhatsApp priorice un ID alternativo', async () => {
  const data = {};
  const root = game.ensureRoot(data);
  const account = { username: 'nara', phone: '5350000044' };
  root.accounts.nara = account;
  root.sessions[account.phone] = account.username;
  const alias = '5350000099';
  const msg = { key: { participant: `${alias}@s.whatsapp.net`, participantAlt: `${account.phone}@s.whatsapp.net`, remoteJid: `${alias}@s.whatsapp.net` }, pushName: 'Nara' };
  const sock = { sendMessage: async () => {} };
  const handler = require('../commands/warcraft');
  const save = () => {};
  await handler(sock, `${alias}@s.whatsapp.net`, msg, 'pjnombre', 'Nara', data, save);
  await handler(sock, `${alias}@s.whatsapp.net`, msg, 'clase', 'guerrero', data, save);
  assert.equal(root.players[account.phone]?.name, 'Nara');
  assert.equal(root.players[alias], undefined);
  assert.equal(game.playerForAccount(root, account), root.players[account.phone]);
});

test('talentos se aplican y recalculan antes de gastar el punto', () => {
  const { player } = playerAtLevel();
  player.talentPoints = 1;
  const before = player.attack;
  const result = game.spendTalent(player, 'ataque');
  assert.equal(result.error, undefined);
  assert.equal(player.attack, before + 2);
  assert.equal(player.talentPoints, 0);
  assert.equal(game.spendTalent(player, 'ataque').error.includes('punto'), true);
});

test('el combate persiste la vida real del enemigo, informa ataques variados y permite morir', () => {
  const { data, player } = playerAtLevel();
  player.attack = 1;
  player.hp = 1;
  const root = game.ensureRoot(data);
  const started = game.startCombat(root, player, 'lobo');
  const result = game.combatAttack(root, player, 'auto');
  assert.ok(started.combat.enemy.hp < started.combat.enemy.maxHp || result.victory);
  assert.match(result.log.join('\n'), /❤️.*\/55|ataque:/u);
  assert.equal(result.incoming > 0, true);
  assert.equal(player.hp, 0);
  assert.equal(started.combat.status, 'defeat');
  assert.match(started.combat.lastEnemyAttack.name, /aullido|zarpazo|mordida|salto/u);
});

test('la tienda respeta el tramo siguiente y asigna rarezas traducibles', () => {
  const { player } = playerAtLevel(10);
  const catalog = game.shopItems(player);
  assert.ok(catalog.length > 0);
  assert.ok(catalog.every(item => item.level <= 20));
  assert.ok(catalog.some(item => item.rarity === 'epic'));
  assert.equal(game.buy(player, catalog[0].id).error, undefined);
});

test('los alias en español apuntan a sus comandos compatibles', () => {
  assert.equal(canonicalCommand('bienvenida'), 'welcome');
  assert.equal(canonicalCommand('login'), 'loginw');
  assert.equal(canonicalCommand('buscar'), 'cazarw');
  assert.equal(canonicalCommand('atacar'), 'attackw');
  assert.equal(canonicalCommand('cancion'), 'song');
  assert.equal(canonicalCommand('darporreembolso'), 'darporreembolso');
  assert.equal(canonicalCommand('aceptarreembolso'), 'aceptarreembolso');
  assert.equal(canonicalCommand('cancelarreembolso'), 'cancelarreembolso');
  assert.equal(spanishCommand('welcome'), 'bienvenida');
});


test('el antispam elimina el tercer mensaje repetido y respeta a admins', async () => {
  const security = require('../commands/seguridad');
  const group = '120363000000@g.us';
  const botData = { antiSpamGroups: { [group]: true } };
  let deleted = 0;
  const sock = { sendMessage: async (_jid, payload) => { if (payload.delete) deleted++; } };
  const message = { key: { remoteJid: group, participant: '15550000001@s.whatsapp.net', id: 'x' } };
  for (let i = 0; i < 2; i++) assert.equal(await security.enforce(sock, group, message, botData, false, { conversation: 'hola repetido' }, 'hola repetido'), false);
  assert.equal(await security.enforce(sock, group, message, botData, false, { conversation: 'hola repetido' }, 'hola repetido'), true);
  assert.equal(deleted, 1);
  assert.equal(await security.enforce(sock, group, message, botData, true, { conversation: 'texto sexual' }, 'texto sexual'), false);
});


test('la tienda rechaza equipo de nivel superior y descuenta oro solo al comprar', () => {
  const data = {};
  const player = game.createPlayer(data, '15550001235@s.whatsapp.net', 'Prueba', 'guerrero').player;
  const price = game.ITEMS.epic_10_blade.price;
  player.gold = 10000;
  const denied = game.buy(player, 'epic_10_blade');
  assert.match(denied.error, /nivel 10/i);
  player.level = 10;
  const purchased = game.buy(player, 'epic_10_blade');
  assert.equal(purchased.item.rarity, 'epic');
  assert.equal(player.gold, 10000 - price);
});

test('setbienvenida guarda el texto y activa el evento de bienvenida', async () => {
  const setwelcome = require('../commands/setwelcome');
  const group = '120363000001@g.us';
  const botData = {};
  const messages = [];
  const sock = { sendMessage: async (_jid, payload) => messages.push(payload.text) };
  await setwelcome(sock, group, { key: { remoteJid: group } }, true, botData, () => {}, ['Hola', '@user', 'a', '@grupo']);
  assert.equal(botData.groupWelcome[group], true);
  assert.equal(botData.groupWelcomeText[group], 'Hola @user a @grupo');
  assert.match(messages[0], /bienvenida activada/i);
});


test('los regalos transfieren oro y objetos de forma inmediata y validan el inventario', () => {
  const data = {};
  const alice = game.createPlayer(data, '5350000001@s.whatsapp.net', 'Alice', 'guerrero').player;
  const bob = game.createPlayer(data, '5350000002@s.whatsapp.net', 'Bob', 'mago').player;
  const transfers = require('../lib/warcraftTransfers');
  const goldBefore = [alice.gold, bob.gold];
  assert.equal(transfers.give(data.warcraft, alice, bob, { type: 'gold', amount: 25 }).error, undefined);
  assert.equal(alice.gold, goldBefore[0] - 25);
  assert.equal(bob.gold, goldBefore[1] + 25);
  const item = transfers.give(data.warcraft, alice, bob, { type: 'item', itemId: 'health_potion', quantity: 1 });
  assert.equal(item.error, undefined);
  assert.equal(alice.inventory.includes('health_potion'), false);
  assert.equal(bob.inventory.includes('health_potion'), true);
  assert.match(transfers.give(data.warcraft, alice, bob, { type: 'item', itemId: 'health_potion', quantity: 2 }).error, /no tienes/i);
});

test('el reembolso no mueve nada hasta aceptar y luego intercambia ambos lados una sola vez', () => {
  const data = {};
  const alice = game.createPlayer(data, '5350000011@s.whatsapp.net', 'Alice', 'guerrero').player;
  const bob = game.createPlayer(data, '5350000012@s.whatsapp.net', 'Bob', 'mago').player;
  const root = game.ensureRoot(data);
  root.accounts.alice = { username: 'alice', phone: alice.id };
  root.accounts.bob = { username: 'bob', phone: bob.id };
  const transfers = require('../lib/warcraftTransfers');
  const offer = { type: 'gold', amount: 30 };
  const request = { type: 'item', itemId: 'health_potion', quantity: 1 };
  const before = { aliceGold: alice.gold, bobGold: bob.gold, alicePotions: alice.inventory.filter(x => x === 'health_potion').length, bobPotions: bob.inventory.filter(x => x === 'health_potion').length };
  const draft = transfers.createDraft(root, alice, bob, offer);
  assert.equal(draft.error, undefined);
  assert.equal(alice.gold, before.aliceGold);
  assert.equal(bob.gold, before.bobGold);
  assert.equal(transfers.submitRequest(root, alice.id, request).error, undefined);
  assert.equal(alice.gold, before.aliceGold);
  assert.equal(bob.gold, before.bobGold);
  const accepted = transfers.accept(root, draft.transaction.id, bob.id);
  assert.equal(accepted.error, undefined);
  assert.equal(alice.gold, before.aliceGold - 30);
  assert.equal(bob.gold, before.bobGold + 30);
  assert.equal(alice.inventory.filter(x => x === 'health_potion').length, before.alicePotions + 1);
  assert.equal(bob.inventory.filter(x => x === 'health_potion').length, before.bobPotions - 1);
  assert.equal(transfers.accept(root, draft.transaction.id, bob.id).error !== undefined, true);
});

test('una propuesta no aceptada por el destinatario y una contraprestación inexistente conservan saldos', () => {
  const data = {};
  const alice = game.createPlayer(data, '5350000021@s.whatsapp.net', 'Alice', 'guerrero').player;
  const bob = game.createPlayer(data, '5350000022@s.whatsapp.net', 'Bob', 'mago').player;
  const root = game.ensureRoot(data);
  const transfers = require('../lib/warcraftTransfers');
  const draft = transfers.createDraft(root, alice, bob, { type: 'gold', amount: 20 }).transaction;
  transfers.submitRequest(root, alice.id, { type: 'item', itemId: 'epic_10_blade', quantity: 1 });
  const before = [alice.gold, bob.gold];
  assert.match(transfers.accept(root, draft.id, alice.id).error, /destinatario/i);
  assert.match(transfers.accept(root, draft.id, bob.id).error, /falta/i);
  assert.deepEqual([alice.gold, bob.gold], before);
  assert.equal(draft.status, 'pending');
});


test('los comandos de chat /dar y /darporreembolso completan el flujo usando el nombre del personaje', async () => {
  const data = {};
  const alice = game.createPlayer(data, '5350000031@s.whatsapp.net', 'Alice', 'guerrero').player;
  const bob = game.createPlayer(data, '5350000032@s.whatsapp.net', 'Bob', 'mago').player;
  const root = game.ensureRoot(data);
  root.accounts.alice = { username: 'alice', phone: alice.id };
  root.accounts.bob = { username: 'bob', phone: bob.id };
  root.sessions[alice.id] = 'alice'; root.sessions[bob.id] = 'bob';
  const sent = [];
  const sock = { sendMessage: async (to, payload) => sent.push({ to, text: payload.text }) };
  const handler = require('../commands/warcraft');
  const msgFor = phone => ({ key: { remoteJid: `${phone}@s.whatsapp.net` }, pushName: phone === alice.id ? 'Alice' : 'Bob' });
  const goldBefore = alice.gold;
  await handler(sock, `${alice.id}@s.whatsapp.net`, msgFor(alice.id), 'dar', 'Bob oro 12', data, () => {});
  assert.equal(alice.gold, goldBefore - 12);
  assert.equal(bob.gold, 92);
  assert.ok(sent.some(m => m.to === `${bob.id}@s.whatsapp.net` && /Regalo de Warcraft/.test(m.text)));
  await handler(sock, `${alice.id}@s.whatsapp.net`, msgFor(alice.id), 'darporreembolso', 'Bob oro 20', data, () => {});
  await handler(sock, `${alice.id}@s.whatsapp.net`, msgFor(alice.id), 'reembolso', 'health_potion', data, () => {});
  const request = Object.values(root.reimbursements).find(t => t.status === 'pending');
  assert.ok(request);
  const beforeAcceptance = alice.gold;
  await handler(sock, `${bob.id}@s.whatsapp.net`, msgFor(bob.id), 'aceptarreembolso', '', data, () => {});
  assert.equal(request.status, 'completed');
  assert.equal(alice.gold, beforeAcceptance - 20);
  assert.ok(alice.inventory.includes('health_potion'));
  assert.ok(sent.some(m => m.to === `${bob.id}@s.whatsapp.net` && /Solicitud de reembolso/.test(m.text)));
});
