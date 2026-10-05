const game = require('../lib/warcraft');
function jidOf(msg, chatId) { return msg?.key?.participant || (msg?.key?.fromMe ? msg?.key?.remoteJid : chatId); }
function reply(sock, chatId, msg, text) { return sock.sendMessage(chatId, { text }, { quoted: msg }); }
function menu() { return `╭──〔 ⚔️ WARCRAFT EN WHATSAPP 〕──╮\n│ /pjnombre Nombre · crear personaje\n│ /clase warrior|mago|picaro · elegir clase\n│ /loginw usuario contraseña · vincular cuenta web\n│ /estadoW · ver nivel, XP, oro y GS\n│ /misionesW · ver/completar misiones\n│ /mazmorrasW · listar mazmorras\n│ /mazmorraW cripta|forja|noche · entrar\n│ /tiendaW · comprar equipo/pociones\n│ /comprarW objeto · comprar\n│ /inventarioW · ver objetos\n│ /talentosW ataque|defensa · gastar punto\n│ /guildW crear Nombre · crear guild\n│ /comerciar número · invitar a otro jugador\n│ /AceptC o /CancelC · responder solicitud\n│\n│ Tutorial: empieza en nivel 1, completa misiones,\n│ mejora equipo y llega hasta nivel 80.\n╰──────────────────────────╯`; }
async function run(sock, chatId, msg, command, q, botData, saveBotData) {
  const jid = jidOf(msg, chatId); const id = game.normalizePhone(jid); const root = game.ensureRoot(botData); let p = game.ensurePlayer(botData, jid, msg?.pushName || 'Aventurero');
  command = String(command || '').toLowerCase();
  root.sessions ||= {};
  if (command === 'warcraft' || command === 'warcraftmenu') return reply(sock, chatId, msg, p && root.sessions[id] ? `${menu()}\n\n${game.formatStatus(p)}` : `${menu()}\n\n🔐 Primero vincula tu cuenta web con /loginw usuario contraseña.`);
  if (command === 'loginw') {
    const [username, password] = q.trim().split(/\s+/); const account = root.accounts[String(username || '').toLowerCase()];
    if (!account || !require('crypto').timingSafeEqual(Buffer.from(require('crypto').scryptSync(String(password || ''), String(account.passwordHash || '').split(':')[0], 64).toString('hex'), 'hex'), Buffer.from(String(account.passwordHash || '').split(':')[1] || '', 'hex'))) return reply(sock, chatId, msg, '❌ Usuario o contraseña incorrectos. Regístrate desde la web Warcraft.');
    if (account.phone !== id) return reply(sock, chatId, msg, '❌ Esa cuenta está vinculada a otro número de WhatsApp.');
    root.sessions[id] = account.username; saveBotData();
    return reply(sock, chatId, msg, '✅ Cuenta Warcraft vinculada en este chat. Ya puedes usar /warcraft.');
  }
  if (!root.sessions[id]) return reply(sock, chatId, msg, '🔐 Debes iniciar sesión primero: /loginw usuario contraseña.');
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
  if (!p) return reply(sock, chatId, msg, '🔐 No tienes personaje. Usa /warcraft y empieza con /pjnombre Nombre.');
  if (command === 'estadow' || command === 'estadoW'.toLowerCase()) return reply(sock, chatId, msg, game.formatStatus(p));
  if (command === 'inventarioW'.toLowerCase()) return reply(sock, chatId, msg, `🎒 *INVENTARIO*\n\n${game.listItems(p).map(x => `${x.index}. ${x.name}${x.attack ? ` · ⚔️${x.attack}` : ''}${x.defense ? ` · 🛡️${x.defense}` : ''}`).join('\n') || 'Vacío'}\n\nEquipo: ${p.equipment.weapon || '-'} / ${p.equipment.armor || '-'}`);
  if (command === 'misionesW'.toLowerCase()) { const lines = game.QUESTS.map(qs => { const s = p.quests[qs.id] || { progress: 0, completed: false }; return `${s.completed ? '✅' : '📜'} ${qs.name} · ${Math.min(s.progress, qs.goal)}/${qs.goal} · ${qs.xp} XP · ${qs.gold} oro\n   ${qs.description}`; }); return reply(sock, chatId, msg, `📜 *TABLÓN DE MISIONES*\n\n${lines.join('\n')}${p.level === 1 ? '\n\n💡 Completa Lobos de la frontera para progresar.' : ''}`); }
  if (command === 'mazmorrasW'.toLowerCase()) return reply(sock, chatId, msg, `🏰 *MAZMORRAS*\n\n${game.DUNGEONS.map(d => `• ${d.name} · nivel ${d.level} · /mazmorraW ${d.id}`).join('\n')}`);
  if (command === 'mazmorraW'.toLowerCase()) { const result = game.dungeon(p, q.trim().toLowerCase()); if (result.error) return reply(sock, chatId, msg, `❌ ${result.error}`); saveBotData(); return reply(sock, chatId, msg, `🏰 *${result.dungeon.name} COMPLETADA*\n\n💰 Botín: ${result.reward} oro\n🎁 Objeto: ${game.ITEMS[result.dungeon.item].name}\n✨ ${result.dungeon.xp} XP\n${result.levels.join('\n')}\n\n${game.formatStatus(p)}`); }
  if (command === 'tiendaW'.toLowerCase()) return reply(sock, chatId, msg, `🛒 *TIENDA*\n\n${Object.entries(game.ITEMS).map(([id, x]) => `• ${id} — ${x.name} · ${x.price} oro · nivel ${x.level}${x.attack ? ` · ⚔️${x.attack}` : ''}${x.defense ? ` · 🛡️${x.defense}` : ''}`).join('\n')}\n\nUsa /comprarW id`);
  if (command === 'comprarW'.toLowerCase()) { const result = game.buy(p, q.trim()); if (result.error) return reply(sock, chatId, msg, `❌ ${result.error}`); saveBotData(); return reply(sock, chatId, msg, `✅ Compraste ${result.item.name}.\n\n${game.formatStatus(p)}`); }
  if (command === 'talentosW'.toLowerCase()) { const talent = q.trim().toLowerCase(); if (!['ataque', 'defensa'].includes(talent)) return reply(sock, chatId, msg, `🎯 Puntos disponibles: ${p.talentPoints || 0}\nUso: /talentosW ataque o /talentosW defensa`); if (!p.talentPoints) return reply(sock, chatId, msg, '❌ No tienes puntos de talento. Sube de nivel.'); p.talentPoints--; p.talents[talent] = Number(p.talents[talent] || 0) + 2; game.recalc(p); saveBotData(); return reply(sock, chatId, msg, `✅ Talento mejorado: ${talent} +2.\n\n${game.formatStatus(p)}`); }
  if (command === 'guildW'.toLowerCase()) { const [action, ...rest] = q.trim().split(/\s+/); const result = game.guild(botData, action || 'info', p, rest.join(' ')); if (result.error) return reply(sock, chatId, msg, `❌ ${result.error}`); saveBotData(); return reply(sock, chatId, msg, result.guild ? `🏰 Guild: ${result.guild.name}\n👥 Miembros: ${result.guild.members.length}\n🆔 ID: ${result.guild.id}` : 'No perteneces a ninguna guild.'); }
  return reply(sock, chatId, msg, menu());
}
module.exports = run;
module.exports.menu = menu;
