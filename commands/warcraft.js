const game = require('../lib/warcraft');
const crypto = require('crypto');
const transfers = require('../lib/warcraftTransfers');
function phoneCandidates(msg, chatId) { const keys = [msg?.key?.participant, msg?.key?.participantAlt, msg?.key?.senderPn, msg?.key?.participantPn, msg?.key?.remoteJid, msg?.key?.remoteJidAlt, chatId]; return [...new Set(keys.map(game.normalizePhone).filter(value => /^\d{7,16}$/.test(value)))]; }
function jidOf(msg, chatId) { return `${phoneCandidates(msg, chatId)[0] || game.normalizePhone(chatId)}@s.whatsapp.net`; }
function reply(sock, chatId, msg, text) { return sock.sendMessage(chatId, { text }, { quoted: msg }); }
function menu(category = '') {
  const groups = {
    combate: ['estado', 'enemigos', 'buscar lobo', 'atacar', 'habilidad nombre', 'usar pocion', 'huir'],
    personaje: ['estadopersonaje', 'fichapersonaje', 'inventario', 'equipar objeto', 'talentos ataque|defensa|vitalidad'],
    tienda: ['tienda', 'comprar id', 'confirmarcompra', 'cancelarcompra', 'recompensadiaria'],
    progreso: ['misiones', 'mazmorras', 'mazmorra crypt', 'logros', 'mapa', 'viajar zona', 'tutorial'],
    mundo: ['profesiones', 'aprender mineria', 'recolectar recurso', 'recetas', 'fabricar receta', 'monturas', 'comprarmontura id', 'encantamientos', 'encantar filo arma'],
    comunidad: ['duelo numero', 'aceptarduelo', 'atacarduelo', 'habilidadduelo nombre', 'rendirse', 'dar jugador oro 53', 'darporreembolso jugador oro 1000', 'reembolso objeto', 'accept rem', 'cancel rem', 'subasta', 'vender objeto precio', 'comprarsubasta id', 'correo', 'hermandad crear nombre']
  };
  const requested = String(category || '').trim().toLowerCase();
  if (groups[requested]) return `⚔️ *WARCRAFT RPG · ${requested.toUpperCase()}*\n\n${groups[requested].map(item => `• /${item}`).join('\n')}\n\n/tutorial · instrucciones para empezar`;
  return `⚔️ *WARCRAFT RPG*\n\nUsa /warcraft para abrir el selector interactivo y elegir comandos por sección.\n\n🔐 /login usuario contraseña · Vincula la cuenta creada en la página.\n📖 /tutorial · Guía paso a paso.\n🎁 /dar jugador oro 53 · Regalo directo.\n🤝 /darporreembolso jugador oro 1000 · Intercambio protegido.\n\nLos comandos se escriben en español y sin W final.`;
}
function activeTrade(root, id) { return Object.values(root.trades || {}).find(t => ['active','pending'].includes(t.status) && [t.owner, t.guest, ...(t.participants || [])].includes(id)); }
function settleTrade(root, trade) { const ids = trade.participants || [trade.owner, trade.guest]; const [a, b] = ids; const pa = root.players[a] || root.players[root.accounts?.[a]?.phone]; const pb = root.players[b] || root.players[root.accounts?.[b]?.phone]; if (!pa || !pb) return { error: 'Ambos jugadores necesitan un personaje.' }; for (const id of ids) { const p = root.players[id] || root.players[root.accounts?.[id]?.phone]; const offer = trade.offers[id] || { items: [], gold: 0 }; if (!p || offer.gold > p.gold || !offer.items.every(item => p.inventory.includes(item))) return { error: 'La oferta ya no está disponible en el inventario.' }; } const oa = trade.offers[a] || { items: [], gold: 0 }; const ob = trade.offers[b] || { items: [], gold: 0 }; if (!game.removeItems(pa, oa.items) || !game.removeItems(pb, ob.items)) return { error: 'No se pudieron reservar los objetos.' }; pa.inventory.push(...ob.items); pb.inventory.push(...oa.items); pa.gold = pa.gold - Number(oa.gold || 0) + Number(ob.gold || 0); pb.gold = pb.gold - Number(ob.gold || 0) + Number(oa.gold || 0); game.recalc(pa); game.recalc(pb); trade.status = 'completed'; trade.completedAt = new Date().toISOString(); return { ok: true }; }
function combatText(result, p) { return `${result.log?.join('\n') || ''}${Number.isFinite(result.enemyHp) ? `\n\n❤️ Enemigo: ${result.enemyHp}/${result.enemyMaxHp} · ❤️ Tú: ${p.hp}/${p.maxHp}` : ''}\n\n${game.formatStatus(p)}${result.victory ? `\n\n🏆 Victoria. Ganaste ${result.gold} oro${result.loot ? ` y encontraste ${game.ITEMS[result.loot]?.name || result.loot}${result.equippedLoot ? ' (equipado automáticamente)' : ''}` : ''}${result.materialLoot ? `\n⛏️ Material obtenido: ${game.ITEMS[result.materialLoot]?.name || result.materialLoot}` : ''}.` : ''}${result.error ? `\n\n❌ ${result.error}` : ''}`; }
async function run(sock, chatId, msg, command, q, botData, saveBotData) {
  const phones = phoneCandidates(msg, chatId); const id = phones[0]; const jid = jidOf(msg, chatId); const root = game.ensureRoot(botData); let p = game.ensurePlayer(botData, jid, msg?.pushName || 'Aventurero'); command = String(command || '').toLowerCase(); root.sessions ||= {}; root.tradeRequests ||= {}; transfers.ensureTransfers(root);
  if (command === 'tutorialw' || command === 'tutorialwarcraft' || command === 'tutorial') return reply(sock, chatId, msg, `📖 *TUTORIAL WARCRAFT*

1️⃣ *Entrar*: desde el WhatsApp registrado, escribe en un solo mensaje: */login tu_usuario tu_contraseña*.

2️⃣ *Crear personaje*: el personaje se crea por WhatsApp, no en la web. Usa /nombredelpersonaje Espartaco y luego /clase guerrero, /clase mago o /clase pícaro. La cuenta y el personaje aparecerán en el ranking de la página.

3️⃣ *Combate*: /enemigos muestra rivales; /buscar lobo inicia combate; /atacar ataca; /habilidad golpe usa una habilidad; /usar health_potion cura; /huir abandona.

4️⃣ *Equipo y GS*: /inventario lista objetos; /equipar iron_blade equipa un arma. Cada equipo mejora ataque, defensa y GS.

5️⃣ *Compra*: /tienda muestra precios; /comprar health_potion compra. La web muestra una confirmación antes de comprar.

6️⃣ *Dar o intercambiar*: regalo inmediato: /dar jugador oro 53 o /dar jugador Poción de salud x1. Para un intercambio protegido, usa /darporreembolso jugador oro 1000, después /reembolso item_codigo x1 (o /-reembolso si no pides nada). El otro recibe un mensaje privado; /accept rem acepta el intercambio y /cancel rem lo cancela. Nada se mueve antes de aceptar.

7️⃣ *Duelo*: /duelo número, el rival usa /aceptarduelo y luego /atacarduelo o /habilidadduelo golpe por turnos. /rendirse abandona.

8️⃣ *Mundo MMO*: /mapa y /viajar frontera. Consulta /recolectar para ver los recursos disponibles, aprende un oficio y recoge materiales en la zona correcta. La página conserva los paneles de combate, tienda, mundo y duelo; el intercambio se hace por WhatsApp.

9️⃣ *Botín*: los lobos pueden dar colmillos, los bandidos cuero y los ogros esencia de sombra. Debes luchar contra el NPC correcto; no puedes pedir el material directamente.

🔟 *Encantamientos*: /encantamientos lista mejoras. Usa /encantar filo arma o /encantar fortaleza armadura; consume materiales y aumenta ataque, defensa, vida y GS.

1️⃣1️⃣ *Economía y grupo*: /gruporpg crear, /subasta, /vender objeto precio, /correo, /reclamarmail, /monturas y /recompensadiaria.

1️⃣2️⃣ *Progreso*: /misiones, /mazmorras, /mazmorra crypt, /talentos ataque y /hermandad crear nombre.

✅ *Flujo*: crear cuenta en la página → /login → personaje por WhatsApp → luchar → mejorar GS → regalo o intercambio seguro por chat.`);
  if (command === 'warcraft' || command === 'warcraftmenu' || command === 'ayudaw' || command === 'comandosw') return reply(sock, chatId, msg, `${menu(q)}${root.sessions[id] && p ? `\n\n${game.formatStatus(p)}` : ''}`);
  if (command === 'loginw' || command === 'login') { const parts = q.trim().split(/\s+/).filter(Boolean); if (parts.length < 2) return reply(sock, chatId, msg, 'Uso: /login usuario contraseña (escribe ambos en el mismo mensaje).'); const raw = String(parts.shift() || '').toLowerCase(); const password = parts.join(' '); const account = Object.values(root.accounts).find(item => String(item.phone) === game.normalizePhone(raw) || String(item.username).toLowerCase() === raw); if (!account) return reply(sock, chatId, msg, '❌ Usuario no registrado o usuario incorrecto.'); let valid = false; try { const [salt, digest] = String(account.passwordHash || '').split(':'); const actual = crypto.scryptSync(password, salt, 64); valid = Buffer.from(digest || '', 'hex').length === actual.length && crypto.timingSafeEqual(actual, Buffer.from(digest || '', 'hex')); } catch {} if (!valid) return reply(sock, chatId, msg, '❌ Contraseña incorrecta.'); if (!phones.includes(game.normalizePhone(account.phone))) return reply(sock, chatId, msg, '❌ Debes usar el WhatsApp del número registrado.'); root.sessions[id] = account.username; saveBotData(); return reply(sock, chatId, msg, '✅ Sesión iniciada. Ya puedes usar /warcraft.'); }
  if (!root.sessions[id]) return reply(sock, chatId, msg, '🔐 Cuenta no vinculada. Regístrate y usa /login usuario contraseña.');
  if (['dar', 'ofrecer', 'darporreembolso', 'reembolso', '-reembolso', 'aceptarreembolso', 'cancelarreembolso'].includes(command) && !p) return reply(sock, chatId, msg, '❌ Primero crea tu personaje en WhatsApp con /nombredelpersonaje Nombre y /clase guerrero, mago o pícaro.');
  if (command === 'dar') {
    const [targetToken, ...assetParts] = String(q || '').trim().split(/\s+/);
    if (!targetToken || !assetParts.length) return reply(sock, chatId, msg, '🎁 Uso: /dar jugador oro 53 o /dar jugador Poción de salud x1. El regalo se entrega inmediatamente.');
    const target = transfers.resolvePlayer(root, targetToken);
    if (!target) return reply(sock, chatId, msg, '❌ No encuentro un personaje registrado con ese usuario o número.');
    const asset = transfers.parseAsset(assetParts.join(' '), { owner: p });
    if (asset.error) return reply(sock, chatId, msg, `❌ ${asset.error}`);
    const result = transfers.give(root, p, target.player, asset);
    if (result.error) return reply(sock, chatId, msg, `❌ ${result.error}`);
    saveBotData();
    const text = `🎁 *Regalo de Warcraft*\n${p.name} te envió ${transfers.describeAsset(asset)}.\nUsa /inventario o /estado para verlo.`;
    try { await sock.sendMessage(`${target.phone}@s.whatsapp.net`, { text }); } catch {}
    return reply(sock, chatId, msg, `✅ Le diste ${transfers.describeAsset(asset)} a ${target.player.name}.`);
  }
  if (command === 'ofrecer') {
    const t = activeTrade(root, id);
    if (!t || t.status !== 'active') return reply(sock, chatId, msg, '❌ No tienes un comercio anterior abierto. Para un regalo usa /dar jugador oro 53; para un intercambio seguro usa /darporreembolso.');
    const match = String(q || '').trim().match(/^(.+?)\s+x\s*(\d+)$/i);
    if (!match) return reply(sock, chatId, msg, 'Uso del comercio anterior: /ofrecer Poción x2 o /ofrecer oro x20. Para transferencias nuevas usa /dar o /darporreembolso.');
    const asset = transfers.parseAsset(`${match[1]} x${match[2]}`, { owner: p });
    if (asset.error) return reply(sock, chatId, msg, `❌ ${asset.error}`);
    const offer = t.offers[id] || { items: [], gold: 0 };
    if (asset.type === 'gold') offer.gold = asset.amount;
    else if (asset.type === 'item') offer.items = Array(asset.quantity).fill(asset.itemId);
    else return reply(sock, chatId, msg, '❌ La oferta no es válida.');
    t.offers[id] = offer; t.accepted = {}; saveBotData();
    return reply(sock, chatId, msg, '📦 Oferta anterior actualizada.');
  }
  if (command === 'darporreembolso') {
    const [targetToken, ...assetParts] = String(q || '').trim().split(/\s+/);
    if (!targetToken || !assetParts.length) return reply(sock, chatId, msg, '🤝 Uso: /darporreembolso jugador oro 1000 o /darporreembolso jugador item_codigo x1. Después indica lo que quieres recibir con /reembolso objeto x1 o /reembolso oro 53.');
    const target = transfers.resolvePlayer(root, targetToken);
    if (!target) return reply(sock, chatId, msg, '❌ No encuentro un personaje registrado con ese usuario o número.');
    if (target.phone === p.id) return reply(sock, chatId, msg, '❌ No puedes intercambiar contigo mismo.');
    const offer = transfers.parseAsset(assetParts.join(' '), { owner: p });
    if (offer.error) return reply(sock, chatId, msg, `❌ ${offer.error}`);
    const draft = transfers.createDraft(root, p, target.player, offer);
    if (draft.error) return reply(sock, chatId, msg, `❌ ${draft.error}`);
    saveBotData();
    return reply(sock, chatId, msg, `🤝 *Reembolso casi listo.*\nVas a ofrecer ${transfers.describeAsset(offer)} a ${target.player.name}.\nAhora escribe /reembolso objeto x1, /reembolso oro 53 o /-reembolso si no quieres recibir nada a cambio.`);
  }
  if (command === 'reembolso' || command === '-reembolso') {
    const request = command === '-reembolso' ? { type: 'none' } : transfers.parseAsset(q, { allowNone: true });
    if (request.error) return reply(sock, chatId, msg, `❌ ${request.error}`);
    const submitted = transfers.submitRequest(root, p.id, request);
    if (submitted.error) return reply(sock, chatId, msg, `❌ ${submitted.error}`);
    const tx = submitted.transaction;
    const requested = tx.request.type === 'none' ? 'nada; es un regalo que requiere aceptación' : transfers.describeAsset(tx.request);
    const itemCode = asset => asset?.type === 'item' ? ` (código: ${asset.itemId})` : '';
    const text = `🤝 *Solicitud de reembolso · ${tx.id}*\n\n${tx.fromName} te quiere dar ${transfers.describeAsset(tx.offer)}${itemCode(tx.offer)}. A cambio solicita: ${requested}${itemCode(tx.request)}.\n\nPara aceptar y completar ambas transferencias: */accept rem*\nPara cancelar sin mover objetos ni oro: */cancel rem*.`;
    try {
      await sock.sendMessage(`${tx.toPhone}@s.whatsapp.net`, { text });
    } catch {
      tx.status = 'cancelled'; saveBotData();
      return reply(sock, chatId, msg, '❌ No se pudo enviar la solicitud al chat privado del destinatario. Se canceló sin mover oro ni objetos.');
    }
    saveBotData();
    return reply(sock, chatId, msg, `✅ *Reembolso listo.* Se envió a ${tx.toName} por privado. No se transferirá nada hasta que escriba /accept rem. ID: ${tx.id}.`);
  }
  if (command === 'aceptarreembolso') {
    const tx = q.trim() ? root.reimbursements[q.trim().toUpperCase()] : Object.values(root.reimbursements).find(t => t.status === 'pending' && t.toPhone === p.id);
    if (!tx) return reply(sock, chatId, msg, '❌ No tienes una solicitud de reembolso pendiente.');
    const result = transfers.accept(root, tx.id, p.id);
    if (result.error) return reply(sock, chatId, msg, `❌ ${result.error}`);
    saveBotData();
    const summary = `✅ *Reembolso completado*\n${tx.fromName} entregó ${transfers.describeAsset(tx.offer)} y recibió ${transfers.describeAsset(tx.request)}.`;
    try { await sock.sendMessage(`${tx.fromPhone}@s.whatsapp.net`, { text: summary }); } catch {}
    return reply(sock, chatId, msg, `${summary}\nTu inventario y oro ya están actualizados.`);
  }
  if (command === 'cancelarreembolso') {
    const tx = q.trim() ? root.reimbursements[q.trim().toUpperCase()] : Object.values(root.reimbursements).find(t => t.status === 'pending' && [t.fromPhone, t.toPhone].includes(p.id));
    if (!tx) return reply(sock, chatId, msg, '❌ No tienes una solicitud de reembolso pendiente.');
    const result = transfers.cancel(root, tx.id, p.id);
    if (result.error) return reply(sock, chatId, msg, `❌ ${result.error}`);
    saveBotData();
    const other = p.id === tx.fromPhone ? tx.toPhone : tx.fromPhone;
    try { await sock.sendMessage(`${other}@s.whatsapp.net`, { text: `❌ ${p.name} canceló la solicitud de reembolso ${tx.id}. No se transfirió oro ni objetos.` }); } catch {}
    return reply(sock, chatId, msg, '❌ Reembolso cancelado. No se movió oro ni ningún objeto.');
  }

  if (command === 'pjnombre') { if (p) return reply(sock, chatId, msg, '❌ Ya tienes un personaje.'); const name = q.trim(); if (name.length < 3) return reply(sock, chatId, msg, 'Uso: /nombredelpersonaje Nombre'); root.pending ||= {}; root.pending[id] = { name }; saveBotData(); return reply(sock, chatId, msg, '✅ Nombre guardado. Ahora usa /clase guerrero, /clase mago o /clase picaro.'); }
  if (command === 'clase') { if (p) return reply(sock, chatId, msg, '❌ Ya tienes un personaje.'); const pending = root.pending?.[id]; if (!pending) return reply(sock, chatId, msg, 'Primero usa /nombredelpersonaje Nombre.'); const result = game.createPlayer(botData, jid, pending.name, q.trim().toLowerCase()); if (result.error) return reply(sock, chatId, msg, `❌ ${result.error}`); delete root.pending[id]; saveBotData(); return reply(sock, chatId, msg, `🌅 Has comenzado tu aventura.\n\n${game.formatStatus(result.player)}`); }
  if (!p) return reply(sock, chatId, msg, '❌ No tienes personaje. Usa /nombredelpersonaje Nombre y /clase warrior.');
  if (['statusw','estadow','personajew','estadopersonaje','fichapersonaje','estado'].includes(command)) return reply(sock, chatId, msg, game.formatStatus(p));
  if (command === 'inventariow' || command === 'inventario') return reply(sock, chatId, msg, `🎒 *INVENTARIO*\n\n${game.listItems(p).map(x => `${x.index}. ${x.name} [${x.id}]`).join('\n') || 'Vacío'}\n\n⚔️ Arma: ${p.equipment.weapon || '-'}\n🛡️ Armadura: ${p.equipment.armor || '-'}\n💰 Oro: ${p.gold}`);
  if (command === 'equiparw' || command === 'equipar') { const r = game.equip(p, q.trim()); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `✅ Equipaste ${r.item.name}.\n\n${game.formatStatus(p)}`); }
  if (['usarw','pocionw','usar'].includes(command)) { const r = game.useItem(p, q.trim() || 'health_potion'); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `🧪 Usaste ${r.item.name} y recuperaste ${r.healed} de vida.\n${game.formatStatus(p)}`); }
  if (command === 'enemigosw' || command === 'enemigos') return reply(sock, chatId, msg, `👹 *ENEMIGOS*\n\n${Object.entries(game.ENEMIES).map(([id, e]) => `• ${id} · ${e.name} · nivel ${e.level} · ❤️${e.hp} · ⚔️${e.attack}`).join('\n')}\n\nUsa /buscar lobo.`);
  if (['buscarw','cazarw','buscar'].includes(command)) { const r = game.startCombat(root, p, q.trim().toLowerCase() || 'lobo'); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `⚔️ Combate iniciado contra ${r.combat.enemy.name}.\n❤️ Enemigo: ${r.combat.enemy.hp}/${r.combat.enemy.maxHp}\nUsa /atacar o /habilidad nombre.`); }
  if (['atacarw','atacar','attackw'].includes(command)) { const r = game.combatAttack(root, p, 'auto'); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, combatText(r, p)); }
  if (['habilidadw','skillw','hechizow','habilidad'].includes(command)) { const r = game.combatAttack(root, p, q.trim().toLowerCase()); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}\nHabilidades: ${Object.keys(game.CLASS_CONFIG[p.classKey].skills).join(', ')}`); saveBotData(); return reply(sock, chatId, msg, combatText(r, p)); }
  if (command === 'huirw' || command === 'huir') { if (!root.combat[p.id] || root.combat[p.id].status !== 'active') return reply(sock, chatId, msg, 'No estás en combate.'); root.combat[p.id].status = 'fled'; saveBotData(); return reply(sock, chatId, msg, '🏃 Has huido del combate.'); }
  if (command === 'misionesw' || command === 'misiones') return reply(sock, chatId, msg, `📜 *MISIONES*\n\n${game.QUESTS.map(qs => { const s = p.quests[qs.id] || { progress: 0, completed: false }; return `${s.completed ? '✅' : '▫️'} ${qs.name} ${Math.min(s.progress, qs.goal)}/${qs.goal} · ${qs.xp} XP · ${qs.gold} oro`; }).join('\n')}`);
  if (command === 'mazmorrasw' || command === 'mazmorras') return reply(sock, chatId, msg, `🏰 *MAZMORRAS*\n\n${game.DUNGEONS.map(d => `• ${d.id} · ${d.name} · nivel ${d.level} · jefe ${d.boss}`).join('\n')}\n\nUsa /mazmorraw cripta.`);
  if (command === 'mazmorraw' || command === 'mazmorra') { const r = game.dungeon(p, q.trim().toLowerCase()); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `🏰 *${r.dungeon.name} completada*\n💰 Botín: ${r.reward} oro\n🎁 Objeto: ${game.ITEMS[r.dungeon.item].name}${r.equippedLoot ? ' (equipado automáticamente)' : ''}\n${game.formatStatus(p)}`); }
  if (command === 'tiendaw' || command === 'tienda') return reply(sock, chatId, msg, `🛒 *TIENDA · NIVEL ${p.level}*\n\n${game.shopItems(p).map(x => `${x.rarityColor} ${x.rarityLabel} · Nivel ${x.level} · ${x.id} — ${x.name} · ${x.price} oro`).join('\n')}\n\nSe muestran objetos hasta el siguiente tramo de nivel, con rarezas Común, Poco común, Raro, Épico y Legendario.\nUsa /comprar id.`);
  if (command === 'comprarw' || command === 'comprar') { const idItem = q.trim(); const item = game.ITEMS[idItem]; if (!item) return reply(sock, chatId, msg, '❌ Objeto inexistente. Usa /tienda para ver los IDs.'); if (p.level < item.level || p.gold < item.price) return reply(sock, chatId, msg, `❌ No puedes comprarlo: requiere nivel ${item.level} y cuesta ${item.price} oro.`); root.pendingPurchases[id] = { itemId: idItem, expiresAt: Date.now() + 120000 }; saveBotData(); return reply(sock, chatId, msg, `🛒 Vas a comprar *${item.name}* por ${item.price} oro.\nOro actual: ${p.gold}.\n\n✅ Escribe /ConfirmarCompra para comprar.\n❌ Escribe /CancelarCompra para cancelar.`); }
  if (command === 'confirmarcompra') { const pending = root.pendingPurchases[id]; if (!pending || pending.expiresAt < Date.now()) return reply(sock, chatId, msg, 'No tienes una compra pendiente.'); const r = game.buy(p, pending.itemId); delete root.pendingPurchases[id]; if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `✅ Compra completada: ${r.item.name}.\n${game.formatStatus(p)}`); }
  if (command === 'cancelarcompra') { delete root.pendingPurchases[id]; saveBotData(); return reply(sock, chatId, msg, '❌ Compra cancelada. No se descontó oro.'); }
  if (command === 'talentosw' || command === 'talentos') { const r = game.spendTalent(p, q.trim()); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}\n🎯 Puntos disponibles: ${p.talentPoints || 0}.`); saveBotData(); return reply(sock, chatId, msg, `✅ Talento mejorado: ${r.talent === 'attack' ? 'ataque' : r.talent === 'defense' ? 'defensa' : 'vitalidad'} +${r.increase}. Puntos restantes: ${r.remaining}.\n${game.formatStatus(p)}`); }
  if (command === 'mapaw' || command === 'zonasw') { return reply(sock, chatId, msg, `🗺️ *MUNDO*\n\n${Object.entries(game.ZONES).map(([id,z]) => `• ${id} · ${z.name} · nivel ${z.level} · recursos: ${z.gathering.join(', ')}`).join('\n')}\n\nUsa /viajar zona.`); }
  if (command === 'viajarw') { const r = game.travel(p, q.trim().toLowerCase()); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `📍 Has viajado a ${r.zone.name}.`); }
  if (command === 'profesionesw') return reply(sock, chatId, msg, `🛠️ *PROFESIONES*\nMinería: ${p.professions.mineria || 0} (${p.professionXp.mineria || 0}/${game.professionXpToNext(p.professions.mineria || 1)}) · Herbalismo: ${p.professions.herbalismo || 0} (${p.professionXp.herbalismo || 0}/${game.professionXpToNext(p.professions.herbalismo || 1)}) · Alquimia: ${p.professions.alquimia || 0} · Herrería: ${p.professions['herrería'] || 0} (${p.professionXp['herrería'] || 0}/${game.professionXpToNext(p.professions['herrería'] || 1)})\n\n/aprender mineria|herbalismo|alquimia|herreria`);
  if (command === 'aprenderw') { const r = game.learnProfession(p, q.trim()); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `✅ Aprendiste ${r.profession} nivel ${r.level}.`); }
  if (command === 'recolectarw') { if (!q.trim()) return reply(sock, chatId, msg, `🧭 *FUENTES DE MATERIALES*\n\n${game.materialGuide()}\n\nViaja a la zona correcta, aprende la profesión y usa /recolectar recurso.`); const r = game.gather(p, q.trim()); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}\n\n🧭 Fuentes conocidas:\n${game.materialGuide()}`); saveBotData(); return reply(sock, chatId, msg, `🌿 Encontraste ${r.name}. ${r.profession} nivel ${r.level}${r.levels?.length ? ` · subiste a nivel ${r.levels.at(-1)}` : ''}.`); }
  if (command === 'recetasw') return reply(sock, chatId, msg, `📜 *RECETAS*\n\n${Object.entries(game.RECIPES).map(([id,r]) => `• ${id} · ${r.name} · ${r.profession} ${r.level} · materiales: ${Object.entries(r.materials).map(([m,n]) => `${m} x${n}`).join(', ')}`).join('\n')}\n\n/fabricar receta`);
  if (command === 'fabricarw') { const r = game.craft(p, q.trim()); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `🔨 Fabricaste ${r.recipe.name}: ${game.ITEMS[r.output]?.name || r.output} x${r.quantity}. XP de ${r.recipe.profession}: +${r.recipe.skillXp || 1}${r.levels?.length ? ` · subiste a nivel ${r.levels.at(-1)}` : ''}.`); }
  if (command === 'diariaw') { const r = game.daily(p); if (r.error) return reply(sock, chatId, msg, `⏳ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `🎁 Recompensa diaria: ${r.gold} oro y experiencia. ${r.achievement ? `Logro: ${r.achievement.name}.` : ''}`); }
  if (command === 'logrosw') return reply(sock, chatId, msg, `🏅 *LOGROS*\n\n${Object.entries(game.ACHIEVEMENTS).map(([id,a]) => `${p.achievements[id] ? '✅' : '▫️'} ${a[0]} · ${a[1]} · recompensa ${a[2]} oro`).join('\n')}`);
  if (command === 'monturasw') return reply(sock, chatId, msg, `🐎 *MONTURAS*\n\n${Object.entries(game.MOUNTS).map(([id,m]) => `• ${id} · ${m.name} · nivel ${m.level} · ${m.price} oro ${p.mounts.includes(id) ? '✅' : ''}`).join('\n')}\n\n/comprarmontura id`);
  if (command === 'comprarmonturaw') { const r = game.buyMount(p, q.trim()); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `🐎 Montura conseguida: ${r.mount.name}.`); }
  if (command === 'grupow') { const [action, arg] = q.trim().split(/\s+/); const r = action === 'crear' ? game.createParty(root, p) : action === 'unir' ? game.joinParty(root, p, arg) : action === 'salir' ? game.leaveParty(root, p) : { error: 'Usa /gruporpg crear, /gruporpg unir ID o /gruporpg salir.' }; if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, r.party ? `👥 Grupo ${r.party.id}: ${r.party.members.length}/5 jugadores.` : '👥 Operación de grupo completada.'); }
  if (command === 'subastaw') { const list = game.listAuction(root); return reply(sock, chatId, msg, `🏷️ *SUBASTA*\n\n${list.map(a => `• ${a.id} · ${game.ITEMS[a.item]?.name || a.item} · ${a.price} oro`).join('\n') || 'No hay objetos publicados.'}\n\n/vender objeto precio\n/comprarsubasta ID`); }
  if (command === 'venderw') { const [item, price] = q.trim().split(/\s+/); const r = game.auctionList(root, p, item, price); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `🏷️ Publicaste ${game.ITEMS[r.auction.item]?.name || r.auction.item} por ${r.auction.price} oro. ID ${r.auction.id}.`); }
  if (command === 'comprarsubastaw') { const r = game.auctionBuy(root, p, q.trim()); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `✅ Compraste ${r.item.name} por ${r.auction.price} oro.`); }
  if (command === 'correow') { const mails = (root.mail[id] || []).filter(x => !x.claimed); return reply(sock, chatId, msg, `📬 Tienes ${mails.length} mensajes pendientes.\n${mails.map(x => `• ${game.ITEMS[x.item]?.name || x.item} + ${x.gold} oro`).join('\n') || 'Buzón vacío.'}\n\n/reclamarmail para recibirlo.`); }
  if (command === 'reclamarmailw') { const r = game.claimMail(root, p); saveBotData(); return reply(sock, chatId, msg, `📬 Recibiste ${r.claimed} mensajes del buzón.`); }
  if (command === 'enviarmailw') { const [target, item, gold] = q.trim().split(/\s+/); const r = game.sendMail(root, p, game.normalizePhone(target), item, Number(gold || 0)); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, '📨 Correo enviado.'); }
  if (command === 'encantamientosw') return reply(sock, chatId, msg, `✨ *ENCANTAMIENTOS*\n\n${Object.entries(game.ENCHANTMENTS).map(([id,e]) => `• ${id} · ${e.name} · ${e.slot === 'weapon' ? 'arma' : 'armadura'} · +${e.attack || 0} ataque · +${e.defense || 0} defensa · +${e.hp || 0} vida · materiales: ${Object.entries(e.materials).map(([m,n]) => `${m} x${n}`).join(', ')}`).join('\n')}\n\nUsa /encantar filo arma o /encantar fortaleza armadura.`);
  if (command === 'encantarw') { const [enchantId, slotInput] = q.trim().split(/\s+/); const slot = /^(armadura|armor)$/i.test(slotInput || '') ? 'armor' : 'weapon'; const r = game.enchant(p, enchantId, slot); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `✨ Encantamiento aplicado: ${r.enchantment.name}.\n${game.formatStatus(p)}`); }
  if (command === 'guildw') { const [action, ...rest] = q.trim().split(/\s+/); const r = game.guild(botData, action || 'info', p, rest.join(' ')); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, r.guild ? `🏰 Guild: ${r.guild.name}\n🆔 ID: ${r.guild.id}` : 'No perteneces a ninguna guild.'); }
  if (command === 'duelo' || command === 'desafiar') { const target = String(q || '').match(/\d{7,16}/)?.[0]; if (!target) return reply(sock, chatId, msg, 'Uso: /duelo número_del_jugador'); const r = game.createDuel(root, p, target); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); await sock.sendMessage(`${target}@s.whatsapp.net`, { text: `⚔️ ${p.name} te ha desafiado a un duelo. Usa /aceptarduelo para aceptar o /rendirse para terminar el duelo.` }); return reply(sock, chatId, msg, '⚔️ Desafío enviado.'); }
  if (command === 'aceptarduel' || command === 'aceptarduelo') { const r = game.acceptDuel(root, p); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); const other = r.duel.players.find(x => x !== p.id); await sock.sendMessage(`${other}@s.whatsapp.net`, { text: '⚔️ Duelo iniciado. Es tu turno: usa /atacarduelo o /habilidadduelo nombre.' }); return reply(sock, chatId, msg, '⚔️ Duelo aceptado. El retador empieza.'); }
  if (command === 'atacarduel' || command === 'dueloatacar') { const r = game.duelAttack(root, p, 'auto'); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); const other = r.duel.players.find(x => x !== p.id); if (r.victory) { await sock.sendMessage(`${other}@s.whatsapp.net`, { text: `🏳️ Has perdido el duelo contra ${p.name}.` }); return reply(sock, chatId, msg, `🏆 Ganaste el duelo. Daño: ${r.damage}.`); } await sock.sendMessage(`${other}@s.whatsapp.net`, { text: `⚔️ ${p.name} te infligió ${r.damage} de daño. Es tu turno.` }); return reply(sock, chatId, msg, `⚔️ Infligiste ${r.damage} de daño. Esperando el turno del rival.`); }
  if (command === 'habilidadduel') { const r = game.duelAttack(root, p, q.trim().toLowerCase()); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, r.victory ? `🏆 Ganaste el duelo con ${r.damage} de daño.` : `⚔️ Habilidad usada: ${r.damage} de daño. Turno del rival.`); }
  if (command === 'rendirse') { const duel = Object.values(root.duels || {}).find(d => d.status === 'active' && d.players.includes(p.id)); if (!duel) return reply(sock, chatId, msg, 'No estás en un duelo.'); duel.status = 'forfeit'; duel.winner = duel.players.find(x => x !== p.id); saveBotData(); return reply(sock, chatId, msg, '🏳️ Te has rendido.'); }
  if (command === 'comerciar' || command === 'trade') { const target = String(q || '').match(/\d{7,16}/)?.[0]; if (!target || target === id) return reply(sock, chatId, msg, 'Uso: /comerciar número_del_otro_jugador'); const tradeId = crypto.randomBytes(4).toString('hex').toUpperCase(); root.trades[tradeId] = { id: tradeId, status: 'pending', participants: [id, target], offers: {}, accepted: {}, createdAt: new Date().toISOString(), expiresAt: Date.now() + 15 * 60 * 1000 }; root.tradeRequests[target] = tradeId; saveBotData(); await sock.sendMessage(`${target}@s.whatsapp.net`, { text: `🤝 @${id} quiere comerciar contigo.\n\n✅ /AceptC para abrir el comercio\n❌ /CancelC para cancelar`, mentions: [`${id}@s.whatsapp.net`] }); return reply(sock, chatId, msg, `📨 Comercio 1/2: esperando que el otro jugador acepte.`); }
  if (command === 'aceptc' || command === 'cancelc') { const tradeId = root.tradeRequests[id] || Object.keys(root.trades).find(k => root.trades[k].participants?.includes(id) && ['pending','active'].includes(root.trades[k].status)); const t = tradeId && root.trades[tradeId]; if (!t || t.expiresAt < Date.now()) return reply(sock, chatId, msg, 'No tienes un comercio pendiente.'); if (command === 'cancelc') { t.status = 'cancelled'; saveBotData(); for (const other of t.participants.filter(x => x !== id)) await sock.sendMessage(`${other}@s.whatsapp.net`, { text: '❌ Comercio Cancelado.' }); return reply(sock, chatId, msg, '❌ Comercio Cancelado.'); } if (t.status === 'pending') { t.status = 'active'; t.accepted = {}; delete root.tradeRequests[id]; saveBotData(); const other = t.participants.find(x => x !== id); await sock.sendMessage(`${other}@s.whatsapp.net`, { text: '✅ 2/2: comercio abierto. Ambos pueden ofrecer oro/objetos y aceptar.' }); return reply(sock, chatId, msg, '✅ 2/2: comercio abierto. Usa /dar y después /AceptC.'); } t.accepted[id] = true; if (t.accepted[t.participants.find(x => x !== id)]) { const r = settleTrade(root, t); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, '✅ Comercio completado con éxito.'); } saveBotData(); return reply(sock, chatId, msg, '⏳ Tu oferta está bloqueada. Esperando la aceptación del otro jugador.'); }
  return reply(sock, chatId, msg, '❌ Comando Warcraft no reconocido. Usa /warcraft o /tutorial.');
}
module.exports = run;
module.exports.menu = menu;
