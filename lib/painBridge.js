const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '../legacy/Pain-Bot');
const PLUGIN_ROOT = path.join(ROOT, 'plugins');
const commandFiles = new Map();
const moduleCache = new Map();
let indexed = false;

// Estos módulos pueden enviar spam, atacar cuentas, ejecutar cambios remotos o exponer NSFW.
const BLOCKED_PLUGIN_PATTERNS = [
  /spam|bomb|crash|freeze|nuke|bug/i,
  /modo-(hot|ilegal)/i,
  /hentai|onlyfans|xnxx|xvideos|waifu-(nsfw|tetas|tik18)/i,
  /owner-(add-plugin|replugin|restart|update|reconnect|join|exit)/i,
  /publicacion-spam|anti-spam/i
];
const BLOCKED_COMMANDS = new Set(['spam', 'callbomb', 'crash', 'freeze', 'nuke', 'bug', 'bugs', 'ilegal', 'hentai', 'onlyfans']);

function listPluginFiles() {
  if (!fs.existsSync(PLUGIN_ROOT)) return [];
  return fs.readdirSync(PLUGIN_ROOT, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.js'))
    .map(entry => path.join(PLUGIN_ROOT, entry.name));
}
function indexCommands() {
  if (indexed) return;
  indexed = true;
  for (const file of listPluginFiles()) {
    const source = fs.readFileSync(file, 'utf8');
    const match = source.match(/(?:handler|plugin)\.command\s*=\s*(\[[\s\S]*?\]|['"][^'"]+['"])/);
    if (!match || BLOCKED_PLUGIN_PATTERNS.some(pattern => pattern.test(path.basename(file)))) continue;
    for (const item of match[1].matchAll(/['"]([\w-]+)['"]/g)) {
      const command = item[1].toLowerCase();
      if (!BLOCKED_COMMANDS.has(command) && !commandFiles.has(command)) commandFiles.set(command, file);
    }
  }
}
async function load(file) {
  if (!moduleCache.has(file)) {
    const promise = import(`${pathToFileURL(file).href}?jk=${fs.statSync(file).mtimeMs}`)
      .then(module => module.default || module)
      .catch(error => { moduleCache.delete(file); throw error; });
    moduleCache.set(file, promise);
  }
  return moduleCache.get(file);
}
function unwrap(raw) {
  return raw?.message?.ephemeralMessage?.message || raw?.message?.viewOnceMessage?.message || raw?.message?.viewOnceMessageV2?.message || raw?.message || {};
}
function textOf(raw) {
  const content = unwrap(raw);
  const type = Object.keys(content)[0];
  const value = content[type] || {};
  return String(content.conversation || value.text || value.caption || value.contentText || '').trim();
}
function contextOf(raw) {
  const content = unwrap(raw);
  const type = Object.keys(content)[0];
  return content[type]?.contextInfo || {};
}
function createMessage(raw, sock, fullText) {
  const chat = raw.key.remoteJid;
  const context = contextOf(raw);
  const sender = raw.key.participant || (raw.key.fromMe ? sock.user?.id : chat);
  const msg = Object.assign({}, raw, {
    id: raw.key.id,
    chat,
    sender,
    fromMe: Boolean(raw.key.fromMe),
    isGroup: chat.endsWith('@g.us'),
    body: fullText,
    text: fullText,
    mentionedJid: context.mentionedJid || [],
    mentions: context.mentionedJid || [],
    quoted: context.quotedMessage ? {
      chat,
      sender: context.participant || chat,
      id: context.stanzaId,
      message: context.quotedMessage,
      msg: context.quotedMessage,
      text: ''
    } : null
  });
  msg.reply = (content, options = {}) => sock.sendMessage(chat, typeof content === 'string' ? { text: content } : content, { ...options, quoted: raw });
  msg.react = emoji => sock.sendMessage(chat, { react: { text: emoji, key: raw.key } });
  return msg;
}
function createConn(sock, state) {
  return new Proxy(sock, {
    get(target, property, receiver) {
      if (property === 'sendMessage') return async (...args) => { state.sent++; return target.sendMessage(...args); };
      if (property === 'reply') return async (chat, content, quoted) => {
        state.sent++;
        return target.sendMessage(chat, typeof content === 'string' ? { text: content } : content, quoted ? { quoted } : undefined);
      };
      if (property === 'sendFile' || property === 'sendFileLia') return async (chat, file, filename, caption, quoted, _thumb, options = {}) => {
        state.sent++;
        let content;
        if (Buffer.isBuffer(file)) content = { document: file, fileName: filename || 'archivo', mimetype: 'application/octet-stream' };
        else content = { image: { url: String(file) }, caption: caption || '' };
        return target.sendMessage(chat, { ...content, ...(options.contextInfo ? { contextInfo: options.contextInfo } : {}) }, quoted ? { quoted } : undefined);
      };
      if (property === 'sendMessageLia') return (...args) => target.sendMessage(...args);
      if (property === 'getFile') return async input => {
        if (Buffer.isBuffer(input)) return { data: input };
        const response = await axios.get(String(input), { responseType: 'arraybuffer', timeout: 30000 });
        return { data: Buffer.from(response.data) };
      };
      if (property === 'getName') return async jid => String(jid || '').split('@')[0];
      const value = Reflect.get(target, property, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
}
function installGlobals() {
  global.rcanal = global.rcanal || { contextInfo: {} };
  global.mess = global.mess || { admin: 'Este comando solo puede ser ejecutado por administradores.', botAdmin: 'Necesito ser administrador para ejecutar este comando.' };
  global.namebot = global.namebot || 'ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ';
  global.db = global.db || { data: { users: {}, chats: {}, bienvenidas: {} } };
}
async function runPainCommand({ command, sock, rawMessage, fullText, args, text, isOwner, isAdmin, isBotAdmin }) {
  indexCommands();
  const file = commandFiles.get(String(command).toLowerCase());
  if (!file) return false;
  installGlobals();
  const state = { sent: 0 };
  try {
    const plugin = await load(file);
    if (typeof plugin !== 'function') return false;
    const conn = createConn(sock, state);
    const msg = createMessage(rawMessage, conn, fullText);
    const chat = rawMessage.key.remoteJid;
    global.db.data.users[msg.sender] ||= { name: msg.pushName || 'Usuario', registered: true };
    global.db.data.chats[chat] ||= {};
    await plugin.call(conn, msg, {
      conn,
      args: Array.isArray(args) ? args : [],
      text: text || '',
      usedPrefix: '/',
      command: String(command).toLowerCase(),
      isOwner: Boolean(isOwner),
      isAdmin: Boolean(isAdmin),
      isBotAdmin: Boolean(isBotAdmin),
      participants: [],
      groupMetadata: null
    });
    return true;
  } catch (error) {
    console.error(`[JK/Pain] ${command}:`, error.message);
    if (state.sent === 0) await sock.sendMessage(rawMessage.key.remoteJid, { text: `❌ Pain no pudo ejecutar /${command}: ${error.message}` }, { quoted: rawMessage });
    return true;
  }
}
function getPainCommandCount() { indexCommands(); return commandFiles.size; }
function getPainPluginCount() { return listPluginFiles().length; }
function getPainCommandNames() { indexCommands(); return [...commandFiles.keys()]; }
module.exports = { runPainCommand, getPainCommandCount, getPainPluginCount, getPainCommandNames };
