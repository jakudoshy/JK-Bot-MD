'use strict';

const crypto = require('crypto');
const game = require('./warcraft');

function ensureTransfers(root) {
  root.reimbursements ||= {};
  root.reimbursementDrafts ||= {};
  return root;
}

function phoneOf(value) {
  return game.normalizePhone(String(value || '').replace(/^@/, ''));
}

function resolvePlayer(root, identifier) {
  const raw = String(identifier || '').trim().replace(/^@/, '').replace(/[<>,]/g, '');
  const phone = phoneOf(raw);
  let account = Object.values(root.accounts || {}).find(a => String(a.phone) === phone);
  if (!account) account = Object.values(root.accounts || {}).find(a => String(a.username || '').toLowerCase() === raw.toLowerCase());
  let player = root.players?.[account?.phone] || root.players?.[phone];
  if (!player) {
    const matches = Object.values(root.players || {}).filter(p => String(p.name || '').toLowerCase() === raw.toLowerCase());
    if (matches.length !== 1) return null;
    player = matches[0];
    account = Object.values(root.accounts || {}).find(a => phoneOf(a.phone) === phoneOf(player.id)) || account;
  }
  if (!player) return null;
  return { account: account || null, player, phone: String(player.id || account?.phone || phone) };
}

function parseAsset(spec, options = {}) {
  const text = String(spec || '').trim();
  const allowNone = Boolean(options.allowNone);
  if (allowNone && /^(?:-reembolso|0|nada|ninguno|ninguna|no)$/i.test(text)) return { type: 'none' };
  if (!text) return { error: 'Indica “oro cantidad” o un objeto; por ejemplo, “oro 53” o “poción de salud x1”.' };

  let goldMatch = text.match(/^(?:oro|gold)\s+(?:x\s*)?(\d+)$/i) || text.match(/^(\d+)\s+(?:oro|gold)$/i) || text.match(/^(\d+)$/);
  if (goldMatch) {
    const amount = Number(goldMatch[1]);
    if (!Number.isSafeInteger(amount) || amount < 1) return { error: 'La cantidad de oro debe ser mayor que cero.' };
    if (options.owner && amount > Number(options.owner.gold || 0)) return { error: `No tienes suficiente oro. Tienes ${options.owner.gold || 0}.` };
    return { type: 'gold', amount };
  }

  const cleaned = text.replace(/^(?:objeto|item)\s+/i, '').trim();
  const quantityMatch = cleaned.match(/^(.*?)\s*(?:x|×)\s*(\d+)$/i);
  const name = (quantityMatch ? quantityMatch[1] : cleaned).trim();
  const quantity = quantityMatch ? Number(quantityMatch[2]) : 1;
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) return { error: 'La cantidad de objetos debe estar entre 1 y 100.' };
  const itemId = game.findItemId(name);
  if (!itemId) return { error: `No reconozco el objeto “${name}”. Revisa /inventario o /tienda.` };
  if (options.owner) {
    const available = (options.owner.inventory || []).filter(id => id === itemId).length;
    if (available < quantity) return { error: `No tienes ${quantity} × ${game.ITEMS[itemId]?.name || itemId}.` };
  }
  return { type: 'item', itemId, quantity };
}

function describeAsset(asset) {
  if (!asset || asset.type === 'none') return 'nada';
  if (asset.type === 'gold') return `${asset.amount} de oro`;
  if (asset.type === 'item') return `${game.ITEMS[asset.itemId]?.name || asset.itemId} x${asset.quantity}`;
  return 'contenido desconocido';
}

function hasAsset(player, asset) {
  if (!player || !asset || asset.type === 'none') return Boolean(player);
  if (asset.type === 'gold') return Number(player.gold || 0) >= asset.amount;
  if (asset.type === 'item') return (player.inventory || []).filter(id => id === asset.itemId).length >= asset.quantity;
  return false;
}

function transferAsset(from, to, asset) {
  if (!asset || asset.type === 'none') return true;
  if (asset.type === 'gold') {
    from.gold -= asset.amount;
    to.gold += asset.amount;
    return true;
  }
  if (asset.type === 'item') {
    const items = Array(asset.quantity).fill(asset.itemId);
    if (!game.removeItems(from, items)) return false;
    to.inventory.push(...items);
    return true;
  }
  return false;
}

function createDraft(root, fromPlayer, toPlayer, offer, now = Date.now()) {
  ensureTransfers(root);
  if (!fromPlayer || !toPlayer || fromPlayer.id === toPlayer.id) return { error: 'El destinatario debe ser otro jugador con personaje.' };
  if (!hasAsset(fromPlayer, offer)) return { error: `No tienes ${describeAsset(offer)} disponible para ofrecer.` };
  const alreadyPending = Object.values(root.reimbursements).some(tx => tx.status === 'pending' && [tx.fromPhone, tx.toPhone].some(phone => [fromPlayer.id, toPlayer.id].includes(phone)));
  if (alreadyPending) return { error: 'Ya hay un reembolso pendiente para ti o para ese jugador. Acéptalo o cancélalo primero.' };
  const existingId = root.reimbursementDrafts[fromPlayer.id]; const existing = existingId && root.reimbursements[existingId];
  if (existing?.status === 'draft') { existing.status = 'cancelled'; existing.cancelledAt = new Date(now).toISOString(); }
  delete root.reimbursementDrafts[fromPlayer.id];
  const id = crypto.randomBytes(5).toString('hex').toUpperCase();
  const transaction = { id, status: 'draft', fromPhone: fromPlayer.id, toPhone: toPlayer.id, fromName: fromPlayer.name, toName: toPlayer.name, offer, request: null, createdAt: new Date(now).toISOString(), draftExpiresAt: now + 10 * 60 * 1000 };
  root.reimbursements[id] = transaction; root.reimbursementDrafts[fromPlayer.id] = id;
  return { transaction };
}

function submitRequest(root, fromPhone, request, now = Date.now()) {
  ensureTransfers(root);
  const id = root.reimbursementDrafts[fromPhone]; const transaction = id && root.reimbursements[id];
  if (!transaction || transaction.status !== 'draft') { delete root.reimbursementDrafts[fromPhone]; return { error: 'No tienes un reembolso en preparación. Empieza con /darporreembolso jugador oro cantidad o con un objeto.' }; }
  if (transaction.draftExpiresAt < now) { transaction.status = 'expired'; transaction.expiredAt = new Date(now).toISOString(); delete root.reimbursementDrafts[fromPhone]; return { error: 'El borrador expiró. Inicia un reembolso nuevo con /darporreembolso.', changed: true }; }
  const pendingConflict = Object.values(root.reimbursements).some(tx => tx.id !== transaction.id && tx.status === 'pending' && [tx.fromPhone, tx.toPhone].includes(fromPhone));
  if (pendingConflict) return { error: 'Tienes otra solicitud pendiente; resuélvela antes de enviar este reembolso.' };
  if (!request || !['gold', 'item', 'none'].includes(request.type)) return { error: 'La solicitud no es válida.' };
  transaction.request = request; transaction.status = 'pending'; transaction.expiresAt = now + 24 * 60 * 60 * 1000; transaction.sentAt = new Date(now).toISOString();
  delete root.reimbursementDrafts[fromPhone];
  return { transaction };
}

function accept(root, transactionId, recipientPhone, now = Date.now()) {
  ensureTransfers(root);
  const transaction = root.reimbursements[transactionId];
  if (!transaction) return { error: 'No se encontró ese reembolso.' };
  if (transaction.toPhone !== recipientPhone) return { error: 'Solo el destinatario registrado puede aceptar este reembolso.' };
  if (transaction.status === 'completed') return { transaction, alreadyCompleted: true };
  if (transaction.status !== 'pending') return { error: `Este reembolso no puede aceptarse: su estado es ${transaction.status}.` };
  if (transaction.expiresAt < now) { transaction.status = 'expired'; transaction.expiredAt = new Date(now).toISOString(); return { error: 'La solicitud expiró. Pide una nueva.', changed: true }; }
  const from = root.players[transaction.fromPhone]; const to = root.players[transaction.toPhone];
  if (!from || !to) return { error: 'Ambos jugadores necesitan un personaje.' };
  const outgoing = transaction.offer; const incoming = transaction.request;
  if (!hasAsset(from, outgoing)) return { error: `${transaction.fromName} ya no tiene lo que ofreció. Cancela y crea una solicitud nueva.` };
  if (incoming?.type !== 'none' && !hasAsset(to, incoming)) return { error: `Te falta ${describeAsset(incoming)}. El intercambio no se realizó.` };
  if (!transferAsset(from, to, outgoing)) return { error: 'No se pudo transferir la oferta; no se completó el intercambio.' };
  if (incoming?.type !== 'none' && !transferAsset(to, from, incoming)) {
    if (outgoing.type === 'gold') { to.gold -= outgoing.amount; from.gold += outgoing.amount; }
    else if (outgoing.type === 'item') { game.removeItems(to, Array(outgoing.quantity).fill(outgoing.itemId)); from.inventory.push(...Array(outgoing.quantity).fill(outgoing.itemId)); }
    return { error: 'No se pudo completar la segunda parte; se revirtió la oferta.' };
  }
  game.recalc(from); game.recalc(to); transaction.status = 'completed'; transaction.completedAt = new Date(now).toISOString(); transaction.acceptedBy = recipientPhone;
  return { transaction, from, to };
}

function cancel(root, transactionId, actorPhone, now = Date.now()) {
  ensureTransfers(root);
  const transaction = root.reimbursements[transactionId];
  if (!transaction) return { error: 'No se encontró esa solicitud de reembolso.' };
  if (![transaction.fromPhone, transaction.toPhone].includes(actorPhone)) return { error: 'Solo quienes participan pueden cancelar esta solicitud.' };
  if (transaction.status === 'cancelled') return { transaction, alreadyCancelled: true };
  if (transaction.status !== 'pending') return { error: `No se puede cancelar; el reembolso está en estado ${transaction.status}.` };
  transaction.status = 'cancelled';
  transaction.cancelledAt = new Date(now).toISOString();
  transaction.cancelledBy = actorPhone;
  return { transaction };
}

function give(root, fromPlayer, toPlayer, asset) {
  if (!fromPlayer || !toPlayer || fromPlayer.id === toPlayer.id) return { error: 'Indica otro jugador con personaje.' };
  if (!hasAsset(fromPlayer, asset)) return { error: `No tienes ${describeAsset(asset)}.` };
  if (!transferAsset(fromPlayer, toPlayer, asset)) return { error: 'No se pudo completar el regalo.' };
  game.recalc(fromPlayer); game.recalc(toPlayer);
  return { from: fromPlayer, to: toPlayer, asset };
}

module.exports = { ensureTransfers, resolvePlayer, parseAsset, describeAsset, hasAsset, createDraft, submitRequest, accept, cancel, give };
