'use strict';

const crypto = require('crypto');
const game = require('./warcraft');
const transfers = require('./warcraftTransfers');

const MAP_CELLS = { aldea: [0, 5], frontera: [1, 0], montana: [0, 4], sombras: [4, 0], torre: [1, 2] };
const RARITY_KEYS = new Set(['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']);

function text(value, max = 120) { return String(value ?? '').trim().slice(0, max); }
function positiveInt(value, fallback = 1, max = 1000000) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= max ? parsed : fallback;
}
function ensureCharacterStore(root) {
  root.characters ||= {};
  root.activeCharacterIds ||= {};
  let changed = false;
  for (const [key, player] of Object.entries(root.players || {})) {
    if (!player) continue;
    const phone = game.normalizePhone(player.ownerPhone || player.jid || key);
    if (!phone) continue;
    if (player.ownerPhone !== phone) { player.ownerPhone = phone; changed = true; }
    if (!player.characterId) { player.characterId = `legacy-${phone}`; changed = true; }
    if (!root.activeCharacterIds[phone]) { root.activeCharacterIds[phone] = player.characterId; changed = true; }
    if (root.activeCharacterIds[phone] === player.characterId && root.characters[player.characterId] !== player) {
      root.characters[player.characterId] = player;
      changed = true;
    }
  }
  for (const account of Object.values(root.accounts || {})) {
    if (!account) continue;
    const phone = game.normalizePhone(account.phone);
    if (!phone) continue;
    const current = root.players[phone];
    const activeId = account.activeCharacterId || root.activeCharacterIds[phone] || current?.characterId;
    if (!activeId || !root.characters[activeId]) continue;
    if (account.activeCharacterId !== activeId) { account.activeCharacterId = activeId; changed = true; }
    if (root.activeCharacterIds[phone] !== activeId) { root.activeCharacterIds[phone] = activeId; changed = true; }
    if (current?.characterId !== activeId) {
      if (current?.characterId) root.characters[current.characterId] = current;
      const selected = root.characters[activeId];
      const active = { ...selected, id: phone, jid: selected.jid || `${phone}@s.whatsapp.net`, ownerPhone: phone, characterId: activeId };
      root.players[phone] = active;
      root.characters[activeId] = active;
      changed = true;
    }
  }
  return changed;
}
function characterSummaries(root, account) {
  const phone = game.normalizePhone(account?.phone);
  const activeId = account?.activeCharacterId || root.activeCharacterIds?.[phone] || root.players?.[phone]?.characterId;
  return Object.entries(root.characters || {}).filter(([, player]) => player && game.normalizePhone(player.ownerPhone || player.jid) === phone).map(([key, player]) => ({
    id: String(player.characterId || key),
    name: player.name,
    classKey: player.classKey,
    className: game.CLASS_CONFIG[player.classKey]?.label || player.classKey,
    classImage: classImage(player.classKey),
    level: Number(player.level || 1),
    zone: player.zone,
    zoneName: game.ZONES[player.zone]?.name || player.zone,
    hp: Number(player.hp || 0),
    maxHp: Number(player.maxHp || 0),
    gs: Number(player.gs || 0),
    selected: String(player.characterId || key) === String(activeId || '')
  })).sort((a, b) => Number(b.selected) - Number(a.selected) || a.name.localeCompare(b.name, 'es'));
}
function nextCharacterId(root, phone) {
  let number = 1;
  let id;
  do { id = `wc-${phone}-${number++}`; } while (root.characters?.[id]);
  return id;
}
function temporaryPlayerPhone(root, phone) {
  let candidate;
  do { candidate = `${phone}${Date.now()}${crypto.randomInt(100000, 999999)}`; } while (root.players?.[candidate]);
  return candidate;
}
function itemKind(item = {}) {
  const hint = `${item.id || ''} ${item.name || ''} ${item.slot || ''}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (item.slot === 'weapon') {
    if (/daga|dagger|knife|cuchillo/.test(hint)) return 'dagger';
    if (/arco|bow/.test(hint)) return 'longbow';
    if (/baston|staff|vara/.test(hint)) return 'staff';
    if (/orbe|orb|cristal|gem/.test(hint)) return 'crystal';
    return 'blade';
  }
  if (/potion|pocion|elixir|elixir/.test(hint)) return 'potion';
  if (/hierba|herb/.test(hint)) return 'herb';
  if (/cristal|gem|esencia/.test(hint)) return 'crystal';
  if (/mineral|mining|cobre|hierro|mineral/.test(hint)) return 'mineral';
  if (/colmillo|fang|hueso/.test(hint)) return 'fang';
  if (/sombra|shadow|oscuro/.test(hint)) return 'shadow';
  if (item.slot === 'armor') {
    if (/tunica|vestidura|robe|manto|capa|cloth|tela/.test(hint)) return 'robe';
    // El asset leather del atlas representa botas; las piezas de torso usan el icono de pechera.
    return 'armor';
  }
  return 'potion';
}
function itemImage(item = {}) {
  const rarity = RARITY_KEYS.has(String(item.rarity || '').toLowerCase()) ? String(item.rarity).toLowerCase() : 'common';
  return `/assets/warcraft/generated/items/${itemKind(item)}-${rarity}.png`;
}
function enrichItem(item, id) {
  if (!item) return null;
  return { id: id || item.id || '', ...item, image: itemImage({ ...item, id: id || item.id }) };
}
function classImage(classKey) { return `/assets/warcraft/generated/classes/${encodeURIComponent(classKey)}.png`; }
function mapImage(zoneId) {
  const cell = MAP_CELLS[zoneId] || MAP_CELLS.aldea;
  return `/assets/warcraft/generated/maps/map-${cell[0]}-${cell[1]}.png`;
}
function publicPlayer(player) {
  if (!player) return null;
  const view = { ...player };
  delete view.jid;
  delete view.id;
  delete view.ownerPhone;
  delete view.characterId;
  view.talentPointsSpent = game.talentPointsUsed(player);
  view.classImage = classImage(view.classKey);
  view.zoneImage = mapImage(view.zone);
  view.xpForNext = game.xpForLevel(view.level);
  return view;
}
function publicParty(root, player) {
  const party = player?.partyId && root.parties?.[player.partyId];
  if (!party) return null;
  return { id: party.id, leader: root.players?.[party.leader]?.name || 'Líder', members: (party.members || []).map(id => {
    const member = root.players?.[id];
    return member ? { name: member.name, classKey: member.classKey, level: member.level, hp: member.hp, maxHp: member.maxHp, role: game.roleForPlayer(member) } : null;
  }).filter(Boolean) };
}
function publicDuel(root, player) {
  if (!player) return null;
  const duel = Object.values(root.duels || {}).find(value => value && ['pending', 'active'].includes(value.status) && (value.players || []).includes(player.id));
  if (!duel) return null;
  const ids = duel.players || [];
  return { id: duel.id, status: duel.status, myTurn: duel.turn === player.id, players: ids.map(id => {
    const member = root.players?.[id];
    return member ? { name: member.name, classKey: member.classKey, hp: duel.status === 'active' ? Number(duel.hp?.[id] ?? member.maxHp) : member.hp, maxHp: member.maxHp, level: member.level, isMe: id === player.id } : null;
  }).filter(Boolean) };
}
function publicDungeon(status) {
  if (!status) return null;
  const { run, dungeon, enemy, currentPlayer, members } = status;
  return {
    dungeon: dungeon ? { id: dungeon.id, name: dungeon.name, level: dungeon.level } : null,
    round: run?.round || 1,
    status: run?.status || 'active',
    enemy: enemy ? { name: enemy.name, hp: enemy.hp, maxHp: enemy.maxHp, level: enemy.level, roomName: enemy.roomName } : null,
    currentPlayer: currentPlayer ? { name: currentPlayer.name, role: game.roleForPlayer(currentPlayer) } : null,
    members: (members || []).map(member => ({ name: member.name, hp: member.hp, maxHp: member.maxHp, role: member.role, active: member.active }))
  };
}
function publicTransactions(root, player) {
  return Object.values(root.reimbursements || {}).filter(tx => tx && tx.status === 'pending' && [tx.fromPhone, tx.toPhone].includes(player.id)).map(tx => ({
    id: tx.id,
    status: tx.status,
    fromName: tx.fromName || root.players?.[tx.fromPhone]?.name || 'Jugador',
    toName: tx.toName || root.players?.[tx.toPhone]?.name || 'Jugador',
    incoming: tx.toPhone === player.id,
    offer: tx.offer,
    request: tx.request
  }));
}
function publicTrades(root, player) {
  return Object.values(root.trades || {}).filter(trade => trade && trade.status === 'pending' && (trade.participants || [trade.owner, trade.guest]).includes(player.id)).map(trade => {
    const participants = trade.participants || [trade.owner, trade.guest];
    const initiator = participants[0];
    return {
      id: trade.id,
      status: trade.status,
      incoming: participants[1] === player.id,
      fromName: root.players?.[initiator]?.name || 'Jugador'
    };
  }).filter(trade => trade.incoming);
}
function playerState(root, account) {
  const characterChanged = ensureCharacterStore(root);
  const characters = characterSummaries(root, account);
  const player = game.playerForAccount(root, account);
  if (!player) return { player: null, changed: characterChanged, characters, inventoryDetails: [], equipmentDetails: [], quests: [], enemies: [], combat: null, duel: null, party: null, dungeon: null, transactions: [], trades: [] };
  const before = JSON.stringify({ quests: player.quests, activeQuest: player.activeQuest });
  const quests = game.getQuestBoard(player);
  const changed = before !== JSON.stringify({ quests: player.quests, activeQuest: player.activeQuest });
  const counts = game.inventoryCounts(player);
  const inventoryDetails = Object.entries(counts).map(([id, quantity]) => ({ ...enrichItem(game.ITEMS[id], id), quantity }));
  const equipmentDetails = Object.entries(player.equipment || {}).map(([slot, id]) => ({ slot, ...enrichItem(game.ITEMS[id], id) })).filter(item => item.name);
  const run = Object.values(root.dungeonRuns || {}).find(value => value && value.status === 'active' && (value.roster || value.members || []).includes(player.id));
  const activeRun = run ? publicDungeon(game.dungeonRunStatus(root, player)) : null;
  const pendingDuel = Object.values(root.duels || {}).find(value => value && value.status === 'pending' && value.players?.[1] === player.id);
  const rawCombat = root.combat?.[player.id];
  const combat = rawCombat?.status === 'active' ? { id: rawCombat.id, enemyId: rawCombat.enemyId, enemy: rawCombat.enemy ? { ...rawCombat.enemy } : null, status: rawCombat.status, round: rawCombat.round, log: rawCombat.log || [] } : null;
  const guild = player.guildId && root.guilds?.[player.guildId];
  return {
    player: publicPlayer(player),
    changed: characterChanged || changed,
    characters,
    inventoryDetails,
    equipmentDetails,
    quests,
    enemies: game.getEnemiesForPlayer(player),
    skills: game.skillsForPlayer(player),
    skillProgression: game.skillProgressionForPlayer(player),
    combat,
    duel: publicDuel(root, player),
    pendingDuel: pendingDuel ? { id: pendingDuel.id, challenger: root.players?.[pendingDuel.players[0]]?.name || 'Jugador' } : null,
    party: publicParty(root, player),
    dungeon: activeRun,
    guild: guild ? { id: guild.id, name: guild.name, members: (guild.members || []).map(id => root.players?.[id]?.name).filter(Boolean) } : null,
    professions: player.professions || {},
    professionXp: player.professionXp || {},
    mounts: player.mounts || [],
    achievements: player.achievements || {},
    mail: (root.mail?.[player.id] || []).map(mail => ({ id: mail.id, item: mail.item, gold: mail.gold, claimed: mail.claimed, sentAt: mail.sentAt, senderName: root.players?.[mail.from]?.name || 'Jugador' })),
    auctions: game.listAuction(root).map(auction => ({ id: auction.id, item: auction.item, price: auction.price, status: auction.status, expiresAt: auction.expiresAt, sellerName: root.players?.[auction.seller]?.name || 'Jugador', itemInfo: enrichItem(game.ITEMS[auction.item], auction.item) })),
    transactions: publicTransactions(root, player),
    trades: publicTrades(root, player)
  };
}
function catalog() {
  return {
    classes: Object.entries(game.CLASS_CONFIG).map(([id, item]) => ({ id, ...item, image: classImage(id) })),
    rarities: game.RARITY,
    items: Object.fromEntries(Object.entries(game.ITEMS).map(([id, item]) => [id, enrichItem(item, id)])),
    enemies: game.ENEMIES,
    dungeons: game.DUNGEONS,
    zones: Object.entries(game.ZONES).map(([id, zone]) => ({ id, ...zone, image: mapImage(id) })),
    recipes: game.RECIPES,
    materialSources: game.MATERIAL_SOURCES,
    mounts: game.MOUNTS,
    achievements: game.ACHIEVEMENTS,
    enchantments: game.ENCHANTMENTS,
    specializations: game.DRUID_SPECIALIZATIONS,
    professions: ['mineria', 'herbalismo', 'alquimia', 'herreria'],
    talents: ['attack', 'defense', 'vitality']
  };
}
function resolvePlayer(root, input) {
  const target = text(input, 80);
  if (!target) return null;
  const phone = game.normalizePhone(target);
  if (phone && root.players?.[phone]) return root.players[phone];
  const username = target.toLowerCase();
  const account = Object.values(root.accounts || {}).find(value => String(value.username || '').toLowerCase() === username || game.normalizePhone(value.phone) === phone);
  if (account) return game.playerForAccount(root, account);
  const byName = Object.values(root.players || {}).find(value => String(value.name || '').toLowerCase() === username);
  return byName || null;
}
function parseAsset(player, type, itemId, amount) {
  const kind = String(type || '').toLowerCase();
  if (kind === 'none') return { type: 'none' };
  if (kind === 'gold') {
    const gold = positiveInt(amount, 0, 100000000);
    if (!gold) return { error: 'Indica una cantidad de oro válida.' };
    if (player && player.gold < gold) return { error: 'No tienes suficiente oro.' };
    return { type: 'gold', amount: gold };
  }
  if (kind === 'item') {
    const id = game.findItemId(itemId);
    const quantity = positiveInt(amount, 1, 100);
    if (!id) return { error: 'No reconozco ese objeto.' };
    if (player && (player.inventory || []).filter(value => value === id).length < quantity) return { error: 'No tienes esa cantidad de objetos.' };
    return { type: 'item', itemId: id, quantity };
  }
  return { error: 'Elige oro, objeto o nada.' };
}
function ok(message, result = null) { return { ok: true, changed: true, message, result }; }
function fail(message, status = 400) { return { ok: false, changed: false, status, message: String(message || 'La acción no se pudo completar.') }; }
function fromResult(result, message) {
  if (result?.error) return { ...fail(result.error), changed: Boolean(result.changed) };
  return ok(message || result?.message || 'Acción completada.', result);
}
function execute({ botData, root, account, input = {} }) {
  const body = input && typeof input === 'object' ? input : {};
  const action = text(body.action, 50).toLowerCase().replace(/[\s-]+/g, '_');
  const phone = game.normalizePhone(account?.phone);
  if (!phone || !account?.username) return fail('La cuenta web no está vinculada a un personaje.', 401);
  ensureCharacterStore(root);
  let player = game.playerForAccount(root, account);
  const args = body.params && typeof body.params === 'object' ? body.params : body;

  if (action === 'select_character') {
    const characterId = text(args.characterId || args.id, 100);
    const selected = root.characters?.[characterId];
    if (!selected || game.normalizePhone(selected.ownerPhone || selected.jid) !== phone) return fail('Ese personaje no pertenece a tu cuenta.');
    if (player?.characterId === characterId) return { ok: true, changed: false, message: `Ya estás jugando con ${player.name}.` };
    const activeCombat = root.combat?.[phone]?.status === 'active';
    const activeDuel = Object.values(root.duels || {}).some(duel => duel?.status === 'active' && (duel.players || []).includes(phone));
    const activeDungeon = Object.values(root.dungeonRuns || {}).some(run => run?.status === 'active' && (run.roster || run.members || []).includes(phone));
    const activeTrade = Object.values(root.trades || {}).some(trade => ['pending', 'active'].includes(trade?.status) && (trade.participants || [trade.owner, trade.guest]).includes(phone));
    const activeRefund = Object.values(root.reimbursements || {}).some(transaction => transaction?.status === 'pending' && [transaction.fromPhone, transaction.toPhone].includes(phone));
    if (activeCombat || activeDuel || activeDungeon || activeTrade || activeRefund) return fail('Termina el combate, duelo, mazmorra o intercambio pendiente antes de cambiar de personaje.');
    if (player?.characterId) root.characters[player.characterId] = player;
    player = { ...selected, id: phone, jid: selected.jid || `${phone}@s.whatsapp.net`, ownerPhone: phone, characterId };
    root.players[phone] = player;
    root.characters[characterId] = player;
    root.activeCharacterIds[phone] = characterId;
    account.activeCharacterId = characterId;
    return ok(`Ahora juegas con ${player.name}.`);
  }

  if (action === 'create_character') {
    const name = text(args.name, 20);
    if (!/^[\p{L}0-9 _'-]{2,20}$/u.test(name)) return fail('El nombre debe tener entre 2 y 20 caracteres.');
    const existing = characterSummaries(root, account);
    const characterId = nextCharacterId(root, phone);
    const storagePhone = existing.length ? temporaryPlayerPhone(root, phone) : phone;
    const result = game.createPlayer(botData, `${storagePhone}@s.whatsapp.net`, name, text(args.classKey || args.class, 40));
    if (result.error) return fail(result.error);
    const created = result.player;
    if (storagePhone !== phone) delete root.players[storagePhone];
    created.id = phone;
    created.jid = `${phone}@s.whatsapp.net`;
    created.ownerPhone = phone;
    created.characterId = characterId;
    root.characters[characterId] = created;
    if (!existing.length) {
      root.players[phone] = created;
      root.activeCharacterIds[phone] = characterId;
      account.activeCharacterId = characterId;
      player = created;
    }
    return ok(`Personaje ${created.name} creado. Elige con cuál quieres jugar.`, { player: publicPlayer(created), characters: characterSummaries(root, account) });
  }
  if (!player) return fail('Primero crea tu personaje desde el panel de juego.', 400);

  switch (action) {
    case 'quest_accept': return fromResult(game.acceptQuest(player, text(args.id || args.questId, 80)), 'Misión aceptada. El objetivo queda activo y se completa con tus combates.');
    case 'quest_cancel': return fromResult(game.cancelQuest(player), 'Misión cancelada.');
    case 'combat_start': return fromResult(game.startCombat(root, player, text(args.enemyId || args.id, 60)), 'Combate iniciado.');
    case 'combat_attack': return fromResult(game.combatAttack(root, player, text(args.skillId || args.skill || 'auto', 60)), 'Turno resuelto.');
    case 'combat_flee':
      if (!root.combat?.[player.id] || root.combat[player.id].status !== 'active') return fail('No tienes un combate activo.');
      root.combat[player.id].status = 'fled';
      return ok('Te retiraste del combate.');
    case 'equip_item': return fromResult(game.equip(player, text(args.itemId || args.id, 80)), 'Equipo actualizado.');
    case 'use_item': return fromResult(game.useItem(player, text(args.itemId || args.id, 80)), 'Objeto usado.');
    case 'shop_prepare': {
      const itemId = text(args.itemId || args.id, 80);
      const item = game.ITEMS[itemId];
      if (!item) return fail('Objeto inexistente.');
      if (item.questReward) return fail('Ese objeto solo se obtiene al completar una misión principal.');
      if (item.classKey && item.classKey !== player.classKey) return fail(`Ese objeto es exclusivo de ${game.CLASS_CONFIG[item.classKey]?.label || item.classKey}.`);
      if (player.level < Number(item.level || 1)) return fail(`Necesitas nivel ${item.level} para comprarlo.`);
      if (player.gold < Number(item.price || 0)) return fail('No tienes suficiente oro.');
      root.pendingPurchases ||= {};
      root.pendingPurchases[player.id] = { itemId, expiresAt: Date.now() + 120000 };
      return { ok: true, changed: true, message: `¿Confirmas ${item.name} por ${item.price} de oro?`, result: { item: enrichItem(item, itemId) } };
    }
    case 'shop_confirm': {
      const pending = root.pendingPurchases?.[player.id];
      if (!pending) return fail('No hay una compra pendiente válida.');
      if (pending.expiresAt < Date.now()) { delete root.pendingPurchases?.[player.id]; return { ...fail('La confirmación de compra expiró. Vuelve a elegir el objeto.'), changed: true }; }
      const result = game.buy(player, pending.itemId);
      delete root.pendingPurchases[player.id];
      return fromResult(result, result?.item ? `Compraste ${result.item.name}.` : 'Compra completada.');
    }
    case 'shop_cancel': {
      const hadPending = Boolean(root.pendingPurchases?.[player.id]);
      if (root.pendingPurchases) delete root.pendingPurchases[player.id];
      return { ok: true, changed: hadPending, message: 'Compra cancelada.' };
    }
    case 'talent': return fromResult(game.spendTalent(player, text(args.talent, 30).toLowerCase()), 'Talento mejorado.');
    case 'specialization': return fromResult(game.chooseDruidSpecialization(player, text(args.specialization, 40)), 'Especialización actualizada.');
    case 'travel': return fromResult(game.travel(player, text(args.zoneId || args.zone, 40).toLowerCase()), 'Viaje completado.');
    case 'profession_learn': return fromResult(game.learnProfession(player, text(args.profession, 40).toLowerCase()), 'Profesión aprendida.');
    case 'gather': return fromResult(game.gather(player, text(args.node || args.material, 60).toLowerCase()), 'Recolección completada.');
    case 'craft': return fromResult(game.craft(player, text(args.recipeId || args.recipe, 60)), 'Fabricación completada.');
    case 'daily': return fromResult(game.daily(player), 'Recompensa diaria reclamada.');
    case 'mount_buy': return fromResult(game.buyMount(player, text(args.mountId || args.id, 60)), 'Montura comprada.');
    case 'party_create': return fromResult(game.createParty(root, player), 'Grupo creado.');
    case 'party_join': return fromResult(game.joinParty(root, player, text(args.partyId || args.id, 30)), 'Te uniste al grupo.');
    case 'party_leave': return fromResult(game.leaveParty(root, player), 'Saliste del grupo.');
    case 'dungeon_start': return fromResult(game.startDungeonRun(root, player, text(args.dungeonId || args.id, 50)), 'Mazmorra iniciada.');
    case 'dungeon_attack': return fromResult(game.dungeonAction(root, player, text(args.skillId || args.skill || 'auto', 60)), 'Turno de mazmorra resuelto.');
    case 'dungeon_aggro': return fromResult(game.dungeonAggro(root, player), 'Agro actualizado.');
    case 'dungeon_heal': return fromResult(game.dungeonHeal(root, player, text(args.targetId || args.target || 'banda', 60)), 'Sanación resuelta.');
    case 'duel_challenge': {
      const target = resolvePlayer(root, args.target || args.targetId);
      if (!target) return fail('No encontré al jugador. Usa su usuario WoW, nombre o teléfono vinculado.');
      return fromResult(game.createDuel(root, player, target.id), 'Desafío de duelo enviado.');
    }
    case 'duel_accept': {
      const result = game.acceptDuel(root, player);
      if (result.error) return fromResult(result, '');
      if (result.alreadyFinished) return { ok: true, changed: false, message: 'Ese duelo ya había terminado.' };
      if (result.alreadyActive) return { ok: true, changed: false, message: 'El duelo ya está activo. Revisa la vida y el turno de ambos jugadores.' };
      if (result.waitingForOpponent) return { ok: true, changed: false, message: 'Tu desafío está pendiente; el rival todavía no lo acepta.' };
      return fromResult(result, 'Duelo aceptado. Ya están en combate; revisa la vida de ambos jugadores.');
    }
    case 'duel_attack': {
      const result = game.duelAttack(root, player, text(args.skillId || args.skill || 'auto', 60));
      if (result.error) return fromResult(result, '');
      if (result.alreadyFinished) return { ok: true, changed: false, message: 'Ese duelo ya había terminado.' };
      return fromResult(result, 'Ataque de duelo resuelto.');
    }
    case 'duel_surrender': {
      const duel = Object.values(root.duels || {}).find(value => value && value.status === 'active' && (value.players || []).includes(player.id));
      if (!duel) return fail('No tienes un duelo activo.');
      const opponentId = (duel.players || []).find(id => id !== player.id);
      duel.status = 'forfeit'; duel.winner = opponentId; duel.loser = player.id; duel.finishedAt = new Date().toISOString();
      if (root.players?.[opponentId]) game.awardAchievement(root.players[opponentId], 'duel_winner');
      return ok('Te rendiste. El duelo terminó.');
    }
    case 'guild_create': return fromResult(game.guild(botData, 'create', player, text(args.name, 30)), 'Hermandad creada.');
    case 'guild_join': {
      const guildId = text(args.guildId || args.id, 40).toLowerCase();
      const guild = root.guilds?.[guildId];
      if (!guild) return fail('No existe esa hermandad.');
      if (player.guildId) return fail('Ya perteneces a una hermandad.');
      if ((guild.members || []).length >= 30) return fail('La hermandad está llena.');
      guild.members ||= []; guild.members.push(player.id); player.guildId = guild.id;
      return ok(`Te uniste a ${guild.name}.`);
    }
    case 'guild_leave': {
      const guild = player.guildId && root.guilds?.[player.guildId];
      if (!guild) return fail('No perteneces a ninguna hermandad.');
      guild.members = (guild.members || []).filter(id => id !== player.id);
      if (guild.leader === player.id && guild.members.length) guild.leader = guild.members[0];
      if (!guild.members.length) delete root.guilds[player.guildId];
      player.guildId = null;
      return ok('Saliste de la hermandad.');
    }
    case 'enchant': return fromResult(game.enchant(player, text(args.enchantId || args.id, 50), text(args.slot || 'weapon', 20)), 'Encantamiento aplicado.');
    case 'auction_list': return fromResult(game.auctionList(root, player, text(args.itemId || args.id, 80), positiveInt(args.price, 0, 100000000)), 'Objeto publicado en subasta.');
    case 'auction_buy': return fromResult(game.auctionBuy(root, player, text(args.auctionId || args.id, 30)), 'Objeto comprado en subasta.');
    case 'mail_send': {
      const target = resolvePlayer(root, args.target || args.targetId);
      if (!target) return fail('No encontré al destinatario.');
      return fromResult(game.sendMail(root, player, target.id, text(args.itemId || args.item, 80), positiveInt(args.gold, 0, 100000000)), 'Correo enviado.');
    }
    case 'mail_claim': return fromResult(game.claimMail(root, player), 'Buzón reclamado.');
    case 'gift': {
      const target = resolvePlayer(root, args.target || args.targetId);
      if (!target) return fail('No encontré al jugador destinatario.');
      const asset = parseAsset(player, args.assetType, args.itemId, args.amount);
      if (asset.error) return fail(asset.error);
      return fromResult(transfers.give(root, player, target, asset), 'Regalo enviado.');
    }
    case 'refund_create': {
      const target = resolvePlayer(root, args.target || args.targetId);
      if (!target) return fail('No encontré al jugador destinatario.');
      const offer = parseAsset(player, args.offerType, args.offerItemId, args.offerAmount);
      if (offer.error) return fail(offer.error);
      const request = parseAsset(null, args.requestType, args.requestItemId, args.requestAmount);
      if (request.error) return fail(request.error);
      if (request.type === 'gold' && request.amount > 100000000) return fail('La cantidad solicitada no es válida.');
      if (request.type === 'item' && !game.ITEMS[request.itemId]) return fail('El objeto solicitado no existe.');
      const created = transfers.createDraft(root, player, target, offer);
      if (created.error) return fail(created.error);
      const submitted = transfers.submitRequest(root, player.id, request);
      if (submitted.error) return fail(submitted.error);
      return ok(`Solicitud de intercambio enviada a ${target.name}.`, { transaction: submitted.transaction });
    }
    case 'refund_accept': {
      const matches = Object.values(root.reimbursements || {}).filter(value => value && value.toPhone === player.id && ['pending', 'completed'].includes(value.status) && (!args.transactionId || value.id === text(args.transactionId, 30))).sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0));
      const tx = matches.find(value => value.status === 'pending') || matches[0];
      if (!tx) return fail('No tienes ningún reembolso activo válido.');
      if (tx.status === 'completed') return { ok: true, changed: false, message: 'Este reembolso ya se había completado correctamente.' };
      return fromResult(transfers.accept(root, tx.id, player.id), 'Reembolso completado.');
    }
    case 'refund_cancel': {
      const tx = Object.values(root.reimbursements || {}).find(value => value && ['draft', 'pending', 'cancelled'].includes(value.status) && [value.fromPhone, value.toPhone].includes(player.id) && (!args.transactionId || value.id === text(args.transactionId, 30)));
      if (!tx) return fail('No tienes un reembolso que puedas cancelar.');
      if (tx.status === 'cancelled') return { ok: true, changed: false, message: 'Este reembolso ya estaba cancelado.' };
      if (tx.status === 'draft') {
        tx.status = 'cancelled'; tx.cancelledAt = new Date().toISOString();
        if (root.reimbursementDrafts) delete root.reimbursementDrafts[tx.fromPhone];
        return ok('Borrador de reembolso cancelado.');
      }
      return fromResult(transfers.cancel(root, tx.id, player.id), 'Reembolso cancelado.');
    }
    default: return fail('Acción Warcraft desconocida. Actualiza la página e inténtalo de nuevo.', 400);
  }
}

module.exports = { catalog, itemImage, itemKind, enrichItem, playerState, execute };
