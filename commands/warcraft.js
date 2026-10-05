const game = require('../lib/warcraft');
function phoneCandidates(msg, chatId) {
  const keys = [msg?.key?.participant, msg?.key?.participantAlt, msg?.key?.senderPn, msg?.key?.participantPn, msg?.key?.remoteJid, msg?.key?.remoteJidAlt, chatId];
  return [...new Set(keys.map(game.normalizePhone).filter(value => /^\d{7,16}$/.test(value)))];
}
function jidOf(msg, chatId) { return `${phoneCandidates(msg, chatId)[0] || game.normalizePhone(chatId)}@s.whatsapp.net`; }
function reply(sock, chatId, msg, text) { return sock.sendMessage(chatId, { text }, { quoted: msg }); }
function menu() { return `⚔️ *WARCRAFT RPG*

/statusW · progreso, nivel y GS
/misionesW · ver tus misiones
/mazmorrasW · listar mazmorras
/mazmorraW · entrar a una mazmorra
/tiendaW · ver objetos disponibles
/comprarW · comprar un objeto
/inventarioW · revisar tu equipo
/talentosW · mejorar tus talentos
/guildW · crear o ver tu guild
/comerciar · solicitar un intercambio
/AceptC · aceptar comercio
/CancelC · cancelar comercio

Elige este módulo para ver la guía.`; }
async function run(sock, chatId, msg, command, q, botData, saveBotData) {
  const phones = phoneCandidates(msg, chatId); const id = phones[0]; const jid = jidOf(msg, chatId); const root = game.ensureRoot(botData); let p = game.ensurePlayer(botData, jid, msg?.pushName || 'Aventurero');
  command = String(command || '').toLowerCase();
  root.sessions ||= {};
  if (command === 'warcraft' || command === 'warcraftmenu') return reply(sock, chatId, msg, p && root.sessions[id] ? `${menu()}\n\n${game.formatStatus(p)}` : '🔐 Cuenta no vinculada. Regístrate en la web con tu número de WhatsApp y luego usa /loginw número_de_teléfono contraseña.');
  if (command === 'loginw') {
    const [username, password] = q.trim().split(/\s+/); const rawUser = String(username || '').trim().toLowerCase();
    const account = Object.values(root.accounts).find(item => String(item.phone) === rawUser || String(item.username).toLowerCase() === rawUser);
    let valid = false;
    try { const crypto = require('crypto'); const [salt, digest] = String(account?.passwordHash || '').split(':'); const actual = crypto.scryptSync(String(password || ''), salt, 64); const expected = Buffer.from(digest || '', 'hex'); valid = expected.length === actual.length && crypto.timingSafeEqual(actual, expected); } catch {}
    if (!account || !valid) return reply(sock, chatId, msg, '❌ Usuario o contraseña incorrectos. Regístrate desde la web Warcraft.');
    if (!phones.includes(game.normalizePhone(account.phone))) return reply(sock, chatId, msg, '❌ La cuenta solo puede vincularse desde el mismo número de WhatsApp registrado.');
    root.sessions[id] = account.username; saveBotData();
    return reply(sock, chatId, msg, '✅ Cuenta Warcraft vinculada en este chat. Ya puedes usar /warcraft.');
  }
  if (!root.sessions[id]) return reply(sock, chatId, msg, '🔐 Cuenta no vinculada. Regístrate en la web y usa /loginw número_de_teléfono contraseña.');
  root.tradeRequests ||= {};
  if (command === 'comerciar' || command === 'trade') {
    const target = String(q || '').match(/\d{8,15}/)?.[0];
    if (!target || target === id) return reply(sock, chatId, msg, 'Uso: /comerciar 535XXXXXXXX');
    root.tradeRequests[target] = { from: id, expiresAt: Date.now() + 10 * 60 * 1000 };
    await sock.sendMessage(`${target}@s.whatsapp.net`, { text: `🤝 @${id} quiere comerciar contigo.\n\n✅ Acepta con /AceptC\n❌ Cancela con /CancelC`, mentions: [`${id}@s.whatsapp.net`] }, { quoted: msg });
    return reply(sock, chatId, msg, `📨 Solicitud de comercio enviada a ${target}.`);
  }
  if (command === 'aceptc' || command === 'cancelc') {
    const request = root.tradeRequests[id];
    if (!request || request.expiresAt < Date.now()) return reply(sock, chatId, msg, 'No tienes una solicitud de comercio pendiente.');
    delete root.tradeRequests[id]; saveBotData();
    const text = command === 'aceptc' ? `✅ Comercio aceptado. Ambos deben abrir la web Warcraft y usar el mismo ID de comercio.` : '❌ No has aceptado el comercio.';
    await sock.sendMessage(`${request.from}@s.whatsapp.net`, { text });
    return reply(sock, chatId, msg, text);
  }
  if (command === 'pjnombre') { if (p) return reply(sock, chatId, msg, '❌ Ya tienes un personaje.'); const name = q.trim(); if (name.length < 3) return reply(sock, chatId, msg, 'Uso: /pjnombre Jakudoshy'); root.pending ||= {}; root.pending[id] = { name }; saveBotData(); return reply(sock, chatId, msg, '✅ Nombre guardado. Ahora elige: /clase warrior, /clase mago o /clase picaro'); }
  if (command === 'clase') { if (p) return reply(sock, chatId, msg, '❌ Ya tienes un personaje.'); const pending = root.pending?.[id]; if (!pending) return reply(sock, chatId, msg, 'Primero usa /pjnombre Nombre.'); const classKey = q.trim().toLowerCase(); const result = game.createPlayer(botData, jid, pending.name, classKey); if (result.error) return reply(sock, chatId, msg, `❌ ${result.error}`); delete root.pending[id]; saveBotData(); return reply(sock, chatId, msg, `🌅 *Amaneces en la aldea de Brumaria.*\n\nLa aldea te acoge y te entrega una armadura y un arma.\n\n${game.formatStatus(result.player)}\n\n📜 Tutorial: completa /misionesW para ganar XP y oro.`); }
  if (!p) return reply(sock, chatId, msg, '❌ No tienes personaje creado.');
  if (command === 'estadow' || command === 'statusw' || command === 'estadoW'.toLowerCase()) return reply(sock, chatId, msg, game.formatStatus(p));
  if (command === 'inventarioW'.toLowerCase()) return reply(sock, chatId, msg, `🎒 *INVENTARIO*\n\n${game.listItems(p).map(x => `${x.index}. ${x.name}${x.attack ? ` · ⚔️${x.attack}` : ''}${x.defense ? ` · 🛡️${x.defense}` : ''}`).join('\n') || 'Vacío'}\n\nEquipo: ${p.equipment.weapon || '-'} / ${p.equipment.armor || '-'}`);
  if (command === 'misionesW'.toLowerCase()) { const lines = game.QUESTS.map(qs => { const s = p.quests[qs.id] || { progress: 0, completed: false }; return `${s.completed ? '✅' : '📜'} ${qs.name} · ${Math.min(s.progress, qs.goal)}/${qs.goal} · ${qs.xp} XP · ${qs.gold} oro\n   ${qs.description}`; }); return reply(sock, chatId, msg, `📜 *TABLÓN DE MISIONES*\n\n${lines.join('\n')}${p.level === 1 ? '\n\n💡 Completa Lobos de la frontera para progresar.' : ''}`); }
  if (command === 'mazmorrasW'.toLowerCase()) return reply(sock, chatId, msg, `🏰 *MAZMORRAS*\n\n${game.DUNGEONS.map(d => `• ${d.name} · nivel ${d.level} · /mazmorraW ${d.id}`).join('\n')}`);
  if (command === 'mazmorraW'.toLowerCase()) { const result = game.dungeon(p, q.trim().toLowerCase()); if (result.error) return reply(sock, chatId, msg, `❌ ${result.error}`); saveBotData(); return reply(sock, chatId, msg, `🏰 *${result.dungeon.name} COMPLETADA*\n\n💰 Botín: ${result.reward} oro\n🎁 Objeto: ${game.ITEMS[result.dungeon.item].name}\n✨ ${result.dungeon.xp} XP\n${result.levels.join('\n')}\n\n${game.formatStatus(p)}`); }
  if (command === 'tiendaW'.toLowerCase()) return reply(sock, chatId, msg, `🛒 *TIENDA*\n\n${Object.entries(game.ITEMS).map(([id, x]) => `• ${id} — ${x.name} · ${x.price} oro · nivel ${x.level}${x.attack ? ` · ⚔️${x.attack}` : ''}${x.defense ? ` · 🛡️${x.defense}` : ''}`).join('\n')}\n\nUsa /comprarW id`);
  if (command === 'comprarW'.toLowerCase()) { const result = game.buy(p, q.trim()); if (result.error) return reply(sock, chatId, msg, `❌ ${result.error}`); saveBotData(); return reply(sock, chatId, msg, `✅ Compraste ${result.item.name}.\n\n${game.formatStatus(p)}`); }
  if (command === 'talentosW'.toLowerCase()) { const talent = q.trim().toLowerCase(); if (!['ataque', 'defensa'].includes(talent)) return reply(sock, chatId, msg, `🎯 Puntos disponibles: ${p.talentPoints || 0}\nUso: /talentosW ataque o /talentosW defensa`); if (!p.talentPoints) return reply(sock, chatId, msg, '❌ No tienes puntos de talento. Sube de nivel.'); p.talentPoints--; p.talents[talent] = Number(p.talents[talent] || 0) + 2; game.recalc(p); saveBotData(); return reply(sock, chatId, msg, `✅ Talento mejorado: ${talent} +2.\n\n${game.formatStatus(p)}`); }
  if (command === 'guildW'.toLowerCase()) { const [action, ...rest] = q.trim().split(/\s+/); const result = game.guild(botData, action || 'info', p, rest.join(' ')); if (result.error) return reply(sock, chatId, msg, `❌ ${result.error}`); saveBotData(); return reply(sock, chatId, msg, result.guild ? `🏰 Guild: ${result.guild.name}\n👥 Miembros: ${result.guild.members.length}\n🆔 ID: ${result.guild.id}` : 'No perteneces a ninguna guild.'); }
  return reply(sock, chatId, msg, '❌ Comando Warcraft no reconocido.');
}
module.exports = run;
module.exports.menu = menu;
