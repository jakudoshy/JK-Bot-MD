'use strict';

const fs = require('node:fs');
const path = require('node:path');
const game = require('./warcraft');
const webAssets = require('./warcraftWeb');
const manifest = require('../assets/warcraft/manifest.json');
const ROOT = path.resolve(__dirname, '..');
const GENERATED = path.join(ROOT, 'assets/warcraft/generated');
const MAX_CAPTION = 950;

function clampCaption(value) {
  const caption = String(value || '');
  return caption.length > MAX_CAPTION ? `${caption.slice(0, MAX_CAPTION - 3)}...` : caption;
}
function assetBuffer(relativePath) {
  const fullPath = path.resolve(GENERATED, relativePath);
  if (!fullPath.startsWith(`${GENERATED}${path.sep}`) || !fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath);
}
function itemRelativePath(item) {
  const url = webAssets.itemImage(item || {});
  return url.replace(/^\/assets\/warcraft\/generated\//, '');
}
async function sendImage(sock, chatId, msg, relativePath, caption) {
  const image = assetBuffer(relativePath);
  if (!image) return sock.sendMessage(chatId, { text: String(caption || 'Imagen no disponible.') }, { quoted: msg });
  return sock.sendMessage(chatId, { image, caption: clampCaption(caption) }, { quoted: msg });
}
async function sendClass(sock, chatId, msg, classKey, caption) {
  const key = String(classKey || '').toLowerCase();
  const file = manifest.classIcons?.[key]?.asset;
  if (!file) return sock.sendMessage(chatId, { text: String(caption || 'Clase creada.') }, { quoted: msg });
  return sendImage(sock, chatId, msg, file, caption);
}
async function sendItem(sock, chatId, msg, item, caption) {
  return sendImage(sock, chatId, msg, itemRelativePath(item), caption);
}
async function sendZone(sock, chatId, msg, zoneId, caption) {
  const file = manifest.zoneMaps?.[zoneId]?.asset;
  if (!file) return sock.sendMessage(chatId, { text: String(caption || 'Zona actualizada.') }, { quoted: msg });
  return sendImage(sock, chatId, msg, file, caption);
}
async function sendMap(sock, chatId, msg) {
  await sock.sendMessage(chatId, { text: 'Mapa del mundo · zonas, nivel y recursos' }, { quoted: msg });
  for (const [id, zone] of Object.entries(game.ZONES)) {
    const caption = `${zone.name} · nivel ${zone.level}\nEnemigos: ${zone.enemies.join(', ')}\nRecursos: ${zone.gathering.join(', ')}\nViajar: /viajar ${id}`;
    await sendZone(sock, chatId, msg, id, caption);
  }
}
async function sendShopCategory(sock, chatId, msg, player, slot, pageValue = '1') {
  const label = slot === 'weapon' ? 'Armas' : 'Armaduras';
  const catalog = game.shopItems(player).filter(item => item.slot === slot);
  if (!catalog.length) return sock.sendMessage(chatId, { text: `No hay ${label.toLowerCase()} disponibles para tu nivel (${player.level}).` }, { quoted: msg });
  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(catalog.length / pageSize));
  const parsed = Number.parseInt(String(pageValue || '1'), 10);
  const page = Number.isFinite(parsed) ? Math.min(pageCount, Math.max(1, parsed)) : 1;
  const visible = catalog.slice((page - 1) * pageSize, page * pageSize);
  await sock.sendMessage(chatId, { text: `${label} · nivel ${player.level} · página ${page}/${pageCount}\nCada tarjeta muestra rareza, ataque, defensa y estadísticas aplicables.` }, { quoted: msg });
  for (const item of visible) {
    const caption = `${game.formatItem(item)}\nID: ${item.id} · Precio: ${item.price} oro\nComprar: /comprar ${item.id}`;
    await sendItem(sock, chatId, msg, item, caption);
  }
  return sock.sendMessage(chatId, { text: page < pageCount ? `Siguiente página: /${slot === 'weapon' ? 'armas' : 'armaduras'} ${page + 1}` : 'Fin del catálogo para tu nivel.' }, { quoted: msg });
}
async function sendInventory(sock, chatId, msg, player) {
  await sendImage(sock, chatId, msg, 'ui/gold.png', `Oro de ${player.name}: ${player.gold}`);
  await sendImage(sock, chatId, msg, 'ui/inventory.png', `Mochila de ${player.name}\nArma: ${game.ITEMS[player.equipment.weapon]?.name || 'Sin arma'}\nArmadura: ${game.ITEMS[player.equipment.armor]?.name || 'Sin armadura'}`);
  const list = game.listItems(player).map(item => `${item.index}. ${game.formatItem(item.id)} [${item.id}]`).join('\n\n') || 'Vacío';
  return sock.sendMessage(chatId, { text: `Inventario · ${player.name}\n\n${list}\n\nArma: ${game.formatItem(player.equipment.weapon)}\nArmadura: ${game.formatItem(player.equipment.armor)}` }, { quoted: msg });
}
async function sendCombatResult(sock, chatId, msg, result, player, text) {
  const ids = [];
  if (result?.loot) ids.push(result.loot);
  if (result?.materialLoot) ids.push(result.materialLoot);
  for (const id of (result?.quest?.items || [])) ids.push(id);
  for (const id of [...new Set(ids)].slice(0, 3)) {
    const item = game.ITEMS[id];
    if (item) await sendItem(sock, chatId, msg, item, `Botín obtenido\n${game.formatItem(id)} [${id}]`);
  }
  return sock.sendMessage(chatId, { text }, { quoted: msg });
}

module.exports = { sendImage, sendClass, sendItem, sendZone, sendMap, sendShopCategory, sendInventory, sendCombatResult, itemRelativePath };
