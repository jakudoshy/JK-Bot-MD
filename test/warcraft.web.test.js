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
  assert.equal(state.player.talentPointsSpent, 0);
  assert.equal(state.secondaryQuests.length, 3);
  assert.deepEqual(new Set(state.secondaryQuests.map(quest => quest.missionType)), new Set(['hunt', 'elite', 'gather']));
  assert.equal(state.skillProgression.find(skill => skill.id === 'golpe_muerte').unlocked, false);
  game.playerForAccount(root, playerAccount).level = 5;
  assert.equal(web.playerState(root, playerAccount).skills.golpe_muerte.name, 'Golpe de muerte');
  const created = act(botData, root, playerAccount, 'create_character', { name: 'Otra', classKey: 'warrior' });
  assert.equal(created.ok, true, created.message);
  assert.equal(created.result.characters.length, 2);
  assert.equal(web.playerState(root, playerAccount).player.name, 'Ana', 'crear otro personaje no cambia el activo sin seleccionarlo');
});

test('un desafío creado en la web genera un aviso WhatsApp al teléfono del rival', () => {
  const { botData, root } = setup();
  const sender = account(botData, root, 'alfa', '5350002101', 'Alfa');
  const target = account(botData, root, 'beta', '5350002102', 'Beta');
  const input = { action: 'duel_challenge', params: { target: 'Beta' } };
  const result = act(botData, root, sender, input.action, input.params);
  assert.equal(result.ok, true, result.message);
  const notices = web.whatsappNotifications(root, sender, input, result);
  assert.equal(notices.length, 1);
  assert.equal(notices[0].phone, target.phone);
  assert.match(notices[0].text, /Alfa te retó a un duelo desde la web/);
});

test('la aceptación web avisa por WhatsApp a quien inició el duelo o intercambio', () => {
  const { botData, root } = setup();
  const sender = account(botData, root, 'alfa', '5350002111', 'Alfa');
  const target = account(botData, root, 'beta', '5350002112', 'Beta');
  const challenge = act(botData, root, sender, 'duel_challenge', { target: 'Beta' });
  assert.equal(challenge.ok, true, challenge.message);
  const acceptedDuelInput = { action: 'duel_accept', params: {} };
  const acceptedDuel = act(botData, root, target, acceptedDuelInput.action, acceptedDuelInput.params);
  const duelNotices = web.whatsappNotifications(root, target, acceptedDuelInput, acceptedDuel);
  assert.equal(duelNotices[0].phone, sender.phone);
  assert.match(duelNotices[0].text, /aceptó tu desafío/);

  const request = act(botData, root, sender, 'refund_create', { target: 'Beta', offerType: 'gold', offerAmount: 20, requestType: 'gold', requestAmount: 10 });
  assert.equal(request.ok, true, request.message);
  const acceptedRequestInput = { action: 'refund_accept', params: { transactionId: request.result.transaction.id } };
  const acceptedRequest = act(botData, root, target, acceptedRequestInput.action, acceptedRequestInput.params);
  assert.equal(acceptedRequest.ok, true, acceptedRequest.message);
  const refundNotices = web.whatsappNotifications(root, target, acceptedRequestInput, acceptedRequest);
  assert.equal(refundNotices[0].phone, sender.phone);
  assert.match(refundNotices[0].text, /Intercambio completado/);
});

test('la cuenta conserva el progreso independiente de cada personaje al cambiar el activo', () => {
  const { botData, root } = setup();
  const playerAccount = account(botData, root, 'ana', '5350002003', 'Ana', 'deathknight');
  const first = game.playerForAccount(root, playerAccount);
  first.level = 8;
  first.gold = 321;
  const creation = act(botData, root, playerAccount, 'create_character', { name: 'Bran', classKey: 'warrior' });
  assert.equal(creation.ok, true, creation.message);
  const second = creation.result.characters.find(character => character.name === 'Bran');
  assert.ok(second);
  const outsider = account(botData, root, 'outsider', '5350002004', 'Lia', 'priest');
  assert.equal(act(botData, root, outsider, 'select_character', { characterId: second.id }).ok, false, 'una cuenta no puede seleccionar personajes ajenos');
  const switched = act(botData, root, playerAccount, 'select_character', { characterId: second.id });
  assert.equal(switched.ok, true, switched.message);
  assert.equal(game.playerForAccount(root, playerAccount).name, 'Bran');
  game.playerForAccount(root, playerAccount).level = 4;
  game.playerForAccount(root, playerAccount).gold = 77;
  assert.equal(act(botData, root, playerAccount, 'select_character', { characterId: second.id }).ok, true, 'seleccionar otra vez el actual es idempotente');
  const back = act(botData, root, playerAccount, 'select_character', { characterId: first.characterId });
  assert.equal(back.ok, true, back.message);
  const restored = game.playerForAccount(root, playerAccount);
  assert.equal(restored.name, 'Ana');
  assert.equal(restored.level, 8);
  assert.equal(restored.gold, 321);
  assert.equal(game.ensurePlayer(botData, `${playerAccount.phone}@s.whatsapp.net`).name, 'Ana', 'WhatsApp utiliza el mismo personaje activo');
  const finalState = web.playerState(root, playerAccount);
  assert.equal(finalState.characters.length, 2);
  assert.equal(finalState.characters.filter(character => character.selected).length, 1);
  const reloaded = JSON.parse(JSON.stringify(botData));
  const reloadedRoot = reloaded.warcraft;
  const reloadedAccount = reloadedRoot.accounts.ana;
  assert.equal(web.playerState(reloadedRoot, reloadedAccount).player.name, 'Ana');
  const reloadedSecond = web.playerState(reloadedRoot, reloadedAccount).characters.find(character => character.name === 'Bran');
  assert.ok(act(reloaded, reloadedRoot, reloadedAccount, 'select_character', { characterId: reloadedSecond.id }).ok);
  assert.equal(game.playerForAccount(reloadedRoot, reloadedAccount).name, 'Bran');
  assert.equal(game.playerForAccount(reloadedRoot, reloadedAccount).level, 4);
});

test('las armas y pecheras escalan por nivel y usan nombres e iconos coherentes', () => {
  const level1 = game.ITEMS.common_1_blade;
  const level10 = game.ITEMS.common_10_blade;
  const level11 = game.ITEMS.rare_11_blade;
  assert.ok(level10.attack > level1.attack, `nivel 10 (${level10.attack}) debe superar nivel 1 (${level1.attack})`);
  assert.ok(level11.attack > level10.attack, `nivel 11 (${level11.attack}) debe superar nivel 10 (${level10.attack})`);
  assert.ok(game.ITEMS.common_10_leather.defense > game.ITEMS.common_1_leather.defense);
  assert.match(game.ITEMS.common_10_leather.name, /^Pechera de cuero Común/);
  assert.match(game.ITEMS.rare_11_robe.name, /^Vestidura Rara/);
  assert.match(web.itemImage(game.ITEMS.rare_11_leather), /items\/armor-rare\.png$/);
  assert.equal(media.itemRelativePath(game.ITEMS.rare_11_leather), 'items/armor-rare.png');
  assert.match(web.itemImage(game.ITEMS.rare_11_robe), /items\/robe-rare\.png$/);
});

test('arco, daga y colmillo de lobo muestran sprites de su categoría y rareza', () => {
  const bow = { id: 'common_1_bow', name: 'Arco Común', slot: 'weapon', rarity: 'common' };
  assert.match(web.itemImage(bow), /items\/longbow-common\.png$/);
  assert.equal(media.itemRelativePath(bow), 'items/longbow-common.png');
  assert.match(web.itemImage({ id: 'shadow_dagger', name: 'Daga de sombra', slot: 'weapon', rarity: 'rare' }), /items\/dagger-rare\.png$/);
  assert.match(web.itemImage({ ...game.ITEMS.colmillo_lobo, id: 'colmillo_lobo' }), /items\/fang-common\.png$/);
  assert.equal(media.itemRelativePath({ id: 'shadow_dagger', name: 'Daga de sombra', slot: 'weapon', rarity: 'rare' }), 'items/dagger-rare.png');
  assert.equal(media.itemRelativePath({ ...game.ITEMS.colmillo_lobo, id: 'colmillo_lobo' }), 'items/fang-common.png');
  for (const name of ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'].map(rarity => `longbow-${rarity}.png`).concat(['dagger-common.png', 'fang-common.png'])) assert.ok(fs.existsSync(path.join(__dirname, '..', 'assets/warcraft/generated/items', name)), `${name} debe existir`);
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

test('el estado web expone el comercio pendiente solo al jugador destinatario', () => {
  const { botData, root } = setup();
  const sender = account(botData, root, 'ana', '5350002014', 'Ana');
  const recipient = account(botData, root, 'ben', '5350002015', 'Ben');
  const senderPlayer = game.playerForAccount(root, sender);
  const recipientPlayer = game.playerForAccount(root, recipient);
  root.trades.trade_1 = { id: 'trade_1', status: 'pending', participants: [senderPlayer.id, recipientPlayer.id], createdAt: new Date().toISOString() };
  root.trades.trade_2 = { id: 'trade_2', status: 'active', participants: [senderPlayer.id, recipientPlayer.id] };
  assert.deepEqual(web.playerState(root, recipient).trades, [{ id: 'trade_1', status: 'pending', incoming: true, fromName: 'Ana' }]);
  assert.deepEqual(web.playerState(root, sender).trades, []);
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
    assert.ok(document.querySelector('.wc-shop-grid'), 'la tienda usa la cuadrícula de selección táctil');
    assert.equal(document.querySelector('[data-shop-filter="all"]')?.getAttribute('aria-pressed'), 'true');
    const buy = document.querySelector('[data-wc-action="shop_prepare"]');
    assert.ok(buy, 'la tienda conserva artículos al entrar desde otra pestaña');
    buy.click();
    await new Promise(resolve => setTimeout(resolve, 60));
    assert.ok(requests.some(url => url.endsWith('/action')), 'el botón envía una acción autenticada');
  } finally {
    window.close();
  }
});

test('una actualización en tiempo real conserva teléfono, foco y selección del formulario de correo', async () => {
  const { botData, root } = setup();
  const user = account(botData, root, 'drafttest', '5350002042', 'Draft Tester', 'warrior');
  const catalog = web.catalog();
  const current = web.playerState(root, user);
  const shop = game.shopItems(game.playerForAccount(root, user)).map(item => ({ ...item, image: web.itemImage(item) }));
  const script = fs.readFileSync(path.join(__dirname, '..', 'public/warcraft/game-ui.js'), 'utf8');
  const dom = new JSDOM('<div id="wcCharacterSetup"><div id="wcClassGrid"></div><input id="wcCreateClass"><button id="wcCreateCharacterButton"></button><form id="wcCreateCharacterForm"><input id="wcCreateName"><div id="wcCreateStatus"></div></form></div><div id="wcGameMount"></div><div id="wcProfileStats"></div><div id="wcProfileEquipment"></div><ul id="wcProfileInventory"></ul>', { runScripts: 'dangerously', url: 'http://localhost/' });
  const window = dom.window;
  try {
    window.localStorage.setItem('jk_warcraft_token', 'test-token');
    window.fetch = async url => {
      let data = { ok: true };
      if (String(url).endsWith('/catalog')) data = { ok: true, ...catalog };
      else if (String(url).endsWith('/me')) data = { ok: true, account: { username: user.username }, ...current, rank: 1 };
      else if (String(url).endsWith('/shop')) data = { ok: true, items: shop };
      return { ok: true, status: 200, json: async () => data };
    };
    window.eval(script);
    await new Promise(resolve => setTimeout(resolve, 60));
    window.document.querySelector('[data-tab="mas"]').click();
    const input = window.document.querySelector('form[data-wc-form="mail_send"] input[name="target"]');
    assert.ok(input, 'el correo presenta el campo del destinatario');
    input.focus();
    input.value = '5350009999';
    input.setSelectionRange(3, 7);
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    await window.wcGameRefresh();
    const restored = window.document.querySelector('form[data-wc-form="mail_send"] input[name="target"]');
    assert.equal(restored.value, '5350009999');
    assert.equal(window.document.activeElement, restored, 'el foco permanece en el campo');
    assert.equal(restored.selectionStart, 3);
    assert.equal(restored.selectionEnd, 7);
  } finally {
    window.close();
  }
});

test('tras autenticar aparece la lista y se puede seleccionar un personaje con botón', async () => {
  const { botData, root } = setup();
  const user = account(botData, root, 'selector', '5350002041', 'Alba', 'priest');
  const created = act(botData, root, user, 'create_character', { name: 'Daro', classKey: 'hunter' });
  assert.equal(created.ok, true, created.message);
  const second = created.result.characters.find(character => character.name === 'Daro');
  const catalog = web.catalog();
  let current = web.playerState(root, user);
  const requests = [];
  const script = fs.readFileSync(path.join(__dirname, '..', 'public/warcraft/game-ui.js'), 'utf8');
  const dom = new JSDOM('<form id="wcLoginForm"></form><button id="wcVerifyBtn"></button><div id="wcCharacterSetup"><div id="wcClassGrid"></div><input id="wcCreateClass"><button id="wcCreateCharacterButton"></button><form id="wcCreateCharacterForm"><input id="wcCreateName"><div id="wcCreateStatus"></div></form></div><div id="wcGameMount"></div>', { runScripts: 'dangerously', url: 'http://localhost/' });
  const window = dom.window;
  try {
    window.fetch = async (url, options = {}) => {
      requests.push({ url: String(url), body: options.body });
      let data = { ok: true };
      if (String(url).endsWith('/catalog')) data = { ok: true, ...catalog };
      else if (String(url).endsWith('/me')) data = { ok: true, account: { username: user.username }, ...current, rank: 1 };
      else if (String(url).endsWith('/shop')) data = { ok: true, items: game.shopItems(game.playerForAccount(root, user)) };
      else if (String(url).endsWith('/action')) {
        const payload = JSON.parse(options.body || '{}');
        const result = act(botData, root, user, payload.action, payload);
        current = web.playerState(root, user);
        data = result;
      }
      return { ok: true, status: 200, json: async () => data };
    };
    window.eval(script);
    window.document.getElementById('wcLoginForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    window.localStorage.setItem('jk_warcraft_token', 'test-token');
    window.dispatchEvent(new window.Event('wc-profile-refresh'));
    await new Promise(resolve => setTimeout(resolve, 80));
    const document = window.document;
    assert.ok(document.querySelector('.wc-character-picker'), 'el login abre la lista de personajes');
    document.querySelector(`[data-select-character="${second.id}"]`).click();
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(game.playerForAccount(root, user).name, 'Daro');
    assert.ok(document.querySelector('.wc-game-shell'));
    assert.ok(requests.some(request => request.url.endsWith('/action') && JSON.parse(request.body).action === 'select_character'));
    document.querySelector('[data-wc-local="characters"]').click();
    await new Promise(resolve => setTimeout(resolve, 60));
    assert.ok(document.querySelector('.wc-character-picker'), 'el botón Personajes vuelve a mostrar el selector');
  } finally {
    window.close();
  }
});

test('en vertical se ve solo la cuenta y Jugar WoW abre el selector sin pantalla negra', async () => {
  const { botData, root } = setup();
  const user = account(botData, root, 'vertical', '5350002042', 'Cuenta', 'warrior');
  act(botData, root, user, 'create_character', { name: 'Luz', classKey: 'hunter' });
  const catalog = web.catalog();
  const current = web.playerState(root, user);
  const script = fs.readFileSync(path.join(__dirname, '..', 'public/warcraft/game-ui.js'), 'utf8');
  const dom = new JSDOM('<button id="menuPlayWow"></button><button id="wcExitGameMode"></button><button id="wcContinuePortrait"></button><form id="wcLoginForm"></form><div id="wcLoginStatus"></div><button id="wcVerifyBtn"></button><div id="wcProfilePanel"><div id="wcProfileStats"></div><div id="wcProfileEquipment"></div><ul id="wcProfileInventory"></ul><div id="wcGameMount"></div></div><div id="wcCharacterSetup"><div id="wcClassGrid"></div><input id="wcCreateClass"><button id="wcCreateCharacterButton"></button></div>', { runScripts: 'dangerously', url: 'http://localhost/' });
  const window = dom.window;
  try {
    window.matchMedia = query => ({ matches: query.includes('orientation: portrait') });
    window.fetch = async url => {
      let data = { ok: true };
      if (String(url).endsWith('/catalog')) data = { ok: true, ...catalog };
      else if (String(url).endsWith('/me')) data = { ok: true, account: { username: user.username }, ...current, rank: 1 };
      else if (String(url).endsWith('/shop')) data = { ok: true, items: [] };
      return { ok: true, status: 200, json: async () => data };
    };
    window.eval(script);
    await new Promise(resolve => setTimeout(resolve, 30));
    window.document.getElementById('wcLoginForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    window.localStorage.setItem('jk_warcraft_token', 'vertical-token');
    window.dispatchEvent(new window.Event('wc-profile-refresh'));
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.ok(window.document.querySelector('.wc-account-ready'), 'la portada vertical informa que la cuenta está lista');
    assert.equal(window.document.querySelector('.wc-character-picker'), null, 'no aparece el jugador ni su retrato en vertical');
    assert.equal(window.document.querySelector('.wc-game-shell'), null, 'no se muestra el juego antes de pulsar Jugar');
    window.document.getElementById('menuPlayWow').click();
    await new Promise(resolve => setTimeout(resolve, 60));
    assert.ok(window.document.body.classList.contains('wc-game-mode'));
    assert.ok(window.document.querySelector('.wc-character-picker'), 'Jugar carga el selector de personaje');
    assert.ok(window.document.querySelector('.wc-character-portrait img'), 'el retrato se muestra dentro del juego');
  } finally {
    window.close();
  }
});
