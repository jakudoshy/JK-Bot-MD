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
