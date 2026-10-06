const crypto = require('crypto');

const MAX_LEVEL = 80;
const CLASS_CONFIG = {
  warrior: { label: 'Guerrero', emoji: '⚔️', baseAttack: 8, baseDefense: 8, talent: 'Filo de batalla', skills: { golpe: { name: 'Golpe poderoso', multiplier: 1.35, cooldown: 2 }, escudo: { name: 'Bloqueo defensivo', multiplier: 0.65, cooldown: 3 } } },
  mago: { label: 'Mago', emoji: '🔮', baseAttack: 11, baseDefense: 4, talent: 'Chispa arcana', skills: { hechizo: { name: 'Descarga arcana', multiplier: 1.55, cooldown: 3 }, barrera: { name: 'Barrera arcana', multiplier: 0.5, cooldown: 3 } } },
  picaro: { label: 'Pícaro', emoji: '🗡️', baseAttack: 10, baseDefense: 5, talent: 'Golpe bajo', skills: { emboscada: { name: 'Emboscada', multiplier: 1.8, cooldown: 3 }, esquivar: { name: 'Evasión', multiplier: 0.4, cooldown: 3 } } }
};
const ITEMS = {
  rusty_sword: { name: 'Espada oxidada', slot: 'weapon', attack: 3, defense: 0, level: 1, price: 25 },
  apprentice_staff: { name: 'Bastón de aprendiz', slot: 'weapon', attack: 4, defense: 0, level: 1, price: 30 },
  shadow_dagger: { name: 'Daga de sombra', slot: 'weapon', attack: 4, defense: 0, level: 1, price: 30 },
  village_armor: { name: 'Armadura de la aldea', slot: 'armor', attack: 0, defense: 3, level: 1, price: 40 },
  iron_blade: { name: 'Hoja de hierro', slot: 'weapon', attack: 10, defense: 0, level: 10, price: 180 },
  arcane_staff: { name: 'Bastón arcano', slot: 'weapon', attack: 14, defense: 0, level: 18, price: 350 },
  nightfang: { name: 'Colmillo nocturno', slot: 'weapon', attack: 16, defense: 0, level: 22, price: 420 },
  dungeon_plate: { name: 'Placas de la cripta', slot: 'armor', attack: 0, defense: 14, level: 12, price: 450 },
  health_potion: { name: 'Poción de salud', slot: 'consumable', heal: 30, level: 1, price: 20, rarity: 'common' },
  hierba_lunar: { name: 'Hierba lunar', slot: 'material', level: 1, price: 0 },
  mineral_cobre: { name: 'Mineral de cobre', slot: 'material', level: 1, price: 0 },
  mineral_hierro: { name: 'Mineral de hierro', slot: 'material', level: 1, price: 0 },
  cristal_arcano: { name: 'Cristal arcano', slot: 'material', level: 1, price: 0 },
  colmillo_lobo: { name: 'Colmillo de lobo', slot: 'material', level: 1, price: 0 },
  cuero_grueso: { name: 'Cuero grueso', slot: 'material', level: 1, price: 0 },
  esencia_sombra: { name: 'Esencia de sombra', slot: 'material', level: 1, price: 0 }
};
const RARITY = { common: { label: 'Común', color: '⚪', multiplier: 1 }, uncommon: { label: 'Poco común', color: '🟢', multiplier: 1.2 }, rare: { label: 'Raro', color: '🔵', multiplier: 1.45 }, epic: { label: 'Épico', color: '🟣', multiplier: 1.8 }, legendary: { label: 'Legendario', color: '🟠', multiplier: 2.25 } };
const GEAR_LEVELS = [1, 10, 20, 30, 40, 50, 60, 70, 80];
for (const level of GEAR_LEVELS) {
  for (const [rarity, info] of Object.entries(RARITY)) {
    const tier = Math.max(1, Math.ceil(level / 10));
    const base = Math.round((5 + tier * 4) * info.multiplier);
    const prefix = `${rarity}_${level}`;
    const label = `${info.label} · Nivel ${level}`;
    const price = Math.round((25 + level * 16) * info.multiplier);
    ITEMS[`${prefix}_blade`] = { name: `Hoja ${label}`, slot: 'weapon', attack: base, defense: 0, level, price, rarity };
    ITEMS[`${prefix}_robe`] = { name: `Armadura ${label}`, slot: 'armor', attack: 0, defense: Math.max(2, Math.round(base * 0.65)), level, price: Math.round(price * 0.9), rarity };
  }
}
for (const level of GEAR_LEVELS) {
  const info = RARITY.common;
  ITEMS[`health_potion_${level}`] = { name: `Poción de salud · Nivel ${level}`, slot: 'consumable', heal: 30 + level * 2, level, price: 20 + level * 5, rarity: 'common' };
}

const ENEMIES = {
  lobo: { name: 'Lobo sombrío', level: 1, hp: 55, attack: 7, defense: 2, attacks: [{ name: 'mordida', min: 2, max: 4 }, { name: 'zarpazo', min: 2, max: 5 }, { name: 'salto', min: 3, max: 5 }, { name: 'aullido cortante', min: 1, max: 4 }], xp: 35, gold: [8, 18], loot: ['health_potion'], materialLoot: ['colmillo_lobo'] },
  bandido: { name: 'Bandido del camino', level: 8, hp: 150, attack: 18, defense: 8, attacks: [{ name: 'corte rápido', min: 4, max: 7 }, { name: 'golpe de daga', min: 3, max: 8 }, { name: 'estocada', min: 5, max: 9 }], xp: 100, gold: [25, 55], loot: ['iron_blade', 'health_potion'], materialLoot: ['cuero_grueso'] },
  ogro: { name: 'Ogro de la montaña', level: 15, hp: 330, attack: 32, defense: 16, attacks: [{ name: 'mazazo', min: 7, max: 11 }, { name: 'pisotón', min: 6, max: 10 }, { name: 'embestida', min: 8, max: 12 }], xp: 260, gold: [70, 150], loot: ['dungeon_plate', 'nightfang'], materialLoot: ['esencia_sombra'] },
  gran_mago: { name: 'Gran mago', level: 25, hp: 620, attack: 54, defense: 28, attacks: [{ name: 'rayo arcano', min: 12, max: 19 }, { name: 'descarga de fuego', min: 10, max: 21 }, { name: 'onda mágica', min: 14, max: 18 }], xp: 760, gold: [180, 340], loot: ['nightfang', 'health_potion_20'], materialLoot: ['cristal_arcano'] }
};
const QUESTS = [
  { id: 'wolves', name: 'Lobos de la frontera', description: 'Derrota 3 lobos sombríos.', minLevel: 1, objective: 'kill', enemyId: 'lobo', goal: 3, xp: 90, gold: 45 },
  { id: 'crypt', name: 'Ecos de la cripta', description: 'Completa la Cripta de los Caídos.', minLevel: 5, objective: 'dungeon', dungeonId: 'crypt', goal: 1, xp: 260, gold: 140 },
  { id: 'bandits', name: 'Bandidos del camino', description: 'Derrota 5 bandidos del camino.', minLevel: 8, objective: 'kill', enemyId: 'bandido', goal: 5, xp: 420, gold: 260 },
  { id: 'ogres', name: 'La amenaza de la montaña', description: 'Derrota 3 ogros de la montaña.', minLevel: 15, objective: 'kill', enemyId: 'ogro', goal: 3, xp: 800, gold: 420 },
  { id: 'gran_mago', name: 'El Gran mago', description: 'Derrota al Gran mago de la Torre Arcana.', minLevel: 25, objective: 'kill', enemyId: 'gran_mago', goal: 1, xp: 1500, gold: 800 }
];
const DUNGEONS = [
  { id: 'crypt', name: 'Cripta de los Caídos', level: 5, minGold: 100, maxGold: 240, xp: 220, item: 'dungeon_plate', boss: 'bandido' },
  { id: 'forge', name: 'Forja de Hierro', level: 12, minGold: 240, maxGold: 520, xp: 480, item: 'iron_blade', boss: 'ogro' },
  { id: 'night', name: 'Cámara de la Noche', level: 20, minGold: 500, maxGold: 900, xp: 850, item: 'nightfang', boss: 'ogro' }
];
const ZONES = {
  aldea: { name: 'Aldea del Alba', level: 1, enemies: ['lobo'], gathering: ['hierba_lunar','mineral_cobre'] },
  frontera: { name: 'Frontera de Ceniza', level: 5, enemies: ['lobo','bandido'], gathering: ['hierba_lunar','mineral_hierro'] },
  montana: { name: 'Montaña del Trueno', level: 12, enemies: ['bandido','ogro'], gathering: ['mineral_hierro','cristal_arcano'] },
  sombras: { name: 'Tierras de Sombra', level: 20, enemies: ['ogro'], gathering: ['cristal_arcano'] },
  torre: { name: 'Torre Arcana', level: 25, enemies: ['gran_mago'], gathering: ['cristal_arcano'] }
};
const RECIPES = {
  elixir_salud: { name: 'Elixir de salud', profession: 'alquimia', level: 1, materials: { hierba_lunar: 2 }, output: 'health_potion', quantity: 2, skillXp: 3 },
  hoja_acero: { name: 'Hoja de acero', profession: 'herrería', level: 1, materials: { mineral_hierro: 3 }, output: 'iron_blade', quantity: 1, skillXp: 4 },
  placas_reforzadas: { name: 'Placas reforzadas', profession: 'herrería', level: 3, materials: { mineral_hierro: 5, cristal_arcano: 1 }, output: 'dungeon_plate', quantity: 1, skillXp: 6 }
};
const GATHER_NODES = { hierba_lunar: 'Hierba lunar', mineral_cobre: 'Mineral de cobre', mineral_hierro: 'Mineral de hierro', cristal_arcano: 'Cristal arcano' };
const MATERIAL_SOURCES = { hierba_lunar: 'Herbalismo en Aldea del Alba o Frontera de Ceniza', mineral_cobre: 'Minería en Aldea del Alba', mineral_hierro: 'Minería en Frontera de Ceniza o Montaña del Trueno', cristal_arcano: 'Minería en Montaña del Trueno o Tierras de Sombra', colmillo_lobo: 'Mata lobos sombríos', cuero_grueso: 'Mata bandidos del camino', esencia_sombra: 'Mata ogros de la montaña' };
function materialGuide() { return Object.entries(MATERIAL_SOURCES).map(([id, source]) => `${id}: ${source}`).join('\n'); }
function professionXpToNext(level) { return Math.max(5, Number(level || 1) * 5); }
function addProfessionXp(p, profession, amount) { p.professionXp[profession] = Number(p.professionXp[profession] || 0) + Number(amount || 0); const levels = []; while (p.professions[profession] && p.professionXp[profession] >= professionXpToNext(p.professions[profession])) { p.professionXp[profession] -= professionXpToNext(p.professions[profession]); p.professions[profession]++; levels.push(p.professions[profession]); } return levels; }
const ACHIEVEMENTS = { first_blood: ['Primera sangre', 'Derrota a tu primer enemigo', 25], level_10: ['Veterano', 'Alcanza el nivel 10', 100], dungeon_runner: ['Explorador de mazmorras', 'Completa una mazmorra', 150], crafter: ['Manos hábiles', 'Crea tu primer objeto', 75], duel_winner: ['Gladiador', 'Gana un duelo', 100] };
const MOUNTS = { lobo_gris: { name: 'Lobo gris', price: 250, level: 5 }, draco_azul: { name: 'Draco azul', price: 900, level: 20 } };
const ENCHANTMENTS = { filo: { name: 'Filo ígneo', slot: 'weapon', attack: 5, defense: 0, hp: 0, materials: { cristal_arcano: 1 }, level: 1 }, fortaleza: { name: 'Fortaleza pétrea', slot: 'armor', attack: 0, defense: 5, hp: 0, materials: { mineral_hierro: 2, cuero_grueso: 1 }, level: 1 }, vitalidad: { name: 'Vitalidad lunar', slot: 'armor', attack: 0, defense: 1, hp: 25, materials: { hierba_lunar: 2, cristal_arcano: 1, esencia_sombra: 1 }, level: 2 } };

function normalizePhone(value) { return String(value || '').replace(/\D/g, ''); }
function xpForLevel(level) { return level >= MAX_LEVEL ? 0 : Math.floor(100 * Math.pow(level, 1.35)); }
function ensureRoot(botData) { botData.warcraft ||= { players: {}, accounts: {}, trades: {}, guilds: {}, sessions: {}, combat: {}, cooldowns: {}, duels: {}, duelRequests: {}, pendingPurchases: {}, parties: {}, auctions: {}, mail: {}, battlegrounds: {}, world: {} }; const r = botData.warcraft; for (const key of ['players','accounts','trades','guilds','sessions','combat','cooldowns','duels','duelRequests','pendingPurchases','parties','auctions','mail','battlegrounds','world']) r[key] ||= {}; return r; }
function playerId(jid) { return String(jid || '').split('@')[0].split(':')[0].replace(/\D/g, ''); }
function playerForAccount(root, account) {
  if (!root?.players) return null;
  const phone = normalizePhone(account?.phone);
  if (phone && root.players[phone]) return root.players[phone];
  const username = String(account?.username || '').trim().toLowerCase();
  if (username) {
    for (const [sessionId, linkedUsername] of Object.entries(root.sessions || {})) {
      if (String(linkedUsername || '').trim().toLowerCase() !== username) continue;
      const player = root.players[normalizePhone(sessionId)];
      if (player) return player;
    }
  }
  for (const [key, player] of Object.entries(root.players)) {
    const ids = [key, player?.id, player?.jid].map(normalizePhone).filter(Boolean);
    if (phone && ids.includes(phone)) return player;
  }
  return null;
}
function ensurePlayer(botData, jid, name = 'Aventurero') { const root = ensureRoot(botData); const id = playerId(jid); const p = root.players[id]; if (!p) return null; normalizePlayer(p, name); return p; }
function normalizePlayer(p, fallbackName = 'Aventurero') { p.inventory ||= []; p.equipment ||= {}; p.talents ||= {}; p.quests ||= {}; p.questHistory ||= []; p.activeQuest ||= null; p.guildId ||= null; p.gold = Number(p.gold || 0); p.xp = Number(p.xp || 0); p.level = Number(p.level || 1); p.talentPoints = Math.max(0, Number(p.talentPoints || 0)); p.name ||= fallbackName; p.maxHp = Number(p.maxHp || 100 + p.level * 10); p.hp = Math.min(Number(p.hp ?? p.maxHp), p.maxHp); p.cooldowns ||= {}; p.zone ||= 'aldea'; p.professions ||= {}; p.professionXp ||= {}; p.reputation ||= {}; p.achievements ||= {}; p.mounts ||= []; p.daily ||= {}; p.lastDaily ||= 0; p.partyId ||= null; p.mail ||= []; p.enchantments ||= {}; recalc(p); return p; }
function createPlayer(botData, jid, name, classKey) { const root = ensureRoot(botData); const id = playerId(jid); if (root.players[id]) return { error: 'Ya tienes un personaje creado.' }; const key = String(classKey || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); const normalizedClass = ({ guerrero: 'warrior', warrior: 'warrior', mago: 'mago', picaro: 'picaro' })[key]; if (!CLASS_CONFIG[normalizedClass]) return { error: 'Clase inválida. Elige guerrero, mago o pícaro.' }; const p = { id, jid, name: String(name).trim().slice(0, 20), classKey: normalizedClass, level: 1, xp: 0, gold: 80, hp: 110, maxHp: 110, talentPoints: 0, talents: {}, inventory: ['rusty_sword', 'village_armor', 'health_potion'], equipment: { weapon: 'rusty_sword', armor: 'village_armor' }, quests: {}, cooldowns: {}, zone: 'aldea', professions: {}, professionXp: {}, reputation: {}, achievements: {}, mounts: [], daily: {}, partyId: null, mail: [], enchantments: {}, createdAt: new Date().toISOString() }; root.players[id] = p; recalc(p); return { player: p }; }
function recalc(p) { const cls = CLASS_CONFIG[p.classKey] || CLASS_CONFIG.warrior; const weapon = ITEMS[p.equipment?.weapon] || {}; const armor = ITEMS[p.equipment?.armor] || {}; const weaponEnchant = ENCHANTMENTS[p.enchantments?.weapon] || {}; const armorEnchant = ENCHANTMENTS[p.enchantments?.armor] || {}; p.attack = cls.baseAttack + Number(weapon.attack || 0) + Number(weaponEnchant.attack || 0) + Number(p.talents.attack || 0); p.defense = cls.baseDefense + Number(armor.defense || 0) + Number(armorEnchant.defense || 0) + Number(p.talents.defense || 0); p.maxHp = 100 + p.level * 10 + Number(armorEnchant.hp || 0) + Number(p.talents.vitality || 0) * 5; p.hp = Math.min(Number(p.hp ?? p.maxHp), p.maxHp); p.gs = Math.max(1, p.level * 10 + p.attack * 2 + p.defense * 2); return p; }
function grantXp(p, amount) { const events = []; if (p.level >= MAX_LEVEL) return events; p.xp += Number(amount || 0); while (p.level < MAX_LEVEL && p.xp >= xpForLevel(p.level)) { p.xp -= xpForLevel(p.level); p.level++; p.talentPoints = Number(p.talentPoints || 0) + 1; p.hp = p.maxHp; events.push(`🎉 Subiste al nivel ${p.level}. Ganaste 1 punto de talento.`); } recalc(p); return events; }
function questRewards(q, level) { const scale = 1 + Math.max(0, Number(level || 1) - Number(q.minLevel || 1)) * 0.05; return { xp: Math.round(q.xp * scale), gold: Math.round(q.gold * scale) }; }
function getQuestBoard(p) { return QUESTS.filter(q => Number(p?.level || 1) >= q.minLevel).map(q => ({ ...q, ...questRewards(q, p.level) })); }
function getEnemiesForPlayer(p) { const zone = ZONES[p?.zone] || ZONES.aldea; const ids = [...zone.enemies]; const target = p?.activeQuest?.enemyId; if (target && !ids.includes(target)) ids.push(target); return ids.filter(id => ENEMIES[id] && ENEMIES[id].level <= Number(p?.level || 1)).map(id => ({ id, ...ENEMIES[id], missionTarget: Boolean(p?.activeQuest?.enemyId === id) })); }
function acceptQuest(p, id) { if (p.activeQuest) return { error: `Ya tienes una misión activa: ${QUESTS.find(q => q.id === p.activeQuest.id)?.name || p.activeQuest.name}. Complétala o usa /cancelarmision.` }; const key = String(id || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_'); const q = QUESTS.find(item => item.id === key || item.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_') === key); if (!q) return { error: 'Misión desconocida. Usa /misiones para ver los IDs disponibles.' }; if (Number(p.level || 1) < q.minLevel) return { error: `Necesitas nivel ${q.minLevel} para aceptar esta misión.` }; const reward = questRewards(q, p.level); p.activeQuest = { id: q.id, name: q.name, objective: q.objective, enemyId: q.enemyId || null, dungeonId: q.dungeonId || null, goal: q.goal, progress: 0, rewardXp: reward.xp, rewardGold: reward.gold, acceptedAt: new Date().toISOString(), levelAtAcceptance: Number(p.level || 1) }; p.quests[q.id] = { progress: 0, completed: false, status: 'active' }; return { quest: p.activeQuest, template: q }; }
function cancelQuest(p) { const active = p?.activeQuest; if (!active) return { error: 'No tienes una misión activa. Usa /misiones para ver las disponibles.' }; p.questHistory ||= []; p.questHistory.push({ ...active, status: 'cancelled', cancelledAt: new Date().toISOString() }); p.quests[active.id] = { progress: Number(active.progress || 0), completed: false, status: 'cancelled' }; p.activeQuest = null; return { quest: active }; }
function progressActiveQuest(p, event, amount = 1) { const active = p?.activeQuest; if (!active) return null; const q = QUESTS.find(item => item.id === active.id); if (!q) { p.activeQuest = null; return null; } const matches = q.objective === 'kill' ? event?.type === 'kill' && event.enemyId === q.enemyId : q.objective === 'dungeon' ? event?.type === 'dungeon' && (!q.dungeonId || event.dungeonId === q.dungeonId) : false; if (!matches) return null; active.progress = Math.min(q.goal, Number(active.progress || 0) + Math.max(1, Number(amount || 1))); const record = p.quests[q.id] ||= {}; record.progress = active.progress; record.completed = false; record.status = 'active'; if (active.progress < q.goal) return { q, completed: false, progress: active.progress, goal: q.goal, xp: active.rewardXp, gold: active.rewardGold }; const completedQuest = { ...active }; const xp = Number(active.rewardXp || 0); const gold = Number(active.rewardGold || 0); p.gold += gold; const levels = grantXp(p, xp); record.progress = q.goal; record.completed = true; record.status = 'completed'; record.completedAt = new Date().toISOString(); p.questHistory ||= []; p.questHistory.push({ ...completedQuest, status: 'completed', completedAt: record.completedAt }); p.activeQuest = null; return { q, completed: true, progress: q.goal, goal: q.goal, xp, gold, levels }; }
function progressQuest(p, id, amount = 1) { const q = QUESTS.find(item => item.id === id); if (!q) return null; return progressActiveQuest(p, q.objective === 'kill' ? { type: 'kill', enemyId: q.enemyId } : { type: 'dungeon', dungeonId: q.dungeonId }, amount); }
function listItems(p) { return p.inventory.map((id, index) => ({ index: index + 1, id, ...(ITEMS[id] || { name: id }) })); }
function inventoryCounts(p) { const counts = {}; for (const id of p?.inventory || []) counts[id] = (counts[id] || 0) + 1; return counts; }
function findItemId(value) { const q = String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); if (!q) return null; const direct = Object.keys(ITEMS).find(id => id.toLowerCase() === q); if (direct) return direct; return Object.entries(ITEMS).find(([, item]) => { const n = item.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return n === q || n.includes(q) || (q === 'posion' && n.includes('pocion')); })?.[0] || null; }
function removeItems(p, items = []) { const copy = [...(p.inventory || [])]; for (const id of items) { const i = copy.indexOf(id); if (i < 0) return false; copy.splice(i, 1); } p.inventory = copy; return true; }
function autoEquipUpgrade(p, id) { const item = ITEMS[id]; if (!item || !['weapon','armor'].includes(item.slot)) return false; const current = ITEMS[p.equipment?.[item.slot]] || {}; const currentScore = Number(current.attack || 0) + Number(current.defense || 0); const newScore = Number(item.attack || 0) + Number(item.defense || 0); if (newScore <= currentScore) return false; p.equipment[item.slot] = id; recalc(p); return true; }
function equip(p, idOrName) { const id = findItemId(idOrName); const item = ITEMS[id]; if (!item) return { error: 'Objeto inexistente.' }; if (!p.inventory.includes(id)) return { error: 'No tienes ese objeto.' }; if (!['weapon','armor'].includes(item.slot)) return { error: 'Ese objeto no se puede equipar.' }; if (p.level < item.level) return { error: `Necesitas nivel ${item.level}.` }; p.equipment[item.slot] = id; recalc(p); return { item }; }
function useItem(p, idOrName) { const id = findItemId(idOrName); const item = ITEMS[id]; if (!item || item.slot !== 'consumable') return { error: 'Ese objeto no es un consumible.' }; if (!removeItems(p, [id])) return { error: 'No tienes ese objeto.' }; const before = p.hp; p.hp = Math.min(p.maxHp, p.hp + item.heal); return { item, healed: p.hp - before }; }
  function buy(p, id) { const item = ITEMS[id]; if (!item) return { error: 'Objeto inexistente.' }; if (item.slot === 'material') return { error: 'Los materiales deben recolectarse o recibirse de otro jugador; no se pueden comprar en esta tienda.' }; if (p.level < item.level) return { error: `Necesitas nivel ${item.level}.` }; if (p.gold < item.price) return { error: `Te faltan ${item.price - p.gold} de oro.` }; p.gold -= item.price; p.inventory.push(id); if (item.slot === 'weapon' && (!p.equipment.weapon || item.attack > (ITEMS[p.equipment.weapon]?.attack || 0))) p.equipment.weapon = id; if (item.slot === 'armor' && item.defense > (ITEMS[p.equipment.armor]?.defense || 0)) p.equipment.armor = id; recalc(p); return { item }; }
function startCombat(root, p, enemyId = 'lobo') { const base = ENEMIES[enemyId]; if (!base) return { error: 'Enemigo inválido. Consulta /enemigos.' }; if (p.hp <= 0) return { error: 'Estás derrotado. Usa una poción para levantarte antes de luchar.' }; if (p.level < base.level) return { error: `Necesitas nivel ${base.level}.` }; const zone = ZONES[p.zone] || ZONES.aldea; if (!zone.enemies.includes(enemyId) && p.activeQuest?.enemyId !== enemyId) return { error: `Ese enemigo no está en ${zone.name}. Usa /mapa y /viajar para llegar a su zona; el objetivo de una misión activa sí puede buscarse desde cualquier zona.` }; if (root.combat[p.id]?.status === 'active') return { error: 'Ya estás en combate. Termina el encuentro actual primero.' }; const enemy = { ...base, attacks: [...(base.attacks || [])], maxHp: base.hp }; const combat = { id: crypto.randomBytes(4).toString('hex'), playerId: p.id, enemyId, enemy, status: 'active', round: 1, log: [], startedAt: new Date().toISOString() }; root.combat[p.id] = combat; return { combat }; }
function combatAttack(root, p, skillId = 'auto') {
  const c = root.combat[p.id];
  if (!c || c.status !== 'active') return { error: 'No estás en combate. Usa /buscar lobo.' };
  if (p.hp <= 0) return { error: 'Estás derrotado. Usa una poción para volver a luchar.' };
  const cls = CLASS_CONFIG[p.classKey] || CLASS_CONFIG.warrior;
  const skill = skillId !== 'auto' ? cls.skills?.[skillId] : null;
  const cd = Number(p.cooldowns?.[skillId] || 0);
  if (skillId !== 'auto' && !skill) return { error: `Habilidad desconocida. Disponibles: ${Object.keys(cls.skills).join(', ')}.` };
  if (skill && cd > 0) return { error: `Esa habilidad estará lista en ${cd} turno(s).` };
  const raw = p.attack * (skill?.multiplier || (0.85 + Math.random() * 0.35));
  const critical = Math.random() < (skill ? 0.15 : 0.1);
  const damage = Math.max(1, Math.floor(raw * (critical ? 1.75 : 1) - c.enemy.defense * 0.35));
  c.enemy.hp = Math.max(0, Number(c.enemy.hp) - damage);
  const log = [`Ronda ${c.round}: ${skill ? skill.name : 'ataque básico'} inflige ${damage}${critical ? ' de daño crítico' : ' de daño'}.`, `❤️ ${c.enemy.name}: ${c.enemy.hp}/${c.enemy.maxHp} de vida.`];
  if (skill) p.cooldowns[skillId] = skill.cooldown;
  for (const k of Object.keys(p.cooldowns)) if (k !== skillId && p.cooldowns[k] > 0) p.cooldowns[k]--;
  if (c.enemy.hp <= 0) {
    c.status = 'victory';
    const gold = c.enemy.gold[0] + Math.floor(Math.random() * (c.enemy.gold[1] - c.enemy.gold[0] + 1));
    p.gold += gold;
    const levels = grantXp(p, c.enemy.xp);
    const quest = progressActiveQuest(p, { type: 'kill', enemyId: c.enemyId });
    const loot = c.enemy.loot?.length && Math.random() < 0.45 ? c.enemy.loot[Math.floor(Math.random() * c.enemy.loot.length)] : null;
    let equippedLoot = false;
    if (loot) { p.inventory.push(loot); equippedLoot = autoEquipUpgrade(p, loot); }
    const materialLoot = c.enemy.materialLoot?.length && Math.random() < 0.7 ? c.enemy.materialLoot[Math.floor(Math.random() * c.enemy.materialLoot.length)] : null;
    if (materialLoot) p.inventory.push(materialLoot);
    recalc(p); c.log.push(...log); c.lastHit = damage;
    return { victory: true, damage, gold, loot, materialLoot, equippedLoot, levels, quest, log, combat: c, enemyHp: 0, enemyMaxHp: c.enemy.maxHp };
  }
  const attacks = c.enemy.attacks?.length ? c.enemy.attacks : [{ name: 'ataque', min: 1, max: Math.max(2, c.enemy.attack) }];
  const enemyAttack = attacks[Math.floor(Math.random() * attacks.length)];
  const rawIncoming = enemyAttack.min + Math.floor(Math.random() * (enemyAttack.max - enemyAttack.min + 1));
  const incoming = Math.max(1, Math.floor(rawIncoming - p.defense * 0.18));
  p.hp = Math.max(0, p.hp - incoming);
  log.push(`🐾 ${c.enemy.name} usa ${enemyAttack.name} y te inflige ${incoming}.`);
  log.push(`❤️ Tu vida: ${p.hp}/${p.maxHp}.`);
  c.round++; c.log.push(...log); c.lastEnemyAttack = enemyAttack; c.lastHit = damage;
  if (p.hp <= 0) { c.status = 'defeat'; log.push('☠️ Has caído en combate. Tu vida queda en 0; usa una poción para recuperarte.'); c.log.push(log.at(-1)); }
  return { damage, incoming, critical, log, combat: c, enemyHp: c.enemy.hp, enemyMaxHp: c.enemy.maxHp, playerHp: p.hp, playerMaxHp: p.maxHp, enemyAttack: enemyAttack.name };
}

function spendTalent(p, talent) {
  const key = String(talent || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const aliases = { ataque: 'attack', atacar: 'attack', attack: 'attack', dano: 'attack', defensa: 'defense', defense: 'defense', vitalidad: 'vitality', vida: 'vitality', vitality: 'vitality' };
  const normalized = aliases[key];
  if (!normalized) return { error: 'Talento no válido. Elige ataque, defensa o vitalidad.' };
  if (Number(p.talentPoints || 0) < 1) return { error: 'No tienes puntos de talento disponibles.' };
  p.talents ||= {};
  const before = normalized === 'attack' ? Number(p.attack || 0) : normalized === 'defense' ? Number(p.defense || 0) : Number(p.maxHp || 0);
  p.talents[normalized] = Number(p.talents[normalized] || 0) + (normalized === 'vitality' ? 1 : 2);
  p.talentPoints = Number(p.talentPoints) - 1;
  recalc(p);
  const after = normalized === 'attack' ? p.attack : normalized === 'defense' ? p.defense : p.maxHp;
  return { talent: normalized, before, after, increase: after - before, remaining: p.talentPoints };
}

function shopItems(p) {
  const level = Math.max(1, Number(p?.level || 1));
  const visibleLevel = Math.min(MAX_LEVEL, Math.floor(level / 10) * 10 + 10);
  return Object.entries(ITEMS)
    .filter(([, item]) => item.slot !== 'material' && Number(item.level || 1) <= visibleLevel)
    .map(([id, item]) => ({ id, ...item, rarity: item.rarity || 'common', rarityLabel: RARITY[item.rarity || 'common'].label, rarityColor: RARITY[item.rarity || 'common'].color }))
    .sort((a, b) => a.level - b.level || Object.keys(RARITY).indexOf(a.rarity) - Object.keys(RARITY).indexOf(b.rarity) || a.name.localeCompare(b.name));
}

function createDuel(root, challenger, targetId) { if (!root.players[targetId]) return { error: 'El jugador objetivo no tiene personaje.' }; if (targetId === challenger.id) return { error: 'No puedes retarte a ti mismo.' }; const id = crypto.randomBytes(4).toString('hex').toUpperCase(); root.duels[id] = { id, status: 'pending', players: [challenger.id, targetId], turns: 0, hp: {}, log: [], createdAt: new Date().toISOString() }; root.duelRequests[targetId] = id; return { duel: root.duels[id] }; }
function acceptDuel(root, player) { const id = root.duelRequests[player.id]; const duel = id && root.duels[id]; if (!duel || duel.status !== 'pending') return { error: 'No tienes ningún desafío pendiente.' }; duel.status = 'active'; duel.turn = duel.players[0]; duel.hp = Object.fromEntries(duel.players.map(pid => [pid, root.players[pid].maxHp])); delete root.duelRequests[player.id]; return { duel }; }
function duelAttack(root, player, skillId = 'auto') { const duel = Object.values(root.duels).find(d => d.status === 'active' && d.players.includes(player.id)); if (!duel) return { error: 'No estás en un duelo.' }; if (duel.turn !== player.id) return { error: 'Espera el turno del otro jugador.' }; const targetId = duel.players.find(id => id !== player.id); const target = root.players[targetId]; const cls = CLASS_CONFIG[player.classKey] || CLASS_CONFIG.warrior; const skill = skillId !== 'auto' ? cls.skills?.[skillId] : null; if (skill && Number(player.cooldowns?.[skillId] || 0) > 0) return { error: `Habilidad en enfriamiento: ${player.cooldowns[skillId]} turno(s).` }; const critical = Math.random() < (skill ? 0.15 : 0.1); const raw = player.attack * (skill?.multiplier || (0.85 + Math.random() * 0.35)) * (critical ? 1.75 : 1); const damage = Math.max(1, Math.floor(raw - target.defense * 0.35)); duel.hp[targetId] -= damage; duel.turns++; duel.log.push(`${player.name} inflige ${damage}${critical ? ' crítico' : ''} a ${target.name}.`); if (skill) player.cooldowns[skillId] = skill.cooldown; if (duel.hp[targetId] <= 0) { duel.status = 'completed'; duel.winner = player.id; return { duel, victory: true, damage }; } duel.turn = targetId; return { duel, damage, critical }; }
function dungeon(p, id) { const d = DUNGEONS.find(x => x.id === id) || DUNGEONS.find(x => p.level >= x.level); if (!d) return { error: 'No hay mazmorras disponibles para tu nivel.' }; if (p.level < d.level) return { error: `Necesitas nivel ${d.level}.` }; const reward = Math.floor(d.minGold + Math.random() * (d.maxGold - d.minGold + 1)); p.gold += reward; p.inventory.push(d.item); const equippedLoot = autoEquipUpgrade(p, d.item); const levels = grantXp(p, d.xp); const quest = progressActiveQuest(p, { type: 'dungeon', dungeonId: d.id }); recalc(p); return { dungeon: d, reward, levels, quest, equippedLoot }; }
function guild(botData, action, p, name) { const root = ensureRoot(botData); if (action === 'create') { if (p.guildId) return { error: 'Ya perteneces a una guild.' }; const id = crypto.randomBytes(3).toString('hex'); root.guilds[id] = { id, name: String(name || 'Hermandad').slice(0, 24), leader: p.id, members: [p.id], bank: 0 }; p.guildId = id; return { guild: root.guilds[id] }; } if (action === 'info') return { guild: p.guildId ? root.guilds[p.guildId] : null }; return { error: 'Acción de guild inválida.' }; }

function enchant(p, enchantId, slot) { const e = ENCHANTMENTS[String(enchantId || '').toLowerCase()]; const target = String(slot || e?.slot || '').toLowerCase(); if (!e) return { error: 'Encantamiento inválido. Usa /encantamientosW.' }; if (!['weapon','armor'].includes(target) || e.slot !== target) return { error: `Este encantamiento solo sirve para ${e.slot === 'weapon' ? 'arma' : 'armadura'}.` }; if (!p.equipment?.[target]) return { error: 'No tienes un objeto equipado en esa ranura.' }; if (p.level < e.level) return { error: `Necesitas nivel ${e.level}.` }; const mats = []; for (const [id, qty] of Object.entries(e.materials)) for (let i = 0; i < qty; i++) mats.push(id); if (!removeItems(p, mats)) return { error: 'No tienes los materiales necesarios.' }; p.enchantments[target] = String(enchantId).toLowerCase(); recalc(p); return { enchantment: e, slot: target, item: p.equipment[target] }; }
function awardAchievement(p, id) { const a = ACHIEVEMENTS[id]; if (!a || p.achievements[id]) return null; p.achievements[id] = { name: a[0], unlockedAt: new Date().toISOString() }; p.gold += a[2]; return { id, name: a[0], reward: a[2] }; }
function travel(p, zoneId) { const zone = ZONES[String(zoneId || '').toLowerCase()]; if (!zone) return { error: 'Zona desconocida. Usa /mapaW.' }; if (p.level < zone.level) return { error: `Necesitas nivel ${zone.level} para viajar a ${zone.name}.` }; p.zone = zoneId; return { zone }; }
function learnProfession(p, profession) { const key = String(profession || '').toLowerCase(); if (!['mineria','herbalismo','alquimia','herrería','herreria'].includes(key)) return { error: 'Profesión inválida: mineria, herbalismo, alquimia o herreria.' }; const normalized = key === 'herreria' ? 'herrería' : key; if (p.professions[normalized]) return { error: 'Ya conoces esa profesión.' }; p.professions[normalized] = 1; p.professionXp[normalized] = 0; return { profession: normalized, level: 1 }; }
function gather(p, node) { const id = String(node || '').toLowerCase(); if (!GATHER_NODES[id]) return { error: 'Recurso inválido. Usa /recolectarW hierba_lunar, mineral_hierro o cristal_arcano.' }; const zone = ZONES[p.zone] || ZONES.aldea; if (!zone.gathering.includes(id)) return { error: `${GATHER_NODES[id]} no se encuentra en ${zone.name}. Usa /mapaW y viaja a una zona con ese recurso.` }; const prof = id.includes('hierba') ? 'herbalismo' : 'mineria'; if (!p.professions[prof]) return { error: `Necesitas aprender ${prof} antes de recolectar.` }; p.inventory.push(id); const levels = addProfessionXp(p, prof, 1); return { item: id, name: GATHER_NODES[id], profession: prof, level: p.professions[prof], levels }; }
function craft(p, recipeId) { const r = RECIPES[String(recipeId || '').toLowerCase()]; if (!r) return { error: 'Receta inválida. Usa /recetasW.' }; if (!p.professions[r.profession] || p.professions[r.profession] < r.level) return { error: `Necesitas ${r.profession} nivel ${r.level}.` }; const ids = []; for (const [id, qty] of Object.entries(r.materials)) for (let i = 0; i < qty; i++) ids.push(id); if (!removeItems(p, ids)) return { error: 'No tienes todos los materiales.' }; for (let i = 0; i < r.quantity; i++) p.inventory.push(r.output); const levels = addProfessionXp(p, r.profession, r.skillXp || 1); recalc(p); return { recipe: r, output: r.output, quantity: r.quantity, levels, achievement: awardAchievement(p, 'crafter') }; }
function daily(p) { const now = Date.now(); if (now - Number(p.lastDaily || 0) < 86400000) return { error: 'La recompensa diaria todavía no está disponible.' }; p.lastDaily = now; p.gold += 100; const levels = grantXp(p, 80); return { gold: 100, levels, achievement: awardAchievement(p, 'first_blood') }; }
function buyMount(p, mountId) { const m = MOUNTS[String(mountId || '').toLowerCase()]; if (!m) return { error: 'Montura inválida. Usa /monturasW.' }; if (p.level < m.level) return { error: `Necesitas nivel ${m.level}.` }; if (p.gold < m.price) return { error: `Te faltan ${m.price - p.gold} de oro.` }; if (p.mounts.includes(mountId)) return { error: 'Ya tienes esa montura.' }; p.gold -= m.price; p.mounts.push(mountId); return { mount: m }; }
function createParty(root, p) { if (p.partyId) return { error: 'Ya estás en un grupo.' }; const id = crypto.randomBytes(3).toString('hex'); root.parties[id] = { id, leader: p.id, members: [p.id], createdAt: new Date().toISOString() }; p.partyId = id; return { party: root.parties[id] }; }
function joinParty(root, p, id) { const party = root.parties[String(id || '').toLowerCase()]; if (!party) return { error: 'Grupo no encontrado.' }; if (p.partyId) return { error: 'Ya estás en un grupo.' }; if (party.members.length >= 5) return { error: 'El grupo está lleno.' }; party.members.push(p.id); p.partyId = party.id; return { party }; }
function leaveParty(root, p) { const party = p.partyId && root.parties[p.partyId]; if (!party) return { error: 'No estás en un grupo.' }; party.members = party.members.filter(id => id !== p.id); p.partyId = null; if (!party.members.length) delete root.parties[party.id]; else if (party.leader === p.id) party.leader = party.members[0]; return { ok: true }; }
function listAuction(root) { return Object.values(root.auctions).filter(a => a.status === 'listed' && a.expiresAt > Date.now()); }
function auctionList(root, p, itemId, price) { const id = findItemId(itemId); if (!id || !p.inventory.includes(id)) return { error: 'No tienes ese objeto.' }; const amount = Math.floor(Number(price)); if (!amount || amount < 1) return { error: 'Precio inválido.' }; removeItems(p, [id]); const auction = { id: crypto.randomBytes(4).toString('hex').toUpperCase(), seller: p.id, item: id, price: amount, status: 'listed', expiresAt: Date.now() + 86400000 }; root.auctions[auction.id] = auction; return { auction }; }
function auctionBuy(root, p, auctionId) { const a = root.auctions[String(auctionId || '').toUpperCase()]; if (!a || a.status !== 'listed' || a.expiresAt < Date.now()) return { error: 'Subasta no disponible.' }; if (a.seller === p.id) return { error: 'No puedes comprarte tu propio objeto.' }; if (p.gold < a.price) return { error: 'No tienes suficiente oro.' }; p.gold -= a.price; p.inventory.push(a.item); a.status = 'sold'; a.buyer = p.id; const seller = root.players[a.seller]; if (seller) seller.gold += a.price; return { auction: a, item: ITEMS[a.item] }; }
function sendMail(root, from, targetId, itemId, gold = 0) { const target = root.players[targetId]; const id = findItemId(itemId); if (!target || !id || !from.inventory.includes(id) || from.gold < gold) return { error: 'Correo inválido: jugador, objeto u oro no disponible.' }; removeItems(from, [id]); from.gold -= gold; root.mail[targetId] ||= []; root.mail[targetId].push({ id: crypto.randomBytes(4).toString('hex'), from: from.id, item: id, gold, claimed: false, sentAt: new Date().toISOString() }); return { ok: true }; }
function claimMail(root, p) { const mail = root.mail[p.id] || []; const available = mail.filter(x => !x.claimed); for (const m of available) { m.claimed = true; if (m.item) p.inventory.push(m.item); p.gold += Number(m.gold || 0); } return { claimed: available.length }; }
function formatStatus(p) { recalc(p); const cls = CLASS_CONFIG[p.classKey] || CLASS_CONFIG.warrior; return `${cls.emoji} *WARCRAFT · ${p.name}*\n${cls.label} · Nivel ${p.level}/${MAX_LEVEL} · GS ${p.gs}\n❤️ Vida ${p.hp}/${p.maxHp} · ✨ XP ${p.xp}/${xpForLevel(p.level) || 'MAX'} · 💰 Oro ${p.gold}\n⚔️ Ataque ${p.attack} · 🛡️ Defensa ${p.defense}\n🎯 Talentos disponibles: ${p.talentPoints || 0}`; }
module.exports = { MAX_LEVEL, CLASS_CONFIG, ITEMS, ENEMIES, RARITY, playerForAccount, shopItems, spendTalent, QUESTS, DUNGEONS, normalizePhone, xpForLevel, ensureRoot, ensurePlayer, createPlayer, recalc, grantXp, progressQuest, questRewards, getQuestBoard, getEnemiesForPlayer, acceptQuest, cancelQuest, progressActiveQuest, listItems, inventoryCounts, findItemId, removeItems, autoEquipUpgrade, equip, useItem, buy, startCombat, combatAttack, createDuel, acceptDuel, duelAttack, dungeon, guild, travel, learnProfession, gather, craft, daily, buyMount, createParty, joinParty, leaveParty, listAuction, auctionList, auctionBuy, sendMail, claimMail, enchant, awardAchievement, ENCHANTMENTS, professionXpToNext, ZONES, MATERIAL_SOURCES, materialGuide, RECIPES, MOUNTS, ACHIEVEMENTS, formatStatus };
