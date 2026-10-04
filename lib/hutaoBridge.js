const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '../legacy/HuTao-Proyect-master');
const COMMAND_ROOT = path.join(ROOT, 'cmds');
const commandFiles = new Map();
const moduleCache = new Map();
let indexed = false;

function files(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files(full, out);
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}
function indexCommands() {
  if (indexed) return;
  indexed = true;
  for (const file of files(COMMAND_ROOT)) {
    try {
      const source = fs.readFileSync(file, 'utf8');
      const block = source.match(/command\s*:\s*(\[[\s\S]*?\]|['"][^'"]+['"])/)?.[1] || '';
      for (const match of block.matchAll(/['"]([^'"]+)['"]/g)) {
        const key = match[1].toLowerCase();
        if (!commandFiles.has(key)) commandFiles.set(key, file);
      }
    } catch {}
  }
}
async function load(file) {
  if (!moduleCache.has(file)) {
    const promise = import(`${pathToFileURL(file).href}?jk=${fs.statSync(file).mtimeMs}`)
      .then(m => m.default || m)
      .catch(error => { moduleCache.delete(file); throw error; });
    moduleCache.set(file, promise);
  }
  return moduleCache.get(file);
}
function contentOf(raw) {
  return raw?.message?.ephemeralMessage?.message || raw?.message?.viewOnceMessage?.message || raw?.message?.viewOnceMessageV2?.message || raw?.message || {};
}
function contextOf(raw) {
  const content = contentOf(raw);
  const type = Object.keys(content)[0];
  return content[type]?.contextInfo || {};
}
function textOf(raw) {
  const content = contentOf(raw);
  const type = Object.keys(content)[0];
  const value = content[type] || {};
  return String(content.conversation || value.text || value.caption || value.contentText || value.selectedDisplayText || '').trim();
}
function legacyMessage(raw, sock, fullText) {
  const chat = raw.key.remoteJid;
  const context = contextOf(raw);
  const sender = raw.key.participant || (raw.key.fromMe ? sock.user?.id : chat);
  const tokens = String(fullText || textOf(raw)).trim().split(/\s+/);
  const command = (tokens.shift() || '').replace(/^[/!.#+-]/, '').toLowerCase();
  const msg = Object.assign({}, raw, {
    id: raw.key.id,
    chat,
    sender,
    fromMe: Boolean(raw.key.fromMe),
    isGroup: chat.endsWith('@g.us'),
    isBot: false,
    body: fullText,
    text: fullText,
    command,
    args: tokens,
    usedPrefix: String(fullText || '')[0] || '/',
    mentionedJid: context.mentionedJid || [],
    mentions: context.mentionedJid || [],
    quoted: context.quotedMessage ? { chat, sender: context.participant || chat, id: context.stanzaId, message: context.quotedMessage, text: '' } : null
  });
  msg.reply = (content, options = {}) => sock.sendMessage(chat, typeof content === 'string' ? { text: content } : content, { ...options, quoted: raw });
  msg.react = emoji => sock.sendMessage(chat, { react: { text: emoji, key: raw.key } });
  msg.download = () => sock.downloadMediaMessage ? sock.downloadMediaMessage(raw) : null;
  return msg;
}
function installGlobals() {
  global.mess = global.mess || { admin: 'Este comando solo puede ser ejecutado por administradores.', botAdmin: 'Necesito ser administrador para ejecutar este comando.' };
  global.msgglobal = global.msgglobal || 'Ocurrió un problema, intenta de nuevo más tarde.';
  global.owner = global.owner || [String(process.env.OWNER_NUMBER || '5350898613').replace(/\D/g, '')];
  global.mods = global.mods || [];
  global.api = global.api || { url: process.env.HUTAO_API_URL || '', key: process.env.HUTAO_API_KEY || '' };
}
async function runHutaoCommand({ command, sock, rawMessage, fullText, args, text, isOwner, isAdmin }) {
  if (String(process.env.HUTAO_COMMANDS_ENABLED || 'true').toLowerCase() === 'false') return false;
  indexCommands();
  const file = commandFiles.get(String(command).toLowerCase());
  if (!file) return false;
  installGlobals();
  try {
    const plugin = await load(file);
    if (!plugin?.run) return false;
    if (plugin.isOwner && !isOwner) return true;
    if (plugin.isAdmin && !isAdmin) {
      await rawMessage.reply?.(global.mess.admin);
      if (!rawMessage.reply) await sock.sendMessage(rawMessage.key.remoteJid, { text: global.mess.admin }, { quoted: rawMessage });
      return true;
    }
    const msg = legacyMessage(rawMessage, sock, fullText);
    await plugin.run({ msg, sock, args, command, usedPrefix: '/', text, isOwner, isAdmins: isAdmin, isBotAdmins: true, groupMetadata: null, participants: [] });
    return true;
  } catch (error) {
    console.error(`[JK/HuTao] ${command}: ${error.message}`);
    await sock.sendMessage(rawMessage.key.remoteJid, { text: `❌ No se pudo ejecutar /${command}: ${error.message}` }, { quoted: rawMessage });
    return true;
  }
}
function getHutaoCommandCount() { indexCommands(); return commandFiles.size; }
module.exports = { runHutaoCommand, getHutaoCommandCount };
