'use strict';

const repeatedMessages = new Map();
const RULES = {
  antiporno: { key: 'antiPornGroups', label: 'Antiporno' },
  antifoto: { key: 'antiPhotoGroups', label: 'Antifoto' },
  antivideo: { key: 'antiVideoGroups', label: 'Antivideo' },
  antiaudio: { key: 'antiAudioGroups', label: 'Antiaudio' },
  antisticker: { key: 'antiStickerGroups', label: 'Antisticker' },
  antidocumento: { key: 'antiDocumentGroups', label: 'Antidocumentos' },
  antimedia: { key: 'antiMediaGroups', label: 'Antimedia' },
  antispam: { key: 'antiSpamGroups', label: 'Antispam' }
};

async function command(sock, chatId, msg, isAdmin, botData, saveBotData, args = [], ruleName = '') {
  const reply = text => sock.sendMessage(chatId, { text }, { quoted: msg });
  if (!chatId.endsWith('@g.us')) return reply('❌ Esta protección solo funciona en grupos.');
  if (!isAdmin) return reply('❌ Solo un administrador puede configurar la seguridad del grupo.');
  const rule = RULES[String(ruleName).toLowerCase()];
  if (!rule) return reply('❌ Protección desconocida.');
  const action = String(args[0] || '').toLowerCase();
  botData[rule.key] ||= {};
  if (['on', 'activar', '1', 'si', 'sí'].includes(action)) botData[rule.key][chatId] = true;
  else if (['off', 'desactivar', '0', 'no'].includes(action)) delete botData[rule.key][chatId];
  else return reply(`🛡️ ${rule.label}: *${botData[rule.key][chatId] ? 'Activado' : 'Desactivado'}*\n\nUso: /${ruleName} on | off\nSolo afecta a mensajes de participantes que no sean administradores.`);
  saveBotData();
  return reply(`✅ ${rule.label} ${botData[rule.key][chatId] ? 'activado' : 'desactivado'} para este grupo.`);
}

function inspect({ content, text = '', command = false }) {
  const types = Object.keys(content || {});
  const has = name => types.includes(name);
  const media = has('imageMessage') || has('videoMessage') || has('audioMessage') || has('stickerMessage') || has('documentMessage') || has('documentWithCaptionMessage') || has('ptvMessage');
  const adult = /(?:porno|porn|xxx|onlyfans|sex(?:o|ual)?|desnuda|desnudo|nudes?|pack(?:s)?|contenido\s+adulto|🔞)/iu.test(String(text || ''));
  const spam = String(text || '').length > 1800 || /(.)\1{18,}/u.test(String(text || ''));
  return { types, has, media, adult, spam, command };
}

async function enforce(sock, chatId, msg, botData, senderIsAdmin, content, text) {
  if (!chatId?.endsWith('@g.us') || senderIsAdmin || msg?.key?.fromMe) return false;
  const detected = inspect({ content, text });
  const normalized = String(text || '').trim().toLowerCase().replace(/\s+/g, ' ');
  let repeated = false;
  if (normalized.length >= 4 && normalized.length <= 1800) {
    const sender = String(msg?.key?.participant || msg?.participant || 'unknown');
    const key = `${chatId}:${sender}:${normalized}`;
    const now = Date.now();
    const recent = (repeatedMessages.get(key) || []).filter(timestamp => now - timestamp < 20000);
    recent.push(now);
    repeatedMessages.set(key, recent);
    repeated = recent.length >= 3;
    if (repeatedMessages.size > 5000) repeatedMessages.delete(repeatedMessages.keys().next().value);
  }
  const tests = [
    ['antiPornGroups', detected.adult],
    ['antiPhotoGroups', detected.has('imageMessage')],
    ['antiVideoGroups', detected.has('videoMessage') || detected.has('ptvMessage')],
    ['antiAudioGroups', detected.has('audioMessage')],
    ['antiStickerGroups', detected.has('stickerMessage')],
    ['antiDocumentGroups', detected.has('documentMessage') || detected.has('documentWithCaptionMessage')],
    ['antiMediaGroups', detected.media],
    ['antiSpamGroups', detected.spam || repeated]
  ];
  const triggered = tests.find(([key, matched]) => matched && botData?.[key]?.[chatId]);
  if (!triggered) return false;
  try { await sock.sendMessage(chatId, { delete: msg.key }); } catch (error) { console.warn('[seguridad] No se pudo eliminar el mensaje:', error.message); }
  return true;
}

module.exports = { command, enforce, RULES };
