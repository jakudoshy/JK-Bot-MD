const crypto = require('crypto');

const MAX_LEVEL = 80;
const CLASS_CONFIG = {
  warrior: { label: 'Guerrero', emoji: '⚔️', role: 'tank', baseAttack: 8, baseDefense: 8, baseAttributes: { strength: 8, agility: 4, intellect: 1, stamina: 8 }, talent: 'Filo de batalla', skills: { golpe: { name: 'Golpe poderoso', multiplier: 1.35, cooldown: 2 }, escudo: { name: 'Bloqueo defensivo', multiplier: 0.65, cooldown: 3 }, agro: { name: 'Provocar', type: 'taunt', cooldown: 2 } } },
  paladin: { label: 'Paladín', emoji: '🛡️', role: 'tank', baseAttack: 8, baseDefense: 8, baseAttributes: { strength: 7, agility: 3, intellect: 5, stamina: 7 }, talent: 'Luz sagrada', skills: { martillo: { name: 'Martillo de justicia', multiplier: 1.4, cooldown: 2 }, luz: { name: 'Luz sanadora', type: 'heal', power: 0.55, cooldown: 3 }, agro: { name: 'Provocar', type: 'taunt', cooldown: 2 } } },
  hunter: { label: 'Cazador', emoji: '🏹', role: 'damage', baseAttack: 10, baseDefense: 5, baseAttributes: { strength: 3, agility: 8, intellect: 4, stamina: 5 }, talent: 'Tiro certero', skills: { disparo: { name: 'Disparo certero', multiplier: 1.55, cooldown: 2 }, trampa: { name: 'Trampa explosiva', multiplier: 1.25, cooldown: 3 } } },
  picaro: { label: 'Pícaro', emoji: '🗡️', role: 'damage', baseAttack: 10, baseDefense: 5, baseAttributes: { strength: 3, agility: 9, intellect: 2, stamina: 5 }, talent: 'Golpe bajo', skills: { emboscada: { name: 'Emboscada', multiplier: 1.8, cooldown: 3 }, esquivar: { name: 'Evasión', multiplier: 0.4, cooldown: 3 } } },
  priest: { label: 'Sacerdote', emoji: '✨', role: 'healer', baseAttack: 7, baseDefense: 4, baseAttributes: { strength: 2, agility: 3, intellect: 9, stamina: 5 }, talent: 'Fe renovada', skills: { castigo: { name: 'Palabra de castigo', multiplier: 1.35, cooldown: 2 }, sanar: { name: 'Sanación', type: 'heal', power: 0.65, cooldown: 2 }, curar_banda: { name: 'Sanación de grupo', type: 'group_heal', power: 0.35, cooldown: 4 } } },
  shaman: { label: 'Chamán', emoji: '🌩️', role: 'healer', baseAttack: 9, baseDefense: 5, baseAttributes: { strength: 4, agility: 4, intellect: 8, stamina: 6 }, talent: 'Marea de maná', skills: { rayo: { name: 'Descarga de relámpagos', multiplier: 1.5, cooldown: 2 }, oleada: { name: 'Oleada de sanación', type: 'heal', power: 0.6, cooldown: 2 }, curar_banda: { name: 'Lluvia de sanación', type: 'group_heal', power: 0.3, cooldown: 4 } } },
  mago: { label: 'Mago', emoji: '🔮', role: 'damage', baseAttack: 11, baseDefense: 4, baseAttributes: { strength: 1, agility: 4, intellect: 10, stamina: 4 }, talent: 'Chispa arcana', skills: { hechizo: { name: 'Descarga arcana', multiplier: 1.55, cooldown: 3 }, barrera: { name: 'Barrera arcana', multiplier: 0.5, cooldown: 3 } } },
  warlock: { label: 'Brujo', emoji: '🔥', role: 'damage', baseAttack: 10, baseDefense: 4, baseAttributes: { strength: 2, agility: 4, intellect: 9, stamina: 5 }, talent: 'Aflicción', skills: { sombra: { name: 'Descarga de las sombras', multiplier: 1.6, cooldown: 3 }, fuego: { name: 'Fuego vil', multiplier: 1.4, cooldown: 2 } } },
  monk: { label: 'Monje', emoji: '🥋', role: 'tank', baseAttack: 9, baseDefense: 7, baseAttributes: { strength: 5, agility: 8, intellect: 4, stamina: 6 }, talent: 'Equilibrio', skills: { palma: { name: 'Palma del tigre', multiplier: 1.35, cooldown: 2 }, brebaje: { name: 'Brebaje fortificante', type: 'heal', power: 0.45, cooldown: 3 }, agro: { name: 'Provocar', type: 'taunt', cooldown: 2 } } },
  druida: { label: 'Druida', emoji: '🌿', role: 'damage', baseAttack: 9, baseDefense: 6, baseAttributes: { strength: 4, agility: 6, intellect: 7, stamina: 6 }, talent: 'Afinidad natural', skills: { garra: { name: 'Garra', multiplier: 1.4, cooldown: 2 } } },
  deathknight: { label: 'Caballero de la muerte', emoji: '❄️', role: 'tank', baseAttack: 10, baseDefense: 8, baseAttributes: { strength: 9, agility: 2, intellect: 4, stamina: 8 }, talent: 'Poder rúnico', skills: { runa: { name: 'Golpe rúnico', multiplier: 1.5, cooldown: 2 }, agro: { name: 'Provocar', type: 'taunt', cooldown: 2 }, sangre: { name: 'Robo de vida', type: 'heal', power: 0.35, cooldown: 3 } } },
  demonhunter: { label: 'Cazador de demonios', emoji: '🪽', role: 'damage', baseAttack: 10, baseDefense: 6, baseAttributes: { strength: 5, agility: 9, intellect: 3, stamina: 6 }, talent: 'Furia vil', skills: { guja: { name: 'Lanzamiento de gujas', multiplier: 1.65, cooldown: 2 }, salto: { name: 'Asalto vil', multiplier: 1.4, cooldown: 3 } } },
  evoker: { label: 'Evocador', emoji: '🐉', role: 'healer', baseAttack: 9, baseDefense: 5, baseAttributes: { strength: 2, agility: 5, intellect: 9, stamina: 5 }, talent: 'Aliento dracónico', skills: { aliento: { name: 'Aliento dracónico', multiplier: 1.5, cooldown: 2 }, rejuvenecer: { name: 'Rejuvenecer', type: 'heal', power: 0.6, cooldown: 2 }, curar_banda: { name: 'Bendición de los dragones', type: 'group_heal', power: 0.32, cooldown: 4 } } }
};
const DRUID_SPECIALIZATIONS = {
  feral: { label: 'Feral · daño', role: 'damage', skills: { mordida: { name: 'Mordida feroz', multiplier: 1.8, cooldown: 3 } } },
  guardian: { label: 'Guardián · tanque', role: 'tank', skills: { zarpa: { name: 'Zarpa de oso', multiplier: 1.35, cooldown: 2 }, agro: { name: 'Provocar', type: 'taunt', cooldown: 2 } } },
  restoration: { label: 'Restauración · sanación', role: 'healer', skills: { nutrir: { name: 'Nutrir', type: 'heal', power: 0.7, cooldown: 2 }, curar_banda: { name: 'Tranquilidad', type: 'group_heal', power: 0.38, cooldown: 4 } } }
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
const RARITY = { common: { label: 'Común', color: '⚪', multiplier: 1 }, uncommon: { label: 'Poco común', color: '🟢', multiplier: 1.2 }, rare: { label: 'Raro', color: '🔵', multiplier: 1.45 }, epic: { label: 'Épico', color: '🟣', multiplier: 1.8 }, legendary: { label: 'Legendario', color: '🟠', multiplier: 2.25 }, mythic: { label: 'Mítico', color: '🔴', multiplier: 2.8 } };
function rarityForLevel(level) { const n = Math.max(1, Number(level || 1)); return n <= 10 ? 'common' : n <= 20 ? 'rare' : n <= 30 ? 'epic' : n <= 50 ? 'legendary' : 'mythic'; }
const GEAR_LEVELS = Array.from({ length: MAX_LEVEL }, (_, index) => index + 1);
for (const level of GEAR_LEVELS) {
  for (const rarity of [rarityForLevel(level)]) {
    const info = RARITY[rarity];
    const tier = Math.max(1, Math.ceil(level / 10));
    const base = Math.round((5 + tier * 4) * info.multiplier);
    const prefix = `${rarity}_${level}`;
    const label = `${info.label} · Nivel ${level}`;
    const price = Math.round((25 + level * 16) * info.multiplier);
    const strength = level >= 30 ? Math.round(tier * info.multiplier) : 0;
    const agility = Math.round(tier * 0.8 * info.multiplier);
    const intellect = Math.round(tier * 0.7 * info.multiplier);
    const stamina = Math.round(tier * 1.2 * info.multiplier);
    const armor = Math.max(2, Math.round(base * 0.65));
    ITEMS[`${prefix}_blade`] = { name: `Hoja ${label}`, slot: 'weapon', attack: base, defense: 0, strength, level, price, rarity };
    ITEMS[`${prefix}_bow`] = { name: `Arco ${label}`, slot: 'weapon', attack: Math.round(base * 0.92), agility, level, price, rarity };
    ITEMS[`${prefix}_staff`] = { name: `Bastón ${label}`, slot: 'weapon', attack: Math.round(base * 0.9), intellect, level, price, rarity };
    ITEMS[`${prefix}_robe`] = { name: `Armadura ${label}`, slot: 'armor', attack: 0, defense: armor, armor, intellect, stamina, level, price: Math.round(price * 0.9), rarity };
    ITEMS[`${prefix}_leather`] = { name: `Pechera de cuero ${label}`, slot: 'armor', attack: 0, defense: Math.max(1, Math.round(armor * 0.82)), armor: Math.max(1, Math.round(armor * 0.82)), strength, agility: Math.round(agility * 0.6), stamina, level, price: Math.round(price * 0.9), rarity };
  }
}
for (const level of GEAR_LEVELS) {
  const info = RARITY.common;
  ITEMS[`health_potion_${level}`] = { name: `Poción de salud · Nivel ${level}`, slot: 'consumable', heal: 30 + level * 2, level, price: 20 + level * 5, rarity: rarityForLevel(level) };
}
for (const item of Object.values(ITEMS)) if (['weapon','armor'].includes(item.slot) && !item.rarity) item.rarity = rarityForLevel(item.level);
function classQuestGearId(classKey, level) { return `main_${classKey}_${level}`; }
function classQuestGearName(classKey, level, slot) {
  const stat = ['strength','agility','intellect'].sort((a, b) => Number(CLASS_CONFIG[classKey].baseAttributes[b] || 0) - Number(CLASS_CONFIG[classKey].baseAttributes[a] || 0))[0];
  const noun = slot === 'armor' ? (CLASS_CONFIG[classKey].role === 'tank' ? 'Coraza' : CLASS_CONFIG[classKey].role === 'healer' ? 'Vestidura' : 'Pechera') : stat === 'intellect' ? 'Foco arcano' : stat === 'agility' ? 'Arma de precisión' : 'Arma de batalla';
  return `${noun} de ${CLASS_CONFIG[classKey].label} · Nivel ${level}`;
}
for (const [classKey, cls] of Object.entries(CLASS_CONFIG)) {
  const mainStat = ['strength','agility','intellect'].sort((a, b) => Number(cls.baseAttributes[b] || 0) - Number(cls.baseAttributes[a] || 0))[0];
  for (let level = 1; level <= MAX_LEVEL; level++) {
    const id = classQuestGearId(classKey, level); const slot = level % 10 === 5 ? 'armor' : 'weapon';
    const rarity = rarityForLevel(level); const multiplier = RARITY[rarity].multiplier; const scaled = Math.max(1, Math.round((3 + level * 0.72) * multiplier));
    const item = { name: classQuestGearName(classKey, level, slot), slot, level, rarity, classKey, questReward: true, price: 0, strength: 0, agility: 0, intellect: 0, stamina: Math.max(1, Math.round((1 + level * 0.18) * multiplier)) };
    item[mainStat] = Math.max(1, Math.round((1 + level * 0.15) * multiplier));
    if (slot === 'weapon') { item.attack = scaled; item.defense = 0; }
    else { item.attack = 0; item.armor = Math.max(2, Math.round((4 + level * 0.8) * multiplier)); item.defense = item.armor; }
    ITEMS[id] = item;
  }
}

const ENEMIES = {
  lobo: { name: 'Lobo sombrío', level: 1, hp: 55, attack: 7, defense: 2, attacks: [{ name: 'mordida', min: 2, max: 4 }, { name: 'zarpazo', min: 2, max: 5 }, { name: 'salto', min: 3, max: 5 }, { name: 'aullido cortante', min: 1, max: 4 }], xp: 35, gold: [8, 18], loot: ['health_potion'], materialLoot: ['colmillo_lobo'] },
  bandido: { name: 'Bandido del camino', level: 8, hp: 150, attack: 18, defense: 8, attacks: [{ name: 'corte rápido', min: 4, max: 7 }, { name: 'golpe de daga', min: 3, max: 8 }, { name: 'estocada', min: 5, max: 9 }], xp: 100, gold: [25, 55], loot: ['iron_blade', 'health_potion'], materialLoot: ['cuero_grueso'] },
  ogro: { name: 'Ogro de la montaña', level: 15, hp: 330, attack: 32, defense: 16, attacks: [{ name: 'mazazo', min: 7, max: 11 }, { name: 'pisotón', min: 6, max: 10 }, { name: 'embestida', min: 8, max: 12 }], xp: 260, gold: [70, 150], loot: ['dungeon_plate', 'nightfang'], materialLoot: ['esencia_sombra'] },
  gran_mago: { name: 'Gran mago', level: 25, hp: 620, attack: 54, defense: 28, attacks: [{ name: 'rayo arcano', min: 12, max: 19 }, { name: 'descarga de fuego', min: 10, max: 21 }, { name: 'onda mágica', min: 14, max: 18 }], xp: 760, gold: [180, 340], loot: ['nightfang', 'health_potion_20'], materialLoot: ['cristal_arcano'] }
};
const MISSION_ENEMY_NAMES = [
  'Lobo de la frontera', 'Bandido de ceniza', 'Ogro de la montaña', 'Gran mago',
  'Caballero no muerto', 'Dragón joven', 'Demonio del vacío', 'Señor de la plaga', 'Titán antiguo'
];
function missionThemeForLevel(level) { const n = Number(level || 1); if (n <= 7) return MISSION_ENEMY_NAMES[0]; if (n <= 14) return MISSION_ENEMY_NAMES[1]; if (n <= 19) return MISSION_ENEMY_NAMES[2]; if (n <= 29) return MISSION_ENEMY_NAMES[3]; if (n <= 39) return MISSION_ENEMY_NAMES[4]; if (n <= 49) return MISSION_ENEMY_NAMES[5]; if (n <= 59) return MISSION_ENEMY_NAMES[6]; if (n <= 69) return MISSION_ENEMY_NAMES[7]; return MISSION_ENEMY_NAMES[8]; }
for (let level = 1; level < MAX_LEVEL; level++) {
  const theme = missionThemeForLevel(level);
  const base = { level, attacks: [{ name: 'golpe', min: 2 + level, max: 4 + level }, { name: 'embestida', min: 1 + level, max: 5 + level }], xp: Math.max(4, Math.round(xpForLevel(level) * 0.018)), gold: [Math.max(2, level * 2), Math.max(5, level * 4)], loot: [], materialLoot: [] };
  ENEMIES[`mission_${level}`] = { ...base, name: `${theme} · Nivel ${level}`, hp: 35 + level * 18, attack: 4 + level * 1.1, defense: 1 + level * 0.55 };
  ENEMIES[`elite_${level}`] = { ...base, name: `Campeón ${theme} · Nivel ${level}`, hp: 65 + level * 30, attack: 7 + level * 1.35, defense: 2 + level * 0.72, xp: Math.max(8, Math.round(xpForLevel(level) * 0.03)), gold: [Math.max(5, level * 4), Math.max(10, level * 7)] };
}
const QUESTS = [
  { id: 'wolves', name: 'Lobos de la frontera', description: 'Derrota 3 lobos sombríos.', minLevel: 1, objective: 'kill', enemyId: 'lobo', goal: 3, xp: 90, gold: 45, legacy: true },
  { id: 'crypt', name: 'Ecos de la cripta', description: 'Completa la Cripta de los Caídos.', minLevel: 5, objective: 'dungeon', dungeonId: 'crypt', goal: 1, xp: 260, gold: 140 },
  { id: 'bandits', name: 'Bandidos del camino', description: 'Derrota 5 bandidos del camino.', minLevel: 8, objective: 'kill', enemyId: 'bandido', goal: 5, xp: 420, gold: 260, legacy: true },
  { id: 'ogres', name: 'La amenaza de la montaña', description: 'Derrota 3 ogros de la montaña.', minLevel: 15, objective: 'kill', enemyId: 'ogro', goal: 3, xp: 800, gold: 420, legacy: true },
  { id: 'gran_mago', name: 'El Gran mago', description: 'Derrota al Gran mago de la Torre Arcana.', minLevel: 25, objective: 'kill', enemyId: 'gran_mago', goal: 1, xp: 1500, gold: 800, legacy: true }
];
const CAMPAIGN_TEMPLATES = [
  { suffix: 'rastros', title: 'Rastros', goal: 2, share: 0.25, objective: 'kill', questType: 'secondary' },
  { suffix: 'patrulla', title: 'Patrulla', goal: 3, share: 0.30, objective: 'kill', questType: 'secondary' },
  { suffix: 'campeon', title: 'Campeón', goal: 1, share: 0.45, objective: 'elite', questType: 'main' }
];
function gearRewardId(level, slot = 'blade') { const gearLevel = [...GEAR_LEVELS].reverse().find(value => value <= level) || 1; return `${rarityForLevel(gearLevel)}_${gearLevel}_${slot}`; }
for (let level = 1; level < MAX_LEVEL; level++) {
  const targetName = ENEMIES[`mission_${level}`].name;
  for (const [index, template] of CAMPAIGN_TEMPLATES.entries()) {
    const enemyId = template.objective === 'elite' ? `elite_${level}` : `mission_${level}`;
    const q = { id: `nivel_${level}_${template.suffix}`, name: `Nivel ${level}: ${template.title} de ${targetName}`, description: `${template.questType === 'main' ? 'Misión principal: ' : 'Misión secundaria: '}derrota ${template.goal} ${ENEMIES[enemyId].name}.`, minLevel: level, objective: 'kill', enemyId, goal: template.goal, xp: Math.max(10, Math.round(xpForLevel(level) * template.share)), gold: Math.max(10, level * (12 + index * 5)), campaign: true, questType: template.questType, mainQuest: template.questType === 'main' };
    if (q.mainQuest) q.rewardItems = [];
    QUESTS.push(q);
  }
}
const DUNGEONS = [
  { id: 'crypt', name: 'Cripta de los Caídos', level: 5, minGold: 100, maxGold: 240, xp: 220, item: 'dungeon_plate', boss: 'nigromante', rooms: [{ name: 'Entrada', enemies: ['esqueleto', 'esqueleto'] }, { name: 'Galería', enemies: ['araña_cripta', 'guardia_cripta'] }, { name: 'Sala del jefe', enemies: ['nigromante'] }] },
  { id: 'forge', name: 'Forja de Hierro', level: 12, minGold: 240, maxGold: 520, xp: 480, item: 'iron_blade', boss: 'ogro_cueva', rooms: [{ name: 'Túnel de fundición', enemies: ['guardia_cripta', 'guardia_cripta'] }, { name: 'Cámara de lava', enemies: ['ogro_cueva', 'araña_cripta'] }, { name: 'Forja central', enemies: ['ogro_cueva'] }] },
  { id: 'night', name: 'Cámara de la Noche', level: 20, minGold: 500, maxGold: 900, xp: 850, item: 'nightfang', boss: 'gran_mago', rooms: [{ name: 'Pasillo umbrío', enemies: ['sombra', 'sombra'] }, { name: 'Salón arcano', enemies: ['nigromante', 'guardia_cripta'] }, { name: 'Trono de la noche', enemies: ['gran_mago'] }] }
];
const DUNGEON_ENEMIES = {
  esqueleto: { name: 'Esqueleto guardián', level: 5, hp: 85, attack: 10, defense: 4, xp: 20, gold: [5, 12], attacks: [{ name: 'tajo óseo', min: 5, max: 9 }] },
  araña_cripta: { name: 'Araña de la cripta', level: 6, hp: 100, attack: 12, defense: 5, xp: 25, gold: [6, 15], attacks: [{ name: 'mordida venenosa', min: 6, max: 10 }] },
  guardia_cripta: { name: 'Guardia de la cripta', level: 7, hp: 145, attack: 15, defense: 8, xp: 35, gold: [8, 18], attacks: [{ name: 'golpe de guardia', min: 7, max: 12 }] },
  nigromante: { name: 'Nigromante de la cripta', level: 8, hp: 210, attack: 20, defense: 10, xp: 55, gold: [12, 25], attacks: [{ name: 'rayo oscuro', min: 9, max: 15 }] },
  ogro_cueva: { name: 'Ogro de la cueva', level: 14, hp: 340, attack: 30, defense: 17, xp: 90, gold: [20, 40], attacks: [{ name: 'mazazo cavernario', min: 12, max: 20 }] },
  sombra: { name: 'Sombra errante', level: 21, hp: 460, attack: 43, defense: 22, xp: 130, gold: [30, 55], attacks: [{ name: 'toque espectral', min: 16, max: 25 }] }
};
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
function xpForLevel(level) { const n = Math.max(1, Number(level || 1)); if (n >= MAX_LEVEL) return 0; return n < 70 ? 100 + n * 45 : 3205 + Math.pow(n - 69, 2) * 250; }
function ensureRoot(botData) { botData.warcraft ||= { players: {}, accounts: {}, trades: {}, guilds: {}, sessions: {}, combat: {}, cooldowns: {}, duels: {}, duelRequests: {}, pendingPurchases: {}, parties: {}, dungeonRuns: {}, auctions: {}, mail: {}, battlegrounds: {}, world: {} }; const r = botData.warcraft; for (const key of ['players','accounts','trades','guilds','sessions','combat','cooldowns','duels','duelRequests','pendingPurchases','parties','dungeonRuns','auctions','mail','battlegrounds','world']) r[key] ||= {}; return r; }
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
function normalizeClassKey(value) { const key = String(value || 'warrior').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s-]+/g, '_'); const aliases = { mage: 'mago', wizard: 'mago', rogue: 'picaro', druid: 'druida', death_knight: 'deathknight', demon_hunter: 'demonhunter' }; const normalized = aliases[key] || key; return CLASS_CONFIG[normalized] ? normalized : 'warrior'; }
function normalizePlayer(p, fallbackName = 'Aventurero') { p.classKey = normalizeClassKey(p.classKey); p.inventory ||= []; p.equipment ||= {}; p.talents ||= {}; p.quests ||= {}; p.questHistory ||= []; p.activeQuest ||= null; p.guildId ||= null; p.gold = Number(p.gold || 0); p.xp = Number(p.xp || 0); p.pendingLevelXp = Math.max(0, Number(p.pendingLevelXp || 0)); p.level = Number(p.level || 1); p.talentPoints = Math.max(0, Number(p.talentPoints || 0)); p.name ||= fallbackName; p.maxHp = Number(p.maxHp || 100 + p.level * 10); p.hp = Math.min(Number(p.hp ?? p.maxHp), p.maxHp); p.cooldowns ||= {}; p.zone ||= 'aldea'; p.professions ||= {}; p.professionXp ||= {}; p.reputation ||= {}; p.achievements ||= {}; p.mounts ||= []; p.daily ||= {}; p.lastDaily ||= 0; p.partyId ||= null; p.mail ||= []; p.enchantments ||= {}; recalc(p); return p; }
function createPlayer(botData, jid, name, classKey) { const root = ensureRoot(botData); const id = playerId(jid); if (root.players[id]) return { error: 'Ya tienes un personaje creado.' }; const key = String(classKey || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_'); const aliases = { guerrero: 'warrior', warrior: 'warrior', paladin: 'paladin', pala: 'paladin', cazador: 'hunter', hunter: 'hunter', picaro: 'picaro', rogue: 'picaro', sacerdote: 'priest', priest: 'priest', chaman: 'shaman', shaman: 'shaman', mago: 'mago', mage: 'mago', brujo: 'warlock', warlock: 'warlock', monje: 'monk', monk: 'monk', druida: 'druida', druid: 'druida', caballero_de_la_muerte: 'deathknight', deathknight: 'deathknight', dk: 'deathknight', cazador_de_demonios: 'demonhunter', demonhunter: 'demonhunter', evocador: 'evoker', evoker: 'evoker' }; const normalizedClass = aliases[key] || key; if (!CLASS_CONFIG[normalizedClass]) return { error: `Clase inválida. Elige: ${Object.values(CLASS_CONFIG).map(x => x.label).join(', ')}.` }; const p = { id, jid, name: String(name).trim().slice(0, 20), classKey: normalizedClass, level: 1, xp: 0, pendingLevelXp: 0, gold: 80, hp: 110, maxHp: 110, talentPoints: 0, talents: {}, inventory: ['rusty_sword', 'village_armor', 'health_potion'], equipment: { weapon: 'rusty_sword', armor: 'village_armor' }, quests: {}, cooldowns: {}, zone: 'aldea', professions: {}, professionXp: {}, reputation: {}, achievements: {}, mounts: [], daily: {}, partyId: null, mail: [], enchantments: {}, createdAt: new Date().toISOString() }; root.players[id] = p; recalc(p); p.hp = p.maxHp; return { player: p }; }
const LEVEL_SKILLS = {
  deathknight: [
    { id: 'golpe_muerte', name: 'Golpe de muerte', level: 5, multiplier: 1.3, type: 'heal', power: 0.14, cooldown: 3, description: 'Golpea al enemigo y recupera parte de tu vida.' },
    { id: 'espiral_mortal', name: 'Espiral mortal', level: 15, multiplier: 1.85, cooldown: 3, description: 'Descarga rúnica de gran daño.' }
  ],
  paladin: [
    { id: 'sentencia_luz', name: 'Sentencia de luz', level: 5, multiplier: 1.7, cooldown: 2, description: 'Sentencia sagrada que inflige daño reforzado.' },
    { id: 'destello_luz', name: 'Destello de luz', level: 15, multiplier: 0.65, type: 'heal', power: 0.8, cooldown: 3, description: 'Restaura una gran cantidad de vida.' }
  ]
};
function skillProgressionForPlayer(p) {
  const cls = CLASS_CONFIG[p?.classKey] || CLASS_CONFIG.warrior;
  const level = Number(p?.level || 1);
  const base = Object.entries(cls.skills || {}).map(([id, skill]) => ({ id, name: skill.name || id, level: 1, unlocked: true, description: 'Poder inicial de clase.' }));
  const spec = p?.classKey === 'druida' && level >= 20 ? DRUID_SPECIALIZATIONS[p.specialization] : null;
  const specialized = Object.entries(spec?.skills || {}).map(([id, skill]) => ({ id, name: skill.name || id, level: 20, unlocked: true, description: 'Poder de especialización.' }));
  const progressive = (LEVEL_SKILLS[p?.classKey] || []).map(skill => ({ id: skill.id, name: skill.name, level: skill.level, unlocked: level >= skill.level, description: skill.description, type: skill.type || 'damage' }));
  return [...base, ...specialized, ...progressive];
}
function skillsForPlayer(p) {
  const cls = CLASS_CONFIG[p?.classKey] || CLASS_CONFIG.warrior;
  const level = Number(p?.level || 1);
  const spec = p?.classKey === 'druida' && level >= 20 ? DRUID_SPECIALIZATIONS[p.specialization] : null;
  const unlocked = Object.fromEntries((LEVEL_SKILLS[p?.classKey] || []).filter(skill => level >= skill.level).map(({ id, name, multiplier, type, power, cooldown }) => [id, { name, multiplier, ...(type ? { type } : {}), ...(power ? { power } : {}), cooldown }]));
  return { ...cls.skills, ...(spec?.skills || {}), ...unlocked };
}
function talentPointsUsed(p) {
  if (Number.isFinite(Number(p?.talentPointsSpent))) return Math.max(0, Number(p.talentPointsSpent));
  const talents = p?.talents || {};
  return Math.max(0, Math.floor(Number(talents.attack || 0) / 2) + Math.floor(Number(talents.defense || 0) / 2) + Number(talents.vitality || 0));
}
function roleForPlayer(p) { if (p?.classKey === 'druida' && Number(p.level || 1) >= 20) return DRUID_SPECIALIZATIONS[p.specialization]?.role || 'damage'; return (CLASS_CONFIG[p?.classKey] || CLASS_CONFIG.warrior).role; }
function isTank(p) { return roleForPlayer(p) === 'tank'; }
function isHealer(p) { return roleForPlayer(p) === 'healer' || Object.values(skillsForPlayer(p)).some(skill => skill.type === 'heal' || skill.type === 'group_heal'); }
function chooseDruidSpecialization(p, value) { if (p?.classKey !== 'druida') return { error: 'La especialización solo está disponible para el druida.' }; if (Number(p.level || 1) < 20) return { error: 'La especialización de druida se desbloquea en el nivel 20.' }; const key = String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); const aliases = { feral: 'feral', dano: 'feral', damage: 'feral', guardian: 'guardian', tanque: 'guardian', tank: 'guardian', restauracion: 'restoration', sanacion: 'restoration', healer: 'restoration', restoration: 'restoration' }; const specialization = aliases[key]; if (!DRUID_SPECIALIZATIONS[specialization]) return { error: 'Elige feral, guardian o restauracion.' }; p.specialization = specialization; recalc(p); return { specialization, config: DRUID_SPECIALIZATIONS[specialization] }; }
function recalc(p) { const cls = CLASS_CONFIG[p.classKey] || CLASS_CONFIG.warrior; const weapon = ITEMS[p.equipment?.weapon] || {}; const armor = ITEMS[p.equipment?.armor] || {}; const weaponEnchant = ENCHANTMENTS[p.enchantments?.weapon] || {}; const armorEnchant = ENCHANTMENTS[p.enchantments?.armor] || {}; const base = cls.baseAttributes || CLASS_CONFIG.warrior.baseAttributes; const attributes = {}; for (const key of ['strength','agility','intellect','stamina']) attributes[key] = Number(base[key] || 0) + Number(weapon[key] || 0) + Number(armor[key] || 0); p.attributes = attributes; const physical = ['warrior','paladin','hunter','picaro','monk','deathknight','demonhunter'].includes(p.classKey); const mainStat = p.level >= 30 ? Math.floor(attributes.strength * (physical ? 0.35 : 0.18)) : 0; const agilityPower = ['hunter','picaro','monk','druida','demonhunter'].includes(p.classKey) ? Math.floor(attributes.agility * 0.22) : 0; const intellectPower = ['mago','priest','shaman','warlock','evoker'].includes(p.classKey) || (p.classKey === 'druida' && p.specialization === 'restoration') ? Math.floor(attributes.intellect * 0.2) : 0; p.attack = cls.baseAttack + Number(weapon.attack || 0) + Number(weaponEnchant.attack || 0) + mainStat + agilityPower + intellectPower + Number(p.talents.attack || 0); p.armor = Number(armor.armor ?? armor.defense ?? 0) + Number(armorEnchant.defense || 0); p.defense = cls.baseDefense + p.armor + Math.floor(attributes.agility * 0.12) + Number(p.talents.defense || 0); p.maxHp = 100 + p.level * 10 + attributes.stamina * 5 + Number(armorEnchant.hp || 0) + Number(p.talents.vitality || 0) * 5; p.hp = Math.min(Number(p.hp ?? p.maxHp), p.maxHp); p.gs = Math.max(1, p.level * 10 + p.attack * 2 + p.defense * 2); return p; }
function campaignProgress(p, level = p?.level) { const campaign = QUESTS.filter(quest => quest.campaign && quest.minLevel === Number(level)); const completed = campaign.filter(quest => p?.quests?.[quest.id]?.completed).length; return { completed, total: campaign.length, complete: completed === campaign.length }; }
function grantXp(p, amount) {
  const events = [];
  if (p.level >= MAX_LEVEL) { p.xp = 0; p.pendingLevelXp = 0; return events; }
  let total = Math.max(0, Number(p.xp || 0)) + Math.max(0, Number(p.pendingLevelXp || 0)) + Math.max(0, Number(amount || 0));
  p.pendingLevelXp = 0;
  while (p.level < MAX_LEVEL) {
    const required = xpForLevel(p.level);
    if (total < required) { p.xp = total; break; }
    total -= required;
    p.level++;
    p.talentPoints = Number(p.talentPoints || 0) + 1;
    recalc(p); p.hp = p.maxHp;
    events.push(`Subiste al nivel ${p.level}. Ganaste 1 punto de talento.`);
  }
  if (p.level >= MAX_LEVEL) { p.xp = 0; p.pendingLevelXp = 0; }
  recalc(p);
  return events;
}
function questRewards(q, level, player = null) { const scale = 1 + Math.max(0, Number(level || 1) - Number(q.minLevel || 1)) * 0.05; const rewardItems = q.mainQuest && player && Number(q.minLevel) % 5 === 0 ? [classQuestGearId(player.classKey, q.minLevel)] : [...(q.rewardItems || [])]; return { xp: Math.round(q.xp * scale), gold: Math.round(q.gold * scale), rewardItems }; }
function normalizedQuestKey(value) { return String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_'); }
function createRepeatableMission(p) {
  const nonce = crypto.randomBytes(4).toString('hex');
  const level = Math.max(1, Number(p.level || 1));
  const enemyId = `random_${nonce}`;
  const monsterNames = ['Lobo de escarcha', 'Bandido de ceniza', 'Ogro de piedra', 'Hechicero errante', 'Caballero sin descanso', 'Draco joven', 'Demonio del vacío', 'Guardián de la plaga', 'Titán menor'];
  const attacks = [
    [{ name: 'mordida feroz', min: 3, max: 7 }, { name: 'zarpazo pesado', min: 4, max: 8 }, { name: 'salto devastador', min: 5, max: 9 }],
    [{ name: 'corte rápido', min: 4, max: 8 }, { name: 'estocada', min: 5, max: 9 }, { name: 'golpe bajo', min: 3, max: 10 }],
    [{ name: 'mazazo sísmico', min: 5, max: 10 }, { name: 'pisotón', min: 4, max: 9 }, { name: 'embestida', min: 6, max: 11 }],
    [{ name: 'rayo arcano', min: 5, max: 11 }, { name: 'descarga ígnea', min: 4, max: 12 }, { name: 'onda mágica', min: 6, max: 10 }],
    [{ name: 'tajo espectral', min: 5, max: 11 }, { name: 'golpe maldito', min: 6, max: 10 }, { name: 'lanza de sombra', min: 4, max: 12 }]
  ];
  const archetype = Math.floor(Math.random() * monsterNames.length);
  const selectedAttacks = attacks[archetype % attacks.length].map(attack => ({ name: attack.name, min: attack.min + Math.floor(level * 0.7), max: attack.max + Math.floor(level * 0.9) }));
  const enemy = { id: enemyId, name: monsterNames[archetype], level, hp: 40 + level * 22, attack: 6 + level * 1.4, defense: 1 + level * 0.65, attacks: selectedAttacks, xp: Math.max(15, Math.round((xpForLevel(level) || 10000) * 0.12)), gold: [Math.max(5, level * 7), Math.max(12, level * 13)], loot: [], materialLoot: [] };
  p.generatedMissionEnemies ||= {}; p.generatedMissionEnemies[enemyId] = enemy;
  const goal = 1 + Math.floor(Math.random() * 3);
  const slot = Math.random() < 0.5 ? 'blade' : 'robe';
  const rewards = Math.random() < 0.22 ? [gearRewardId(level, slot)] : [];
  return { id: `extra_${level}_${nonce}`, name: `Encargo ${level}: ${enemy.name}`, description: `Derrota ${goal} ${enemy.name} de nivel ${level}.`, minLevel: level, objective: 'kill', enemyId, goal, xp: Math.max(20, Math.round((xpForLevel(level) || 10000) * (0.12 + Math.random() * 0.12))), gold: Math.max(15, level * (15 + Math.floor(Math.random() * 12))), rewardItems: rewards, repeatable: true, createdAt: new Date().toISOString() };
}
function ensureRepeatableMissionBoard(p) {
  if (!p) return { missions: [], changed: false };
  if (!p.repeatableMissionsUnlocked && QUESTS.some(q => q.mainQuest && (q.minLevel === Number(p.level || 1) || q.minLevel === Number(p.level || 1) - 1) && p.quests?.[q.id]?.completed)) p.repeatableMissionsUnlocked = true;
  if (!p.repeatableMissionsUnlocked) return { missions: [], changed: false };
  let changed = false;
  if (Number(p.repeatableMissionLevel) !== Number(p.level)) { p.repeatableMissionLevel = Number(p.level); p.repeatableMissions = []; changed = true; }
  p.repeatableMissions ||= [];
  while (p.repeatableMissions.length < 3) { p.repeatableMissions.push(createRepeatableMission(p)); changed = true; }
  return { missions: p.repeatableMissions, changed };
}
function findQuestTemplate(p, id) {
  return QUESTS.find(item => item.id === id) || (p?.repeatableMissions || []).find(item => item.id === id) || null;
}
function getQuestBoard(p) {
  const level = Number(p?.level || 1);
  const main = QUESTS.find(q => q.mainQuest && q.minLevel === level && !q.legacy && !p?.quests?.[q.id]?.completed);
  return main ? [{ ...main, ...questRewards(main, level, p) }] : [];
}
function getEnemiesForPlayer(p) {
  const zone = ZONES[p?.zone] || ZONES.aldea; const ids = [...zone.enemies];
  const target = p?.activeQuest?.enemyId; if (target && !ids.includes(target)) ids.push(target);
  return ids.map(id => ({ id, enemy: ENEMIES[id] || p?.generatedMissionEnemies?.[id] })).filter(item => item.enemy && item.enemy.level <= Number(p?.level || 1)).map(({ id, enemy }) => ({ id, ...enemy, missionTarget: Boolean(p?.activeQuest?.enemyId === id) }));
}
function acceptQuest(p, id) {
  if (p.activeQuest) return { error: `Ya tienes una misión activa: ${findQuestTemplate(p, p.activeQuest.id)?.name || p.activeQuest.name}. Complétala o usa /cancelarmision.` };
  const key = normalizedQuestKey(id);
  const q = findQuestTemplate(p, key) || QUESTS.find(item => normalizedQuestKey(item.name) === key) || (p.repeatableMissions || []).find(item => normalizedQuestKey(item.name) === key);
  if (!q) return { error: 'Misión desconocida. Usa /misiones para ver los IDs disponibles.' };
  if (p.quests?.[q.id]?.completed && !q.repeatable) return { error: 'Ya completaste esa misión. Elige otra del nivel actual.' };
  if (Number(p.level || 1) < q.minLevel) return { error: `Necesitas nivel ${q.minLevel} para aceptar esta misión.` };
  const reward = questRewards(q, p.level, p);
  p.activeQuest = { id: q.id, name: q.name, description: q.description, objective: q.objective, enemyId: q.enemyId || null, dungeonId: q.dungeonId || null, goal: q.goal, progress: 0, rewardXp: reward.xp, rewardGold: reward.gold, rewardItems: reward.rewardItems, acceptedAt: new Date().toISOString(), levelAtAcceptance: Number(p.level || 1), repeatable: Boolean(q.repeatable), mainQuest: Boolean(q.mainQuest), questType: q.questType || 'secondary' };
  p.quests[q.id] = { progress: 0, completed: false, status: 'active' };
  return { quest: p.activeQuest, template: q };
}
function cancelQuest(p) {
  const active = p?.activeQuest; if (!active) return { error: 'No tienes una misión activa. Usa /misiones para ver las disponibles.' };
  p.questHistory ||= []; p.questHistory.push({ ...active, status: 'cancelled', cancelledAt: new Date().toISOString() });
  p.quests[active.id] = { progress: Number(active.progress || 0), completed: false, status: 'cancelled' }; p.activeQuest = null;
  return { quest: active };
}
function progressActiveQuest(p, event, amount = 1) {
  const active = p?.activeQuest; if (!active) return null;
  const q = findQuestTemplate(p, active.id);
  if (!q) { p.activeQuest = null; return null; }
  const matches = q.objective === 'kill' ? event?.type === 'kill' && event.enemyId === q.enemyId : q.objective === 'dungeon' ? event?.type === 'dungeon' && (!q.dungeonId || event.dungeonId === q.dungeonId) : false;
  if (!matches) return null;
  active.progress = Math.min(q.goal, Number(active.progress || 0) + Math.max(1, Number(amount || 1)));
  const record = p.quests[q.id] ||= {}; record.progress = active.progress; record.completed = false; record.status = 'active';
  if (active.progress < q.goal) return { q, completed: false, progress: active.progress, goal: q.goal, xp: active.rewardXp, gold: active.rewardGold, items: [] };
  const completedQuest = { ...active }; const xp = Number(active.rewardXp || 0); const gold = Number(active.rewardGold || 0); const items = [...(active.rewardItems || [])];
  p.gold += gold; for (const itemId of items) p.inventory.push(itemId);
  const equippedItems = items.filter(itemId => autoEquipUpgrade(p, itemId)); record.progress = q.goal; record.completed = true; record.status = 'completed'; record.completedAt = new Date().toISOString();
  p.questHistory ||= []; p.questHistory.push({ ...completedQuest, status: 'completed', completedAt: record.completedAt }); p.activeQuest = null;
  if (completedQuest.mainQuest) p.repeatableMissionsUnlocked = true;
  const levels = grantXp(p, xp);
  if (q.repeatable) p.repeatableMissions = (p.repeatableMissions || []).filter(item => item.id !== q.id);
  if (p.repeatableMissionsUnlocked) ensureRepeatableMissionBoard(p);
  return { q, completed: true, progress: q.goal, goal: q.goal, xp, gold, items, equippedItems, levels };
}
function progressQuest(p, id, amount = 1) { const q = QUESTS.find(item => item.id === id); if (!q) return null; return progressActiveQuest(p, q.objective === 'kill' ? { type: 'kill', enemyId: q.enemyId } : { type: 'dungeon', dungeonId: q.dungeonId }, amount); }
function listItems(p) { return p.inventory.map((id, index) => ({ index: index + 1, id, ...(ITEMS[id] || { name: id }) })); }
function inventoryCounts(p) { const counts = {}; for (const id of p?.inventory || []) counts[id] = (counts[id] || 0) + 1; return counts; }
function findItemId(value) { const q = String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); if (!q) return null; const direct = Object.keys(ITEMS).find(id => id.toLowerCase() === q); if (direct) return direct; return Object.entries(ITEMS).find(([, item]) => { const n = item.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return n === q || n.includes(q) || (q === 'posion' && n.includes('pocion')); })?.[0] || null; }
function removeItems(p, items = []) { const copy = [...(p.inventory || [])]; for (const id of items) { const i = copy.indexOf(id); if (i < 0) return false; copy.splice(i, 1); } p.inventory = copy; return true; }
function itemScore(item = {}) { return Number(item.attack || 0) + Number(item.defense || item.armor || 0) + Number(item.strength || 0) * 0.45 + Number(item.agility || 0) * 0.4 + Number(item.intellect || 0) * 0.4 + Number(item.stamina || 0) * 0.5; }
function formatItem(itemOrId) { const item = typeof itemOrId === 'string' ? ITEMS[itemOrId] : itemOrId; if (!item) return String(itemOrId || 'Objeto desconocido'); const rarity = RARITY[item.rarity || 'common'] || RARITY.common; const alreadyTagged = item.rarity && new RegExp(`nivel\\s*${Number(item.level || 1)}\\b`, 'i').test(item.name); const identity = `${alreadyTagged ? item.name : `${item.name} · ${rarity.label} · nivel ${item.level || 1}`}${item.classKey ? ` · exclusivo de ${CLASS_CONFIG[item.classKey]?.label || item.classKey}` : ''}`; const stats = []; if (item.attack) stats.push(`ataque +${item.attack}`); if (item.armor || item.defense) stats.push(`armadura +${item.armor || item.defense}`); for (const [key, label] of [['strength','fuerza'],['agility','agilidad'],['intellect','intelecto'],['stamina','aguante']]) if (item[key]) stats.push(`${label} +${item[key]}`); if (item.heal) stats.push(`cura ${item.heal} de vida`); return `${identity}${stats.length ? `\n${stats.join(' · ')}` : ''}`; }
function autoEquipUpgrade(p, id) { const item = ITEMS[id]; if (!item || !['weapon','armor'].includes(item.slot)) return false; const current = ITEMS[p.equipment?.[item.slot]] || {}; if (itemScore(item) <= itemScore(current)) return false; p.equipment[item.slot] = id; recalc(p); return true; }
function equip(p, idOrName) { const id = findItemId(idOrName); const item = ITEMS[id]; if (!item) return { error: 'Objeto inexistente.' }; if (item.classKey && item.classKey !== p.classKey) return { error: `Ese objeto pertenece a la clase ${CLASS_CONFIG[item.classKey]?.label || item.classKey}.` }; if (!p.inventory.includes(id)) return { error: 'No tienes ese objeto.' }; if (!['weapon','armor'].includes(item.slot)) return { error: 'Ese objeto no se puede equipar.' }; if (p.level < item.level) return { error: `Necesitas nivel ${item.level}.` }; p.equipment[item.slot] = id; recalc(p); return { item }; }
function useItem(p, idOrName) { const id = findItemId(idOrName); const item = ITEMS[id]; if (!item || item.slot !== 'consumable') return { error: 'Ese objeto no es un consumible.' }; if (!removeItems(p, [id])) return { error: 'No tienes ese objeto.' }; const before = p.hp; p.hp = Math.min(p.maxHp, p.hp + item.heal); return { item, healed: p.hp - before }; }
  function buy(p, id) { const item = ITEMS[id]; if (!item) return { error: 'Objeto inexistente.' }; if (item.questReward) return { error: 'Ese equipo solo se obtiene al completar misiones principales.' }; if (item.classKey && item.classKey !== p.classKey) return { error: `Ese objeto pertenece a la clase ${CLASS_CONFIG[item.classKey]?.label || item.classKey}.` }; if (item.slot === 'material') return { error: 'Los materiales deben recolectarse o recibirse de otro jugador; no se pueden comprar en esta tienda.' }; if (['weapon','armor'].includes(item.slot) && item.rarity && item.rarity !== rarityForLevel(item.level)) return { error: 'La rareza de ese equipo no corresponde a su nivel.' }; if (p.level < item.level) return { error: `Necesitas nivel ${item.level}.` }; if (p.gold < item.price) return { error: `Te faltan ${item.price - p.gold} de oro.` }; p.gold -= item.price; p.inventory.push(id); if (item.slot === 'weapon' && (!p.equipment.weapon || itemScore(item) > itemScore(ITEMS[p.equipment.weapon]))) p.equipment.weapon = id; if (item.slot === 'armor' && itemScore(item) > itemScore(ITEMS[p.equipment.armor])) p.equipment.armor = id; recalc(p); return { item }; }
function startCombat(root, p, enemyId = 'lobo') { const base = ENEMIES[enemyId] || p.generatedMissionEnemies?.[enemyId]; if (!base) return { error: 'Enemigo inválido. Consulta /enemigos.' }; if (getActiveDungeonRun(root, p)) return { error: 'Ya estás en una mazmorra grupal; termina el encuentro antes de iniciar otro combate.' }; if (p.hp <= 0) return { error: 'Estás derrotado. Usa una poción para levantarte antes de luchar.' }; if (p.level < base.level) return { error: `Necesitas nivel ${base.level}.` }; const zone = ZONES[p.zone] || ZONES.aldea; if (!zone.enemies.includes(enemyId) && p.activeQuest?.enemyId !== enemyId) return { error: `Ese enemigo no está en ${zone.name}. Usa /mapa y /viajar para llegar a su zona; el objetivo de una misión activa sí puede buscarse desde cualquier zona.` }; if (root.combat[p.id]?.status === 'active') return { error: 'Ya estás en combate. Termina el encuentro actual primero.' }; const enemy = { ...base, attacks: [...(base.attacks || [])], maxHp: base.hp }; const combat = { id: crypto.randomBytes(4).toString('hex'), playerId: p.id, enemyId, enemy, status: 'active', round: 1, log: [], startedAt: new Date().toISOString() }; root.combat[p.id] = combat; return { combat }; }
function combatAttack(root, p, skillId = 'auto') {
  const c = root.combat[p.id];
  if (!c || c.status !== 'active') return { error: 'No estás en combate. Usa /buscar lobo.' };
  if (p.hp <= 0) return { error: 'Estás derrotado. Usa una poción para volver a luchar.' };
  const cls = CLASS_CONFIG[p.classKey] || CLASS_CONFIG.warrior;
  const skills = skillsForPlayer(p);
  const skill = skillId !== 'auto' ? skills[skillId] : null;
  const cd = Number(p.cooldowns?.[skillId] || 0);
  if (skillId !== 'auto' && !skill) return { error: `Habilidad desconocida. Disponibles: ${Object.keys(skills).join(', ')}.` };
  if (skill && cd > 0) return { error: `Esa habilidad estará lista en ${cd} turno(s).` };
  const raw = p.attack * (skill?.multiplier || (skill?.type ? 0.65 : 0.85 + Math.random() * 0.35));
  const critical = Math.random() < (skill ? 0.15 : 0.1);
  const damage = Math.max(1, Math.floor(raw * (critical ? 1.75 : 1) - c.enemy.defense * 0.35));
  c.enemy.hp = Math.max(0, Number(c.enemy.hp) - damage);
  const log = [`Ronda ${c.round}: ${skill ? skill.name : 'ataque básico'} inflige ${damage}${critical ? ' de daño crítico' : ' de daño'}.`, `❤️ ${c.enemy.name}: ${c.enemy.hp}/${c.enemy.maxHp} de vida.`];
  let healed = 0;
  if (skill?.type === 'heal' || skill?.type === 'group_heal') { const before = p.hp; p.hp = Math.min(p.maxHp, p.hp + Math.max(1, Math.round(p.maxHp * Number(skill.power || 0.3) + Number(p.attributes?.intellect || 0) * 2))); healed = p.hp - before; log.push(`${skill.name} te recupera ${healed} de vida.`); }
  if (skill?.type === 'taunt') c.tauntRounds = 1;
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
    return { victory: true, damage, healed, gold, loot, materialLoot, equippedLoot, levels, quest, log, combat: c, enemyHp: 0, enemyMaxHp: c.enemy.maxHp };
  }
  const attacks = c.enemy.attacks?.length ? c.enemy.attacks : [{ name: 'ataque', min: 1, max: Math.max(2, c.enemy.attack) }];
  const enemyAttack = attacks[Math.floor(Math.random() * attacks.length)];
  const rawIncoming = enemyAttack.min + Math.floor(Math.random() * (enemyAttack.max - enemyAttack.min + 1));
  const abilityCritical = Math.random() < 0.08;
  const incoming = Math.max(1, Math.floor((rawIncoming * (abilityCritical ? 1.6 : 1) - p.defense * 0.18) * (c.tauntRounds > 0 ? 0.65 : 1)));
  c.tauntRounds = Math.max(0, Number(c.tauntRounds || 0) - 1);
  p.hp = Math.max(0, p.hp - incoming);
  log.push(`${c.enemy.name} usa ${enemyAttack.name}${abilityCritical ? ' con golpe crítico' : ''} y te inflige ${incoming} de daño.`);
  log.push(`❤️ Tu vida: ${p.hp}/${p.maxHp}.`);
  c.round++; c.log.push(...log); c.lastEnemyAttack = enemyAttack; c.lastHit = damage;
  if (p.hp <= 0) { c.status = 'defeat'; log.push('☠️ Has caído en combate. Tu vida queda en 0; usa una poción para recuperarte.'); c.log.push(log.at(-1)); }
  return { damage, healed, incoming, critical, log, combat: c, enemyHp: c.enemy.hp, enemyMaxHp: c.enemy.maxHp, playerHp: p.hp, playerMaxHp: p.maxHp, enemyAttack: enemyAttack.name };
}

function spendTalent(p, talent) {
  const key = String(talent || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const aliases = { ataque: 'attack', atacar: 'attack', attack: 'attack', dano: 'attack', defensa: 'defense', defense: 'defense', vitalidad: 'vitality', vida: 'vitality', vitality: 'vitality' };
  const normalized = aliases[key];
  if (!normalized) return { error: 'Talento no válido. Elige ataque, defensa o vitalidad.' };
  if (Number(p.talentPoints || 0) < 1) return { error: 'No tienes puntos de talento disponibles.' };
  p.talents ||= {};
  const before = normalized === 'attack' ? Number(p.attack || 0) : normalized === 'defense' ? Number(p.defense || 0) : Number(p.maxHp || 0);
  p.talentPointsSpent = talentPointsUsed(p) + 1;
  p.talents[normalized] = Number(p.talents[normalized] || 0) + (normalized === 'vitality' ? 1 : 2);
  p.talentPoints = Number(p.talentPoints) - 1;
  recalc(p);
  const after = normalized === 'attack' ? p.attack : normalized === 'defense' ? p.defense : p.maxHp;
  return { talent: normalized, before, after, increase: after - before, remaining: p.talentPoints };
}

function shopItems(p) {
  const level = Math.max(1, Number(p?.level || 1));
  const minimumLevel = Math.floor((level - 1) / 10) * 10 + 1;
  const visibleLevel = Math.min(MAX_LEVEL, minimumLevel + 9);
  return Object.entries(ITEMS)
    .filter(([, item]) => item.slot !== 'material' && !item.questReward && (!item.classKey || item.classKey === p.classKey) && Number(item.level || 1) >= minimumLevel && Number(item.level || 1) <= visibleLevel && (!['weapon','armor'].includes(item.slot) || !item.rarity || item.rarity === rarityForLevel(item.level)))
    .map(([id, item]) => ({ id, ...item, rarity: item.rarity || 'common', rarityLabel: RARITY[item.rarity || 'common'].label, rarityColor: RARITY[item.rarity || 'common'].color }))
    .sort((a, b) => a.level - b.level || Object.keys(RARITY).indexOf(a.rarity) - Object.keys(RARITY).indexOf(b.rarity) || a.name.localeCompare(b.name));
}

const DUEL_REQUEST_TTL_MS = 15 * 60 * 1000;
function cleanupDuelRequests(root, now = Date.now()) {
  root.duels ||= {}; root.duelRequests ||= {};
  for (const [id, duel] of Object.entries(root.duels)) {
    if (duel.status === 'pending' && now - Date.parse(duel.createdAt || 0) > DUEL_REQUEST_TTL_MS) { duel.status = 'expired'; duel.expiredAt = new Date(now).toISOString(); }
  }
  for (const [recipientId, duelId] of Object.entries(root.duelRequests)) {
    const duel = root.duels[duelId];
    if (!duel || duel.status !== 'pending' || duel.players?.[1] !== recipientId) delete root.duelRequests[recipientId];
  }
}
function duelForPlayer(root, playerId) { return Object.values(root.duels || {}).find(duel => ['pending', 'active'].includes(duel.status) && duel.players?.includes(playerId)) || null; }
function createDuel(root, challenger, targetId) {
  root.duels ||= {}; root.duelRequests ||= {}; cleanupDuelRequests(root);
  const target = root.players[targetId];
  if (!challenger || !root.players[challenger.id]) return { error: 'Tu personaje no está registrado; inicia sesión y vuelve a intentarlo.' };
  if (!target) return { error: 'El jugador objetivo no tiene personaje.' };
  if (targetId === challenger.id) return { error: 'No puedes retarte a ti mismo.' };
  const occupied = duelForPlayer(root, challenger.id);
  if (occupied) return { error: occupied.status === 'pending' ? 'Ya tienes un desafío pendiente o enviado. Espera su respuesta.' : 'Ya estás en un duelo activo.' };
  const targetOccupied = duelForPlayer(root, targetId);
  if (targetOccupied) return { error: `${target.name} ya tiene un desafío pendiente o está en otro duelo.` };
  const id = crypto.randomBytes(4).toString('hex').toUpperCase();
  root.duels[id] = { id, status: 'pending', players: [challenger.id, targetId], turns: 0, hp: {}, log: [], createdAt: new Date().toISOString() };
  root.duelRequests[targetId] = id;
  return { duel: root.duels[id] };
}
function recentFinishedDuel(root, playerId, now = Date.now()) {
  return Object.values(root.duels || {}).filter(duel => duel.players?.includes(playerId) && ['completed', 'forfeit'].includes(duel.status) && now - Date.parse(duel.finishedAt || 0) <= 10 * 60 * 1000).sort((a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt))[0] || null;
}
function acceptDuel(root, player) {
  root.duels ||= {}; root.duelRequests ||= {}; cleanupDuelRequests(root);
  if (!player || !root.players[player.id]) return { error: 'Tu personaje no está registrado; inicia sesión y vuelve a intentarlo.' };
  const existing = duelForPlayer(root, player.id);
  if (existing?.status === 'active') return { duel: existing, alreadyActive: true };
  if (existing?.status === 'pending' && existing.players[0] === player.id) return { duel: existing, waitingForOpponent: true };
  const id = root.duelRequests[player.id]; const duel = id && root.duels[id];
  if (!duel || duel.status !== 'pending' || duel.players?.[1] !== player.id) {
    const finished = recentFinishedDuel(root, player.id);
    return finished ? { duel: finished, alreadyFinished: true } : { error: 'No tienes un desafío pendiente dirigido a esta cuenta.' };
  }
  const challenger = root.players[duel.players[0]], target = root.players[duel.players[1]];
  if (!challenger || !target) { duel.status = 'cancelled'; delete root.duelRequests[player.id]; return { error: 'No se encontró uno de los personajes. Se canceló el desafío.' }; }
  duel.status = 'active'; duel.acceptedAt = new Date().toISOString(); duel.turn = duel.players[0]; duel.hp = Object.fromEntries(duel.players.map(id => [id, Number(root.players[id].maxHp || 1)]));
  delete root.duelRequests[player.id];
  return { duel };
}
function duelAttack(root, player, skillId = 'auto') {
  root.duels ||= {};
  if (!player || !root.players[player.id]) return { error: 'Tu personaje no está registrado; inicia sesión y vuelve a intentarlo.' };
  const duel = duelForPlayer(root, player.id);
  if (!duel || duel.status !== 'active') {
    const finished = recentFinishedDuel(root, player.id);
    return finished ? { duel: finished, alreadyFinished: true } : { error: duel?.status === 'pending' ? 'El duelo todavía espera que el rival acepte.' : 'No hay un duelo activo para este personaje.' };
  }
  if (duel.turn !== player.id) return { error: 'Espera tu turno; el rival todavía está jugando.' };
  const targetId = duel.players.find(id => id !== player.id); const target = root.players[targetId];
  if (!target) { duel.status = 'cancelled'; duel.cancelledAt = new Date().toISOString(); return { error: 'El rival ya no tiene un personaje registrado; el duelo se canceló.' }; }
  duel.hp ||= Object.fromEntries(duel.players.map(id => [id, Number(root.players[id]?.maxHp || 1)]));
  const cls = CLASS_CONFIG[player.classKey] || CLASS_CONFIG.warrior; const skill = skillId !== 'auto' ? cls.skills?.[skillId] : null;
  if (skillId !== 'auto' && !skill) return { error: `No reconocí esa habilidad. Habilidades: ${Object.keys(cls.skills || {}).join(', ')}.` };
  if (skill && Number(player.cooldowns?.[skillId] || 0) > 0) return { error: `Habilidad en enfriamiento: ${player.cooldowns[skillId]} turno(s).` };
  const critical = Math.random() < (skill ? 0.15 : 0.1); const raw = player.attack * (skill?.multiplier || (0.85 + Math.random() * 0.35)) * (critical ? 1.75 : 1); const damage = Math.max(1, Math.floor(raw - target.defense * 0.35));
  duel.hp[targetId] = Math.max(0, Number(duel.hp[targetId] ?? target.maxHp) - damage); duel.turns++; duel.log ||= []; duel.log.push(`${player.name} inflige ${damage}${critical ? ' crítico' : ''} a ${target.name}.`);
  if (skill) player.cooldowns[skillId] = skill.cooldown;
  if (duel.hp[targetId] <= 0) { duel.status = 'completed'; duel.winner = player.id; duel.finishedAt = new Date().toISOString(); return { duel, victory: true, damage }; }
  duel.turn = targetId; return { duel, damage, critical };
}
function getActiveDungeonRun(root, player) { return Object.values(root?.dungeonRuns || {}).find(run => run.status === 'active' && run.roster?.includes(player?.id)) || null; }
function dungeonEnemyFor(id) { return DUNGEON_ENEMIES[id] || ENEMIES[id] || null; }
function currentDungeonEnemy(run) { return run?.enemies?.[run.enemyIndex] || null; }
function dungeonRunStatus(root, player) { const run = getActiveDungeonRun(root, player); if (!run) return null; const enemy = currentDungeonEnemy(run); const currentId = run.roster[run.turnIndex]; const currentPlayer = root.players[currentId]; return { run, dungeon: DUNGEONS.find(d => d.id === run.dungeonId), enemy, currentPlayer, members: run.roster.map(id => root.players[id]).filter(Boolean).map(p => ({ id: p.id, name: p.name, hp: p.hp, maxHp: p.maxHp, role: roleForPlayer(p), active: p.id === currentId })) }; }
function startDungeonRun(root, player, dungeonId) {
  root.dungeonRuns ||= {};
  root.combat ||= {};
  const id = String(dungeonId || '').trim().toLowerCase();
  const dungeon = DUNGEONS.find(item => item.id === id);
  if (!dungeon) return { error: `Indica una mazmorra válida: ${DUNGEONS.map(item => item.id).join(', ')}.` };
  if (player.level < dungeon.level) return { error: `Necesitas nivel ${dungeon.level} para entrar a ${dungeon.name}.` };
  const party = player.partyId ? root.parties[player.partyId] : null;
  if (player.partyId && !party) player.partyId = null;
  if (party && party.leader !== player.id) return { error: 'Solo el líder del grupo puede iniciar la mazmorra.' };
  const roster = (party?.members || [player.id]).filter(id => root.players[id]).slice(0, 5);
  if (!roster.length) return { error: 'El grupo no tiene personajes disponibles.' };
  const underLevel = roster.map(id => root.players[id]).find(member => member.level < dungeon.level);
  if (underLevel) return { error: `${underLevel.name} necesita nivel ${dungeon.level} para entrar.` };
  const unavailable = roster.map(id => root.players[id]).find(member => member.hp <= 0 || root.combat[member.id]?.status === 'active' || getActiveDungeonRun(root, member));
  if (unavailable) return { error: `${unavailable.name} está derrotado o ya está en otro combate; debe terminarlo y recuperarse antes de entrar.` };
  const key = party?.id || player.id;
  if (root.dungeonRuns[key]?.status === 'active') return { error: 'El grupo ya está dentro de una mazmorra. Usa /mazmorra estado.' };
  const rooms = dungeon.rooms || [{ name: dungeon.name, enemies: [dungeon.boss] }];
  const enemies = rooms.flatMap(room => (room.enemies || []).map(enemyId => {
    const template = dungeonEnemyFor(enemyId);
    return template ? { ...template, id: enemyId, attacks: [...(template.attacks || [])], maxHp: template.hp, roomName: room.name, status: 'alive' } : null;
  }).filter(Boolean));
  if (!enemies.length) return { error: 'La mazmorra todavía no tiene encuentros configurados.' };
  const run = { id: crypto.randomBytes(5).toString('hex'), key, partyId: party?.id || null, dungeonId: dungeon.id, leader: player.id, roster, enemies, enemyIndex: 0, turnIndex: 0, round: 1, status: 'active', aggroTarget: null, aggroRounds: 0, threat: {}, cooldowns: {}, log: [], startedAt: new Date().toISOString() };
  root.dungeonRuns[key] = run;
  return { run, dungeon, enemy: currentDungeonEnemy(run), members: roster.map(memberId => root.players[memberId]) };
}
function advanceDungeonTurn(root, run, usedPlayerId) {
  const roster = run.roster.map(id => root.players[id]).filter(Boolean);
  const previousIndex = run.turnIndex;
  let nextIndex = -1;
  for (let offset = 1; offset <= run.roster.length; offset++) {
    const idx = (previousIndex + offset) % run.roster.length;
    if (root.players[run.roster[idx]]?.hp > 0) { nextIndex = idx; break; }
  }
  if (nextIndex < 0) { run.status = 'defeat'; run.endedAt = new Date().toISOString(); return { defeat: true }; }
  const newRound = nextIndex <= previousIndex;
  run.turnIndex = nextIndex;
  if (!newRound) return { nextPlayer: root.players[run.roster[nextIndex]] };
  run.round++;
  const enemy = currentDungeonEnemy(run);
  if (!enemy) return { nextPlayer: root.players[run.roster[nextIndex]] };
  const alive = roster.filter(member => member.hp > 0);
  let target = run.aggroRounds > 0 ? root.players[run.aggroTarget] : null;
  if (!target || target.hp <= 0) { const tanks = alive.filter(isTank).sort((a, b) => Number(run.threat[b.id] || 0) - Number(run.threat[a.id] || 0)); target = tanks[0] || alive[Math.floor(Math.random() * alive.length)]; }
  if (run.aggroRounds > 0) run.aggroRounds--;
  if (run.aggroRounds <= 0 && target.id === run.aggroTarget) run.aggroTarget = null;
  const attacks = enemy.attacks?.length ? enemy.attacks : [{ name: 'ataque', min: 1, max: Math.max(2, enemy.attack) }];
  const attack = attacks[Math.floor(Math.random() * attacks.length)];
  const raw = Number(attack.min || 1) + Math.floor(Math.random() * (Number(attack.max || 2) - Number(attack.min || 1) + 1));
  const mitigation = isTank(target) ? 0.72 : 1;
  const incoming = Math.max(1, Math.floor((raw - Number(target.defense || 0) * 0.18) * mitigation));
  target.hp = Math.max(0, target.hp - incoming);
  const enemyTurn = `${enemy.name} ataca a ${target.name} y le inflige ${incoming}. Vida: ${target.hp}/${target.maxHp}.`;
  run.log.push(enemyTurn);
  if (alive.every(member => member.hp <= 0)) { run.status = 'defeat'; run.endedAt = new Date().toISOString(); return { enemyTurn, defeat: true, target, incoming }; }
  while (root.players[run.roster[run.turnIndex]]?.hp <= 0) run.turnIndex = (run.turnIndex + 1) % run.roster.length;
  return { enemyTurn, target, incoming, nextPlayer: root.players[run.roster[run.turnIndex]] };
}
function completeDungeonRun(root, run) {
  const dungeon = DUNGEONS.find(item => item.id === run.dungeonId);
  const reward = Math.floor(dungeon.minGold + Math.random() * (dungeon.maxGold - dungeon.minGold + 1));
  const share = Math.max(1, Math.floor(reward / run.roster.length));
  const rewards = [];
  run.status = 'completed'; run.endedAt = new Date().toISOString();
  for (const id of run.roster) {
    const player = root.players[id]; if (!player) continue;
    player.gold += share;
    player.inventory.push(dungeon.item);
    const equippedLoot = autoEquipUpgrade(player, dungeon.item);
    const levels = grantXp(player, dungeon.xp);
    const quest = progressActiveQuest(player, { type: 'dungeon', dungeonId: dungeon.id });
    const achievement = awardAchievement(player, 'dungeon_runner');
    rewards.push({ playerId: id, name: player.name, gold: share, xp: dungeon.xp, item: dungeon.item, equippedLoot, levels, quest, achievement });
  }
  run.rewards = rewards;
  return { dungeon, reward, share, rewards };
}
function dungeonAction(root, player, skillId = 'auto', healTargetId = null) {
  const run = getActiveDungeonRun(root, player);
  if (!run) return { error: 'No estás en una mazmorra activa. Usa /mazmorra ID.' };
  const currentId = run.roster[run.turnIndex];
  if (currentId !== player.id) return { error: `Espera tu turno. Ahora actúa ${root.players[currentId]?.name || 'otro jugador'}.` };
  if (player.hp <= 0) return { error: 'Estás fuera de combate. Un sanador puede revivirte con /curar banda.' };
  const enemy = currentDungeonEnemy(run);
  if (!enemy) return { error: 'No hay enemigo activo.' };
  const skills = skillsForPlayer(player);
  const skill = skillId !== 'auto' ? skills[skillId] : null;
  if (skillId !== 'auto' && !skill) return { error: `Habilidad desconocida. Disponibles: ${Object.keys(skills).join(', ')}.` };
  const cooldown = Number(run.cooldowns[player.id]?.[skillId] || 0);
  if (skill && cooldown > run.round) return { error: `Esa habilidad estará lista dentro de ${cooldown - run.round} ronda(s).` };
  const log = [];
  let damage = 0; let healed = 0;
  if (skill?.type === 'heal' || skill?.type === 'group_heal') {
    const targets = skill.type === 'group_heal' ? run.roster.map(id => root.players[id]).filter(Boolean) : [root.players[healTargetId] || player];
    const amount = Math.max(1, Math.round((30 + player.level * 3 + Number(player.attributes?.intellect || 0) * 4) * Number(skill.power || 0.35) * (skill.type === 'group_heal' ? 0.72 : 1)));
    for (const target of targets) { const before = target.hp; target.hp = Math.min(target.maxHp, target.hp + amount); const recovered = target.hp - before; healed += recovered; if (recovered) log.push(`${target.name} recupera ${recovered} de vida.`); }
  } else if (skill?.type === 'taunt') {
    if (!isTank(player)) return { error: 'Solo una especialización de tanque puede usar /agro.' };
    run.aggroTarget = player.id; run.aggroRounds = 2;
    log.push(`${player.name} provoca a ${enemy.name}; el enemigo lo priorizará durante 2 rondas.`);
  } else {
    const multiplier = Number(skill?.multiplier || (0.85 + Math.random() * 0.35));
    const critical = Math.random() < (skill ? 0.15 : 0.1);
    damage = Math.max(1, Math.floor(player.attack * multiplier * (critical ? 1.75 : 1) - enemy.defense * 0.35));
    enemy.hp = Math.max(0, enemy.hp - damage);
    run.threat[player.id] = Number(run.threat[player.id] || 0) + damage;
    log.push(`${player.name} usa ${skill?.name || 'ataque básico'} e inflige ${damage}${critical ? ' de daño crítico' : ' de daño'} a ${enemy.name}.`);
    if (enemy.hp <= 0) {
      enemy.status = 'defeated';
      for (const id of run.roster) { const member = root.players[id]; if (member) { grantXp(member, enemy.xp || 0); member.gold += Math.floor((enemy.gold?.[0] || 0) / run.roster.length); } }
      run.enemyIndex++;
      const nextEnemy = currentDungeonEnemy(run);
      log.push(`${enemy.name} fue derrotado.${nextEnemy ? ` Entra ${nextEnemy.name}, de ${nextEnemy.roomName}.` : ''}`);
      if (!nextEnemy) {
        run.log.push(...log);
        const completion = completeDungeonRun(root, run);
        return { run, enemy, damage, healed, log, completed: true, completion };
      }
    }
  }
  run.cooldowns[player.id] ||= {};
  if (skill) run.cooldowns[player.id][skillId] = run.round + Number(skill.cooldown || 0);
  const turn = advanceDungeonTurn(root, run, player.id);
  if (turn.enemyTurn) log.push(turn.enemyTurn);
  if (turn.defeat) log.push('El grupo fue derrotado. No recibió la recompensa final.');
  else if (turn.nextPlayer) log.push(`Siguiente turno: ${turn.nextPlayer.name}.`);
  run.log.push(...log);
  return { run, enemy: currentDungeonEnemy(run), damage, healed, log, turn, completed: false };
}
function dungeonAggro(root, player) { const skills = skillsForPlayer(player); const skillId = Object.keys(skills).find(id => skills[id].type === 'taunt') || 'agro'; if (!isTank(player)) return { error: 'Solo el tanque puede usar /agro.' }; return dungeonAction(root, player, skillId); }
function dungeonHeal(root, player, targetInput = 'banda') {
  if (!isHealer(player)) return { error: 'Esta clase o especialización no tiene habilidades de sanación.' };
  const skills = skillsForPlayer(player);
  const groupSkillId = Object.keys(skills).find(id => skills[id].type === 'group_heal');
  const singleSkillId = Object.keys(skills).find(id => skills[id].type === 'heal');
  const target = String(targetInput || 'banda').trim().toLowerCase();
  const isGroupTarget = ['banda','grupo','todos','all'].includes(target);
  const skillId = isGroupTarget ? groupSkillId : singleSkillId || groupSkillId;
  if (isGroupTarget && !groupSkillId) return { error: 'Tu clase no tiene una sanación de grupo. Usa /curar nombre_de_un_compañero.' };
  if (!skillId) return { error: 'Tu especialización no tiene esa sanación. Usa /habilidad para ver tus habilidades.' };
  const run = getActiveDungeonRun(root, player);
  if (!run) return { error: 'No hay una mazmorra activa. Usa /curar banda dentro de un encuentro.' };
  if (!isGroupTarget) {
    const member = run.roster.map(id => root.players[id]).find(item => item && (item.id === target || item.name.toLowerCase() === target));
    if (!member) return { error: 'No encuentro a ese compañero en tu grupo activo.' };
    return dungeonAction(root, player, skillId, member.id);
  }
  return dungeonAction(root, player, skillId);
}
function dungeonState(root, player) { const state = dungeonRunStatus(root, player); if (!state) return { error: 'No hay una mazmorra activa para ti o tu grupo.' }; return state; }
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
function createParty(root, p) { if (getActiveDungeonRun(root, p)) return { error: 'No puedes cambiar de grupo durante una mazmorra.' }; if (p.partyId) return { error: 'Ya estás en un grupo.' }; const id = crypto.randomBytes(3).toString('hex'); root.parties[id] = { id, leader: p.id, members: [p.id], createdAt: new Date().toISOString() }; p.partyId = id; return { party: root.parties[id] }; }
function joinParty(root, p, id) { const party = root.parties[String(id || '').toLowerCase()]; if (!party) return { error: 'Grupo no encontrado.' }; if (getActiveDungeonRun(root, p)) return { error: 'No puedes cambiar de grupo durante una mazmorra.' }; if (root.dungeonRuns?.[party.id]?.status === 'active') return { error: 'Ese grupo está dentro de una mazmorra.' }; if (p.partyId) return { error: 'Ya estás en un grupo.' }; if (party.members.length >= 5) return { error: 'El grupo está lleno.' }; party.members.push(p.id); p.partyId = party.id; return { party }; }
function leaveParty(root, p) { const party = p.partyId && root.parties[p.partyId]; if (!party) return { error: 'No estás en un grupo.' }; if (getActiveDungeonRun(root, p) || root.dungeonRuns?.[party.id]?.status === 'active') return { error: 'No puedes salir del grupo hasta que termine la mazmorra.' }; party.members = party.members.filter(id => id !== p.id); p.partyId = null; if (!party.members.length) delete root.parties[party.id]; else if (party.leader === p.id) party.leader = party.members[0]; return { ok: true }; }
function listAuction(root) { return Object.values(root.auctions).filter(a => a.status === 'listed' && a.expiresAt > Date.now()); }
function auctionList(root, p, itemId, price) { const id = findItemId(itemId); if (!id || !p.inventory.includes(id)) return { error: 'No tienes ese objeto.' }; const amount = Math.floor(Number(price)); if (!amount || amount < 1) return { error: 'Precio inválido.' }; removeItems(p, [id]); const auction = { id: crypto.randomBytes(4).toString('hex').toUpperCase(), seller: p.id, item: id, price: amount, status: 'listed', expiresAt: Date.now() + 86400000 }; root.auctions[auction.id] = auction; return { auction }; }
function auctionBuy(root, p, auctionId) { const a = root.auctions[String(auctionId || '').toUpperCase()]; if (!a || a.status !== 'listed' || a.expiresAt < Date.now()) return { error: 'Subasta no disponible.' }; if (a.seller === p.id) return { error: 'No puedes comprarte tu propio objeto.' }; if (p.gold < a.price) return { error: 'No tienes suficiente oro.' }; p.gold -= a.price; p.inventory.push(a.item); a.status = 'sold'; a.buyer = p.id; const seller = root.players[a.seller]; if (seller) seller.gold += a.price; return { auction: a, item: ITEMS[a.item] }; }
function sendMail(root, from, targetId, itemId, gold = 0) { const target = root.players[targetId]; const id = findItemId(itemId); if (!target || !id || !from.inventory.includes(id) || from.gold < gold) return { error: 'Correo inválido: jugador, objeto u oro no disponible.' }; removeItems(from, [id]); from.gold -= gold; root.mail[targetId] ||= []; root.mail[targetId].push({ id: crypto.randomBytes(4).toString('hex'), from: from.id, item: id, gold, claimed: false, sentAt: new Date().toISOString() }); return { ok: true }; }
function claimMail(root, p) { const mail = root.mail[p.id] || []; const available = mail.filter(x => !x.claimed); for (const m of available) { m.claimed = true; if (m.item) p.inventory.push(m.item); p.gold += Number(m.gold || 0); } return { claimed: available.length }; }
function formatStatus(p) { recalc(p); const cls = CLASS_CONFIG[p.classKey] || CLASS_CONFIG.warrior; const a = p.attributes || {}; const role = roleForPlayer(p); const spec = p.classKey === 'druida' && DRUID_SPECIALIZATIONS[p.specialization] ? ` · ${DRUID_SPECIALIZATIONS[p.specialization].label}` : ''; const campaign = campaignProgress(p); const campaignLine = campaign.total && !campaign.complete ? `\nMisiones del nivel: ${campaign.completed}/${campaign.total} · Progreso opcional; la experiencia desbloquea niveles${p.pendingLevelXp ? ` · XP acumulada: ${p.pendingLevelXp}` : ''}` : ''; return `${cls.emoji} *Warcraft · ${p.name}*\n${cls.label}${spec} · Rol ${role} · Nivel ${p.level}/${MAX_LEVEL} · GS ${p.gs}\nVida ${p.hp}/${p.maxHp} · XP ${p.xp}/${xpForLevel(p.level) || 'máximo'} · Oro ${p.gold}\nAtaque ${p.attack} · Armadura ${p.armor} · Defensa ${p.defense}\nFuerza ${a.strength || 0} · Agilidad ${a.agility || 0} · Intelecto ${a.intellect || 0} · Aguante ${a.stamina || 0}\nTalentos disponibles: ${p.talentPoints || 0}${campaignLine}`; }
module.exports = { MAX_LEVEL, CLASS_CONFIG, DRUID_SPECIALIZATIONS, ITEMS, ENEMIES, DUNGEON_ENEMIES, RARITY, rarityForLevel, playerForAccount, shopItems, itemScore, formatItem, spendTalent, QUESTS, DUNGEONS, normalizePhone, xpForLevel, ensureRoot, ensurePlayer, createPlayer, recalc, grantXp, campaignProgress, skillsForPlayer, roleForPlayer, isTank, isHealer, chooseDruidSpecialization, progressQuest, questRewards, classQuestGearId, getQuestBoard, getEnemiesForPlayer, acceptQuest, cancelQuest, progressActiveQuest, ensureRepeatableMissionBoard, createRepeatableMission, listItems, inventoryCounts, findItemId, removeItems, autoEquipUpgrade, equip, useItem, buy, startCombat, combatAttack, createDuel, acceptDuel, duelAttack, duelForPlayer, cleanupDuelRequests, recentFinishedDuel, getActiveDungeonRun, dungeonRunStatus, startDungeonRun, dungeonAction, dungeonAggro, dungeonHeal, dungeonState, dungeon, guild, travel, learnProfession, gather, craft, daily, buyMount, createParty, joinParty, leaveParty, listAuction, auctionList, auctionBuy, sendMail, claimMail, enchant, awardAchievement, ENCHANTMENTS, professionXpToNext, ZONES, MATERIAL_SOURCES, materialGuide, RECIPES, MOUNTS, ACHIEVEMENTS, formatStatus };

module.exports.skillProgressionForPlayer = skillProgressionForPlayer;
module.exports.talentPointsUsed = talentPointsUsed;
module.exports.LEVEL_SKILLS = LEVEL_SKILLS;
