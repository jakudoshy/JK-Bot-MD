'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const game = require('../lib/warcraft');
const web = require('../lib/warcraftWeb');
const media = require('../lib/warcraftWhatsAppMedia');
const manifest = require('../assets/warcraft/manifest.json');

function setup() {
  const botData = {};
  game.ensureRoot(botData);
  const root = botData.warcraft;
  root.accounts ||= {};
  return { botData, root };
}
function account(botData, root, username, phone, name, classKey = 'warrior') {
  const value = { username, phone, createdAt: new Date().toISOString() };
  root.accounts[username] = value;
  const result = web.execute({ botData, root, account: value, input: { action: 'create_character', params: { name, classKey } } });
  assert.equal(result.ok, true, result.message);
  return value;
}
function act(botData, root, user, action, params = {}) {
  return web.execute({ botData, root, account: user, input: { action, params } });
}

 test('el catálogo sirve imágenes válidas para las clases, zonas, objetos, mochila y monedas', () => {
  const catalog = web.catalog();
  assert.equal(catalog.classes.length, Object.keys(game.CLASS_CONFIG).length);
  for (const item of catalog.classes) {
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'assets/warcraft/generated', manifest.classIcons[item.id].asset)), item.id);
  }
  for (const zone of catalog.zones) {
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'assets/warcraft/generated', manifest.zoneMaps[zone.id].asset)), zone.id);
  }
  for (const [id, item] of Object.entries(catalog.items)) {
    const file = path.join(__dirname, '..', item.image.replace(/^\//, ''));
    assert.ok(fs.existsSync(file), `${id} -> ${item.image}`);
    assert.equal(fs.readFileSync(file).subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  }
  for (const name of ['inventory.png', 'gold.png']) assert.ok(fs.existsSync(path.join(__dirname, '..', 'assets/warcraft/generated/ui', name)));
});

test('la creación de personaje web usa el mismo motor y las 13 clases aceptan retrato', () => {
  const { botData, root } = setup();
  const playerAccount = account(botData, root, 'ana', '5350002000', 'Ana', 'deathknight');
  const state = web.playerState(root, playerAccount);
  assert.equal(state.player.name, 'Ana');
  assert.equal(state.player.classKey, 'deathknight');
  assert.equal(state.player.classImage, '/assets/warcraft/generated/classes/deathknight.png');
  assert.ok(state.player.xpForNext > 0);
  assert.equal(act(botData, root, playerAccount, 'create_character', { name: 'Otra', classKey: 'warrior' }).ok, false);
});

test('duelo web de dos cuentas: aceptación válida, HP visible, turno y reintento idempotente', () => {
  const { botData, root } = setup();
  const challenger = account(botData, root, 'ana', '5350002000', 'Ana', 'warrior');
  const target = account(botData, root, 'ben', '5350002001', 'Ben', 'mago');
  const challenge = act(botData, root, challenger, 'duel_challenge', { target: 'ben' });
  assert.equal(challenge.ok, true, challenge.message);
  assert.equal(web.playerState(root, target).pendingDuel.challenger, 'Ana');
  const accepted = act(botData, root, target, 'duel_accept');
  assert.equal(accepted.ok, true, accepted.message);
  assert.match(accepted.message, /duelo|combate/i);
  const active = web.playerState(root, target).duel;
  assert.equal(active.status, 'active');
  assert.equal(active.players.length, 2);
  assert.ok(active.players.every(player => player.hp > 0 && player.maxHp >= player.hp));
  const repeated = act(botData, root, target, 'duel_accept');
  assert.equal(repeated.ok, true);
  assert.match(repeated.message, /ya está activo/i);
  assert.doesNotMatch(repeated.message, /no tienes|no hay/i);
  const attack = act(botData, root, challenger, 'duel_attack');
  assert.equal(attack.ok, true, attack.message);
  const afterHit = web.playerState(root, target).duel;
  assert.ok(afterHit.players.find(player => player.name === 'Ben').hp < afterHit.players.find(player => player.name === 'Ben').maxHp);
  assert.equal(afterHit.myTurn, true);
  const unrelated = account(botData, root, 'cami', '5350002002', 'Cami', 'priest');
  const invalid = act(botData, root, unrelated, 'duel_accept');
  assert.equal(invalid.ok, false);
  assert.match(invalid.message, /desafío pendiente/i);
  assert.doesNotMatch(JSON.stringify(active), /535000200/);
});

test('aceptación de reembolso web entre cuentas transfiere una vez y reconoce el reintento', () => {
  const { botData, root } = setup();
  const sender = account(botData, root, 'ana', '5350002010', 'Ana');
  const recipient = account(botData, root, 'ben', '5350002011', 'Ben');
  const senderPlayer = game.playerForAccount(root, sender);
  const recipientPlayer = game.playerForAccount(root, recipient);
  senderPlayer.gold = 100;
  recipientPlayer.gold = 50;
  const created = act(botData, root, sender, 'refund_create', {
    target: 'ben', offerType: 'gold', offerAmount: 10, requestType: 'gold', requestAmount: 5
  });
  assert.equal(created.ok, true, created.message);
  const txId = created.result.transaction.id;
  const pending = web.playerState(root, recipient).transactions.find(tx => tx.id === txId);
  assert.equal(pending.incoming, true);
  const accepted = act(botData, root, recipient, 'refund_accept', { transactionId: txId });
  assert.equal(accepted.ok, true, accepted.message);
  assert.equal(senderPlayer.gold, 95);
  assert.equal(recipientPlayer.gold, 55);
  const retry = act(botData, root, recipient, 'refund_accept', { transactionId: txId });
  assert.equal(retry.ok, true);
  assert.match(retry.message, /ya se había completado/i);
  assert.equal(senderPlayer.gold, 95);
  assert.equal(recipientPlayer.gold, 55);
  const stranger = account(botData, root, 'cami', '5350002012', 'Cami');
  const invalid = act(botData, root, stranger, 'refund_accept', { transactionId: txId });
  assert.equal(invalid.ok, false);
  assert.match(invalid.message, /reembolso activo válido/i);
});

test('misiones web mantienen el objetivo activo y el combate entrega automáticamente la recompensa', () => {
  const { botData, root } = setup();
  const user = account(botData, root, 'ana', '5350002020', 'Ana', 'warrior');
  const player = game.playerForAccount(root, user);
  player.gold = 100000;
  const template = game.getQuestBoard(player).find(quest => quest.enemyId);
  assert.ok(template, 'se esperaba una misión de combate disponible');
  const accepted = act(botData, root, user, 'quest_accept', { id: template.id });
  assert.equal(accepted.ok, true, accepted.message);
  assert.ok(web.playerState(root, user).enemies.some(enemy => enemy.id === template.enemyId));
  const initialGold = player.gold;
  const goal = player.activeQuest.goal;
  let resolved;
  for (let count = 0; count < goal; count++) {
    const started = act(botData, root, user, 'combat_start', { enemyId: template.enemyId });
    assert.equal(started.ok, true, started.message);
    player.attack = 100000;
    resolved = act(botData, root, user, 'combat_attack', { skillId: 'auto' });
    assert.equal(resolved.ok, true, resolved.message);
  }
  assert.equal(player.activeQuest, null);
  assert.ok(player.gold > initialGold);
  assert.match(resolved.message, /Turno resuelto|misión completada/i);
});

test('la tienda de nivel usa compra confirmada y el envío WhatsApp aporta imágenes con rareza', async () => {
  const { botData, root } = setup();
  const user = account(botData, root, 'ana', '5350002030', 'Ana', 'warrior');
  const player = game.playerForAccount(root, user);
  player.gold = 100000;
  const item = game.shopItems(player).find(value => value.slot === 'weapon');
  assert.ok(item);
  const prepared = act(botData, root, user, 'shop_prepare', { itemId: item.id });
  assert.equal(prepared.ok, true, prepared.message);
  const bought = act(botData, root, user, 'shop_confirm');
  assert.equal(bought.ok, true, bought.message);
  assert.ok(player.inventory.includes(item.id));

  const sent = [];
  const sock = { sendMessage: async (...args) => { sent.push(args); return {}; } };
  await media.sendShopCategory(sock, '5350002030@s.whatsapp.net', {}, player, 'weapon');
  assert.ok(sent.length > 2);
  const imageMessages = sent.filter(([, payload]) => Buffer.isBuffer(payload.image));
  assert.ok(imageMessages.length > 0);
  assert.ok(imageMessages.every(([, payload]) => /ID:|Precio:/.test(payload.caption)));
  const first = imageMessages[0][1].image;
  assert.equal(first.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
});

test('el cliente web renderiza sus pestañas y conserva la tienda al cambiar de sección', async () => {
  const { botData, root } = setup();
  const user = account(botData, root, 'webtest', '5350002040', 'Tester', 'warrior');
  const player = game.playerForAccount(root, user);
  const catalog = web.catalog();
  const state = web.playerState(root, user);
  const shop = game.shopItems(player).map(item => ({ ...item, image: web.itemImage(item) }));
  const requests = [];
  const script = fs.readFileSync(path.join(__dirname, '..', 'public/warcraft/game-ui.js'), 'utf8');
  const dom = new JSDOM('<div id="wcCharacterSetup"><div id="wcClassGrid"></div><input id="wcCreateClass"><button id="wcCreateCharacterButton"></button><form id="wcCreateCharacterForm"><input id="wcCreateName"><div id="wcCreateStatus"></div></form></div><div id="wcGameMount"></div><div id="wcProfileStats"></div><div id="wcProfileEquipment"></div><ul id="wcProfileInventory"></ul>', { runScripts: 'dangerously', url: 'http://localhost/' });
  const window = dom.window;
  try {
    window.localStorage.setItem('jk_warcraft_token', 'test-token');
    window.fetch = async (url) => {
      requests.push(String(url));
      let data = { ok: true };
      if (String(url).endsWith('/catalog')) data = { ok: true, ...catalog };
      else if (String(url).endsWith('/me')) data = { ok: true, account: { username: user.username }, ...state, rank: 1 };
      else if (String(url).endsWith('/shop')) data = { ok: true, items: shop, level: player.level };
      else if (String(url).endsWith('/action')) data = { ok: true, message: 'Acción simulada.' };
      return { ok: true, status: 200, json: async () => data };
    };
    window.eval(script);
    await new Promise(resolve => setTimeout(resolve, 60));
    const document = window.document;
    assert.ok(document.querySelector('.wc-game-shell'));
    assert.equal(document.querySelectorAll('.wc-game-tabs [data-tab]').length, 10);
    document.querySelector('[data-tab="misiones"]').click();
    assert.ok(document.querySelector('.wc-game-card'));
    document.querySelector('[data-tab="tienda"]').click();
    const buy = document.querySelector('[data-wc-action="shop_prepare"]');
    assert.ok(buy, 'la tienda conserva artículos al entrar desde otra pestaña');
    buy.click();
    await new Promise(resolve => setTimeout(resolve, 60));
    assert.ok(requests.some(url => url.endsWith('/action')), 'el botón envía una acción autenticada');
  } finally {
    window.close();
  }
});
