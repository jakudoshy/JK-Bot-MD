const game = require('../lib/warcraft');
const crypto = require('crypto');
function phoneCandidates(msg, chatId) { const keys = [msg?.key?.participant, msg?.key?.participantAlt, msg?.key?.senderPn, msg?.key?.participantPn, msg?.key?.remoteJid, msg?.key?.remoteJidAlt, chatId]; return [...new Set(keys.map(game.normalizePhone).filter(value => /^\d{7,16}$/.test(value)))]; }
function jidOf(msg, chatId) { return `${phoneCandidates(msg, chatId)[0] || game.normalizePhone(chatId)}@s.whatsapp.net`; }
function reply(sock, chatId, msg, text) { return sock.sendMessage(chatId, { text }, { quoted: msg }); }
function menu() { return `⚔️ *WARCRAFT RPG*

/statusW · vida, ataque, defensa y oro
/personajeW · ficha completa
/inventarioW · objetos y equipo
/equiparW objeto · equipar arma/armadura
/usarW pocion · consumir objeto
/enemigosW · enemigos disponibles
/buscarW lobo · iniciar combate
/atacarW · ataque básico
/habilidadW golpe · usar habilidad
/huirW · abandonar combate
/mazmorrasW · mazmorras y jefes
/mazmorraW cripta · completar mazmorra
/misionesW · progreso de misiones
/tiendaW · tienda
/comprarW id · comprar objeto
/talentosW ataque · mejorar talento
/duelo número · desafiar a un jugador
/AceptarDuel · aceptar duelo
/AtacarDuel · atacar en duelo
/comerciar número · abrir comercio
/dar oro x20 · ofrecer oro
/dar pocion x1 · ofrecer objetos
/AceptC · aceptar comercio
/CancelC · cancelar comercio
/tutorialW · guía paso a paso
/mapaW · zonas y viaje
/profesionesW · profesiones
/aprenderW mineria · aprender oficio
/recolectarW mineral_hierro · recolectar
/recetasW · recetas de fabricación
/fabricarW receta · crear objetos
/diariaW · recompensa diaria
/logrosW · logros
/monturasW · monturas
/grupoW crear|unir|salir · grupo
/subastaW · casa de subastas
/correoW · correo y objetos
/encantamientosW · mejoras disponibles
/encantarW filo arma · encantar objeto
/guildW create nombre · guild`;
}
function activeTrade(root, id) { return Object.values(root.trades || {}).find(t => ['active','pending'].includes(t.status) && [t.owner, t.guest, ...(t.participants || [])].includes(id)); }
function settleTrade(root, trade) { const ids = trade.participants || [trade.owner, trade.guest]; const [a, b] = ids; const pa = root.players[a] || root.players[root.accounts?.[a]?.phone]; const pb = root.players[b] || root.players[root.accounts?.[b]?.phone]; if (!pa || !pb) return { error: 'Ambos jugadores necesitan un personaje.' }; for (const id of ids) { const p = root.players[id] || root.players[root.accounts?.[id]?.phone]; const offer = trade.offers[id] || { items: [], gold: 0 }; if (!p || offer.gold > p.gold || !offer.items.every(item => p.inventory.includes(item))) return { error: 'La oferta ya no está disponible en el inventario.' }; } const oa = trade.offers[a] || { items: [], gold: 0 }; const ob = trade.offers[b] || { items: [], gold: 0 }; if (!game.removeItems(pa, oa.items) || !game.removeItems(pb, ob.items)) return { error: 'No se pudieron reservar los objetos.' }; pa.inventory.push(...ob.items); pb.inventory.push(...oa.items); pa.gold = pa.gold - Number(oa.gold || 0) + Number(ob.gold || 0); pb.gold = pb.gold - Number(ob.gold || 0) + Number(oa.gold || 0); game.recalc(pa); game.recalc(pb); trade.status = 'completed'; trade.completedAt = new Date().toISOString(); return { ok: true }; }
function combatText(result, p) { return `${result.log?.join('\n') || ''}\n\n${game.formatStatus(p)}${result.victory ? `\n\n🏆 Victoria. Ganaste ${result.gold} oro${result.loot ? ` y encontraste ${game.ITEMS[result.loot]?.name || result.loot}${result.equippedLoot ? ' (equipado automáticamente)' : ''}` : ''}.` : ''}${result.error ? `\n\n❌ ${result.error}` : ''}`; }
async function run(sock, chatId, msg, command, q, botData, saveBotData) {
  const phones = phoneCandidates(msg, chatId); const id = phones[0]; const jid = jidOf(msg, chatId); const root = game.ensureRoot(botData); let p = game.ensurePlayer(botData, jid, msg?.pushName || 'Aventurero'); command = String(command || '').toLowerCase(); root.sessions ||= {}; root.tradeRequests ||= {};
  if (command === 'tutorialw' || command === 'tutorialwarcraft') return reply(sock, chatId, msg, `📖 *TUTORIAL WARCRAFT*

1️⃣ *Entrar*: regístrate en la web y usa /loginw usuario contraseña desde el WhatsApp registrado.

2️⃣ *Crear personaje*: si es la primera vez, usa /pjnombre Espartaco y luego /clase warrior, /clase mago o /clase picaro. Si ya existe, el bot lo recupera solo.

3️⃣ *Combate*: /enemigosW muestra rivales; /buscarW lobo inicia combate; /atacarW ataca; /habilidadW golpe usa una habilidad; /usarW health_potion cura; /huirW abandona.

4️⃣ *Equipo y GS*: /inventarioW lista objetos; /equiparW iron_blade equipa un arma. Cada equipo mejora ataque, defensa y GS.

5️⃣ *Compra*: /tiendaW muestra precios; /comprarW health_potion compra. La web muestra una confirmación antes de comprar.

6️⃣ *Comercio*: /comerciar número, el rival usa /AceptC, ambos usan /dar oro x20 o /dar health_potion x1, revisan y vuelven a usar /AceptC. Solo entonces se transfiere. /CancelC no transfiere nada.

7️⃣ *Duelo*: /duelo número, el rival usa /AceptarDuel, después /AtacarDuel o /HabilidadDuel golpe por turnos. /Rendirse abandona.

8️⃣ *Mundo MMO*: /mapaW y /viajarW frontera. Aprende /profesionesW, usa /aprenderW mineria, recolecta con /recolectarW mineral_hierro y fabrica con /fabricarW hoja_acero.

9️⃣ *Encantamientos*: /encantamientosW lista mejoras. Usa /encantarW filo arma o /encantarW fortaleza armadura; consume materiales y aumenta ataque, defensa, vida y GS.

🔟 *Economía y grupo*: /grupoW crear, /subastaW, /venderW objeto precio, /correoW, /reclamarmailW, /monturasW y /diariaW.

1️⃣1️⃣ *Progreso*: /misionesW, /mazmorrasW, /mazmorraW crypt, /talentosW ataque y /guildW create nombre.

✅ *Flujo*: login → personaje → clase → equipar → luchar → conseguir botín → mejorar GS → comerciar o batirse en duelo.`);
  if (command === 'warcraft' || command === 'warcraftmenu' || command === 'ayudaw' || command === 'comandosw') return reply(sock, chatId, msg, root.sessions[id] ? `${menu()}${p ? `\n\n${game.formatStatus(p)}` : ''}` : '🔐 Cuenta no vinculada. Regístrate y usa /loginw usuario contraseña.');
  if (command === 'loginw') { const parts = q.trim().split(/\s+/); const raw = String(parts.shift() || '').toLowerCase(); const password = parts.join(' '); const account = Object.values(root.accounts).find(item => String(item.phone) === game.normalizePhone(raw) || String(item.username).toLowerCase() === raw); let valid = false; try { const [salt, digest] = String(account?.passwordHash || '').split(':'); const actual = crypto.scryptSync(password, salt, 64); valid = Buffer.from(digest || '', 'hex').length === actual.length && crypto.timingSafeEqual(actual, Buffer.from(digest || '', 'hex')); } catch {} if (!account || !valid) return reply(sock, chatId, msg, '❌ Error: no es la contraseña correcta o el usuario no existe.'); if (!phones.includes(game.normalizePhone(account.phone))) return reply(sock, chatId, msg, '❌ Debes usar el WhatsApp del número registrado.'); root.sessions[id] = account.username; saveBotData(); return reply(sock, chatId, msg, '✅ Sesión iniciada. Ya puedes usar el /Warcraft.'); }
  if (!root.sessions[id]) return reply(sock, chatId, msg, '🔐 Cuenta no vinculada. Regístrate y usa /loginw usuario contraseña.');
  if (command === 'pjnombre') { if (p) return reply(sock, chatId, msg, '❌ Ya tienes un personaje.'); const name = q.trim(); if (name.length < 3) return reply(sock, chatId, msg, 'Uso: /pjnombre Nombre'); root.pending ||= {}; root.pending[id] = { name }; saveBotData(); return reply(sock, chatId, msg, '✅ Nombre guardado. Ahora usa /clase warrior, /clase mago o /clase picaro.'); }
  if (command === 'clase') { if (p) return reply(sock, chatId, msg, '❌ Ya tienes un personaje.'); const pending = root.pending?.[id]; if (!pending) return reply(sock, chatId, msg, 'Primero usa /pjnombre Nombre.'); const result = game.createPlayer(botData, jid, pending.name, q.trim().toLowerCase()); if (result.error) return reply(sock, chatId, msg, `❌ ${result.error}`); delete root.pending[id]; saveBotData(); return reply(sock, chatId, msg, `🌅 Has comenzado tu aventura.\n\n${game.formatStatus(result.player)}`); }
  if (!p) return reply(sock, chatId, msg, '❌ No tienes personaje. Usa /pjnombre Nombre y /clase warrior.');
  if (['statusw','estadow','personajew'].includes(command)) return reply(sock, chatId, msg, game.formatStatus(p));
  if (command === 'inventariow') return reply(sock, chatId, msg, `🎒 *INVENTARIO*\n\n${game.listItems(p).map(x => `${x.index}. ${x.name} [${x.id}]`).join('\n') || 'Vacío'}\n\n⚔️ Arma: ${p.equipment.weapon || '-'}\n🛡️ Armadura: ${p.equipment.armor || '-'}\n💰 Oro: ${p.gold}`);
  if (command === 'equiparw') { const r = game.equip(p, q.trim()); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `✅ Equipaste ${r.item.name}.\n\n${game.formatStatus(p)}`); }
  if (['usarw','pocionw'].includes(command)) { const r = game.useItem(p, q.trim() || 'health_potion'); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `🧪 Usaste ${r.item.name} y recuperaste ${r.healed} de vida.\n${game.formatStatus(p)}`); }
  if (command === 'enemigosw') return reply(sock, chatId, msg, `👹 *ENEMIGOS*\n\n${Object.entries(game.ENEMIES).map(([id, e]) => `• ${id} · ${e.name} · nivel ${e.level} · ❤️${e.hp} · ⚔️${e.attack}`).join('\n')}\n\nUsa /buscarW lobo.`);
  if (['buscarw','cazarw'].includes(command)) { const r = game.startCombat(root, p, q.trim().toLowerCase() || 'lobo'); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `⚔️ Combate iniciado contra ${r.combat.enemy.name}.\n❤️ Enemigo: ${r.combat.enemy.hp}/${r.combat.enemy.maxHp}\nUsa /atacarW o /habilidadW nombre.`); }
  if (['atacarw','atacar','attackw'].includes(command)) { const r = game.combatAttack(root, p, 'auto'); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, combatText(r, p)); }
  if (['habilidadw','skillw','hechizow'].includes(command)) { const r = game.combatAttack(root, p, q.trim().toLowerCase()); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}\nHabilidades: ${Object.keys(game.CLASS_CONFIG[p.classKey].skills).join(', ')}`); saveBotData(); return reply(sock, chatId, msg, combatText(r, p)); }
  if (command === 'huirw') { if (!root.combat[p.id] || root.combat[p.id].status !== 'active') return reply(sock, chatId, msg, 'No estás en combate.'); root.combat[p.id].status = 'fled'; saveBotData(); return reply(sock, chatId, msg, '🏃 Has huido del combate.'); }
  if (command === 'misionesw') return reply(sock, chatId, msg, `📜 *MISIONES*\n\n${game.QUESTS.map(qs => { const s = p.quests[qs.id] || { progress: 0, completed: false }; return `${s.completed ? '✅' : '▫️'} ${qs.name} ${Math.min(s.progress, qs.goal)}/${qs.goal} · ${qs.xp} XP · ${qs.gold} oro`; }).join('\n')}`);
  if (command === 'mazmorrasw') return reply(sock, chatId, msg, `🏰 *MAZMORRAS*\n\n${game.DUNGEONS.map(d => `• ${d.id} · ${d.name} · nivel ${d.level} · jefe ${d.boss}`).join('\n')}\n\nUsa /mazmorraw cripta.`);
  if (command === 'mazmorraw') { const r = game.dungeon(p, q.trim().toLowerCase()); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `🏰 *${r.dungeon.name} completada*\n💰 Botín: ${r.reward} oro\n🎁 Objeto: ${game.ITEMS[r.dungeon.item].name}${r.equippedLoot ? ' (equipado automáticamente)' : ''}\n${game.formatStatus(p)}`); }
  if (command === 'tiendaw') return reply(sock, chatId, msg, `🛒 *TIENDA*\n\n${Object.entries(game.ITEMS).map(([id, x]) => `• ${id} — ${x.name} · ${x.price} oro · nivel ${x.level}`).join('\n')}\n\nUsa /comprarW id.`);
  if (command === 'comprarw') { const idItem = q.trim(); const item = game.ITEMS[idItem]; if (!item) return reply(sock, chatId, msg, '❌ Objeto inexistente. Usa /tiendaW para ver los IDs.'); if (p.level < item.level || p.gold < item.price) return reply(sock, chatId, msg, `❌ No puedes comprarlo: requiere nivel ${item.level} y cuesta ${item.price} oro.`); root.pendingPurchases[id] = { itemId: idItem, expiresAt: Date.now() + 120000 }; saveBotData(); return reply(sock, chatId, msg, `🛒 Vas a comprar *${item.name}* por ${item.price} oro.\nOro actual: ${p.gold}.\n\n✅ Escribe /ConfirmarCompra para comprar.\n❌ Escribe /CancelarCompra para cancelar.`); }
  if (command === 'confirmarcompra') { const pending = root.pendingPurchases[id]; if (!pending || pending.expiresAt < Date.now()) return reply(sock, chatId, msg, 'No tienes una compra pendiente.'); const r = game.buy(p, pending.itemId); delete root.pendingPurchases[id]; if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `✅ Compra completada: ${r.item.name}.\n${game.formatStatus(p)}`); }
  if (command === 'cancelarcompra') { delete root.pendingPurchases[id]; saveBotData(); return reply(sock, chatId, msg, '❌ Compra cancelada. No se descontó oro.'); }
  if (command === 'talentosw') { const talent = q.trim().toLowerCase(); if (!['ataque','defensa','vitality'].includes(talent) || !p.talentPoints) return reply(sock, chatId, msg, `🎯 Puntos: ${p.talentPoints || 0}. Usa ataque, defensa o vitality.`); p.talentPoints--; p.talents[talent] = Number(p.talents[talent] || 0) + 2; game.recalc(p); saveBotData(); return reply(sock, chatId, msg, `✅ Talento mejorado.\n${game.formatStatus(p)}`); }
  if (command === 'mapaw' || command === 'zonasw') { return reply(sock, chatId, msg, `🗺️ *MUNDO*\n\n${Object.entries(game.ZONES).map(([id,z]) => `• ${id} · ${z.name} · nivel ${z.level} · recursos: ${z.gathering.join(', ')}`).join('\n')}\n\nUsa /viajarW zona.`); }
  if (command === 'viajarw') { const r = game.travel(p, q.trim().toLowerCase()); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `📍 Has viajado a ${r.zone.name}.`); }
  if (command === 'profesionesw') return reply(sock, chatId, msg, `🛠️ *PROFESIONES*\nMinería: ${p.professions.mineria || 0} · Herbalismo: ${p.professions.herbalismo || 0} · Alquimia: ${p.professions.alquimia || 0} · Herrería: ${p.professions['herrería'] || 0}\n\n/aprenderW mineria|herbalismo|alquimia|herreria`);
  if (command === 'aprenderw') { const r = game.learnProfession(p, q.trim()); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `✅ Aprendiste ${r.profession} nivel ${r.level}.`); }
  if (command === 'recolectarw') { const r = game.gather(p, q.trim()); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `🌿 Encontraste ${r.name}. ${r.profession} nivel ${r.level}.`); }
  if (command === 'recetasw') return reply(sock, chatId, msg, `📜 *RECETAS*\n\n${Object.entries(game.RECIPES).map(([id,r]) => `• ${id} · ${r.name} · ${r.profession} ${r.level} · materiales: ${Object.entries(r.materials).map(([m,n]) => `${m} x${n}`).join(', ')}`).join('\n')}\n\n/fabricarW receta`);
  if (command === 'fabricarw') { const r = game.craft(p, q.trim()); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `🔨 Fabricaste ${r.recipe.name}: ${game.ITEMS[r.output]?.name || r.output} x${r.quantity}.`); }
  if (command === 'diariaw') { const r = game.daily(p); if (r.error) return reply(sock, chatId, msg, `⏳ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `🎁 Recompensa diaria: ${r.gold} oro y experiencia. ${r.achievement ? `Logro: ${r.achievement.name}.` : ''}`); }
  if (command === 'logrosw') return reply(sock, chatId, msg, `🏅 *LOGROS*\n\n${Object.entries(game.ACHIEVEMENTS).map(([id,a]) => `${p.achievements[id] ? '✅' : '▫️'} ${a[0]} · ${a[1]} · recompensa ${a[2]} oro`).join('\n')}`);
  if (command === 'monturasw') return reply(sock, chatId, msg, `🐎 *MONTURAS*\n\n${Object.entries(game.MOUNTS).map(([id,m]) => `• ${id} · ${m.name} · nivel ${m.level} · ${m.price} oro ${p.mounts.includes(id) ? '✅' : ''}`).join('\n')}\n\n/comprarmonturaW id`);
  if (command === 'comprarmonturaw') { const r = game.buyMount(p, q.trim()); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `🐎 Montura conseguida: ${r.mount.name}.`); }
  if (command === 'grupow') { const [action, arg] = q.trim().split(/\s+/); const r = action === 'crear' ? game.createParty(root, p) : action === 'unir' ? game.joinParty(root, p, arg) : action === 'salir' ? game.leaveParty(root, p) : { error: 'Usa /grupoW crear, /grupoW unir ID o /grupoW salir.' }; if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, r.party ? `👥 Grupo ${r.party.id}: ${r.party.members.length}/5 jugadores.` : '👥 Operación de grupo completada.'); }
  if (command === 'subastaw') { const list = game.listAuction(root); return reply(sock, chatId, msg, `🏷️ *SUBASTA*\n\n${list.map(a => `• ${a.id} · ${game.ITEMS[a.item]?.name || a.item} · ${a.price} oro`).join('\n') || 'No hay objetos publicados.'}\n\n/venderW objeto precio\n/comprarsubastaW ID`); }
  if (command === 'venderw') { const [item, price] = q.trim().split(/\s+/); const r = game.auctionList(root, p, item, price); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `🏷️ Publicaste ${game.ITEMS[r.auction.item]?.name || r.auction.item} por ${r.auction.price} oro. ID ${r.auction.id}.`); }
  if (command === 'comprarsubastaw') { const r = game.auctionBuy(root, p, q.trim()); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `✅ Compraste ${r.item.name} por ${r.auction.price} oro.`); }
  if (command === 'correow') { const mails = (root.mail[id] || []).filter(x => !x.claimed); return reply(sock, chatId, msg, `📬 Tienes ${mails.length} mensajes pendientes.\n${mails.map(x => `• ${game.ITEMS[x.item]?.name || x.item} + ${x.gold} oro`).join('\n') || 'Buzón vacío.'}\n\n/reclamarmailW para recibirlo.`); }
  if (command === 'reclamarmailw') { const r = game.claimMail(root, p); saveBotData(); return reply(sock, chatId, msg, `📬 Recibiste ${r.claimed} mensajes del buzón.`); }
  if (command === 'enviarmailw') { const [target, item, gold] = q.trim().split(/\s+/); const r = game.sendMail(root, p, game.normalizePhone(target), item, Number(gold || 0)); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, '📨 Correo enviado.'); }
  if (command === 'encantamientosw') return reply(sock, chatId, msg, `✨ *ENCANTAMIENTOS*\n\n${Object.entries(game.ENCHANTMENTS).map(([id,e]) => `• ${id} · ${e.name} · ${e.slot === 'weapon' ? 'arma' : 'armadura'} · +${e.attack || 0} ataque · +${e.defense || 0} defensa · +${e.hp || 0} vida · materiales: ${Object.entries(e.materials).map(([m,n]) => `${m} x${n}`).join(', ')}`).join('\n')}\n\nUsa /encantarW filo arma o /encantarW fortaleza armadura.`);
  if (command === 'encantarw') { const [enchantId, slotInput] = q.trim().split(/\s+/); const slot = /^(armadura|armor)$/i.test(slotInput || '') ? 'armor' : 'weapon'; const r = game.enchant(p, enchantId, slot); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, `✨ Encantamiento aplicado: ${r.enchantment.name}.\n${game.formatStatus(p)}`); }
  if (command === 'guildw') { const [action, ...rest] = q.trim().split(/\s+/); const r = game.guild(botData, action || 'info', p, rest.join(' ')); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, r.guild ? `🏰 Guild: ${r.guild.name}\n🆔 ID: ${r.guild.id}` : 'No perteneces a ninguna guild.'); }
  if (command === 'duelo' || command === 'desafiar') { const target = String(q || '').match(/\d{7,16}/)?.[0]; if (!target) return reply(sock, chatId, msg, 'Uso: /duelo número_del_jugador'); const r = game.createDuel(root, p, target); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); await sock.sendMessage(`${target}@s.whatsapp.net`, { text: `⚔️ ${p.name} te ha desafiado a un duelo. Usa /AceptarDuel para aceptar o /Rendirse para rechazar.` }); return reply(sock, chatId, msg, '⚔️ Desafío enviado.'); }
  if (command === 'aceptarduel' || command === 'aceptarduelo') { const r = game.acceptDuel(root, p); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); const other = r.duel.players.find(x => x !== p.id); await sock.sendMessage(`${other}@s.whatsapp.net`, { text: '⚔️ Duelo iniciado. Es tu turno: usa /AtacarDuel o /HabilidadDuel nombre.' }); return reply(sock, chatId, msg, '⚔️ Duelo aceptado. El retador empieza.'); }
  if (command === 'atacarduel' || command === 'dueloatacar') { const r = game.duelAttack(root, p, 'auto'); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); const other = r.duel.players.find(x => x !== p.id); if (r.victory) { await sock.sendMessage(`${other}@s.whatsapp.net`, { text: `🏳️ Has perdido el duelo contra ${p.name}.` }); return reply(sock, chatId, msg, `🏆 Ganaste el duelo. Daño: ${r.damage}.`); } await sock.sendMessage(`${other}@s.whatsapp.net`, { text: `⚔️ ${p.name} te infligió ${r.damage} de daño. Es tu turno.` }); return reply(sock, chatId, msg, `⚔️ Infligiste ${r.damage} de daño. Esperando el turno del rival.`); }
  if (command === 'habilidadduel') { const r = game.duelAttack(root, p, q.trim().toLowerCase()); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, r.victory ? `🏆 Ganaste el duelo con ${r.damage} de daño.` : `⚔️ Habilidad usada: ${r.damage} de daño. Turno del rival.`); }
  if (command === 'rendirse') { const duel = Object.values(root.duels || {}).find(d => d.status === 'active' && d.players.includes(p.id)); if (!duel) return reply(sock, chatId, msg, 'No estás en un duelo.'); duel.status = 'forfeit'; duel.winner = duel.players.find(x => x !== p.id); saveBotData(); return reply(sock, chatId, msg, '🏳️ Te has rendido.'); }
  if (command === 'comerciar' || command === 'trade') { const target = String(q || '').match(/\d{7,16}/)?.[0]; if (!target || target === id) return reply(sock, chatId, msg, 'Uso: /comerciar número_del_otro_jugador'); const tradeId = crypto.randomBytes(4).toString('hex').toUpperCase(); root.trades[tradeId] = { id: tradeId, status: 'pending', participants: [id, target], offers: {}, accepted: {}, createdAt: new Date().toISOString(), expiresAt: Date.now() + 15 * 60 * 1000 }; root.tradeRequests[target] = tradeId; saveBotData(); await sock.sendMessage(`${target}@s.whatsapp.net`, { text: `🤝 @${id} quiere comerciar contigo.\n\n✅ /AceptC para abrir el comercio\n❌ /CancelC para cancelar`, mentions: [`${id}@s.whatsapp.net`] }); return reply(sock, chatId, msg, `📨 Comercio 1/2: esperando que el otro jugador acepte.`); }
  if (command === 'aceptc' || command === 'cancelc') { const tradeId = root.tradeRequests[id] || Object.keys(root.trades).find(k => root.trades[k].participants?.includes(id) && ['pending','active'].includes(root.trades[k].status)); const t = tradeId && root.trades[tradeId]; if (!t || t.expiresAt < Date.now()) return reply(sock, chatId, msg, 'No tienes un comercio pendiente.'); if (command === 'cancelc') { t.status = 'cancelled'; saveBotData(); for (const other of t.participants.filter(x => x !== id)) await sock.sendMessage(`${other}@s.whatsapp.net`, { text: '❌ Comercio Cancelado.' }); return reply(sock, chatId, msg, '❌ Comercio Cancelado.'); } if (t.status === 'pending') { t.status = 'active'; t.accepted = {}; delete root.tradeRequests[id]; saveBotData(); const other = t.participants.find(x => x !== id); await sock.sendMessage(`${other}@s.whatsapp.net`, { text: '✅ 2/2: comercio abierto. Ambos pueden ofrecer oro/objetos y aceptar.' }); return reply(sock, chatId, msg, '✅ 2/2: comercio abierto. Usa /dar y después /AceptC.'); } t.accepted[id] = true; if (t.accepted[t.participants.find(x => x !== id)]) { const r = settleTrade(root, t); if (r.error) return reply(sock, chatId, msg, `❌ ${r.error}`); saveBotData(); return reply(sock, chatId, msg, '✅ Comercio completado con éxito.'); } saveBotData(); return reply(sock, chatId, msg, '⏳ Tu oferta está bloqueada. Esperando la aceptación del otro jugador.'); }
  if (command === 'dar') { const t = activeTrade(root, id); if (!t || t.status !== 'active') return reply(sock, chatId, msg, '❌ No tienes un comercio abierto.'); const match = String(q || '').trim().match(/^(.+?)\s+x\s*(\d+)$/i); if (!match) return reply(sock, chatId, msg, 'Tutorial: /dar Poción x2 o /dar oro x20'); const qty = Number(match[2]); const requested = match[1].trim(); const offer = t.offers[id] || { items: [], gold: 0 }; if (/^oro$/i.test(requested)) { if (qty > p.gold) return reply(sock, chatId, msg, '❌ No tienes suficiente oro.'); offer.gold = qty; } else { const itemId = game.findItemId(requested); if (!itemId) return reply(sock, chatId, msg, '❌ Objeto inexistente.'); const items = Array(qty).fill(itemId); const available = [...p.inventory]; for (const item of items) { const i = available.indexOf(item); if (i < 0) return reply(sock, chatId, msg, '❌ No tienes esa cantidad.'); available.splice(i, 1); } offer.items = items; } t.offers[id] = offer; t.accepted = {}; saveBotData(); return reply(sock, chatId, msg, `📦 Oferta actualizada. El otro jugador puede verla y aceptar.`); }
  return reply(sock, chatId, msg, '❌ Comando Warcraft no reconocido. Usa /ayudaW.');
}
module.exports = run;
module.exports.menu = menu;
