require('dotenv').config();
const P = require('pino');
const os = require('os');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const express = require('express');
const socketIo = require('socket.io');
const axios = require('axios');
const QRCode = require('qrcode');
const { OpenAI } = require('openai');
const TelegramBot = require('node-telegram-bot-api');
const githubBackup = require('./lib/githubBackup');
const settings = require('./settings');

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, downloadContentFromMessage, jidNormalizedUser, Browsers, delay, generateWAMessageContent, generateWAMessageFromContent, normalizeMessageContent, isJidGroup, generateMessageIDV2 } = require('@whiskeysockets/baileys');

const PREMIUM_COMMANDS = new Set([
    'book', 'owner', 'ownermenu', 'toolsmenu', 'tools', 'bugmenu', 'bugs', 'bug', 'crash', 'freeze',
    'ping', 'dp', 'vv', 'translate', 'base64', 'shorturl', 'calc',
    'weather', 'github', 'ipinfo', 'tempmail', 'fakeinfo', 'binlookup',
    'whois', 'dnslookup', 'portscan', 'screenshot', 'define', 'google',
    'wiki', 'yts', 'playstore', 'npm'
]);

// BOT NAME - JK VERSION
const BOT_NAME = 'ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ';
const MOD_NAME = 'ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ';
const CHANNEL = 'https://t.me/gg_no_root';
const ADMIN_USER = 'admin*';
const ADMIN_PASS = 'admin*1';

const PREMIUM_FILE = path.join(__dirname, 'premium.json');
const TOKENS_FILE = path.join(__dirname, 'tokens.json');
function loadJSON(p,d){ try{ if(!fs.existsSync(p)) return d; return JSON.parse(fs.readFileSync(p,'utf8')); }catch{ return d } }
function saveJSON(p,d){ fs.writeFileSync(p, JSON.stringify(d,null,2)); }
let premiumReal = loadJSON(PREMIUM_FILE,{});
let tokensReal = loadJSON(TOKENS_FILE,{});
function isPremiumReal(n){ const d=premiumReal[n]; if(!d) return false; if(Date.now()>d.expires){ delete premiumReal[n]; saveJSON(PREMIUM_FILE,premiumReal); return false; } return true; }
function genTokenReal(days=30){ const code='JK-'+Math.random().toString(36).substring(2,8).toUpperCase()+'-'+days+'D'; tokensReal[code]={days:parseInt(days),used:false,created:Date.now()}; saveJSON(TOKENS_FILE,tokensReal); return code; }
function redeemReal(num,token){ token=token.trim().toUpperCase(); const t=tokensReal[token]; if(!t) return {ok:false,msg:'Token no existe'}; if(t.used) return {ok:false,msg:'Token ya usado'}; const add=t.days*86400000; if(premiumReal[num] && premiumReal[num].expires>Date.now()){ premiumReal[num].expires+=add; }else{ premiumReal[num]={expires:Date.now()+add,since:Date.now()}; } tokensReal[token].used=true; tokensReal[token].usedBy=num; saveJSON(PREMIUM_FILE,premiumReal); saveJSON(TOKENS_FILE,tokensReal); return {ok:true,days:t.days,expires:premiumReal[num].expires}; }

// Import all commands - MISMO MECANISMO
const commands = {
    song: require('./commands/song'), video: require('./commands/video'), insta: require('./commands/insta'), tiktok: require('./commands/tiktok'), facebook: require('./commands/facebook'), youtube: require('./commands/youtube'), pinterest: require('./commands/pinterest'), twitter: require('./commands/twitter'), reddit: require('./commands/reddit'), spotify: require('./commands/spotify'), mediafire: require('./commands/mf'), apk: require('./commands/apk'), gdrive: require('./commands/gdrive'), mf: require('./commands/mf'),
    kick: require('./commands/kick'), add: require('./commands/add'), promote: require('./commands/promote'), demote: require('./commands/demote'), revoke: require('./commands/revoke'), invite: require('./commands/invite'), mute: require('./commands/mute'), unmute: require('./commands/unmute'), kickoffline: require('./commands/kickoffline'), hidetag: require('./commands/hidetag'), tagall: require('./commands/tagall'), tagadmin: require('./commands/tagadmin'), groupinfo: require('./commands/groupinfo'), grouplink: require('./commands/grouplink'), join: require('./commands/join'), leave: require('./commands/leave'), setdesc: require('./commands/setdesc'), open: require('./commands/open'), close: require('./commands/close'), onlyadmin: require('./commands/onlyadmin'), alertas: require('./commands/alertas'), welcome: require('./commands/welcome'), bye: require('./commands/bye'), setwelcome: require('./commands/setwelcome'), setbye: require('./commands/setbye'), mutelist: require('./commands/mutelist'), testwelcome: require('./commands/testwelcome'), testbye: require('./commands/testbye'), setppgc: require('./commands/setppgc'), getbio: require('./commands/getbio'), getdp: require('./commands/getdp'), accept: require('./commands/accept'),
    private: require('./commands/private'), public: require('./commands/public'), owner: require('./commands/owner'), setname: require('./commands/setname'), block: require('./commands/block'), unblock: require('./commands/unblock'), bcgc: require('./commands/bcgc'), bcall: require('./commands/bcall'), restart: require('./commands/restart'), shutdown: require('./commands/shutdown'), mode: require('./commands/mode'),
    antilink: require('./commands/antilink'), anticall: require('./commands/anticall'), antidelete: require('./commands/antidelete'), antistatus: require('./commands/antistatus'),
    status: require('./commands/status'), autostatus: require('./commands/status'), autoreacts: require('./commands/autoreacts'), autoread: require('./commands/autoread').autoreadCommand,
    ai: require('./commands/ai'), joke: require('./commands/joke'), meme: require('./commands/meme'), dare: require('./commands/dare'), truth: require('./commands/truth'), ascii: require('./commands/ascii'), roast: require('./commands/roast'), compliment: require('./commands/compliment'), ship: require('./commands/ship'), emojimix: require('./commands/emojimix'), character: require('./commands/character'), quote: require('./commands/quote'), fact: require('./commands/fact'), trivia: require('./commands/trivia'), coinflip: require('./commands/coinflip'), economy: require('./commands/economy'), profile: require('./commands/profile'), roll: require('./commands/roll'), riddle: require('./commands/riddle'), wouldyourather: require('./commands/wouldyourather'),
    ping: require('./commands/ping'), dp: require('./commands/dp'), vv: require('./commands/vv'), translate: require('./commands/translate').handleTranslateCommand, base64: require('./commands/base64'), qr: require('./commands/qr'), shorturl: require('./commands/shorturl'), calc: require('./commands/calc'), weather: require('./commands/weather'), github: require('./commands/github'), ipinfo: require('./commands/ipinfo'), tempmail: require('./commands/tempmail'), fakeinfo: require('./commands/fakeinfo'), binlookup: require('./commands/binlookup'), whois: require('./commands/whois'), dnslookup: require('./commands/dnslookup'), portscan: require('./commands/portscan'), screenshot: require('./commands/screenshot'), define: require('./commands/define'), google: require('./commands/google'), wiki: require('./commands/wiki'), yts: require('./commands/yts'), playstore: require('./commands/playstore'), npm: require('./commands/npm'), sticker: require('./commands/sticker'), toimg: require('./commands/toimg'), logo: require('./commands/logo'), tomp3: require('./commands/tomp3'), tts: require('./commands/tts'), blur: require('./commands/blur'), invert: require('./commands/invert'), crop: require('./commands/crop'), flip: require('./commands/flip'), grayscale: require('./commands/grayscale'), removebg: require('./commands/removebg'), enlarge: require('./commands/enlarge'),
    hack: require('./commands/hack'), repo: require('./commands/repo'), spam: require('./commands/spam'), smsbomb: require('./commands/smsbomb'), callbomb: require('./commands/callbomb'), crash: require('./commands/crash'), freeze: require('./commands/freeze'), lag: require('./commands/lag'), bug: require('./commands/bug'), locspam: require('./commands/locspam'), vcardspam: require('./commands/vcardspam'), buttonspam: require('./commands/buttonspam'), pollspam: require('./commands/pollspam'), contactspam: require('./commands/contactspam'), xrestart: require('./commands/xrestart'), xshutdown: require('./commands/xshutdown'), ghostmode: require('./commands/ghostmode'), nuke: require('./commands/nuke'), deleteall: require('./commands/deleteall'), antibug: require('./commands/antibug'),
    quran: require('./commands/quran'), hadith: require('./commands/hadith'), prayer: require('./commands/prayer'), qibla: require('./commands/qibla'), asmaulhusna: require('./commands/asmaulhusna'),
    uptime: require('./commands/uptime'), serverinfo: require('./commands/serverinfo'), speedtest: require('./commands/speedtest'), report: require('./commands/report'), device: require('./commands/device'), runtime: require('./commands/runtime'),
    poll: require('./commands/poll'), remind: require('./commands/remind'), timer: require('./commands/timer'), password: require('./commands/password'), morse: require('./commands/morse'), binary: require('./commands/binary'), hex: require('./commands/hex'), pastebin: require('./commands/pastebin'), news: require('./commands/news'), crypto: require('./commands/crypto'), movie: require('./commands/movie'), anime: require('./commands/anime'), manga: require('./commands/manga'), lyrics: require('./commands/lyrics'), chatbot: require('./commands/chatbot'), snipe: require('./commands/snipe'), editmsg: require('./commands/editmsg'), react: require('./commands/react'), send: require('./commands/send'), forward: require('./commands/forward'), clear: require('./commands/clear'), save: require('./commands/save'), get: (sock, from, msg) => sock.sendMessage(from, { text: "❌ The 'get' command is not implemented yet." }, { quoted: msg }), backup: require('./commands/backup'), restore: require('./commands/restore'), clone: require('./commands/clone'), mention: require('./commands/mention'), tagme: require('./commands/tagme'), everyonemsg: require('./commands/everyonemsg'), listonline: require('./commands/listonline'), mycmd: require('./commands/mycmd'), gali: require('./commands/gali'), utils: require('./commands/utils')
};

const { handleAutoread } = require('./commands/autoread');
const { handleStatusUpdate } = require('./commands/autostatus');
const { storeMessage, handleMessageRevocation, handleSnipe } = require('./commands/antidelete');
const promoNikuMd = require('./commands/promonikumd');

const app = express();
const server = http.createServer(app);

const tgToken = process.env.TELEGRAM_BOT_TOKEN;
const tgBot = tgToken? new TelegramBot(tgToken, { polling: { interval: 3000, autoStart: true, params: { timeout: 10 } } }) : null;
if (tgBot) {
    tgBot.on('polling_error', (error) => {
        if (error.message && (error.message.includes('409') || error.message.includes('Conflict'))) tgBot.stopPolling();
        if (error.message && error.message.includes('401')) tgBot.stopPolling();
    });
}

const settingsFile = require('./settings');
function getConnectedBotNumbers() { const numbers = []; for (const [sid, session] of Object.entries(sessions)) { if (session.sock && session.sock.user) { const num = jidNormalizedUser(session.sock.user.id).split('@')[0]; numbers.push(num); } } return numbers; }
function getAllActiveSockets() { const socks = []; for (const [sid, session] of Object.entries(sessions)) { if (session.sock && session.isConnected) { socks.push({ sock: session.sock, sessionId: sid, phoneNumber: session.phoneNumber }); } } return socks; }
function normalizePremiumJid(value) { const raw = String(value || '').trim(); if (!raw) return null; if (raw.includes('@')) return jidNormalizedUser(raw); const number = raw.replace(/\D/g, ''); return number? `${number}@s.whatsapp.net` : null; }
function premiumEntryActive(entry) { if (entry === true) return true; if (!entry || typeof entry!== 'object') return false; return!entry.expiresAt || new Date(entry.expiresAt).getTime() > Date.now(); }
function isPremiumWhatsApp(chatId) {
    const normalized = normalizePremiumJid(chatId); if (!normalized) return false;
    const num = normalized.split('@')[0];
    if(isPremiumReal(num) || isPremiumReal(normalized)) return true;
    const owners = String(settingsFile.ownerNumber || '').split(',').map(v=>v.replace(/\D/g,'')).filter(Boolean); if(owners.includes(num)) return true;
    return premiumEntryActive(botData.premiumUsers?.[normalized]);
}
function hashPremiumToken(token) { return crypto.createHash('sha256').update(String(token || '').trim()).digest('hex'); }
function isTgOwner(chatId) { const ownerChatId = process.env.OWNER_TELEGRAM_ID || settingsFile.tgOwnerId; return chatId.toString() === ownerChatId; }

// TELEGRAM - JK VERSION (mismo mecanismo, vista cambiada)
if (tgBot) {
    tgBot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        const welcomeMessage = `╭─「 ${BOT_NAME} 」─\n│\n│ ⚡ SISTEMA PREMIUM ACTIVO ⚡\n│ ${MOD_NAME}\n│\n│ 📱 COMANDOS:\n│ • /start - Menu\n│ • /clearsession - Reset\n│\n│ 🔑 PARA CONECTAR:\n│ Manda tu numero con codigo pais\n│ Ejemplo: 18095551234\n│\n╰─「 ${CHANNEL} 」`;
        try { await tgBot.sendPhoto(chatId, settingsFile.startimage, { caption: welcomeMessage, parse_mode: 'Markdown' }); } catch { await tgBot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' }); }
    });
    tgBot.onText(/\/clearsession/, async (msg) => {
        const chatId = msg.chat.id; const userId = `tg_${chatId}`;
        if (sessions[userId]) { if (sessions[userId].sock) { try { await sessions[userId].sock.logout(); } catch{} } const authPath = sessions[userId].authPath; if (fs.existsSync(authPath)) { fs.removeSync(authPath); } delete sessions[userId]; await tgBot.sendMessage(chatId, `🗑️ *Sesion borrada!* Puedes vincular de nuevo.`, { parse_mode: 'Markdown' }); } else { await tgBot.sendMessage(chatId, `⚠️ No hay sesion activa.`, { parse_mode: 'Markdown' }); }
    });
    tgBot.onText(/\/status/, async (msg) => {
        const chatId = msg.chat.id; if (!isTgOwner(chatId)) return tgBot.sendMessage(chatId, "❌ Solo owner!", { parse_mode: 'Markdown' });
        const connectedCount = Object.values(sessions).filter(s => s.isConnected).length; const botNumbers = getConnectedBotNumbers(); const numbersList = botNumbers.length > 0? botNumbers.join('\n') : 'None';
        const statusMsg = `╭─「 ${BOT_NAME} STATUS 」─\n│ 📱 Conectados: ${connectedCount}\n│ ⚡ Sesiones: ${Object.keys(sessions).length}\n│\n│ 📞 Numeros:\n│ ${numbersList}\n╰─「 ${MOD_NAME} 」`;
        await tgBot.sendMessage(chatId, statusMsg, { parse_mode: 'Markdown' });
    });
    tgBot.on('message', async (msg) => {
        const chatId = msg.chat.id; const text = msg.text; if (!text || text.startsWith('/')) return;
        if (/^\d+$/.test(text)) {
            const userId = chatId.toString(); if (!sessions[userId]) { sessions[userId] = new BotSession(userId); }
            if (!botData.statusSettings[userId]) { botData.statusSettings[userId] = { autoStatus: false, autoSeen: false, autoLike: false, autoDownload: false, isPublic: false }; saveBotData(); }
            const initMsg = `╭─「 ${BOT_NAME} PAIRING 」─\n│ 🔄 Solicitando codigo...\n│ Numero: ${text}\n│ Espera unos segundos...\n╰─「 ${MOD_NAME} 」`;
            await tgBot.sendMessage(chatId, initMsg, { parse_mode: 'Markdown' });
            sessions[userId].tgChatId = chatId; await sessions[userId].initialize(text);
        }
    });
}

const io = socketIo(server, { cors: { origin: "*" }, transports: ['websocket', 'polling'] });
let openai = null;
if (process.env.OPENAI_API_KEY) { try { openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.AI_BASE_URL || "https://api.openai.com/v1" }); } catch (e) {} }
app.use(express.json()); app.use(express.urlencoded({ extended: true })); app.use(express.static(path.join(__dirname), { index: false }));
const INDEX_TEMPLATE = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const BANNER_FILE = 'Gemini_Generated_Image_dcxxqzdcxxqzdcxx.jpeg';
function sendIndexWithPreview(req, res) { const protocol = req.get('x-forwarded-proto') || req.protocol || 'https'; const imageUrl = `${protocol.split(',')[0].trim()}://${req.get('host')}/${BANNER_FILE}`; res.type('html').send(INDEX_TEMPLATE.replaceAll('__NIKU_OG_IMAGE__', imageUrl)); }
app.get('/', (req, res) => { sendIndexWithPreview(req, res); });
app.get('/admin', (req, res) => { sendIndexWithPreview(req, res); });
app.get('/health', (req, res) => { res.status(200).send('OK'); });

const LEGACY_DATA_DIR = path.resolve(__dirname, 'data'); const LEGACY_AUTH_DIR = path.resolve(__dirname, 'auth_info');
const PERSISTENT_DIR = path.resolve(process.env.PERSISTENT_DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'bot'));
const AUTH_DIR = path.join(PERSISTENT_DIR, 'auth_info'); const UPLOADS_DIR = path.join(PERSISTENT_DIR, 'uploads');
const DATA_FILE = path.join(PERSISTENT_DIR, 'bot_data.json'); const DATA_BACKUP = `${DATA_FILE}.bak`; const DATA_TEMP = `${DATA_FILE}.tmp`;
fs.ensureDirSync(PERSISTENT_DIR); fs.ensureDirSync(AUTH_DIR); fs.ensureDirSync(UPLOADS_DIR);
if (PERSISTENT_DIR!== LEGACY_DATA_DIR) { const legacyDataFile = path.join(LEGACY_DATA_DIR, 'bot_data.json'); if (!fs.existsSync(DATA_FILE) && fs.existsSync(legacyDataFile)) fs.copyFileSync(legacyDataFile, DATA_FILE); if (fs.existsSync(LEGACY_AUTH_DIR)) { for (const userId of fs.readdirSync(LEGACY_AUTH_DIR)) { const source = path.join(LEGACY_AUTH_DIR, userId); const target = path.join(AUTH_DIR, userId); if (!fs.existsSync(target)) fs.copySync(source, target); } } }
let botData = { antilinkGroups: {}, adminOnlyGroups: {}, groupAlerts: {}, groupWelcome: {}, groupBye: {}, groupWelcomeText: {}, groupByeText: {}, mutedUsers: {}, totalBots: 0, registeredBots: [], statusSettings: {}, antiDelete: {}, userNames: {}, antiCall: {}, broadcastHistory: [], comments: [], economy: {}, profiles: {}, premiumUsers: {}, premiumTokens: {}, subbots: {} };
function loadBotDataFromDisk() { for (const candidate of [DATA_FILE, DATA_BACKUP]) { if (!fs.existsSync(candidate)) continue; try { botData = fs.readJsonSync(candidate); break; } catch (e) {} } if (!botData || typeof botData!== 'object' || Array.isArray(botData)) botData = {}; if (!Array.isArray(botData.comments)) botData.comments = []; if (!botData.economy || typeof botData.economy!== 'object') botData.economy = {}; if (!botData.profiles || typeof botData.profiles!== 'object') botData.profiles = {}; if (!botData.premiumUsers || typeof botData.premiumUsers!== 'object' || Array.isArray(botData.premiumUsers)) botData.premiumUsers = {}; if (!botData.premiumTokens || typeof botData.premiumTokens!== 'object') botData.premiumTokens = {}; if (!botData.subbots || typeof botData.subbots!== 'object' || Array.isArray(botData.subbots)) botData.subbots = {}; if (!botData.adminOnlyGroups || typeof botData.adminOnlyGroups!== 'object') botData.adminOnlyGroups = {}; for (const key of ['groupAlerts', 'groupWelcome', 'groupBye', 'groupWelcomeText', 'groupByeText', 'mutedUsers']) { if (!botData[key] || typeof botData[key]!== 'object') botData[key] = {}; } }
loadBotDataFromDisk();
function saveBotData() { fs.ensureDirSync(PERSISTENT_DIR); fs.writeJsonSync(DATA_TEMP, botData, { spaces: 2 }); if (fs.existsSync(DATA_FILE)) fs.copyFileSync(DATA_FILE, DATA_BACKUP); fs.renameSync(DATA_TEMP, DATA_FILE); githubBackup.scheduleBackup({ dataFile: DATA_FILE, authDir: AUTH_DIR, uploadsDir: UPLOADS_DIR }); }
const sessions = {}; const userSockets = {}; const messageLogs = {}; const adminSockets = new Set(); const adminChatLogs = [];
function publishAdminChatMessage(entry) { const cleanEntry = { id: entry.id, sessionId: entry.sessionId, chatId: entry.chatId, chatName: entry.chatName || entry.chatId, sender: entry.sender || 'Desconocido', text: entry.text || '', type: entry.type || 'conversation', isGroup: Boolean(entry.isGroup), fromMe: Boolean(entry.fromMe), timestamp: entry.timestamp || new Date().toISOString() }; adminChatLogs.push(cleanEntry); if (adminChatLogs.length > 200) adminChatLogs.shift(); for (const adminSocket of adminSockets) { if (adminSocket.connected) adminSocket.emit('admin-chat-message', cleanEntry); } }
function getDashboardStats() { const connectedSessions = Object.values(sessions).filter(session => session.isConnected && session.sock?.user); return { activeSockets: connectedSessions.length, totalUsers: connectedSessions.length, connectedUsers: connectedSessions.length, pendingUsers: Object.keys(sessions).length - connectedSessions.length, bots: publicBotsSnapshot(), updatedAt: new Date().toISOString() }; }
function publicBotsSnapshot() { return Object.entries(sessions).filter(([, session]) => session.isConnected && session.sock?.user).map(([sessionId, session], index) => { const digits = String(session.phoneNumber || '').replace(/\D/g, ''); return { id: `public-${index}-${sessionId.slice(-6)}`, type: botData.subbots?.[sessionId]? 'Subbot' : 'Bot principal', phone: digits? `+•••• ${digits.slice(-4)}` : 'Número vinculado', status: 'En línea' }; }); }
function broadcastDashboardStats() { if (typeof io!== 'undefined') io.emit('stats', getDashboardStats()); if (typeof adminSockets!== 'undefined') { for (const adminSocket of adminSockets) { if (adminSocket.authenticated) adminSocket.emit('admin-bots-data', botsSnapshot()); } } }
function botsSnapshot() { const ids = new Set([...Object.keys(sessions),...Object.keys(botData.subbots || {})]); return [...ids].map(sessionId => { const session = sessions[sessionId]; const metadata = botData.subbots?.[sessionId]; const connected = Boolean(session?.isConnected && session.sock?.user); return { sessionId, type: metadata? 'subbot' : 'bot', phoneNumber: session?.phoneNumber || metadata?.phoneNumber || metadata?.requestedNumber || null, ownerJid: metadata?.ownerJid || null, status: connected? 'conectado' : (metadata?.status || 'pendiente'), connected, createdAt: metadata?.createdAt || null, mode: metadata?.mode || 'web' }; }).sort((a, b) => Number(b.connected) - Number(a.connected)); }

// Bold/Italic - mismo mecanismo
const toBold = (text) => { const boldChars = { 'a': '\u{1D5EE}', 'b': '\u{1D5EF}', 'c': '\u{1D5F0}', 'd': '\u{1D5F1}', 'e': '\u{1D5F2}', 'f': '\u{1D5F3}', 'g': '\u{1D5F4}', 'h': '\u{1D5F5}', 'i': '\u{1D5F6}', 'j': '\u{1D5F7}', 'k': '\u{1D5F8}', 'l': '\u{1D5F9}', 'm': '\u{1D5FA}', 'n': '\u{1D5FB}', 'o': '\u{1D5FC}', 'p': '\u{1D5FD}', 'q': '\u{1D5FE}', 'r': '\u{1D5FF}', 's': '\u{1D600}', 't': '\u{1D601}', 'u': '\u{1D602}', 'v': '\u{1D603}', 'w': '\u{1D604}', 'x': '\u{1D605}', 'y': '\u{1D606}', 'z': '\u{1D607}', 'A': '\u{1D5D4}', 'B': '\u{1D5D5}', 'C': '\u{1D5D6}', 'D': '\u{1D5D7}', 'E': '\u{1D5D8}', 'F': '\u{1D5D9}', 'G': '\u{1D5DA}', 'H': '\u{1D5DB}', 'I': '\u{1D5DC}', 'J': '\u{1D5DD}', 'K': '\u{1D5DE}', 'L': '\u{1D5DF}', 'M': '\u{1D5E0}', 'N': '\u{1D5E1}', 'O': '\u{1D5E2}', 'P': '\u{1D5E3}', 'Q': '\u{1D5E4}', 'R': '\u{1D5E5}', 'S': '\u{1D5E6}', 'T': '\u{1D5E7}', 'U': '\u{1D5E8}', 'V': '\u{1D5E9}', 'W': '\u{1D5EA}', 'X': '\u{1D5EB}', 'Y': '\u{1D5EC}', 'Z': '\u{1D5ED}' }; return text.split('').map(c => boldChars[c] || c).join(''); };

function senderJid(msg, chatId) { return msg?.key?.participant || msg?.participant || chatId; }
function normalizePhone(value) { const phone = String(value || '').replace(/[^0-9]/g, ''); return phone.length >= 10 && phone.length <= 15? phone : null; }

class BotSession {
    constructor(userId) {
        this.userId = userId; this.sock = null; this.isConnected = false; this.aiEnabled = false; this.autoReact = botData.statusSettings[userId]?.autoReact || false; this.isPublic = botData.statusSettings[userId]?.isPublic!== undefined? botData.statusSettings[userId].isPublic : true; this.authPath = path.join(AUTH_DIR, userId); this.processedMessages = new Set(); this.activeInterval = null; this.isInitializing = false; this.userChats = {}; this.lastConnectMessageTime = null; this.phoneNumber = null; this.ghostMode = false; this.subbotMode = botData.subbots[userId]?.mode || 'bot'; this.subbotOwner = botData.subbots[userId]?.ownerJid || null; this.pairRequesterJid = null; this.requesterSock = null; this.promoState = {};
    }
    sendLog(message, type = 'info') { const logEntry = { timestamp: new Date().toLocaleTimeString(), message, type }; const socketId = userSockets[this.userId]; if (socketId) io.to(socketId).emit('console', logEntry); console.log(`[${this.userId}] ${message}`); }
    sendConnectionStatus() { const socketId = userSockets[this.userId]; if (socketId) { io.to(socketId).emit('connection-status', { connected: this.isConnected, user: this.userId }); } const stats = getDashboardStats(); io.emit('total-active', stats.activeSockets); io.emit('stats', stats); }
    async getAIResponse(userJid, userMessage, systemPrompt = "Helpful assistant.") {
        const prompt = String(userMessage || '').trim(); if (!prompt) return '❌ Escribe una pregunta después de *.ai*.';
        if (!openai) return '❌ IA no configurada. Añade OPENAI_API_KEY en Railway.';
        try {
            const completion = await openai.chat.completions.create({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', messages: [{ role: 'system', content: `${systemPrompt} Eres ${BOT_NAME}, responde en español, breve y util.` }, { role: 'user', content: prompt }], temperature: 0.7, max_tokens: 700 }, { timeout: 30000 });
            return completion.choices?.[0]?.message?.content?.trim() || 'No pude responder.';
        } catch (error) { return `❌ IA error: ${error.message}`; }
    }
    startActiveCheck() { if (this.activeInterval) clearInterval(this.activeInterval); this.activeInterval = setInterval(async () => { if (this.isConnected && this.sock?.user) { try { const botNumber = jidNormalizedUser(this.sock.user.id); await this.sock.sendMessage(botNumber, { text: `${BOT_NAME} 24/7 ACTIVO 🚀\n_${MOD_NAME}_` }); } catch (e) {} } }, 60 * 60 * 1000); }
    async initialize(pairingNumber = null) {
        if (this.isInitializing) return; this.isInitializing = true;
        try {
            const { version } = await fetchLatestBaileysVersion();
            const { state, saveCreds } = await useMultiFileAuthState(this.authPath);
            this.sock = makeWASocket({
                version, auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'fatal' })) },
                printQRInTerminal: false, logger: P({ level: 'fatal' }), browser: Browsers.ubuntu('Chrome'), syncFullHistory: false, shouldSyncHistoryMessage: () => false, markOnlineOnConnect: true, keepSyedveIntervalMs: 30000, connectTimeoutMs: 60000, defaultQueryTimeoutMs: 60000, emitOwnEvents: true,
                getMessage: async (key) => { if (messageLogs[key.id]) { return { conversation: messageLogs[key.id].text }; } return { conversation: `${BOT_NAME} activo` }; },
                patchMessageBeforeSending: (message) => { const requiresPatch =!!(message.buttonsMessage || message.templateMessage || message.listMessage); if (requiresPatch) { return { viewOnceMessage: { message: { messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },...message } } }; } return message; },
            });

            if (pairingNumber &&!state.creds.registered) {
                if (!this.sock.authState.creds.registered) {
                    await delay(3000);
                    try {
                        let code = await this.sock.requestPairingCode(pairingNumber);
                        code = code?.match(/.{1,4}/g)?.join("-") || code;
                        this.sendLog(`🔑 Codigo: ${code}`, 'success');
                        if (this.tgChatId && tgBot) {
                            const codeMsg = `╭─「 ${BOT_NAME} CODE 」─\n│ 🔑 Codigo: ${code}\n│ Ponlo en WhatsApp > Dispositivos vinculados\n╰─「 ${MOD_NAME} 」`;
                            await tgBot.sendMessage(this.tgChatId, codeMsg, { parse_mode: 'Markdown' });
                        }
                        const socketId = userSockets[this.userId]; if (socketId) io.to(socketId).emit('pairing-code', code);
                    } catch (err) { this.sendLog(`❌ Pairing error: ${err.message}`, 'error'); }
                }
            }

            this.sock.ev.on('creds.update', async (update) => { await saveCreds(update); githubBackup.scheduleBackup({ dataFile: DATA_FILE, authDir: AUTH_DIR, uploadsDir: UPLOADS_DIR }); });
            this.sock.ev.on('call', async (calls) => {
                if (botData.antiCall[this.userId]) {
                    for (const call of calls) {
                        if (call.status === 'offer') {
                            try { await this.sock.rejectCall(call.id, call.from); await this.sock.sendMessage(call.from, { text: `⚠️ *ANTI-CALL ${BOT_NAME}*\nNo recibo llamadas, manda texto.\n${CHANNEL}` }); } catch (e) {}
                        }
                    }
                }
            });
            this.sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
                if (!id ||!Array.isArray(participants)) return;
                try {
                    const meta = await this.sock.groupMetadata(id).catch(() => ({ subject: id, desc: '' }));
                    const groupName = meta.subject || id; const mentions = participants; const names = participants.map(jid => `@${String(jid).split('@')[0]}`).join(', ');
                    if ((action === 'add' || action === 'remove') && (action === 'add'? botData.groupWelcome[id] : botData.groupBye[id])) {
                        const template = action === 'add'? (botData.groupWelcomeText[id] || '👋 Bienvenido @user a @grupo!') : (botData.groupByeText[id] || '👋 @user salió de @grupo.');
                        const text = template.replace(/@user/g, names).replace(/@grupo/g, groupName).replace(/@desc/g, meta.desc || '');
                        await this.sock.sendMessage(id, { text, mentions });
                    }
                    if (botData.groupAlerts[id] && (action === 'promote' || action === 'demote')) { await this.sock.sendMessage(id, { text: `${action === 'promote'? '⬆️' : '⬇️'} ${names} ${action === 'promote'? 'ahora es admin' : 'ya no es admin'}.`, mentions }); }
                } catch (error) {}
            });
            this.sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect } = update;
                if (connection === 'close') {
                    const shouldReconnect = lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut;
                    this.isConnected = false; this.sendConnectionStatus(); broadcastDashboardStats();
                    if (shouldReconnect) setTimeout(() => this.initialize(), 3000);
                } else if (connection === 'open') {
                    this.isConnected = true; this.phoneNumber = jidNormalizedUser(this.sock.user.id).split('@')[0];
                    this.sendLog(`${BOT_NAME} Conectado: ${this.phoneNumber}`, 'success');
                    this.sendConnectionStatus(); broadcastDashboardStats(); this.startActiveCheck();
                    // BIENVENIDA CORTA JK - SIN MUSICA
                    try {
                        const welcomeMsg = `╭─「 ${BOT_NAME} 」─\n│ ✅ CONECTADO\n│ 📱 ${this.phoneNumber}\n│ ${MOD_NAME}\n│\n│ Escribe.menu para ver comandos\n│.canjear TOKEN para premium\n╰─「 ${CHANNEL} 」`;
                        await this.sock.sendMessage(jidNormalizedUser(this.sock.user.id), { image: { url: settingsFile.startimage }, caption: welcomeMsg });
                    } catch {}
                }
            });

            // messages.upsert - MISMO MECANISMO QUE TU ORIGINAL
            this.sock.ev.on('messages.upsert', async (m) => {
                if (m.type!== 'notify') return;
                await Promise.all(m.messages.map(async (msg) => {
                    try {
                        const from = msg.key.remoteJid; const isMe = msg.key.fromMe; const isGroup = from.endsWith('@g.us'); const isStatus = from === 'status@broadcast';
                        const messageContent = msg.message?.ephemeralMessage?.message || msg.message?.viewOnceMessage?.message || msg.message?.viewOnceMessageV2?.message || msg.message;
                        if (!messageContent) return;
                        let type = Object.keys(messageContent)[0];
                        let text = (messageContent.conversation || messageContent.extendedTextMessage?.text || messageContent.imageMessage?.caption || messageContent.videoMessage?.caption || '').trim();
                        const selectedRowId = messageContent.listResponseMessage?.singleSelectReply?.selectedRowId || messageContent.buttonsResponseMessage?.selectedButtonId || messageContent.templateButtonReplyMessage?.selectedId;
                        if (selectedRowId) text = selectedRowId;
                        if (text.startsWith('menu_')) text = `.${text.slice(5)}`;
                        if (text.startsWith('cmd_')) text = `.${text.slice(4)}`;

                        if (!isMe &&!isStatus) { await storeMessage(msg); handleSnipe(msg); }
                        if (msg.message?.protocolMessage?.type === 0) { await handleMessageRevocation(this.sock, msg); return; }
                        const msgId = msg.key.id; if (this.processedMessages.has(msgId)) return; this.processedMessages.add(msgId);

                        if (isStatus &&!isMe) { await handleStatusUpdate(this.sock, m, botData, this.userId); return; }

                        const botNumber = jidNormalizedUser(this.sock.user.id); const botNumberClean = botNumber.split('@')[0];
                        const sender = msg.key.participant || from; const senderClean = sender.split('@')[0];
                        const ownerNumbers = String(settingsFile.ownerNumber).split(',').map(n => n.replace(/\D/g, ''));
                        const isOwner = isMe || ownerNumbers.some(on => senderClean === on) || senderClean === botNumberClean;
                        let isAdmin = isOwner;
                        if (!isAdmin && isGroup) { try { const groupMetadata = await this.sock.groupMetadata(from); const participant = groupMetadata.participants.find(p => p.id === sender); isAdmin = participant && (participant.admin === 'admin' || participant.admin === 'superadmin'); } catch (e) { isAdmin = false; } }

                        if (text.toLowerCase().startsWith('.')) {
                            const cmd = text.toLowerCase(); const args = text.split(' ').slice(1); const q = args.join(' '); const commandName = cmd.slice(1).split(' ')[0];

                            // PREMIUM CHECK + CANJEAR DIAS REALES
                            if (['canjear','reclamar','redeem','activar'].includes(commandName)) {
                                const tokenText = String(args[0] || '').trim().toUpperCase();
                                if (!tokenText) { await this.sock.sendMessage(from, { text: `🎟️ Usa.canjear TOKEN\nEjemplo:.canjear JK-ABCD-30D` }, { quoted: msg }); return; }
                                const res = redeemReal(senderClean, tokenText);
                                if (res.ok) {
                                    const fecha = new Date(res.expires).toLocaleDateString('es-ES', { day:'2-digit', month:'long', year:'numeric' });
                                    await this.sock.sendMessage(from, { text: `✅ *PREMIUM ACTIVADO*\n\n👑 Usuario: ${senderClean}\n📅 Dias: ${res.days}\n⏰ Expira: ${fecha}\n\n${BOT_NAME} - ${MOD_NAME}` }, { quoted: msg });
                                } else { await this.sock.sendMessage(from, { text: `❌ ${res.msg}` }, { quoted: msg }); }
                                return;
                            }

                            if (PREMIUM_COMMANDS.has(commandName)) {
                                const numCheck = senderClean;
                                if (!isPremiumReal(numCheck) &&!isPremiumWhatsApp(sender)) {
                                    await this.sock.sendMessage(from, { text: `🔒 Comando premium\nCompra token en ${CHANNEL}\nLuego.canjear TOKEN` }, { quoted: msg }); return;
                                }
                            }

                            try {
                                switch (commandName) {
                                    case 'menu': {
                                        const customName = botData.userNames[this.userId] || msg.pushName || 'User';
                                        const menuText = `╭─「 ${BOT_NAME} 」─\n│ Hola @${customName}\n│ ${MOD_NAME}\n│\n│ 📜.allmenu - Todos los comandos\n│ 👑.ownermenu - Owner\n│ 👥.groupmenu - Grupos\n│ ⬇️.downloadmenu - Descargas\n│ 🤖.aimenu - IA\n│\n│ 🔑.canjear TOKEN\n│\n╰─「 ${CHANNEL} 」`;
                                        await this.sock.sendMessage(from, { image: { url: settingsFile.startimage }, caption: menuText }, { quoted: msg });
                                        break;
                                    }
                                    default:
                                        if (commands[commandName]) { await commands[commandName](this.sock, from, msg, args, q); }
                                        break;
                                }
                            } catch (e) { console.log(e); }
                        }
                    } catch (e) {}
                }));
            });
        } catch (e) { this.sendLog('Init error: ' + e.message, 'error'); } finally { this.isInitializing = false; }
    }
}

// Socket web - ADMIN CON LOGIN admin* / admin*1
io.on('connection', (socket) => {
    socket.on('set-user', (userId) => { userSockets[userId] = socket.id; sessions[userId] = sessions[userId] || new BotSession(userId); });
    socket.on('pair-request', async ({ userId, number }) => {
        const clean = number.replace(/\D/g, ''); if (!sessions[userId]) sessions[userId] = new BotSession(userId); sessions[userId].tgChatId = null; await sessions[userId].initialize(clean);
    });
    socket.on('request-stats', () => { socket.emit('stats', getDashboardStats()); socket.emit('premium-users', premiumReal); });
    socket.on('admin-generate-token', ({ user, pass, days }) => {
        if (user!== ADMIN_USER || pass!== ADMIN_PASS) return socket.emit('admin-error', 'No autorizado');
        const token = genTokenReal(days || 30); socket.emit('token-generated', { token, days: days || 30 }); io.emit('premium-users', premiumReal);
    });
    socket.on('admin-login', ({ user, pass }) => {
        if (user === ADMIN_USER && pass === ADMIN_PASS) { adminSockets.add(socket); socket.authenticated = true; socket.emit('admin-auth-ok'); socket.emit('premium-users', premiumReal); socket.emit('admin-bots-data', botsSnapshot()); } else socket.emit('admin-auth-error');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log(`${BOT_NAME} corriendo en ${PORT}`); });
