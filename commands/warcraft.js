const game = require('../lib/warcraft');
const crypto = require('crypto');
const transfers = require('../lib/warcraftTransfers');
function phoneCandidates(msg, chatId) {
  const keys = [msg?.key?.participant, msg?.key?.participantAlt, msg?.key?.senderPn, msg?.key?.participantPn, msg?.key?.remoteJid, msg?.key?.remoteJidAlt, chatId];
  return [...new Set(keys.map(game.normalizePhone).filter(value => /^\d{7,16}$/.test(value)))];
}
function selectPlayerId(root, phones, chatId) {
  const registered = Object.values(root.accounts || {}).map(account => game.normalizePhone(account?.phone)).find(phone => phone && phones.includes(phone));
  return registered || phones.find(phone => root.sessions[phone]) || phones.find(phone => root.players[phone]) || phones[0] || game.normalizePhone(chatId);
}
function duelHealthText(root, duel) {
  return duel.players.map(id => { const player = root.players[id]; return `${player?.name || id}: ${Math.max(0, Number(duel.hp?.[id] ?? player?.maxHp ?? 0))}/${player?.maxHp || 0} vida`; }).join('\n');
}
function shopCategoryText(player, slot, pageValue = '1') {
  const label = slot === 'weapon' ? 'Armas' : 'Armaduras';
  const catalog = game.shopItems(player).filter(item => item.slot === slot);
  if (!catalog.length) return `No hay ${label.toLowerCase()} disponibles para tu nivel (${player.level}).`;
  const pageSize = 8; const pageCount = Math.max(1, Math.ceil(catalog.length / pageSize));
  const parsedPage = Number.parseInt(String(pageValue || '1'), 10); const page = Number.isFinite(parsedPage) ? Math.min(pageCount, Math.max(1, parsedPage)) : 1;
  const visible = catalog.slice((page - 1) * pageSize, page * pageSize);
  return `${label} · nivel ${player.level} · página ${page}/${pageCount}\n\n${visible.map(item => `${game.formatItem(item)}\nID: ${item.id} · Precio: ${item.price} oro\nComprar: /comprar ${item.id}`).join('\n\n')}\n\n${page < pageCount ? `Siguiente página: /${slot === 'weapon' ? 'armas' : 'armaduras'} ${page + 1}` : 'Fin del catálogo para tu nivel.'}`;
}
function reply(sock, chatId, msg, text) { return sock.sendMessage(chatId, { text }, { quoted: msg }); }
function menu(category = '') {
  const groups = {
    combate: ['estadopersonaje', 'enemigos', 'buscar id_del_enemigo', 'atacar', 'habilidad nombre', 'agro', 'curar banda|jugador', 'usar health_potion', 'huir'],
    personaje: ['estadopersonaje', 'fichapersonaje', 'inventario', 'equipar objeto', 'talentos ataque|defensa|vitalidad'],
    tienda: ['tienda', 'comprar id', 'confirmarcompra', 'cancelarcompra', 'recompensadiaria'],
    progreso: ['misiones', 'aceptarmision id', 'cancelarmision', 'mazmorras', 'mazmorra crypt', 'mazmorra estado', 'especializacion feral|guardian|restoration', 'logros', 'mapa', 'viajar zona', 'tutorial'],
    mundo: ['profesiones', 'aprender mineria', 'recolectar recurso', 'recetas', 'fabricar receta', 'monturas', 'comprarmontura id', 'encantamientos', 'encantar filo arma'],
    comunidad: ['duelo numero', 'aceptarduelo', 'atacarduelo', 'habilidadduelo nombre', 'rendirse', 'dar jugador oro 53', 'darporreembolso jugador oro 1000', 'reembolso objeto', 'accept rem', 'cancel rem', 'subasta', 'vender objeto precio', 'comprarsubasta id', 'correo', 'hermandad crear nombre']
  };
  const labels = { combate: 'Combate', personaje: 'Personaje', tienda: 'Tienda', progreso: 'Progreso', mundo: 'Mundo', comunidad: 'Comunidad' };
  const requested = String(category || '').trim().toLowerCase();
  if (groups[requested]) return `Warcraft · ${labels[requested]}\n\n${groups[requested].map(item => `/${item}`).join('\n')}\n\n/tutorial · Guía de juego por WhatsApp`;
  return `Warcraft RPG\n\nUsa /warcraft para elegir una sección. El juego se controla por WhatsApp; la página solo muestra tu cuenta y progreso.\n\n/login usuario contraseña · Vincula tu cuenta.\n/tutorial · Guía paso a paso.\n/dar jugador oro 53 · Envía un regalo.\n/darporreembolso jugador oro 1000 · Prepara un intercambio protegido.\n\nEscribe los comandos en español.`;
}
function activeTrade(root, id) { return Object.values(root.trades || {}).find(t => ['active','pending'].includes(t.status) && [t.owner, t.guest, ...(t.participants || [])].includes(id)); }
function settleTrade(root, trade) { const ids = trade.participants || [trade.owner, trade.guest]; const [a, b] = ids; const pa = root.players[a] || root.players[root.accounts?.[a]?.phone]; const pb = root.players[b] || root.players[root.accounts?.[b]?.phone]; if (!pa || !pb) return { error: 'Ambos jugadores necesitan un personaje.' }; for (const id of ids) { const p = root.players[id] || root.players[root.accounts?.[id]?.phone]; const offer = trade.offers[id] || { items: [], gold: 0 }; if (!p || offer.gold > p.gold || !offer.items.every(item => p.inventory.includes(item))) return { error: 'La oferta ya no está disponible en el inventario.' }; } const oa = trade.offers[a] || { items: [], gold: 0 }; const ob = trade.offers[b] || { items: [], gold: 0 }; if (!game.removeItems(pa, oa.items) || !game.removeItems(pb, ob.items)) return { error: 'No se pudieron reservar los objetos.' }; pa.inventory.push(...ob.items); pb.inventory.push(...oa.items); pa.gold = pa.gold - Number(oa.gold || 0) + Number(ob.gold || 0); pb.gold = pb.gold - Number(ob.gold || 0) + Number(oa.gold || 0); game.recalc(pa); game.recalc(pb); trade.status = 'completed'; trade.completedAt = new Date().toISOString(); return { ok: true }; }
function combatText(result, p) { const questText = result.quest ? (result.quest.completed ? `\n\nMisión completada: ${result.quest.q.name}. Recompensa automática: ${result.quest.xp} XP y ${result.quest.gold} oro.${result.quest.levels?.length ? `\n${result.quest.levels.join('\n')}` : ''}${result.quest.items?.length ? `\nObjeto: ${result.quest.items.map(id => game.formatItem(id)).join('\n')}${result.quest.equippedItems?.length ? '\nSe equipó automáticamente la mejora.' : ''}` : ''}` : `\n\nMisión: ${result.quest.q.name} · Progreso ${result.quest.progress}/${result.quest.goal}.`) : ''; return `${result.log?.join('\n') || ''}${Number.isFinite(result.enemyHp) ? `\n\n❤️ Enemigo: ${result.enemyHp}/${result.enemyMaxHp} · ❤️ Tú: ${p.hp}/${p.maxHp}` : ''}\n\n${game.formatStatus(p)}${result.victory ? `\n\n🏆 Victoria. Ganaste ${result.gold} oro${result.loot ? ` y encontraste ${game.formatItem(result.loot)}${result.equippedLoot ? ' (equipado automáticamente)' : ''}` : ''}${result.materialLoot ? `\n⛏️ Material obtenido: ${game.formatItem(result.materialLoot)}` : ''}.` : ''}${questText}${result.error ? `\n\n❌ ${result.error}` : ''}`; }
function dungeonActionText(result, p, root) { const run = result.run; const enemy = run?.enemies?.[run.enemyIndex]; let text = `${result.log?.join('\n') || ''}`; if (result.completed && result.completion) { text += `\n\nMazmorra completada: ${result.completion.dungeon.name}.`; for (const reward of result.completion.rewards) text += `\n${reward.name}: ${reward.xp} XP, ${reward.gold} oro y ${game.formatItem(reward.item)}${reward.equippedLoot ? ' (equipado)' : ''}${reward.quest?.completed ? ` · Misión ${reward.quest.q.name} completada (+${reward.quest.xp} XP, +${reward.quest.gold} oro${reward.quest.items?.length ? `, objeto ${reward.quest.items.map(id => game.ITEMS[id]?.name || id).join(', ')}` : ''})` : ''}`; return `${text}\n\n${game.formatStatus(p)}`; } if (run?.status === 'defeat' || result.turn?.defeat) return `${text}\n\nEl grupo fue derrotado. Puede recuperarse y volver a intentarlo.`; const nextPlayer = result.turn?.nextPlayer || root.players[run.roster[run.turnIndex]]; const memberStatus = run.roster.map(id => root.players[id]).filter(Boolean).map(member => `${member.name} ${member.hp}/${member.maxHp}`).join(' · '); return `${text}\n\n${enemy ? `Enemigo actual: ${enemy.name} ${enemy.hp}/${enemy.maxHp} · Sala: ${enemy.roomName}` : 'Encuentro finalizado.'}\nGrupo: ${memberStatus}\nTurno: ${nextPlayer?.name || '—'} · Ronda ${run.round}\n${game.formatStatus(p)}`; }
async function run(sock, chatId, msg, command, q, botData, saveBotData) {
  const phones = phoneCandidates(msg, chatId); const root = game.ensureRoot(botData); command = String(command || '').toLowerCase(); root.sessions ||= {}; root.tradeRequests ||= {}; transfers.ensureTransfers(root); const id = phones.find(phone => root.sessions[phone]) || phones[0] || game.normalizePhone(chatId); const jid = `${id}@s.whatsapp.net`; let p = game.ensurePlayer(botData, jid, msg?.pushName || 'Aventurero');
  if (command === 'tutorialw' || command === 'tutorialwarcraft' || command === 'tutorial') return reply(sock, chatId, msg, `Guía de Warcraft por WhatsApp

1️⃣ *Entrar*: desde el WhatsApp registrado, escribe en un solo mensaje: */login tu_usuario tu_contraseña*.

2️⃣ *Crear personaje*: el personaje se crea por WhatsApp, no en la web. Usa /nombredelpersonaje Espartaco y luego /clase guerrero, paladin, cazador, picaro, sacerdote, chaman, mago, brujo, monje, druida, caballero de la muerte, cazador de demonios o evocador.

3️⃣ *Combate*: /enemigos muestra rivales; /buscar lobo inicia combate; /atacar ataca; /habilidad golpe usa una habilidad; /usar health_potion cura; /huir abandona. En grupo, el personaje activo y el turno se muestran en la mazmorra.

4️⃣ *Equipo y GS*: /inventario y /tienda muestran ataque, armadura, fuerza, agilidad, intelecto, aguante y rareza. /equipar item_id equipa una mejora. La fuerza empieza a aumentar el ataque desde el nivel 30.

5️⃣ *Compra*: /tienda muestra precios; /comprar id inicia una compra y /confirmarcompra la completa desde WhatsApp. /cancelarcompra cancela sin gastar oro.

6️⃣ *Dar o intercambiar*: regalo inmediato: /dar jugador oro 53 o /dar jugador Poción de salud x1. Para un intercambio protegido, usa /darporreembolso jugador oro 1000, después /reembolso item_codigo x1 (o /-reembolso si no pides nada). El otro recibe un mensaje privado; /accept rem acepta el intercambio y /cancel rem lo cancela. Nada se mueve antes de aceptar.

7️⃣ *Duelo*: /duelo número, el rival usa /aceptarduelo y luego /atacarduelo o /habilidadduelo golpe por turnos. /rendirse abandona.

8️⃣ *Mundo MMO*: /mapa y /viajar frontera. Consulta /recolectar para ver los recursos disponibles, aprende un oficio y recoge materiales en la zona correcta. Toda la partida se juega por WhatsApp; la página solo muestra el perfil y el progreso.

9️⃣ *Botín*: los lobos pueden dar colmillos, los bandidos cuero y los ogros esencia de sombra. Debes luchar contra el NPC correcto; no puedes pedir el material directamente.

🔟 *Encantamientos*: /encantamientos lista mejoras. Usa /encantar filo arma o /encantar fortaleza armadura; consume materiales y aumenta ataque, defensa, vida y GS.

1️⃣1️⃣ *Economía y grupo*: /gruporpg crear, /subasta, /vender objeto precio, /correo, /reclamarmail, /monturas y /recompensadiaria.

12. *Misiones*: pulsa /misiones y elige una misión del nivel actual en el menú. Se registra el objetivo; al completarlo recibes experiencia, oro y, en algunas, equipo automáticamente. /cancelarmision abandona.

13. *Grupo y mazmorra*: /gruporpg crear, comparte el ID, /gruporpg unir ID y /gruporpg ver. El líder usa /mazmorra crypt; el bot muestra cada enemigo en orden. Ataca solo cuando sea tu turno; el tanque usa /agro y el sanador /curar banda o /curar nombre.

14. *Druida*: al llegar al nivel 20 usa /especializacion feral, /especializacion guardian o /especializacion restauracion para elegir daño, tanque o sanación.

El juego se juega por WhatsApp; la página se mantiene como cuenta y consulta de progreso.`);
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
    if (submitted.error) { if (submitted.changed) saveBotData(); return reply(sock, chatId, msg, submitted.error); }
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
    const requestedId = q.trim().toUpperCase();
    const tx = requestedId ? root.reimbursements[requestedId] : Object.values(root.reimbursements).find(item => item.status === 'pending' && item.toPhone === p.id) || Object.values(root.reimbursements).filter(item => item.status === 'completed' && item.toPhone === p.id && Date.now() - Date.parse(item.completedAt || 0) <= 10 * 60 * 1000).sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt))[0];
    if (!tx) return reply(sock, chatId, msg, 'No hay un reembolso pendiente dirigido a tu cuenta. No se movió oro ni objetos.');
    const result = transfers.accept(root, tx.id, p.id);
    if (result.error) { if (result.changed) saveBotData(); return reply(sock, chatId, msg, result.error); }
    if (result.alreadyCompleted) return reply(sock, chatId, msg, `Este reembolso ya estaba completado (${tx.id}). No se volvió a transferir nada.\nRevisa /inventario y /estadopersonaje.`);
    saveBotData();
    const summary = `Reembolso completado · ${tx.id}\n${tx.fromName} entregó ${transfers.describeAsset(tx.offer)} y recibió ${transfers.describeAsset(tx.request)}.`;
    try { await sock.sendMessage(`${tx.fromPhone}@s.whatsapp.net`, { text: summary }); } catch {}
    return reply(sock, chatId, msg, `${summary}\nTu inventario y oro ya están actualizados.`);
  }
  if (command === 'cancelarreembolso') {
    const tx = q.trim() ? root.reimbursements[q.trim().toUpperCase()] : Object.values(root.reimbursements).find(t => t.status === 'pending' && [t.fromPhone, t.toPhone].includes(p.id));
    if (!tx) return reply(sock, chatId, msg, '❌ No tienes una solicitud de reembolso pendiente.');
    const result = transfers.cancel(root, tx.id, p.id);
    if (result.error) return reply(sock, chatId, msg, result.error);
    if (result.alreadyCancelled) return reply(sock, chatId, msg, `La solicitud ${tx.id} ya estaba cancelada. No se movieron recursos.`);
    saveBotData();
    const other = p.id === tx.fromPhone ? tx.toPhone : tx.fromPhone;
    try { await sock.sendMessage(`${other}@s.whatsapp.net`, { text: `❌ ${p.name} canceló la solicitud de reembolso ${tx.id}. No se transfirió oro ni objetos.` }); } catch {}
    return reply(sock, chatId, msg, '❌ Reembolso cancelado. No se movió oro ni ningún objeto.');
  }

  if (command === 'pjnombre') { if (p) return reply(sock, chatId, msg, 'Ya tienes un personaje.'); const name = q.trim(); if (name.length < 3) return reply(sock, chatId, msg, 'Uso: /nombredelpersonaje Nombre'); root.pending ||= {}; root.pending[id] = { name }; saveBotData(); return reply(sock, chatId, msg, 'Nombre guardado. Ahora elige tu clase con /clase y una de las clases disponibles en /tutorial.'); }
  if (command === 'clase') { if (p) return reply(sock, chatId, msg, 'Ya tienes un personaje.'); const pending = root.pending?.[id]; if (!pending) return reply(sock, chatId, msg, 'Primero usa /nombredelpersonaje Nombre.'); const result = game.createPlayer(botData, jid, pending.name, q.trim().toLowerCase()); if (result.error) return reply(sock, chatId, msg, result.error); delete root.pending[id]; saveBotData(); return reply(sock, chatId, msg, `Personaje creado.\nClase: ${game.CLASS_CONFIG[result.player.classKey].label} · función: ${game.roleForPlayer(result.player)}\n\n${game.formatStatus(result.player)}`); }
  if (!p) return reply(sock, chatId, msg, 'No tienes personaje. Usa /nombredelpersonaje Nombre y luego /clase con una clase disponible.');
  if (['statusw','estadow','personajew','estadopersonaje','fichapersonaje','estado'].includes(command)) return reply(sock, chatId, msg, game.formatStatus(p));
  if (command === 'inventariow' || command === 'inventario') return reply(sock, chatId, msg, `Inventario · ${p.name}\nOro: ${p.gold}\n\n${game.listItems(p).map(item => `${item.index}. ${game.formatItem(item.id)} [${item.id}]`).join('\n\n') || 'Vacío'}\n\nArma: ${game.formatItem(p.equipment.weapon)}\nArmadura: ${game.formatItem(p.equipment.armor)}`);
  if (command === 'equiparw' || command === 'equipar') { const r = game.equip(p, q.trim()); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `✅ Equipaste ${r.item.name}.\n\n${game.formatStatus(p)}`); }
  if (['usarw','pocionw','usar'].includes(command)) { const r = game.useItem(p, q.trim() || 'health_potion'); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `🧪 Usaste ${r.item.name} y recuperaste ${r.healed} de vida.\n${game.formatStatus(p)}`); }
  if (command === 'enemigosw' || command === 'enemigos') { const dungeon = game.dungeonState(root, p); if (!dungeon.error) return reply(sock, chatId, msg, `Enemigos de ${dungeon.dungeon.name} · en orden\n\n${dungeon.run.enemies.map((enemy, index) => `${index + 1}. ${enemy.name} · ${enemy.roomName} · ${enemy.status === 'defeated' ? 'derrotado' : enemy.hp === enemy.maxHp ? `${enemy.hp} vida` : `${enemy.hp}/${enemy.maxHp} vida`}`).join('\n')}\n\nActual: ${dungeon.enemy?.name || 'mazmorra completada'}`); const enemies = game.getEnemiesForPlayer(p); const zone = game.ZONES[p.zone] || game.ZONES.aldea; return reply(sock, chatId, msg, `Enemigos disponibles · ${zone.name}\n\n${enemies.map(e => `${e.id} · ${e.name} · nivel ${e.level} · vida ${e.hp} · ataque ${e.attack}${e.missionTarget ? ' · objetivo de misión activo' : ''}`).join('\n') || 'No hay enemigos disponibles para tu nivel en esta zona.'}\n\n${p.activeQuest?.enemyId ? `Objetivo de misión: /buscar ${p.activeQuest.enemyId}` : 'Usa /buscar id_del_enemigo para iniciar un combate.'}`); }
  if (['buscarw','cazarw','buscar'].includes(command)) { const enemyId = q.trim().toLowerCase().replace(/\s+/g, '_') || 'lobo'; const r = game.startCombat(root, p, enemyId); if (r.error) return reply(sock, chatId, msg, `No se pudo iniciar el combate. ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `Combate iniciado contra ${r.combat.enemy.name}.\nEnemigo: ${r.combat.enemy.hp}/${r.combat.enemy.maxHp} de vida.\nUsa /atacar o /habilidad nombre.`); }
  if (['atacarw','atacar','attackw'].includes(command)) { const r = game.getActiveDungeonRun(root, p) ? game.dungeonAction(root, p, 'auto') : game.combatAttack(root, p, 'auto'); if (r.error) return reply(sock, chatId, msg, r.error); saveBotData(); return reply(sock, chatId, msg, r.run ? dungeonActionText(r, p, root) : combatText(r, p)); }
  if (['habilidadw','skillw','hechizow','habilidad'].includes(command)) { const skill = q.trim().toLowerCase(); const r = game.getActiveDungeonRun(root, p) ? game.dungeonAction(root, p, skill) : game.combatAttack(root, p, skill); if (r.error) return reply(sock, chatId, msg, `${r.error}\nHabilidades: ${Object.keys(game.skillsForPlayer(p)).join(', ')}`); saveBotData(); return reply(sock, chatId, msg, r.run ? dungeonActionText(r, p, root) : combatText(r, p)); }
  if (command === 'agro' || command === 'agrow') { const r = game.dungeonAggro(root, p); if (r.error) return reply(sock, chatId, msg, r.error); saveBotData(); return reply(sock, chatId, msg, dungeonActionText(r, p, root)); }
  if (command === 'curar' || command === 'curarw') { const r = game.dungeonHeal(root, p, q.trim() || 'banda'); if (r.error) return reply(sock, chatId, msg, r.error); saveBotData(); return reply(sock, chatId, msg, dungeonActionText(r, p, root)); }
  if (command === 'especializacion' || command === 'especializacionw') { const r = game.chooseDruidSpecialization(p, q.trim()); if (r.error) return reply(sock, chatId, msg, r.error); saveBotData(); return reply(sock, chatId, msg, `Especialización elegida: ${r.config.label}.\nHabilidades: ${Object.keys(game.skillsForPlayer(p)).join(', ')}\n${game.formatStatus(p)}`); }
  if (command === 'huirw' || command === 'huir') { if (!root.combat[p.id] || root.combat[p.id].status !== 'active') return reply(sock, chatId, msg, 'No estás en combate.'); root.combat[p.id].status = 'fled'; saveBotData(); return reply(sock, chatId, msg, '🏃 Has huido del combate.'); }
  if (command === 'misionesw' || command === 'misiones') { const active = p.activeQuest; const campaign = game.campaignProgress(p); if (active) { const quest = game.QUESTS.find(item => item.id === active.id); return reply(sock, chatId, msg, `Misión en progreso\n\n${quest?.name || active.name}\nTipo: ${active.mainQuest ? 'misión principal' : 'misión secundaria'}\n${quest?.description || active.description || ''}\nProgreso: ${active.progress}/${active.goal}\nCampaña del nivel: ${campaign.completed}/${campaign.total} misiones completadas\nRecompensa automática: ${active.rewardXp} XP y ${active.rewardGold} oro${active.rewardItems?.length ? `\nObjeto: ${active.rewardItems.map(item => game.formatItem(item)).join('\n')}` : ''}${active.enemyId ? `\nObjetivo añadido a /enemigos: ${active.enemyId}\nUsa /buscar ${active.enemyId}` : `\nObjetivo: /mazmorra ${active.dungeonId}`}\n\nPara abandonar: /cancelarmision`); } const board = game.getQuestBoard(p); saveBotData(); return reply(sock, chatId, msg, `Misiones del nivel ${p.level} · ${campaign.completed}/${campaign.total} completadas\nCompleta las tres misiones de este nivel para desbloquear el siguiente.\nPulsa /misiones para elegir una del menú o usa el ID.\n\n${board.map(qs => `${qs.mainQuest ? '[Misión principal] ' : qs.repeatable ? '[Secundaria aleatoria] ' : '[Misión secundaria] '}${qs.name} [${qs.id}]\n${qs.description}\nRecompensa automática: ${qs.xp} XP y ${qs.gold} oro${qs.rewardItems?.length ? `\nObjeto: ${qs.rewardItems.map(item => game.formatItem(item)).join('\n')}` : ''}\n/aceptarmision ${qs.id}`).join('\n\n') || 'No hay misiones disponibles para este nivel.'}`); }
  if (command === 'aceptarmision' || command === 'aceptarmisionw') { const r = game.acceptQuest(p, q.trim()); if (r.error) return reply(sock, chatId, msg, r.error); const quest = r.template; saveBotData(); return reply(sock, chatId, msg, `Misión aceptada: ${quest.name} · ${quest.mainQuest ? 'principal' : 'secundaria'}.\n${quest.description}\nAl completar recibirás automáticamente ${r.quest.rewardXp} XP y ${r.quest.rewardGold} oro.${r.quest.rewardItems?.length ? `\nRecompensa especial: ${r.quest.rewardItems.map(item => game.formatItem(item)).join('\n')}` : ''}${quest.enemyId ? `\nEl objetivo ya aparece en /enemigos. Usa /buscar ${quest.enemyId}.` : `\nCompleta el objetivo con /mazmorra ${quest.dungeonId}.`}\nUsa /misiones para consultar el progreso.`); }
  if (command === 'cancelarmision' || command === 'cancelarmisionw') { const r = game.cancelQuest(p); if (r.error) return reply(sock, chatId, msg, r.error); saveBotData(); return reply(sock, chatId, msg, `Misión cancelada: ${r.quest.name}. El objetivo ya no aparecerá como misión activa en /enemigos.`); }
  if (command === 'mazmorrasw' || command === 'mazmorras') return reply(sock, chatId, msg, `Mazmorras\n\n${game.DUNGEONS.map(d => `${d.id} · ${d.name} · nivel ${d.level}\nEnemigos en orden: ${d.rooms.flatMap(room => room.enemies).map(enemyId => `${game.DUNGEON_ENEMIES[enemyId]?.name || game.ENEMIES[enemyId]?.name || enemyId}`).join(' → ')}`).join('\n\n')}\n\nEl líder inicia con /mazmorra crypt|forge|night. Usa /mazmorra estado para ver el turno.`);
  if (command === 'mazmorraw' || command === 'mazmorra') { const requested = q.trim().toLowerCase(); if (requested === 'estado' || requested === 'status') { const state = game.dungeonState(root, p); if (state.error) return reply(sock, chatId, msg, state.error); const enemy = state.enemy; return reply(sock, chatId, msg, `${state.dungeon.name} · Ronda ${state.run.round}\nEnemigo actual: ${enemy?.name || '—'} ${enemy ? `${enemy.hp}/${enemy.maxHp} vida` : ''}\nOrden: ${state.members.map((member, index) => `${index + 1}. ${member.name} ${member.hp}/${member.maxHp}${member.active ? ' (turno)' : ''}`).join('\n')}`); } const r = game.startDungeonRun(root, p, requested); if (r.error) return reply(sock, chatId, msg, r.error); saveBotData(); const sequence = r.run.enemies.map((enemy, index) => `${index + 1}. ${enemy.name} · ${enemy.roomName}`).join('\n'); return reply(sock, chatId, msg, `Mazmorra iniciada: ${r.dungeon.name}.\nGrupo: ${r.members.map(member => `${member.name} (${game.roleForPlayer(member)})`).join(', ')}\n\nEnemigos en orden:\n${sequence}\n\nPrimer turno: ${r.members[0].name}. Usa /atacar, /habilidad, /agro o /curar banda. Consulta /mazmorra estado.`); }
  if (command === 'tiendaw' || command === 'tienda') {
    const category = q.trim().toLowerCase();
    if (/^(?:arma|armas|weapon|weapons)$/.test(category)) return reply(sock, chatId, msg, shopCategoryText(p, 'weapon'));
    if (/^(?:armadura|armaduras|armor|armors)$/.test(category)) return reply(sock, chatId, msg, shopCategoryText(p, 'armor'));
    return reply(sock, chatId, msg, `Tienda de equipo · nivel ${p.level}\n\n/armas · catálogo de armas\n/armaduras · catálogo de armaduras\n/tienda armas|armaduras · acceso directo\n\nCada objeto muestra rareza, nivel, ataque, armadura, fuerza, agilidad, intelecto, aguante y precio.`);
  }
  if (command === 'armasw') return reply(sock, chatId, msg, shopCategoryText(p, 'weapon', q.trim() || '1'));
  if (command === 'armadurasw') return reply(sock, chatId, msg, shopCategoryText(p, 'armor', q.trim() || '1'));
  if (command === 'comprarw' || command === 'comprar') { const idItem = q.trim(); const item = game.ITEMS[idItem]; if (!item) return reply(sock, chatId, msg, '❌ Objeto inexistente. Usa /tienda para ver los IDs.'); if (item.questReward) return reply(sock, chatId, msg, 'Ese equipo solo se obtiene al completar una misión principal.'); if (item.classKey && item.classKey !== p.classKey) return reply(sock, chatId, msg, `Ese equipo es exclusivo de ${game.CLASS_CONFIG[item.classKey]?.label || item.classKey}.`); if (p.level < item.level || p.gold < item.price) return reply(sock, chatId, msg, `❌ No puedes comprarlo: requiere nivel ${item.level} y cuesta ${item.price} oro.`); root.pendingPurchases[id] = { itemId: idItem, expiresAt: Date.now() + 120000 }; saveBotData(); return reply(sock, chatId, msg, `🛒 Vas a comprar *${item.name}* por ${item.price} oro.\nOro actual: ${p.gold}.\n\n✅ Escribe /ConfirmarCompra para comprar.\n❌ Escribe /CancelarCompra para cancelar.`); }
  if (command === 'confirmarcompra') { const pending = root.pendingPurchases[id]; if (!pending || pending.expiresAt < Date.now()) return reply(sock, chatId, msg, 'No tienes una compra pendiente.'); const r = game.buy(p, pending.itemId); delete root.pendingPurchases[id]; if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `✅ Compra completada: ${r.item.name}.\n${game.formatStatus(p)}`); }
  if (command === 'cancelarcompra') { delete root.pendingPurchases[id]; saveBotData(); return reply(sock, chatId, msg, '❌ Compra cancelada. No se descontó oro.'); }
  if (command === 'talentosw' || command === 'talentos') { const r = game.spendTalent(p, q.trim()); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}\n🎯 Puntos disponibles: ${p.talentPoints || 0}.`); saveBotData(); return reply(sock, chatId, msg, `✅ Talento mejorado: ${r.talent === 'attack' ? 'ataque' : r.talent === 'defense' ? 'defensa' : 'vitalidad'} +${r.increase}. Puntos restantes: ${r.remaining}.\n${game.formatStatus(p)}`); }
  if (command === 'mapaw' || command === 'zonasw') { return reply(sock, chatId, msg, `Mapa y zonas\n\n${Object.entries(game.ZONES).map(([id,z]) => `• ${id} · ${z.name} · nivel ${z.level} · enemigos: ${z.enemies.join(', ')} · recursos: ${z.gathering.join(', ')}`).join('\n')}\n\nUsa /viajar id_de_zona.`); }
  if (command === 'viajarw') { const r = game.travel(p, q.trim().toLowerCase()); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `📍 Has viajado a ${r.zone.name}.`); }
  if (command === 'profesionesw') return reply(sock, chatId, msg, `Profesiones\nMinería: ${p.professions.mineria || 0} (${p.professionXp.mineria || 0}/${game.professionXpToNext(p.professions.mineria || 1)}) · Herbalismo: ${p.professions.herbalismo || 0} (${p.professionXp.herbalismo || 0}/${game.professionXpToNext(p.professions.herbalismo || 1)}) · Alquimia: ${p.professions.alquimia || 0} · Herrería: ${p.professions['herrería'] || 0} (${p.professionXp['herrería'] || 0}/${game.professionXpToNext(p.professions['herrería'] || 1)})\n\n/aprender mineria|herbalismo|alquimia|herreria`);
  if (command === 'aprenderw') { const r = game.learnProfession(p, q.trim()); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `✅ Aprendiste ${r.profession} nivel ${r.level}.`); }
  if (command === 'recolectarw') { if (!q.trim()) return reply(sock, chatId, msg, `Fuentes de materiales\n\n${game.materialGuide()}\n\nViaja a la zona correcta, aprende la profesión y usa /recolectar recurso.`); const r = game.gather(p, q.trim()); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}\n\n🧭 Fuentes conocidas:\n${game.materialGuide()}`); saveBotData(); return reply(sock, chatId, msg, `🌿 Encontraste ${r.name}. ${r.profession} nivel ${r.level}${r.levels?.length ? ` · subiste a nivel ${r.levels.at(-1)}` : ''}.`); }
  if (command === 'recetasw') return reply(sock, chatId, msg, `Recetas\n\n${Object.entries(game.RECIPES).map(([id,r]) => `• ${id} · ${r.name} · ${r.profession} ${r.level} · materiales: ${Object.entries(r.materials).map(([m,n]) => `${m} x${n}`).join(', ')}`).join('\n')}\n\n/fabricar receta`);
  if (command === 'fabricarw') { const r = game.craft(p, q.trim()); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `🔨 Fabricaste ${r.recipe.name}: ${game.ITEMS[r.output]?.name || r.output} x${r.quantity}. XP de ${r.recipe.profession}: +${r.recipe.skillXp || 1}${r.levels?.length ? ` · subiste a nivel ${r.levels.at(-1)}` : ''}.`); }
  if (command === 'diariaw') { const r = game.daily(p); if (r.error) return reply(sock, chatId, msg, `⏳ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `🎁 Recompensa diaria: ${r.gold} oro y experiencia. ${r.achievement ? `Logro: ${r.achievement.name}.` : ''}`); }
  if (command === 'logrosw') return reply(sock, chatId, msg, `Logros\n\n${Object.entries(game.ACHIEVEMENTS).map(([id,a]) => `${p.achievements[id] ? '✅' : '▫️'} ${a[0]} · ${a[1]} · recompensa ${a[2]} oro`).join('\n')}`);
  if (command === 'monturasw') return reply(sock, chatId, msg, `Monturas\n\n${Object.entries(game.MOUNTS).map(([id,m]) => `• ${id} · ${m.name} · nivel ${m.level} · ${m.price} oro ${p.mounts.includes(id) ? '✅' : ''}`).join('\n')}\n\n/comprarmontura id`);
  if (command === 'comprarmonturaw') { const r = game.buyMount(p, q.trim()); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `🐎 Montura conseguida: ${r.mount.name}.`); }
  if (command === 'grupow') { const [action, arg] = q.trim().split(/\s+/); if (!action || action === 'ver' || action === 'estado') { const party = p.partyId && root.parties[p.partyId]; return reply(sock, chatId, msg, party ? `Grupo ${party.id} · ${party.members.length}/5\nLíder: ${root.players[party.leader]?.name || party.leader}\n${party.members.map((memberId, index) => `${index + 1}. ${root.players[memberId]?.name || memberId} · nivel ${root.players[memberId]?.level || '?'}`).join('\n')}\n\nComparte el ID para que otros usen /gruporpg unir ${party.id}.` : 'No estás en un grupo. Usa /gruporpg crear.'); } const r = action === 'crear' ? game.createParty(root, p) : action === 'unir' ? game.joinParty(root, p, arg) : action === 'salir' ? game.leaveParty(root, p) : { error: 'Usa /gruporpg crear, /gruporpg unir ID, /gruporpg ver o /gruporpg salir.' }; if (r.error) return reply(sock, chatId, msg, r.error); saveBotData(); return reply(sock, chatId, msg, r.party ? `Grupo ${r.party.id}: ${r.party.members.length}/5 jugadores. Comparte este ID para unir al grupo.` : 'Operación de grupo completada.'); }
  if (command === 'subastaw') { const list = game.listAuction(root); return reply(sock, chatId, msg, `Subasta\n\n${list.map(a => `• ${a.id} · ${game.ITEMS[a.item]?.name || a.item} · ${a.price} oro`).join('\n') || 'No hay objetos publicados.'}\n\n/vender objeto precio\n/comprarsubasta ID`); }
  if (command === 'venderw') { const [item, price] = q.trim().split(/\s+/); const r = game.auctionList(root, p, item, price); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `🏷️ Publicaste ${game.ITEMS[r.auction.item]?.name || r.auction.item} por ${r.auction.price} oro. ID ${r.auction.id}.`); }
  if (command === 'comprarsubastaw') { const r = game.auctionBuy(root, p, q.trim()); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `✅ Compraste ${r.item.name} por ${r.auction.price} oro.`); }
  if (command === 'correow') { const mails = (root.mail[id] || []).filter(x => !x.claimed); return reply(sock, chatId, msg, `📬 Tienes ${mails.length} mensajes pendientes.\n${mails.map(x => `• ${game.ITEMS[x.item]?.name || x.item} + ${x.gold} oro`).join('\n') || 'Buzón vacío.'}\n\n/reclamarmail para recibirlo.`); }
  if (command === 'reclamarmailw') { const r = game.claimMail(root, p); saveBotData(); return reply(sock, chatId, msg, `📬 Recibiste ${r.claimed} mensajes del buzón.`); }
  if (command === 'enviarmailw') { const [target, item, gold] = q.trim().split(/\s+/); const r = game.sendMail(root, p, game.normalizePhone(target), item, Number(gold || 0)); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, '📨 Correo enviado.'); }
  if (command === 'encantamientosw') return reply(sock, chatId, msg, `Encantamientos\n\n${Object.entries(game.ENCHANTMENTS).map(([id,e]) => `• ${id} · ${e.name} · ${e.slot === 'weapon' ? 'arma' : 'armadura'} · +${e.attack || 0} ataque · +${e.defense || 0} defensa · +${e.hp || 0} vida · materiales: ${Object.entries(e.materials).map(([m,n]) => `${m} x${n}`).join(', ')}`).join('\n')}\n\nUsa /encantar filo arma o /encantar fortaleza armadura.`);
  if (command === 'encantarw') { const [enchantId, slotInput] = q.trim().split(/\s+/); const slot = /^(armadura|armor)$/i.test(slotInput || '') ? 'armor' : 'weapon'; const r = game.enchant(p, enchantId, slot); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `✨ Encantamiento aplicado: ${r.enchantment.name}.\n${game.formatStatus(p)}`); }
  if (command === 'guildw') { const [action, ...rest] = q.trim().split(/\s+/); const r = game.guild(botData, action || 'info', p, rest.join(' ')); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, r.guild ? `🏰 Guild: ${r.guild.name}\n🆔 ID: ${r.guild.id}` : 'No perteneces a ninguna guild.'); }
  if (command === 'duelo' || command === 'desafiar') {
    const target = String(q || '').match(/\d{7,16}/)?.[0];
    if (!target) return reply(sock, chatId, msg, 'Uso: /duelo número_del_jugador');
    const result = game.createDuel(root, p, target);
    if (result.error) return reply(sock, chatId, msg, result.error);
    saveBotData();
    try {
      await sock.sendMessage(`${target}@s.whatsapp.net`, { text: `Desafío de duelo: ${p.name} te reta. Escribe /aceptarduelo para aceptar.\n\nVida inicial:\n${duelHealthText(root, result.duel)}` });
    } catch {
      result.duel.status = 'cancelled';
      delete root.duelRequests[target];
      saveBotData();
      return reply(sock, chatId, msg, 'No se pudo entregar el desafío al número indicado. No quedó un duelo pendiente.');
    }
    return reply(sock, chatId, msg, `Desafío enviado a ${root.players[target].name}.\nVida inicial:\n${duelHealthText(root, result.duel)}`);
  }
  if (command === 'aceptarduel' || command === 'aceptarduelo') {
    const result = game.acceptDuel(root, p);
    if (result.error) return reply(sock, chatId, msg, result.error);
    if (result.waitingForOpponent) return reply(sock, chatId, msg, `Tu desafío sigue pendiente; el rival todavía no lo ha aceptado.\n${duelHealthText(root, result.duel)}`);
    if (result.alreadyFinished) return reply(sock, chatId, msg, `Ese duelo ya terminó.\n${duelHealthText(root, result.duel)}\nGanador: ${root.players[result.duel.winner]?.name || '—'}.`);
    saveBotData();
    const other = result.duel.players.find(playerId => playerId !== p.id);
    const state = `${result.alreadyActive ? 'El duelo ya está activo.' : 'Duelo aceptado.'}\n${duelHealthText(root, result.duel)}\nTurno de ${root.players[result.duel.turn]?.name || 'retador'}: /atacarduelo o /habilidadduelo nombre.`;
    if (!result.alreadyActive) try { await sock.sendMessage(`${other}@s.whatsapp.net`, { text: state }); } catch {}
    return reply(sock, chatId, msg, state);
  }
  if (command === 'atacarduel' || command === 'dueloatacar' || command === 'atacarduelo') {
    const result = game.duelAttack(root, p, 'auto');
    if (result.error) return reply(sock, chatId, msg, result.error);
    if (result.alreadyFinished) return reply(sock, chatId, msg, `Ese duelo ya terminó.\n${duelHealthText(root, result.duel)}\nGanador: ${root.players[result.duel.winner]?.name || '—'}.`);
    saveBotData();
    const next = result.duel.players.find(playerId => playerId !== p.id);
    const state = `${result.duel.log.at(-1)}\n\n${duelHealthText(root, result.duel)}\n${result.victory ? `Ganó ${p.name}.` : `Turno de ${root.players[result.duel.turn]?.name || 'rival'}.`}`;
    try { await sock.sendMessage(`${next}@s.whatsapp.net`, { text: state }); } catch {}
    return reply(sock, chatId, msg, state);
  }
  if (command === 'habilidadduel' || command === 'habilidadduelo') {
    const result = game.duelAttack(root, p, q.trim().toLowerCase());
    if (result.error) return reply(sock, chatId, msg, result.error);
    if (result.alreadyFinished) return reply(sock, chatId, msg, `Ese duelo ya terminó.\n${duelHealthText(root, result.duel)}\nGanador: ${root.players[result.duel.winner]?.name || '—'}.`);
    saveBotData();
    const next = result.duel.players.find(playerId => playerId !== p.id);
    const state = `${result.duel.log.at(-1)}\n\n${duelHealthText(root, result.duel)}\n${result.victory ? `Ganó ${p.name}.` : `Turno de ${root.players[result.duel.turn]?.name || 'rival'}.`}`;
    try { await sock.sendMessage(`${next}@s.whatsapp.net`, { text: state }); } catch {}
    return reply(sock, chatId, msg, state);
  }
  if (command === 'rendirse') {
    const duel = Object.values(root.duels || {}).find(item => item.status === 'active' && item.players.includes(p.id));
    if (!duel) { const ended = game.recentFinishedDuel(root, p.id); return ended ? reply(sock, chatId, msg, `Ese duelo ya terminó.\n${duelHealthText(root, ended)}\nGanador: ${root.players[ended.winner]?.name || '—'}.`) : reply(sock, chatId, msg, 'No hay un duelo activo para este personaje.'); }
    duel.status = 'forfeit'; duel.winner = duel.players.find(playerId => playerId !== p.id); duel.finishedAt = new Date().toISOString(); saveBotData();
    const winner = root.players[duel.winner];
    try { await sock.sendMessage(`${duel.winner}@s.whatsapp.net`, { text: `${p.name} se rindió. Ganaste el duelo.` }); } catch {}
    return reply(sock, chatId, msg, `Te rendiste. Ganó ${winner?.name || 'el rival'}.`);
  }
  if (command === 'comerciar' || command === 'trade') { const target = String(q || '').match(/\d{7,16}/)?.[0]; if (!target || target === id) return reply(sock, chatId, msg, 'Uso: /comerciar número_del_otro_jugador'); const tradeId = crypto.randomBytes(4).toString('hex').toUpperCase(); root.trades[tradeId] = { id: tradeId, status: 'pending', participants: [id, target], offers: {}, accepted: {}, createdAt: new Date().toISOString(), expiresAt: Date.now() + 15 * 60 * 1000 }; root.tradeRequests[target] = tradeId; saveBotData(); await sock.sendMessage(`${target}@s.whatsapp.net`, { text: `🤝 @${id} quiere comerciar contigo.\n\n✅ /AceptC para abrir el comercio\n❌ /CancelC para cancelar`, mentions: [`${id}@s.whatsapp.net`] }); return reply(sock, chatId, msg, `📨 Comercio 1/2: esperando que el otro jugador acepte.`); }
  if (command === 'aceptc' || command === 'cancelc') { const tradeId = root.tradeRequests[id] || Object.keys(root.trades).find(k => root.trades[k].participants?.includes(id) && ['pending','active'].includes(root.trades[k].status)); const t = tradeId && root.trades[tradeId]; if (!t || t.expiresAt < Date.now()) return reply(sock, chatId, msg, 'No tienes un comercio pendiente.'); if (command === 'cancelc') { t.status = 'cancelled'; saveBotData(); for (const other of t.participants.filter(x => x !== id)) await sock.sendMessage(`${other}@s.whatsapp.net`, { text: '❌ Comercio Cancelado.' }); return reply(sock, chatId, msg, '❌ Comercio Cancelado.'); } if (t.status === 'pending') { t.status = 'active'; t.accepted = {}; delete root.tradeRequests[id]; saveBotData(); const other = t.participants.find(x => x !== id); await sock.sendMessage(`${other}@s.whatsapp.net`, { text: '✅ 2/2: comercio abierto. Ambos pueden ofrecer oro/objetos y aceptar.' }); return reply(sock, chatId, msg, '✅ 2/2: comercio abierto. Usa /dar y después /AceptC.'); } t.accepted[id] = true; if (t.accepted[t.participants.find(x => x !== id)]) { const r = settleTrade(root, t); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, '✅ Comercio completado con éxito.'); } saveBotData(); return reply(sock, chatId, msg, '⏳ Tu oferta está bloqueada. Esperando la aceptación del otro jugador.'); }
  return reply(sock, chatId, msg, '❌ Comando Warcraft no reconocido. Usa /warcraft o /tutorial.');
}
module.exports = run;
module.exports.menu = menu;
