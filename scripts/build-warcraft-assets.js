'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'assets/warcraft/source');
const OUTPUT = path.join(ROOT, 'assets/warcraft/generated');
const TILE = 66;
const RARITIES = {
  common: '#49c774',
  uncommon: '#4e9de0',
  rare: '#a56be8',
  epic: '#dc5fca',
  legendary: '#f0a23b',
  mythic: '#d94b55'
};

// Cuadrícula de habilidades: 14 columnas x 6 filas, celdas de 66 px.
// Son emblemas/arte de habilidades, no retratos completos de personajes.
const CLASSES = {
  warrior: { cell: [0, 3], role: 'tank' },
  paladin: { cell: [0, 2], role: 'tank' },
  hunter: { cell: [2, 0], role: 'damage' },
  picaro: { cell: [1, 0], role: 'damage' },
  priest: { cell: [4, 12], role: 'healer' },
  shaman: { cell: [0, 8], role: 'healer' },
  mago: { cell: [2, 3], role: 'damage' },
  warlock: { cell: [5, 7], role: 'damage' },
  monk: { cell: [2, 1], role: 'tank' },
  druida: { cell: [3, 1], role: 'damage' },
  deathknight: { cell: [2, 7], role: 'tank' },
  demonhunter: { cell: [1, 11], role: 'damage' },
  evoker: { cell: [0, 13], role: 'healer' }
};
const CLASS_COLORS = { tank: '#6595d4', healer: '#66bd8a', damage: '#d56e70' };

// Recortes ajustados a sprites completos del atlas transparente items23.png.
const ITEM_SPRITES = {
  blade: { file: 'items23.png', left: 129, top: 130, width: 63, height: 63 },
  dagger: { file: 'items23.png', left: 515, top: 197, width: 60, height: 52 },
  bow: { file: 'items23.png', left: 193, top: 67, width: 63, height: 62 },
  staff: { file: 'items23.png', left: 833, top: 129, width: 64, height: 64 },
  armor: { file: 'items23.png', left: 390, top: 5, width: 55, height: 57 },
  leather: { file: 'items23.png', left: 263, top: 3, width: 52, height: 60 },
  robe: { file: 'items23.png', left: 769, top: 4, width: 64, height: 61 },
  potion: { file: 'items23.png', left: 1, top: 320, width: 62, height: 64 },
  herb: { file: 'activables2.png', left: 0, top: 64, width: 61, height: 61 },
  mineral: { file: 'items23.png', left: 132, top: 259, width: 57, height: 58 },
  crystal: { file: 'items23.png', left: 332, top: 140, width: 41, height: 41 },
  fang: { file: 'items30.png', left: 128, top: 0, width: 64, height: 64 },
  shadow: { file: 'items23.png', left: 332, top: 140, width: 41, height: 41 }
};

const ZONE_CELLS = {
  aldea: [0, 5],
  frontera: [1, 0],
  montana: [0, 4],
  sombras: [4, 0],
  torre: [1, 2]
};
const ROLE_BACKGROUNDS = {
  tank: '#141d2a',
  healer: '#15251d',
  damage: '#28191d'
};

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function sourcePath(file) { return path.join(SOURCE, file); }
function safeColor(color) { return /^#[0-9a-f]{6}$/i.test(color) ? color : '#718096'; }

async function makeIcon(cropBuffer, outputFile, rarityColor = null) {
  const icon = await sharp(cropBuffer)
    .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toBuffer();
  if (!rarityColor) return sharp(icon).png().toFile(outputFile);
  const color = safeColor(rarityColor);
  const frame = Buffer.from(`<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="120" height="120" rx="15" fill="none" stroke="${color}" stroke-width="7"/></svg>`);
  return sharp(icon).composite([{ input: frame }]).png().toFile(outputFile);
}

async function cropCell(file, left, top, width, height) {
  return sharp(sourcePath(file)).extract({ left, top, width, height }).png().toBuffer();
}

async function makeLongbowIcon(sourceBuffer, outputFile, rarityColor) {
  const color = safeColor(rarityColor);
  const background = Buffer.from(`<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#254d34"/><stop offset="1" stop-color="#101d16"/></linearGradient></defs><rect x="3" y="3" width="122" height="122" rx="18" fill="url(#g)" stroke="${color}" stroke-width="7"/><rect x="10" y="10" width="108" height="108" rx="12" fill="none" stroke="${color}" stroke-opacity=".25" stroke-width="1.5"/></svg>`);
  const icon = await sharp(sourceBuffer).trim().resize(96, 96, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return sharp({ create: { width: 128, height: 128, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: background }, { input: icon, left: 16, top: 16 }])
    .png().toFile(outputFile);
}

async function build() {
  for (const dir of ['classes', 'items', 'ui', 'maps']) ensureDir(path.join(OUTPUT, dir));
  const generated = [];

  for (const [key, spec] of Object.entries(CLASSES)) {
    const [row, col] = spec.cell;
    const crop = await cropCell('skills2.png', col * TILE, row * TILE, TILE, TILE);
    const output = path.join(OUTPUT, 'classes', `${key}.png`);
    await makeIcon(crop, output);
    generated.push(`classes/${key}.png`);
  }

  for (const [kind, spec] of Object.entries(ITEM_SPRITES)) {
    const crop = kind === 'bow' ? fs.readFileSync(sourcePath('bow-clear.png')) : await cropCell(spec.file, spec.left, spec.top, spec.width, spec.height);
    for (const rarity of Object.keys(RARITIES)) {
      const prefix = kind === 'bow' ? 'longbow' : kind;
      const relative = `items/${prefix}-${rarity}.png`;
      if (kind === 'bow') await makeLongbowIcon(crop, path.join(OUTPUT, relative), RARITIES[rarity]);
      else await makeIcon(crop, path.join(OUTPUT, relative), RARITIES[rarity]);
      generated.push(relative);
    }
  }

  const uiSources = {
    inventory: { file: 'activables2.png', left: 74, top: 0, width: 58, height: 64 },
    shop: { file: 'activables2.png', left: 74, top: 0, width: 58, height: 64 },
    gold: { file: 'activables2.png', left: 260, top: 0, width: 78, height: 64 },
    guild: { file: 'flags3.png', left: 0, top: 28, width: 365, height: 250 }
  };
  for (const [key, spec] of Object.entries(uiSources)) {
    const crop = await cropCell(spec.file, spec.left, spec.top, spec.width, spec.height);
    const output = path.join(OUTPUT, 'ui', `${key}.png`);
    await makeIcon(crop, output);
    generated.push(`ui/${key}.png`);
  }

  // Extrae las 36 miniaturas del atlas 6 x 6 y conserva su relación cuadrada.
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      const relative = `maps/map-${row}-${col}.png`;
      await sharp(sourcePath('map_thumbnails3.png'))
        .extract({ left: col * 162, top: row * 162, width: 162, height: 162 })
        .resize(256, 256, { fit: 'fill' })
        .png()
        .toFile(path.join(OUTPUT, relative));
      generated.push(relative);
    }
  }

  const sourceFiles = fs.readdirSync(SOURCE).filter(name => name.toLowerCase().endsWith('.png')).sort();
  const sourceAssets = [];
  for (const name of sourceFiles) {
    const fullPath = sourcePath(name);
    const buffer = fs.readFileSync(fullPath);
    const metadata = await sharp(buffer).metadata();
    const category = name.startsWith('items') ? 'atlas de objetos/equipo'
      : name.startsWith('skills') ? 'atlas de habilidades'
      : name.startsWith('map_thumbnails') ? 'atlas de mapas'
      : name.startsWith('activables') ? 'objetos del mundo y monedas'
      : name.startsWith('flags') ? 'emblemas y banderas'
      : 'iconos de interfaz';
    sourceAssets.push({ file: name, category, width: metadata.width, height: metadata.height, bytes: buffer.length, sha256: crypto.createHash('sha256').update(buffer).digest('hex') });
  }
  const manifest = {
    source: 'ZIP proporcionado por el usuario mediante MediaFire; licencia de los gráficos no incluida en el archivo.',
    sourceCount: sourceAssets.length,
    generatedCount: generated.length,
    rarityColors: RARITIES,
    classIcons: Object.fromEntries(Object.entries(CLASSES).map(([key, value]) => [key, { asset: `classes/${key}.png`, cell: value.cell, role: value.role }])),
    itemIcons: Object.fromEntries(Object.entries(ITEM_SPRITES).map(([key, value]) => [key, { source: key === 'bow' ? 'bow-clear.png' : value.file, sourceRect: key === 'bow' ? null : [value.left, value.top, value.width, value.height], variants: Object.keys(RARITIES).map(rarity => `items/${key === 'bow' ? 'longbow' : key}-${rarity}.png`) }])),
    zoneMaps: Object.fromEntries(Object.entries(ZONE_CELLS).map(([key, cell]) => [key, { asset: `maps/map-${cell[0]}-${cell[1]}.png`, cell }])),
    sourceAssets
  };
  fs.writeFileSync(path.join(ROOT, 'assets/warcraft/manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Generados ${generated.length} recursos a partir de ${sourceAssets.length} PNG originales.`);
}

build().catch(error => { console.error(error); process.exitCode = 1; });
