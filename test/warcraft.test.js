'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const game = require('../lib/warcraft');
const { canonicalCommand, spanishCommand, parseCommandText } = require('../lib/spanishCommands');

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

test('mantiene los IDs de clases antiguas al cargar un personaje guardado', () => {
  const data = { warcraft: { players: { '5350000040': { id: '5350000040', name: 'Rogue', classKey: 'rogue', level: 12, hp: 100, maxHp: 150, inventory: [], equipment: {} }, '5350000041': { id: '5350000041', name: 'Mage', classKey: 'mage', level: 12, hp: 100, maxHp: 150, inventory: [], equipment: {} } } } };
  assert.equal(game.ensurePlayer(data, '5350000040@s.whatsapp.net').classKey, 'picaro');
  assert.equal(game.ensurePlayer(data, '5350000041@s.whatsapp.net').classKey, 'mago');
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

test('el tablón muestra una sola misión principal por nivel y sus recompensas escalan', () => {
  const { player } = playerAtLevel(1);
  const levelOneBoard = game.getQuestBoard(player);
  assert.equal(levelOneBoard.length, 1);
  assert.equal(levelOneBoard[0].id, 'nivel_1_campeon');
  assert.equal(levelOneBoard[0].mainQuest, true);
  player.level = 25;
  game.recalc(player);
  const at25 = game.getQuestBoard(player);
  assert.equal(at25.length, 1);
  assert.ok(at25[0].mainQuest);
  assert.match(at25[0].description, /Gran mago/);
  assert.equal(at25[0].enemyId, 'elite_25');
  const at50 = game.questRewards(at25[0], 50);
  assert.ok(at50.xp > at25[0].xp && at50.gold > at25[0].gold);
});

test('completar la principal da recompensa, pero ganar experiencia no depende de misiones', () => {
  const { data, player } = playerAtLevel(1);
  const root = game.ensureRoot(data);
  const quest = game.getQuestBoard(player)[0];
  assert.ok(quest?.mainQuest);
  player.attack = 100000;
  const accepted = game.acceptQuest(player, quest.id);
  assert.equal(accepted.error, undefined);
  let lastResult;
  for (let kill = 0; kill < accepted.quest.goal; kill++) {
    assert.equal(game.startCombat(root, player, accepted.quest.enemyId).error, undefined);
    player.attack = 100000;
    lastResult = game.combatAttack(root, player, 'auto');
    assert.equal(lastResult.victory, true);
  }
  assert.equal(lastResult.quest.completed, true);
  assert.equal(player.activeQuest, null);
  const levelBeforeGrinding = player.level;
  game.grantXp(player, game.xpForLevel(player.level) - player.xp);
  assert.ok(player.level > levelBeforeGrinding, 'sube por XP aunque queden misiones sin completar');
  assert.equal(player.pendingLevelXp, 0);
  const nextBoard = game.getQuestBoard(player);
  assert.equal(nextBoard.length, 1);
  assert.ok(nextBoard[0].mainQuest);
  assert.equal(nextBoard[0].minLevel, player.level);
});

test('la experiencia permite subir y aceptar la misión principal sin secundarias completadas', () => {
  const { player } = playerAtLevel(1);
  const events = game.grantXp(player, 5000);
  assert.ok(events.length > 0);
  assert.ok(player.level > 1);
  assert.equal(player.pendingLevelXp, 0);
  assert.equal(game.campaignProgress(player).completed, 0);
  const board = game.getQuestBoard(player);
  assert.equal(board.length, 1);
  assert.ok(board[0].mainQuest);
  const accepted = game.acceptQuest(player, board[0].id);
  assert.equal(accepted.error, undefined);
  assert.equal(player.activeQuest.mainQuest, true);
  assert.doesNotMatch(game.formatStatus(player), /Completa.*desbloquear el siguiente nivel/i);
});

test('aceptar la misión del Gran mago fija el objetivo en enemigos y paga al completarla', () => {
  const { data, player } = playerAtLevel(25);
  const root = game.ensureRoot(data);
  const accepted = game.acceptQuest(player, 'el gran mago');
  assert.equal(accepted.error, undefined);
  assert.equal(player.activeQuest.id, 'gran_mago');
  assert.match(game.acceptQuest(player, 'wolves').error, /misión activa/i);
  assert.ok(game.getEnemiesForPlayer(player).some(enemy => enemy.id === 'gran_mago' && enemy.missionTarget));
  const started = game.startCombat(root, player, 'gran_mago');
  assert.equal(started.error, undefined, 'el objetivo activo puede buscarse fuera de su zona');
  player.attack = 10000;
  const victory = game.combatAttack(root, player, 'auto');
  assert.equal(victory.victory, true);
  assert.equal(victory.quest.completed, true);
  assert.equal(victory.quest.q.name, 'El Gran mago');
  assert.equal(player.activeQuest, null);
  assert.equal(player.quests.gran_mago.completed, true);
  assert.equal(game.getEnemiesForPlayer(player).some(enemy => enemy.id === 'gran_mago'), false);
});

test('cancelar una misión quita inmediatamente su objetivo especial', () => {
  const { player } = playerAtLevel(25);
  const accepted = game.acceptQuest(player, 'gran_mago');
  assert.equal(accepted.error, undefined);
  assert.ok(game.getEnemiesForPlayer(player).some(enemy => enemy.id === 'gran_mago'));
  const cancelled = game.cancelQuest(player);
  assert.equal(cancelled.error, undefined);
  assert.equal(game.getEnemiesForPlayer(player).some(enemy => enemy.id === 'gran_mago'), false);
  assert.equal(player.questHistory.at(-1).status, 'cancelled');
});

test('la misión de la cripta solo progresa después de aceptarla y se completa al vencer la mazmorra', () => {
  const { player } = playerAtLevel(5);
  const accepted = game.acceptQuest(player, 'crypt');
  assert.equal(accepted.error, undefined);
  const result = game.dungeon(player, 'crypt');
  assert.equal(result.quest.completed, true);
  assert.equal(result.quest.q.id, 'crypt');
  assert.equal(player.activeQuest, null);
  assert.equal(player.quests.crypt.status, 'completed');
});

test('aceptar, listar y cancelar misiones funciona en los comandos de WhatsApp', async () => {
  const { data, player } = playerAtLevel(25);
  const root = game.ensureRoot(data);
  root.sessions[player.id] = 'tester';
  const sent = [];
  const sock = { sendMessage: async (_jid, payload) => sent.push(payload.text) };
  const handler = require('../commands/warcraft');
  const msg = { key: { remoteJid: `${player.id}@s.whatsapp.net` }, pushName: player.name };
  await handler(sock, `${player.id}@s.whatsapp.net`, msg, 'misiones', '', data, () => {});
  assert.match(sent.at(-1), /aceptarmision nivel_25_/);
  await handler(sock, `${player.id}@s.whatsapp.net`, msg, 'aceptarmision', 'gran_mago', data, () => {});
  assert.match(sent.at(-1), /Misión aceptada: El Gran mago/);
  await handler(sock, `${player.id}@s.whatsapp.net`, msg, 'enemigos', '', data, () => {});
  assert.match(sent.at(-1), /gran_mago.*objetivo de misión activo/s);
  await handler(sock, `${player.id}@s.whatsapp.net`, msg, 'cancelarmision', '', data, () => {});
  assert.match(sent.at(-1), /Misión cancelada/);
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
  assert.ok(catalog.every(item => item.level >= 1 && item.level <= 10));
  assert.equal(game.rarityForLevel(10), 'common');
  assert.equal(game.rarityForLevel(11), 'rare');
  assert.equal(game.rarityForLevel(20), 'rare');
  assert.equal(game.rarityForLevel(21), 'epic');
  assert.ok(catalog.every(item => item.rarity === 'common'));
  const { player: rarePlayer } = playerAtLevel(11);
  const rareCatalog = game.shopItems(rarePlayer);
  assert.ok(rareCatalog.length > 0);
  assert.ok(rareCatalog.every(item => item.level >= 11 && item.level <= 20 && item.rarity === 'rare'));
  assert.match(game.formatItem('rare_20_robe'), /Raro[\s\S]*nivel 20[\s\S]*armadura[\s\S]*intelecto[\s\S]*aguante/i);
  assert.equal(game.buy(player, catalog[0].id).error, undefined);
});

test('la tienda impide comprar equipo de rareza incorrecta para su nivel', () => {
  const { player } = playerAtLevel(50);
  assert.equal(game.ITEMS.epic_10_blade, undefined);
  assert.ok(game.ITEMS.rare_20_blade);
  assert.equal(game.buy(player, 'rare_20_blade').error, undefined);
});

test('mazmorra de grupo respeta turnos y prioriza al tanque', () => {
  const { data, player: tank } = playerAtLevel(5);
  const healer = game.createPlayer(data, '5350000001@s.whatsapp.net', 'Sanadora', 'sacerdote').player;
  tank.level = healer.level = 5;
  game.recalc(tank); game.recalc(healer);
  tank.hp = tank.maxHp; healer.hp = healer.maxHp;
  const root = game.ensureRoot(data);
  const party = game.createParty(root, tank).party;
  assert.equal(game.joinParty(root, healer, party.id).error, undefined);
  const started = game.startDungeonRun(root, tank, 'crypt');
  assert.equal(started.error, undefined);
  assert.equal(started.run.enemies.length, 5);
  assert.equal(started.run.enemies[0].name, 'Esqueleto guardián');
  assert.match(game.dungeonAction(root, healer, 'auto').error, /Espera tu turno/);
  assert.equal(game.dungeonAction(root, tank, 'auto').turn.nextPlayer.id, healer.id);
  const healerTurn = game.dungeonAction(root, healer, 'auto');
  assert.equal(healerTurn.turn.target.id, tank.id);
  assert.equal(game.dungeonAggro(root, tank).error, undefined);
  assert.equal(game.dungeonAction(root, healer, 'auto').turn.target.id, tank.id);
});

test('el sanador cura a la banda y su habilidad se recarga por rondas', () => {
  const { data, player: tank } = playerAtLevel(5);
  const healer = game.createPlayer(data, '5350000002@s.whatsapp.net', 'Sanadora', 'sacerdote').player;
  tank.level = healer.level = 5;
  game.recalc(tank); game.recalc(healer);
  const root = game.ensureRoot(data);
  const party = game.createParty(root, tank).party;
  game.joinParty(root, healer, party.id);
  assert.equal(game.startDungeonRun(root, tank, 'crypt').error, undefined);
  game.dungeonAction(root, tank, 'auto');
  tank.hp = 10; healer.hp = 10;
  const result = game.dungeonHeal(root, healer, 'banda');
  assert.equal(result.error, undefined);
  assert.ok(result.healed > 0);
  assert.ok(tank.hp > 10 && healer.hp > 10);
  game.dungeonAction(root, tank, 'auto');
  const cooling = game.dungeonHeal(root, healer, 'banda');
  assert.match(cooling.error, /ronda/);
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
  assert.equal(canonicalCommand('cerrargrupo'), 'close');
  assert.equal(canonicalCommand('cerrar_grupo'), 'close');
  assert.equal(canonicalCommand('abrir_grupo'), 'open');
  assert.equal(canonicalCommand('set_bienvenida'), 'setwelcome');
  assert.equal(canonicalCommand('nombre_del_personaje'), 'pjnombre');
  assert.equal(canonicalCommand('nombredelpersonaje'), 'pjnombre');
  assert.equal(canonicalCommand('anti_enlaces'), 'antilink');
  assert.equal(canonicalCommand('codigo_qr'), 'qr');
  assert.equal(canonicalCommand('aceptar_duelo'), 'aceptarduelo');
  assert.equal(canonicalCommand('aceptarmision'), 'aceptarmision');
  assert.equal(canonicalCommand('cancelarmision'), 'cancelarmision');
  assert.equal(canonicalCommand('agro'), 'agrow');
  assert.equal(canonicalCommand('curar'), 'curarw');
  assert.equal(canonicalCommand('especializacion'), 'especializacionw');
  assert.equal(spanishCommand('welcome'), 'bienvenida');
  assert.equal(spanishCommand('close'), 'cerrar_grupo');
  assert.equal(spanishCommand('aceptarmision'), 'aceptar_mision');
  assert.equal(parseCommandText('/cerrar_grupo').commandName, 'close');
  assert.equal(parseCommandText('/cerrargrupo').commandName, 'close');
});

test('el menú completo muestra aliases compuestos separados con guion bajo', async () => {
  const allMenu = require('../commands/allmenu');
  let text = '';
  const commands = { groupinfo: true, grouplink: true, tagall: true, hidetag: true, welcome: true, setwelcome: true, open: true, close: true, promote: true, demote: true, mute: true, unmute: true, poll: true };
  await allMenu({ sendMessage: async (_chat, payload) => { text = payload.text; } }, 'chat', {}, null, commands);
  assert.match(text, /\/cerrar_grupo/);
  assert.match(text, /\/abrir_grupo/);
  assert.match(text, /\/set_bienvenida/);
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
  const price = game.ITEMS.rare_20_blade.price;
  player.gold = 10000;
  const denied = game.buy(player, 'rare_20_blade');
  assert.match(denied.error, /nivel 20/i);
  player.level = 20;
  const purchased = game.buy(player, 'rare_20_blade');
  assert.equal(purchased.item.rarity, 'rare');
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
  const duplicateAcceptance = transfers.accept(root, draft.transaction.id, bob.id);
  assert.equal(duplicateAcceptance.alreadyCompleted, true);
  assert.equal(alice.gold, before.aliceGold - 30);
  assert.equal(bob.gold, before.bobGold + 30);
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
  const completedGold = [alice.gold, bob.gold];
  await handler(sock, `${bob.id}@s.whatsapp.net`, msgFor(bob.id), 'aceptarreembolso', '', data, () => {});
  assert.equal(request.status, 'completed');
  assert.deepEqual([alice.gold, bob.gold], completedGold);
  assert.ok(sent.some(m => /ya estaba completado/i.test(m.text || '')));
  assert.equal(alice.gold, beforeAcceptance - 20);
  assert.ok(alice.inventory.includes('health_potion'));
  assert.ok(sent.some(m => m.to === `${bob.id}@s.whatsapp.net` && /Solicitud de reembolso/.test(m.text)));
});


test('la misión principal permanece accesible aunque no se hayan hecho las secundarias', () => {
  const { player } = playerAtLevel(1);
  const secondary = game.QUESTS.filter(q => q.campaign && q.minLevel === 1 && !q.mainQuest);
  assert.ok(secondary.length > 0);
  assert.ok(secondary.every(q => !player.quests?.[q.id]?.completed));
  const board = game.getQuestBoard(player);
  assert.equal(board.length, 1);
  assert.equal(board[0].questType, 'main');
  const accepted = game.acceptQuest(player, board[0].id);
  assert.equal(accepted.error, undefined);
  assert.equal(player.activeQuest.id, board[0].id);
});

test('la misión principal entrega equipo de la clase cada cinco niveles, no en cada misión', () => {
  const { data, player } = playerAtLevel(5);
  const root = game.ensureRoot(data);
  player.quests ||= {};
  player.quests.nivel_4_campeon = { completed: true, status: 'completed' };
  player.quests.nivel_5_rastros = { completed: true, status: 'completed' };
  player.quests.nivel_5_patrulla = { completed: true, status: 'completed' };
  const accepted = game.acceptQuest(player, 'nivel_5_campeon');
  assert.equal(accepted.error, undefined);
  assert.deepEqual(player.activeQuest.rewardItems, ['main_warrior_5']);
  assert.equal(game.ITEMS.main_warrior_5.level, 5);
  assert.equal(game.ITEMS.main_warrior_5.slot, 'armor');
  assert.equal(game.ITEMS.main_warrior_5.classKey, 'warrior');
  assert.match(game.formatItem('main_warrior_5'), /exclusivo de Guerrero[\s\S]*fuerza/i);
  player.attack = 100000;
  game.startCombat(root, player, 'elite_5');
  const result = game.combatAttack(root, player);
  assert.equal(result.quest.completed, true);
  assert.ok(player.inventory.includes('main_warrior_5'));
  assert.equal(player.equipment.armor, 'main_warrior_5');
  const laterMain = game.QUESTS.find(q => q.id === 'nivel_6_campeon');
  assert.deepEqual(game.questRewards(laterMain, 6, player).rewardItems, []);
  const mage = playerAtLevel(5).player;
  mage.classKey = 'mago';
  assert.match(game.equip(mage, 'main_warrior_5').error, /pertenece a la clase Guerrero/i);
});

test('los encargos opcionales no requieren completar secundarias para desbloquearse', () => {
  const { player } = playerAtLevel(2);
  const firstMain = game.QUESTS.find(q => q.mainQuest && q.minLevel === 1);
  player.quests[firstMain.id] = { completed: true, status: 'completed' };
  const unfinishedSecondary = game.QUESTS.filter(q => q.campaign && q.minLevel === 1 && !q.mainQuest).some(q => !player.quests[q.id]?.completed);
  assert.equal(unfinishedSecondary, true);
  const optional = game.ensureRepeatableMissionBoard(player).missions;
  assert.equal(optional.length, 3);
  assert.equal(player.repeatableMissionsUnlocked, true);
  assert.equal(game.getQuestBoard(player).length, 1, 'el tablón principal sigue mostrando solo la principal actual');
});

test('los encargos secundarios aleatorios tienen NPC con habilidades, hacen daño, persisten y se reponen', () => {
  const { data, player } = playerAtLevel(2);
  const root = game.ensureRoot(data);
  player.repeatableMissionsUnlocked = true;
  const board = game.getQuestBoard(player);
  assert.equal(board.length, 1, 'el tablón principal no mezcla encargos opcionales');
  const side = game.ensureRepeatableMissionBoard(player).missions;
  assert.equal(side.length, 3);
  assert.equal(new Set(side.map(q => q.id)).size, 3);
  const quest = side[0];
  const accepted = game.acceptQuest(player, quest.id);
  assert.equal(accepted.error, undefined);
  const target = game.getEnemiesForPlayer(player).find(enemy => enemy.id === quest.enemyId);
  assert.equal(target.missionTarget, true);
  assert.ok(target.attacks.length >= 2);
  const started = game.startCombat(root, player, quest.enemyId);
  assert.equal(started.error, undefined);
  player.attack = 1;
  const hpBefore = player.hp;
  const turn = game.combatAttack(root, player);
  assert.ok(turn.incoming > 0);
  assert.ok(player.hp < hpBefore);
  assert.match(turn.log.join('\n'), /usa .+ y te inflige \d+ de daño/i);
  const restored = JSON.parse(JSON.stringify(data));
  const savedPlayer = game.ensureRoot(restored).players[player.id];
  assert.ok(savedPlayer.generatedMissionEnemies[quest.enemyId]);
  assert.ok(game.getEnemiesForPlayer(savedPlayer).some(enemy => enemy.id === quest.enemyId && enemy.missionTarget));
  const originalIds = new Set(side.map(item => item.id));
  player.attack = 100000;
  while (player.activeQuest) {
    player.hp = player.maxHp;
    const current = root.combat[player.id];
    if (!current || current.status !== 'active') game.startCombat(root, player, player.activeQuest.enemyId);
    game.combatAttack(root, player);
  }
  const refreshed = game.ensureRepeatableMissionBoard(player).missions;
  assert.equal(refreshed.length, 3);
  assert.ok(refreshed.some(item => !originalIds.has(item.id)));
  assert.ok(player.questHistory.some(item => item.id === quest.id && item.status === 'completed'));
});

test('la tienda limita el equipo al tramo y la fuerza de las armas escala con el nivel y la rareza', () => {
  const { player } = playerAtLevel(10);
  const common = game.shopItems(player);
  assert.ok(common.every(item => item.level >= 1 && item.level <= 10 && item.rarity === 'common'));
  assert.equal(common.some(item => item.questReward), false);
  player.level = 11;
  const rare = game.shopItems(player);
  assert.ok(rare.every(item => item.level >= 11 && item.level <= 20 && item.rarity === 'rare'));
  player.level = 21;
  assert.ok(game.shopItems(player).every(item => item.level >= 21 && item.level <= 30 && item.rarity === 'epic'));
  const weaponIds = ['common_10_blade', 'rare_11_blade', 'epic_21_blade', 'legendary_31_blade', 'mythic_51_blade', 'mythic_80_blade'];
  const damage = weaponIds.map(id => game.ITEMS[id].attack);
  assert.deepEqual(damage, [...damage].sort((a, b) => a - b));
  const bow = game.formatItem('rare_11_bow');
  assert.match(bow, /ataque \+\d+[\s\S]*agilidad \+\d+/i);
  assert.doesNotMatch(bow, /fuerza|intelecto \+0/i);
});

test('un duelo entre dos cuentas conserva vidas y aceptar otra vez no devuelve falso error', () => {
  const data = {};
  const alice = game.createPlayer(data, '5350000101@s.whatsapp.net', 'Alice', 'warrior').player;
  const bob = game.createPlayer(data, '5350000102@s.whatsapp.net', 'Bob', 'mage').player;
  const root = game.ensureRoot(data);
  const invitation = game.createDuel(root, alice, bob.id);
  assert.equal(invitation.error, undefined);
  const accepted = game.acceptDuel(root, bob);
  assert.equal(accepted.error, undefined);
  assert.equal(accepted.duel.status, 'active');
  assert.equal(accepted.duel.hp[alice.id], alice.maxHp);
  assert.equal(accepted.duel.hp[bob.id], bob.maxHp);
  const acceptedAgain = game.acceptDuel(root, bob);
  assert.equal(acceptedAgain.error, undefined);
  assert.equal(acceptedAgain.alreadyActive, true);
  alice.attack = 100000;
  const hit = game.duelAttack(root, alice);
  assert.equal(hit.victory, true);
  assert.equal(hit.duel.status, 'completed');
  assert.equal(hit.duel.winner, alice.id);
});


test('el parser enruta /accept rem y /cancel rem a las respuestas de reembolso', () => {
  assert.equal(parseCommandText('/accept rem').commandName, 'aceptarreembolso');
  assert.equal(parseCommandText('/cancel rem').commandName, 'cancelarreembolso');
  assert.equal(parseCommandText('/accept rem TX123').q, 'TX123');
});
