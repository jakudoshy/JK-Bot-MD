const crypto = require('crypto');

const MAX_LEVEL = 80;
const CLASS_CONFIG = {
  warrior: { label: 'Guerrero', emoji: '⚔️', baseAttack: 8, baseDefense: 8, talent: 'Filo de batalla' },
  mago: { label: 'Mago', emoji: '🔮', baseAttack: 11, baseDefense: 4, talent: 'Chispa arcana' },
  picaro: { label: 'Pícaro', emoji: '🗡️', baseAttack: 10, baseDefense: 5, talent: 'Golpe bajo' }
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
  health_potion: { name: 'Poción de salud', slot: 'consumable', heal: 30, level: 1, price: 20 }
};
const QUESTS = [
  { id: 'wolves', name: 'Lobos de la frontera', description: 'Derrota 3 lobos sombríos.', level: 1, xp: 90, gold: 45, goal: 3 },
  { id: 'crypt', name: 'Ecos de la cripta', description: 'Completa una mazmorra.', level: 5, xp: 260, gold: 140, goal: 1 },
  { id: 'bandits', name: 'Bandidos del camino', description: 'Derrota 5 bandidos.', level: 8, xp: 420, gold: 260, goal: 5 }
];
const DUNGEONS = [
  { id: 'crypt', name: 'Cripta de los Caídos', level: 5, minGold: 100, maxGold: 240, xp: 220, item: 'dungeon_plate' },
  { id: 'forge', name: 'Forja de Hierro', level: 12, minGold: 240, maxGold: 520, xp: 480, item: 'iron_blade' },
  { id: 'night', name: 'Cámara de la Noche', level: 20, minGold: 500, maxGold: 900, xp: 850, item: 'nightfang' }
];
function normalizePhone(value) { return String(value || '').replace(/\D/g, ''); }
function xpForLevel(level) { return level >= MAX_LEVEL ? 0 : Math.floor(100 * Math.pow(level, 1.35)); }
function ensureRoot(botData) { botData.warcraft ||= { players: {}, accounts: {}, trades: {}, guilds: {}, sessions: {} }; botData.warcraft.players ||= {}; botData.warcraft.accounts ||= {}; botData.warcraft.trades ||= {}; botData.warcraft.guilds ||= {}; botData.warcraft.sessions ||= {}; return botData.warcraft; }
function playerId(jid) { return String(jid || '').split('@')[0].split(':')[0].replace(/\D/g, ''); }
function ensurePlayer(botData, jid, name = 'Aventurero') {
  const root = ensureRoot(botData); const id = playerId(jid); let player = root.players[id];
  if (!player) return null;
  player.inventory ||= []; player.equipment ||= {}; player.talents ||= {}; player.quests ||= {}; player.guildId ||= null; player.gs ||= 0; player.gold = Number(player.gold || 0); player.xp = Number(player.xp || 0); player.level = Number(player.level || 1); player.name ||= name; return player;
}
function createPlayer(botData, jid, name, classKey) {
  const root = ensureRoot(botData); const id = playerId(jid); if (root.players[id]) return { error: 'Ya tienes un personaje creado.' };
  const cls = CLASS_CONFIG[classKey]; if (!cls) return { error: 'Clase inválida. Usa warrior, mago o picaro.' };
  const player = { id, jid, name: String(name).trim().slice(0, 20), classKey, level: 1, xp: 0, gold: 80, talentPoints: 0, talents: {}, inventory: ['rusty_sword', 'village_armor', 'health_potion'], equipment: { weapon: 'rusty_sword', armor: 'village_armor' }, quests: {}, guildId: null, createdAt: new Date().toISOString() };
  root.players[id] = player; recalc(player); return { player };
}
function recalc(player) { const cls = CLASS_CONFIG[player.classKey] || CLASS_CONFIG.warrior; const weapon = ITEMS[player.equipment?.weapon] || {}; const armor = ITEMS[player.equipment?.armor] || {}; player.attack = cls.baseAttack + Number(weapon.attack || 0) + Number(player.talents.attack || 0); player.defense = cls.baseDefense + Number(armor.defense || 0) + Number(player.talents.defense || 0); player.gs = Math.max(1, player.level * 10 + player.attack * 2 + player.defense * 2); return player; }
function grantXp(player, amount) { const events = []; if (player.level >= MAX_LEVEL) return events; player.xp += Number(amount || 0); while (player.level < MAX_LEVEL && player.xp >= xpForLevel(player.level)) { player.xp -= xpForLevel(player.level); player.level++; player.talentPoints = Number(player.talentPoints || 0) + 1; events.push(`🎉 *LV UP* — ¡Ahora eres nivel ${player.level}! Ganaste 1 punto de talento.`); } recalc(player); return events; }
function progressQuest(player, id, amount = 1) { const q = QUESTS.find(x => x.id === id); if (!q || player.level < q.level) return null; player.quests[id] ||= { progress: 0, completed: false }; const state = player.quests[id]; if (!state.completed) state.progress = Math.min(q.goal, state.progress + amount); if (!state.completed && state.progress >= q.goal) { state.completed = true; player.gold += q.gold; const levels = grantXp(player, q.xp); return { q, levels }; } return null; }
function listItems(player) { return player.inventory.map((id, index) => ({ index: index + 1, id, ...(ITEMS[id] || { name: id }) })); }
function buy(player, id) { const item = ITEMS[id]; if (!item) return { error: 'Objeto inexistente.' }; if (player.level < item.level) return { error: `Necesitas nivel ${item.level}.` }; if (player.gold < item.price) return { error: `Te faltan ${item.price - player.gold} de oro.` }; player.gold -= item.price; player.inventory.push(id); if (item.slot === 'weapon' && (!player.equipment.weapon || item.attack > (ITEMS[player.equipment.weapon]?.attack || 0))) player.equipment.weapon = id; if (item.slot === 'armor' && item.defense > (ITEMS[player.equipment.armor]?.defense || 0)) player.equipment.armor = id; recalc(player); return { item }; }
function dungeon(player, id) { const d = DUNGEONS.find(x => x.id === id) || DUNGEONS.find(x => player.level >= x.level); if (!d) return { error: 'No hay mazmorras disponibles para tu nivel.' }; if (player.level < d.level) return { error: `Necesitas nivel ${d.level}.` }; const reward = Math.floor(d.minGold + Math.random() * (d.maxGold - d.minGold + 1)); player.gold += reward; player.inventory.push(d.item); const levels = grantXp(player, d.xp); progressQuest(player, 'crypt'); recalc(player); return { dungeon: d, reward, levels }; }
function guild(botData, action, player, name) { const root = ensureRoot(botData); if (action === 'create') { if (player.guildId) return { error: 'Ya perteneces a una guild.' }; const id = crypto.randomBytes(3).toString('hex'); root.guilds[id] = { id, name: String(name || 'Hermandad').slice(0, 24), leader: player.id, members: [player.id], bank: 0 }; player.guildId = id; return { guild: root.guilds[id] }; } if (action === 'info') return { guild: player.guildId ? root.guilds[player.guildId] : null }; return { error: 'Acción de guild inválida.' }; }
function formatStatus(player) { const cls = CLASS_CONFIG[player.classKey] || CLASS_CONFIG.warrior; const need = xpForLevel(player.level); return `╭──〔 ${cls.emoji} WARCRAFT 〕──╮\n│ 👤 ${player.name} · ${cls.label}\n│ 🧬 Nivel: ${player.level}/80 · GS: ${player.gs}\n│ ✨ XP: ${player.xp}/${need || 'MAX'}\n│ ⚔️ Ataque: ${player.attack} · 🛡️ Defensa: ${player.defense}\n│ 💰 Oro: ${player.gold}\n│ 🎯 Talentos disponibles: ${player.talentPoints || 0}\n╰────────────────────╯`; }
module.exports = { MAX_LEVEL, CLASS_CONFIG, ITEMS, QUESTS, DUNGEONS, normalizePhone, xpForLevel, ensureRoot, ensurePlayer, createPlayer, recalc, grantXp, progressQuest, listItems, buy, dungeon, guild, formatStatus };
