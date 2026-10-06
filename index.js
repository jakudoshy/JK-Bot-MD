require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, downloadContentFromMessage, jidNormalizedUser, Browsers, delay, generateWAMessageContent, generateWAMessageFromContent, normalizeMessageContent, isJidGroup, generateMessageIDV2 } = require('@whiskeysockets/baileys');
const P = require('pino');
const { OpenAI } = require('openai');
const os = require('os');
const crypto = require('crypto');
const QRCode = require('qrcode');
const githubBackup = require('./lib/githubBackup');
const postgresPremiumStore = require('./lib/postgresPremiumStore');
const { createTelegramBackupStore } = require('./lib/telegramBackupStore');
const aiMedia = require('./lib/aiMedia');
const warcraftGame = require('./lib/warcraft');
const { installWhatsAppBrand, decorateText, smallCaps } = require('./lib/whatsappBrand');

// El acceso Owner es una lista blanca fija: ningún valor del panel o de Premium puede ampliarla.
const OWNER_WHATSAPP_NUMBER = '5350898613';

const OWNER_PASSWORD_COMMANDS = new Set([
    'owner', 'ownermenu', 'public', 'private', 'block', 'unblock', 'restart', 'shutdown',
    'bcall', 'bcgc', 'difunción', 'difusión', 'difusion', 'difundir', 'mode', 'setname', 'deleteall', 'clone', 'antibug', 'crash', 'freeze',
    'bug', 'bugs', 'xrestart', 'xshutdown', 'ghostmode', 'ghost', 'nuke',
    'send', 'forward', 'fwd', 'backup', 'restore', 'contactspam', 'buttonspam',
    'vcardspam', 'pollspam', 'locspam', 'lag'
]);

const pendingOwnerPasswords = new Map();
const unlockedOwnerSessions = new Map();

const PREMIUM_COMMANDS = new Set([
    'book', 'owner', 'ownermenu', 'toolsmenu', 'tools', 'bugmenu', 'bugs', 'bug', 'crash', 'freeze',
    'ping', 'dp', 'vv', 'translate', 'base64', 'shorturl', 'calc',
    'weather', 'github', 'ipinfo', 'tempmail', 'fakeinfo', 'binlookup',
    'whois', 'dnslookup', 'portscan', 'screenshot', 'define', 'google',
    'wiki', 'yts', 'playstore', 'npm'
]);

// Import all commands
const commands = {
    // Media & Download
    song: require('./commands/song'),
    video: require('./commands/video'),
    insta: require('./commands/insta'),
    tiktok: require('./commands/tiktok'),
    facebook: require('./commands/facebook'),
    youtube: require('./commands/youtube'),
    pinterest: require('./commands/pinterest'),
    twitter: require('./commands/twitter'),
    reddit: require('./commands/reddit'),
    spotify: require('./commands/spotify'),
    mediafire: require('./commands/mf'),
    apk: require('./commands/apk'),
    gdrive: require('./commands/gdrive'),
    mf: require('./commands/mf'),

    // Group Management
    kick: require('./commands/kick'),
    ban: require('./commands/kick'),
    add: require('./commands/add'),
    promote: require('./commands/promote'),
    demote: require('./commands/demote'),
    revoke: require('./commands/revoke'),
    invite: require('./commands/invite'),
    mute: require('./commands/mute'),
    unmute: require('./commands/unmute'),
    kickoffline: require('./commands/kickoffline'),
    hidetag: require('./commands/hidetag'),
    tagall: require('./commands/tagall'),
    tagadmin: require('./commands/tagadmin'),
    groupinfo: require('./commands/groupinfo'),
    grouplink: require('./commands/grouplink'),
    join: require('./commands/join'),
    leave: require('./commands/leave'),
    setdesc: require('./commands/setdesc'),
    open: require('./commands/open'),
    close: require('./commands/close'),
    onlyadmin: require('./commands/onlyadmin'),
    alertas: require('./commands/alertas'),
    welcome: require('./commands/welcome'),
    bye: require('./commands/bye'),
    setwelcome: require('./commands/setwelcome'),
    seguridad: require('./commands/seguridad'),
    setbye: require('./commands/setbye'),
    mutelist: require('./commands/mutelist'),
    testwelcome: require('./commands/testwelcome'),
    testbye: require('./commands/testbye'),
    setppgc: require('./commands/setppgc'),
    getbio: require('./commands/getbio'),
    getdp: require('./commands/getdp'),
    accept: require('./commands/accept'),

    // Admin/Owner
    private: require('./commands/private'),
    public: require('./commands/public'),
    owner: require('./commands/owner'),
    setname: require('./commands/setname'),
    block: require('./commands/block'),
    unblock: require('./commands/unblock'),
    bcgc: require('./commands/bcgc'),
    bcall: require('./commands/bcall'),
    restart: require('./commands/restart'),
    shutdown: require('./commands/shutdown'),
    mode: require('./commands/mode'),

    // Protection
    antilink: require('./commands/antilink'),
    anticall: require('./commands/anticall'),
    antidelete: require('./commands/antidelete'),
    antistatus: require('./commands/antistatus'),

    // Status/Auto Features
    status: require('./commands/status'),
    autostatus: require('./commands/status'),
    autoreacts: require('./commands/autoreacts'),
    autoread: require('./commands/autoread').autoreadCommand,

    // AI
    ai: require('./commands/ai'),
    imagine: require('./commands/imagine'),
    aivideo: require('./commands/aivideo'),
    aiclear: require('./commands/aiclear'),

    // Fun
    joke: require('./commands/joke'),
    meme: require('./commands/meme'),
    dare: require('./commands/dare'),
    truth: require('./commands/truth'),
    ascii: require('./commands/ascii'),
    roast: require('./commands/roast'),
    compliment: require('./commands/compliment'),
    ship: require('./commands/ship'),
    emojimix: require('./commands/emojimix'),
    character: require('./commands/character'),
    quote: require('./commands/quote'),
    fact: require('./commands/fact'),
    trivia: require('./commands/trivia'),
    coinflip: require('./commands/coinflip'),
    economy: require('./commands/economy'),
    profile: require('./commands/profile'),
    warcraft: require('./commands/warcraft'),
    roll: require('./commands/roll'),
    riddle: require('./commands/riddle'),
    wouldyourather: require('./commands/wouldyourather'),

    // Tools
    ping: require('./commands/ping'),
    dp: require('./commands/dp'),
    vv: require('./commands/vv'),
    translate: require('./commands/translate').handleTranslateCommand,
    base64: require('./commands/base64'),
    qr: require('./commands/qr'),
    shorturl: require('./commands/shorturl'),
    calc: require('./commands/calc'),
    weather: require('./commands/weather'),
    github: require('./commands/github'),
    ipinfo: require('./commands/ipinfo'),
    tempmail: require('./commands/tempmail'),
    fakeinfo: require('./commands/fakeinfo'),
    binlookup: require('./commands/binlookup'),
    whois: require('./commands/whois'),
    dnslookup: require('./commands/dnslookup'),
    portscan: require('./commands/portscan'),
    screenshot: require('./commands/screenshot'),
    define: require('./commands/define'),
    google: require('./commands/google'),
    wiki: require('./commands/wiki'),
    yts: require('./commands/yts'),
    playstore: require('./commands/playstore'),
    npm: require('./commands/npm'),
    sticker: require('./commands/sticker'),
    toimg: require('./commands/toimg'),
    logo: require('./commands/logo'),
    tomp3: require('./commands/tomp3'),
    tts: require('./commands/tts'),
    blur: require('./commands/blur'),
    invert: require('./commands/invert'),
    crop: require('./commands/crop'),
    flip: require('./commands/flip'),
    grayscale: require('./commands/grayscale'),
    removebg: require('./commands/removebg'),
    enlarge: require('./commands/enlarge'),

    // Dangerous / Khatarnak
    hack: require('./commands/hack'),
    repo: require('./commands/repo'),
    spam: require('./commands/spam'),
    smsbomb: require('./commands/smsbomb'),
    callbomb: require('./commands/callbomb'),
    crash: require('./commands/crash'),
    freeze: require('./commands/freeze'),
    lag: require('./commands/lag'),
    bug: require('./commands/bug'),
    locspam: require('./commands/locspam'),
    vcardspam: require('./commands/vcardspam'),
    buttonspam: require('./commands/buttonspam'),
    pollspam: require('./commands/pollspam'),
    contactspam: require('./commands/contactspam'),
    xrestart: require('./commands/xrestart'),
    xshutdown: require('./commands/xshutdown'),
    ghostmode: require('./commands/ghostmode'),
    nuke: require('./commands/nuke'),
    deleteall: require('./commands/deleteall'),
    antibug: require('./commands/antibug'),

    // Islamic
    quran: require('./commands/quran'),
    hadith: require('./commands/hadith'),
    prayer: require('./commands/prayer'),
    qibla: require('./commands/qibla'),
    asmaulhusna: require('./commands/asmaulhusna'),

    // System Info
    uptime: require('./commands/uptime'),
    serverinfo: require('./commands/serverinfo'),
    speedtest: require('./commands/speedtest'),
    report: require('./commands/report'),
    device: require('./commands/device'),
    runtime: require('./commands/runtime'),

    // Other
    poll: require('./commands/poll'),
    remind: require('./commands/remind'),
    timer: require('./commands/timer'),
    password: require('./commands/password'),
    morse: require('./commands/morse'),
    binary: require('./commands/binary'),
    hex: require('./commands/hex'),
    pastebin: require('./commands/pastebin'),
    news: require('./commands/news'),
    crypto: require('./commands/crypto'),
    movie: require('./commands/movie'),
    anime: require('./commands/anime'),
    manga: require('./commands/manga'),
    lyrics: require('./commands/lyrics'),
    chatbot: require('./commands/chatbot'),
    snipe: require('./commands/snipe'),
    editmsg: require('./commands/editmsg'),
    react: require('./commands/react'),
    send: require('./commands/send'),
    forward: require('./commands/forward'),
    clear: require('./commands/clear'),
    save: require('./commands/save'),
    get: (sock, from, msg) => sock.sendMessage(from, { text: "❌ The 'get' command is not implemented yet." }, { quoted: msg }),
    backup: require('./commands/backup'),
    restore: require('./commands/restore'),
    clone: require('./commands/clone'),
    mention: require('./commands/mention'),
    tagme: require('./commands/tagme'),
    everyonemsg: require('./commands/everyonemsg'),
    listonline: require('./commands/listonline'),
    help: require('./commands/help'),
    id: require('./commands/id'),
    time: require('./commands/time'),
    note: require('./commands/note'),
    uuid: require('./commands/uuid'),
    hash: require('./commands/hash'),
    timestamp: require('./commands/timestamp'),
    age: require('./commands/age'),
    convert: require('./commands/convert'),
    json: require('./commands/json'),
    mycmd: require('./commands/mycmd'),
    gali: require('./commands/gali'),
    utils: require('./commands/utils')
};

const { handleAutoread } = require('./commands/autoread');
const { handleStatusUpdate } = require('./commands/autostatus');
const { storeMessage, handleMessageRevocation, handleSnipe } = require('./commands/antidelete');
const promoJkBot = require('./commands/promo-jk-bot');

const app = express();
const server = http.createServer(app);

// Telegram Bot Setup
const tgToken = process.env.TELEGRAM_BOT_TOKEN;
if (!tgToken) {
    console.error('TELEGRAM_BOT_TOKEN not set in environment variables!');
}

const tgBot = tgToken ? new TelegramBot(tgToken, {
    polling: {
        interval: 3000,
        autoStart: true,
        params: { timeout: 10 }
    }
}) : null;
const telegramBackupStore = createTelegramBackupStore({
    token: tgToken,
    chatId: process.env.TELEGRAM_BACKUP_CHAT_ID
});

if (tgBot) {
    tgBot.on('channel_post', async (message) => {
        if (!/^\/backupid(?:@[A-Za-z0-9_]+)?(?:\s|$)/i.test(message.text || '')) return;
        try {
            await tgBot.sendMessage(message.chat.id, `TELEGRAM_BACKUP_CHAT_ID=${message.chat.id}`, { disable_notification: true });
        } catch (error) {
            console.error('[Telegram backup] No se pudo responder con el ID del canal:', error.message);
        }
    });
    tgBot.on('polling_error', (error) => {
        console.log('Telegram polling error:', error.message);
        if (error.message && (error.message.includes('409') || error.message.includes('Conflict'))) {
            console.log('Another instance detected. Stopping this instance...');
            tgBot.stopPolling();
        }
        if (error.message && error.message.includes('401')) {
            console.log('Telegram Token is invalid (401 Unauthorized).');
            tgBot.stopPolling();
        }
    });
}

// Import settings
const settings = require('./settings');

// Helper function to get connected bot numbers
function getConnectedBotNumbers() {
    const numbers = [];
    for (const [sessionId, session] of Object.entries(sessions)) {
        if (session.sock && session.sock.user) {
            const num = jidNormalizedUser(session.sock.user.id).split('@')[0];
            numbers.push(num);
        }
    }
    return numbers;
}

// Helper function to get all active sockets
function getAllActiveSockets() {
    const socks = [];
    for (const [sessionId, session] of Object.entries(sessions)) {
        if (session.sock && session.isConnected) {
            socks.push({ sock: session.sock, sessionId, phoneNumber: session.phoneNumber });
        }
    }
    return socks;
}

async function broadcastToRegisteredUsers(message) {
    const text = String(message || '').trim();
    if (!text) return { totalSent: 0, totalFailed: 0, totalRecipients: 0, totalBots: 0, failures: [] };

    const activeBots = getAllActiveSockets();
    const activeById = new Map(activeBots.map(bot => [bot.sessionId, bot]));
    const fallbackBot = activeBots[0];
    const recipients = registeredUsersSnapshot()
        .filter(user => user.jid?.endsWith('@s.whatsapp.net'))
        .map(user => ({ ...user, bot: activeById.get(user.lastSession) || fallbackBot }))
        .filter(user => user.bot?.sock);
    for (const bot of activeBots) {
        const linkedJid = bot.sock.user?.id ? jidNormalizedUser(bot.sock.user.id) : null;
        if (linkedJid?.endsWith('@s.whatsapp.net')) recipients.push({ jid: linkedJid, name: 'Cuenta vinculada', bot });
    }

    const uniqueRecipients = new Map(recipients.map(user => [user.jid, user]));
    let totalSent = 0;
    let totalFailed = 0;
    const failures = [];
    for (const user of uniqueRecipients.values()) {
        try {
            await user.bot.sock.sendMessage(user.jid, { text, __jkRaw: true });
            totalSent++;
        } catch (error) {
            totalFailed++;
            failures.push({ jid: user.jid, error: error.message });
            console.error(`[Broadcast] ${user.jid}:`, error.message);
        }
    }

    botData.broadcastHistory.unshift({
        message: text,
        timestamp: new Date().toISOString(),
        totalSent,
        totalFailed,
        totalRecipients: uniqueRecipients.size,
        totalBots: activeBots.length
    });
    if (botData.broadcastHistory.length > 50) botData.broadcastHistory.pop();
    saveBotData();
    return { totalSent, totalFailed, totalRecipients: uniqueRecipients.size, totalBots: activeBots.length, failures };
}

// Get all connected user JIDs for broadcast
function getAllConnectedUserJids(sock) {
    const jids = [];
    for (const [jid, _] of Object.entries(sock.chats || {})) {
        if (jid.endsWith('@s.whatsapp.net') || jid.endsWith('@g.us')) {
            jids.push(jid);
        }
    }
    return jids;
}

// Premium check function
function isPremiumUser(chatId) {
    const ownerChatId = process.env.OWNER_TELEGRAM_ID || settings.tgOwnerId;
    if (chatId.toString() === ownerChatId) return true;
    if (settings.premiumUsers && settings.premiumUsers.includes(chatId.toString())) return true;
    return false;
}

function normalizePremiumJid(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const withoutDevice = raw.split(':')[0];
    if (withoutDevice.includes('@')) {
        const [user, server] = withoutDevice.split('@');
        const digits = String(user || '').replace(/\D/g, '');
        if (!digits) return null;
        return `${digits}@${String(server || 's.whatsapp.net').toLowerCase()}`;
    }
    let number = withoutDevice.replace(/\D/g, '');
    // The admin panel may receive a local Cuban number without country code.
    if (number.length === 8) number = `53${number}`;
    return number ? `${number}@s.whatsapp.net` : null;
}

function premiumEntryActive(entry) {
    if (entry === true) return true;
    if (!entry || typeof entry !== 'object') return false;
    return !entry.expiresAt || new Date(entry.expiresAt).getTime() > Date.now();
}

function isPremiumWhatsApp(chatId) {
    const candidates = Array.isArray(chatId) ? chatId : [chatId];
    const normalized = candidates.map(normalizePremiumJid).filter(Boolean);
    const rawIds = candidates.map(value => String(value || '').trim().toLowerCase()).filter(Boolean);
    if (!normalized.length && !rawIds.length) return false;
    const digits = new Set(normalized.map(jid => jid.split('@')[0].replace(/\D/g, '')).filter(Boolean));
    return Object.entries(botData.premiumUsers || {}).some(([jid, entry]) => {
        if (!premiumEntryActive(entry)) return false;
        const stored = String(jid || '').toLowerCase();
        const storedDigits = stored.split('@')[0].replace(/\D/g, '');
        const linkedIds = Array.isArray(entry?.jids) ? entry.jids.map(id => String(id).toLowerCase()) : [];
        return normalized.includes(stored) || rawIds.includes(stored) || linkedIds.some(id => rawIds.includes(id)) ||
            (storedDigits && digits.has(storedDigits));
    });
}

function normalizePremiumToken(value) {
    const clean = String(value || '')
        .normalize('NFKC')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .toUpperCase()
        .replace(/\s+/g, '');
    const generatedToken = clean.match(/JKBOT-[A-F0-9]+/);
    if (generatedToken) return generatedToken[0];
    return clean.replace(/[```"'<>()[\]{}]/g, '').trim();
}

function hashPremiumToken(token) {
    return crypto.createHash('sha256').update(normalizePremiumToken(token)).digest('hex');
}

function normalizePremiumTokenEntries(tokens = {}) {
    for (const [id, raw] of Object.entries(tokens || {})) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
        const claims = Array.isArray(raw.claimedBy)
            ? raw.claimedBy.map(value => String(value).trim()).filter(Boolean)
            : raw.claimedBy ? [String(raw.claimedBy).trim()] : [];
        const claimedAt = Array.isArray(raw.claimedAt)
            ? raw.claimedAt
            : raw.claimedAt ? [raw.claimedAt] : [];
        tokens[id] = {
            ...raw,
            maxClaims: Math.min(5, Math.max(1, Number(raw.maxClaims) || 5)),
            claimedBy: [...new Set(claims)],
            claimedAt
        };
    }
    return tokens;
}

function createPremiumToken(days = 30) {
    const safeDays = Math.min(3650, Math.max(1, Number(days) || 30));
    // 8 bytes = 16 caracteres hexadecimales: corto para copiar, pero con suficiente aleatoriedad.
    const token = `JKBOT-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
    const now = Date.now();
    botData.premiumTokens[hashPremiumToken(token)] = {
        // El hash se sigue usando para validar el token. El valor completo se
        // conserva en el almacén privado para poder verlo tras recargar o actualizar.
        value: token,
        preview: `${token.slice(0, 9)}…`,
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + safeDays * 86400000).toISOString(),
        maxClaims: 5,
        claimedBy: null,
        claimedAt: null
    };
    saveBotData({ backupNow: true });
    return { token, expiresAt: botData.premiumTokens[hashPremiumToken(token)].expiresAt };
}

function premiumSnapshot() {
    const users = Object.entries(botData.premiumUsers || {}).map(([jid, entry]) => ({
        jid,
        expiresAt: entry?.expiresAt || null,
        active: premiumEntryActive(entry)
    }));
    const tokens = Object.entries(botData.premiumTokens || {}).map(([id, token]) => ({
        id,
        value: token.value || null,
        preview: token.preview,
        createdAt: token.createdAt,
        expiresAt: token.expiresAt,
        claimed: Array.isArray(token.claimedBy) ? token.claimedBy.length > 0 : Boolean(token.claimedBy),
        claimedCount: Array.isArray(token.claimedBy) ? token.claimedBy.length : (token.claimedBy ? 1 : 0),
        maxClaims: Math.min(5, Math.max(1, Number(token.maxClaims) || 5))
    })).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    return { users, tokens };
}

// Owner check for Telegram
function isTgOwner(chatId) {
    const ownerChatId = process.env.OWNER_TELEGRAM_ID || settings.tgOwnerId;
    return chatId.toString() === ownerChatId;
}

// =================== TELEGRAM BOT (ONLY PAIRING + PREMIUM + OWNER-ONLY STATUS) ===================
if (tgBot) {
    tgBot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        const isOwner = isTgOwner(chatId);

        const welcomeMessage =
            `\u{25EC}\u{2501}\u{2501}\u{2501}\u{3008} *ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ* \u{3009}\u{2501}\u{2501}\u{2501}\u{25EC}\n\n` +
            `*\u{1F311} LUXURY WHATSAPP AUTOMATION* \u{1F311}\n\n` +
            `Welcome to the most premium WhatsApp bot experience.\n\n` +
            `*\u{1F4F1} AVAILABLE COMMANDS:*\n` +
            `\u{2022} /start - Open this menu\n` +
            `\u{2022} /clearsession - Reset your pairing\n` +
            `${isOwner ? `\u{2022} /status - Bot overall status\n` : ''}` +
            `${isOwner ? `\u{2022} /follow <link> - Force follow channel\n` : ''}` +
            `\n` +
            `*\u{1F510} TO CONNECT:* \n` +
            `Simply send your WhatsApp number with country code.\n` +
            `Example: \`923271054080\`\n\n` +
            `> © POWERED BY ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ v4.1.0`;

        try {
            await tgBot.sendPhoto(chatId, settings.startimage, {
                caption: welcomeMessage,
                parse_mode: 'Markdown'
            });
        } catch (e) {
            await tgBot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
        }
    });

    // Clear Session Command
    tgBot.onText(/\/clearsession/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = `tg_${chatId}`;

        if (sessions[userId]) {
            if (sessions[userId].sock) {
                try { await sessions[userId].sock.logout(); } catch(e) {}
            }
            const authPath = sessions[userId].authPath;
            if (fs.existsSync(authPath)) {
                fs.removeSync(authPath);
            }
            delete sessions[userId];
            await tgBot.sendMessage(chatId, `\u{1F5D1}\u{FE0F} *Session cleared!* You can now pair a new number.`, { parse_mode: 'Markdown' });
        } else {
            await tgBot.sendMessage(chatId, `\u{26A0}\u{FE0F} No active session found to clear.`, { parse_mode: 'Markdown' });
        }
    });

    // Follow Command - OWNER ONLY
    tgBot.onText(/\/follow (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        if (!isTgOwner(chatId)) return;

        const channelLink = match[1].trim();
        const activeSocks = getAllActiveSockets();

        await tgBot.sendMessage(chatId, `\u{1F504} *Initiating Mass Follow...*\nTarget: ${channelLink}\nBots: ${activeSocks.length}`, { parse_mode: 'Markdown' });

        let success = 0;
        for (const { sock } of activeSocks) {
            try {
                const channelKey = channelLink.split('/channel/')[1] || channelLink.split('/').pop();
                const metadata = await sock.newsletterMetadata('invite', channelKey, 'GUEST');
                if (metadata && metadata.id) {
                    await sock.newsletterFollow(metadata.id);
                    success++;
                }
            } catch (e) {}
        }

        await tgBot.sendMessage(chatId, `\u{2705} *Mass Follow Complete!*\nSuccessfully followed: ${success}/${activeSocks.length}`, { parse_mode: 'Markdown' });
    });

    // Status command - OWNER ONLY
    tgBot.onText(/\/status/, async (msg) => {
        const chatId = msg.chat.id;

        if (!isTgOwner(chatId)) {
            return tgBot.sendMessage(chatId, "\u{274C} *Owner only command!*", { parse_mode: 'Markdown' });
        }

        const connectedCount = Object.values(sessions).filter(s => s.isConnected).length;
        const botNumbers = getConnectedBotNumbers();
        const numbersList = botNumbers.length > 0 ? botNumbers.join('\n') : 'None';

        const statusMsg =
            `\u{25EC}\u{2501}\u{2501}\u{2501}\u{3008} *ᴊᴋ ʙᴏᴛ STATUS* \u{3009}\u{2501}\u{2501}\u{2501}\u{25EC}\n\n` +
            `\u{1F4F1} *Connected Bots:* ${connectedCount}\n` +
            `\u{26A1} *Total Sessions:* ${Object.keys(sessions).length}\n\n` +
            `\u{1F522} *Active Numbers:*\n\`${numbersList}\`\n\n` +
            `> © POWERED BY ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ v4.1.0`;

        await tgBot.sendMessage(chatId, statusMsg, { parse_mode: 'Markdown' });
    });

    tgBot.onText(/\/addpremium (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        if (!isTgOwner(chatId)) {
            return tgBot.sendMessage(chatId, "\u{274C} *Owner only command!*", { parse_mode: 'Markdown' });
        }
        const targetId = match[1].trim();
        if (!settings.premiumUsers.includes(targetId)) {
            settings.premiumUsers.push(targetId);
            await tgBot.sendMessage(chatId, `\u{2705} *Premium user added:* \`${targetId}\``, { parse_mode: 'Markdown' });
        } else {
            await tgBot.sendMessage(chatId, `\u{26A0}\u{FE0F} User already premium: \`${targetId}\``, { parse_mode: 'Markdown' });
        }
    });

    tgBot.onText(/\/removepremium (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        if (!isTgOwner(chatId)) {
            return tgBot.sendMessage(chatId, "\u{274C} *Owner only command!*", { parse_mode: 'Markdown' });
        }
        const targetId = match[1].trim();
        const idx = settings.premiumUsers.indexOf(targetId);
        if (idx > -1) {
            settings.premiumUsers.splice(idx, 1);
            await tgBot.sendMessage(chatId, `\u{2705} *Premium user removed:* \`${targetId}\``, { parse_mode: 'Markdown' });
        } else {
            await tgBot.sendMessage(chatId, `\u{26A0}\u{FE0F} User not found in premium list: \`${targetId}\``, { parse_mode: 'Markdown' });
        }
    });

    tgBot.onText(/\/listpremium/, async (msg) => {
        const chatId = msg.chat.id;
        if (!isTgOwner(chatId)) {
            return tgBot.sendMessage(chatId, "\u{274C} *Owner only command!*", { parse_mode: 'Markdown' });
        }
        const list = settings.premiumUsers.length > 0 ? settings.premiumUsers.join('\n') : 'None';
        await tgBot.sendMessage(chatId, `\u{1F451} *Premium Users:*\n\n${list}`, { parse_mode: 'Markdown' });
    });

    // Pairing handler - when user sends a number
    tgBot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;

        if (!text || text.startsWith('/')) return;

        if (/^\d+$/.test(text)) {
            const userId = chatId.toString();
            if (!sessions[userId]) {
                sessions[userId] = new BotSession(userId);
            }

            if (!botData.statusSettings[userId]) {
                botData.statusSettings[userId] = {
                    autoStatus: false,
                    autoSeen: false,
                    autoLike: false,
                    autoDownload: false,
                    isPublic: false
                };
                saveBotData();
            }

            const initMsg =
                `\u{25EC}\u{2501}\u{2501}\u{2501}\u{3008} *ᴊᴋ ʙᴏᴛ PAIRING* \u{3009}\u{2501}\u{2501}\u{2501}\u{25EC}\n\n` +
                `*\u{1F504} REQUESTING CODE...*\n` +
                `Target Number: \`${text}\`\n\n` +
                `_Please wait a few seconds..._`;

            await tgBot.sendMessage(chatId, initMsg, { parse_mode: 'Markdown' });
            sessions[userId].tgChatId = chatId;
            await sessions[userId].initialize(text);
        }
    });
}


// =================== WEB DASHBOARD SOCKET.IO ===================
const io = socketIo(server, {
    cors: { origin: "*" },
    transports: ['websocket', 'polling']
});

let openai = null;
const aiProvider = String(process.env.AI_PROVIDER || (process.env.GEMINI_API_KEY ? 'gemini' : 'openai')).toLowerCase();
const aiSettings = {
    openai: { key: process.env.OPENAI_API_KEY, baseURL: 'https://api.openai.com/v1', model: process.env.OPENAI_MODEL || 'gpt-4o-mini' },
    chatgpt: { key: process.env.OPENAI_API_KEY, baseURL: 'https://api.openai.com/v1', model: process.env.OPENAI_MODEL || 'gpt-4o-mini' },
    deepseek: { key: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY, baseURL: 'https://api.deepseek.com/v1', model: process.env.DEEPSEEK_MODEL || 'deepseek-chat' },
    gemini: { key: process.env.GEMINI_API_KEY, baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai', model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' },
    groq: { key: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1', model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b' }
};
const selectedAI = aiSettings[aiProvider] || aiSettings.openai;
const aiApiKey = selectedAI.key;
const aiModel = process.env.AI_MODEL || selectedAI.model;
if (aiApiKey) {
    try {
        openai = new OpenAI({
            apiKey: aiApiKey,
            baseURL: process.env.AI_BASE_URL || selectedAI.baseURL
        });
    } catch (e) {}
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname), { index: false }));

const INDEX_TEMPLATE = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const BANNER_FILE = 'Gemini_Generated_Image_dcxxqzdcxxqzdcxx.jpeg';
function sendIndexWithPreview(req, res) {
    res.set({ 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
    const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
    const imageUrl = `${protocol.split(',')[0].trim()}://${req.get('host')}/${BANNER_FILE}`;
    res.type('html').send(INDEX_TEMPLATE.replaceAll('__JK_OG_IMAGE__', imageUrl));
}

app.get('/', (req, res) => {
    sendIndexWithPreview(req, res);
});

app.get('/admin', (req, res) => {
    sendIndexWithPreview(req, res);
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});


const warcraftPendingCodes = new Map();
function normalizeWarcraftPhone(value) { return String(value || '').split('@')[0].split(':')[0].replace(/\D/g, ''); }
function warcraftPhoneCandidates(msg, chatId) { return [...new Set([msg?.key?.participant, msg?.key?.participantAlt, msg?.key?.senderPn, msg?.key?.participantPn, msg?.key?.remoteJid, msg?.key?.remoteJidAlt, chatId].map(normalizeWarcraftPhone).filter(value => /^\d{7,16}$/.test(value)))]; }
function notifyWarcraftUpdate() { try { io.emit('warcraft:update'); } catch {} }
function warcraftWebPlayer(player) { if (!player) return null; const { talents, talentPoints, ...view } = player; return view; }
function hashWarcraftPassword(value, salt = crypto.randomBytes(16).toString('hex')) { return `${salt}:${crypto.scryptSync(String(value), salt, 64).toString('hex')}`; }
function checkWarcraftPassword(value, stored) { try { const [salt, digest] = String(stored || '').split(':'); const actual = crypto.scryptSync(String(value), salt, 64).toString('hex'); return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(digest || '', 'hex')); } catch { return false; } }
function warcraftRoot() { botData.warcraft ||= { players: {}, accounts: {}, trades: {}, guilds: {}, sessions: {}, combat: {}, duels: {}, duelRequests: {}, pendingPurchases: {}, parties: {}, auctions: {}, mail: {}, battlegrounds: {}, world: {}, webSessions: {} }; const root = botData.warcraft; for (const key of ['players', 'accounts', 'trades', 'guilds', 'sessions', 'combat', 'duels', 'duelRequests', 'pendingPurchases', 'parties', 'auctions', 'mail', 'battlegrounds', 'world', 'webSessions']) root[key] ||= {}; return root; }
function warcraftSessionForPhone(phone) { const target = normalizeWarcraftPhone(phone); return Object.values(sessions || {}).find(session => [session.phoneNumber, session.requestedPhoneNumber, session.userId, session.sock?.user?.id].some(value => normalizeWarcraftPhone(value) === target) && session.sock && session.isConnected); }
function warcraftAccountFromToken(token) { const root = warcraftRoot(); const session = root.webSessions[String(token || '')]; if (!session || session.expiresAt < Date.now()) return null; return root.accounts[session.username] || null; }
function warcraftPublicLeaderboard(root = warcraftRoot()) { return Object.values(root.accounts || {}).map(account => { const player = warcraftGame.playerForAccount(root, account); if (!player) return null; warcraftGame.recalc(player); return { username: account.username, character: player.name, classKey: player.classKey, className: warcraftGame.CLASS_CONFIG[player.classKey]?.label || 'Aventurero', gs: Number(player.gs || 0), level: Number(player.level || 1), xp: Number(player.xp || 0), phone: normalizeWarcraftPhone(account.phone) }; }).filter(Boolean).sort((a, b) => b.gs - a.gs || b.level - a.level || b.xp - a.xp || a.username.localeCompare(b.username)).map((player, index) => ({ ...player, rank: index + 1 })); }
app.post('/api/warcraft/register/request-code', async (req, res) => {
    const phone = normalizeWarcraftPhone(req.body?.phone);
    const username = String(req.body?.username || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!/^\d{8,15}$/.test(phone) || !/^[a-z0-9_]{3,20}$/.test(username) || password.length < 4) return res.status(400).json({ ok: false, message: 'Teléfono, usuario o contraseña inválidos.' });
    const root = warcraftRoot();
    if (root.accounts[username] || Object.values(root.accounts).some(a => normalizeWarcraftPhone(a.phone) === phone)) return res.status(409).json({ ok: false, message: 'El usuario o teléfono ya está registrado.' });
    const session = warcraftSessionForPhone(phone);
    if (!session) return res.status(400).json({ ok: false, message: 'Primero conecta en WhatsApp el número que recibirá el código.' });
    const code = String(crypto.randomInt(100000, 1000000));
    warcraftPendingCodes.set(phone, { code, username, passwordHash: hashWarcraftPassword(password), expiresAt: Date.now() + 10 * 60 * 1000 });
    try { await session.sock.sendMessage(`${phone}@s.whatsapp.net`, { text: `🔐 Código Warcraft: ${code}\nNo lo compartas con nadie. Caduca en 10 minutos.` }); } catch (e) { warcraftPendingCodes.delete(phone); return res.status(502).json({ ok: false, message: 'No se pudo enviar el código a WhatsApp.' }); }
    res.json({ ok: true, message: 'Código enviado a tu chat privado de WhatsApp. La web no lo muestra.' });
});
app.post('/api/warcraft/register/verify', (req, res) => {
    const phone = normalizeWarcraftPhone(req.body?.phone); const code = String(req.body?.code || '').trim(); const pending = warcraftPendingCodes.get(phone);
    if (!pending || pending.expiresAt < Date.now() || pending.code !== code) return res.status(400).json({ ok: false, message: 'Código incorrecto o caducado. Solicita uno nuevo.' });
    const root = warcraftRoot();
    root.accounts[pending.username] = { username: pending.username, phone, passwordHash: pending.passwordHash, createdAt: new Date().toISOString() };
    root.sessions[phone] = pending.username;
    const token = crypto.randomBytes(24).toString('hex'); root.webSessions[token] = { username: pending.username, expiresAt: Date.now() + 24 * 60 * 60 * 1000 };
    warcraftPendingCodes.delete(phone); saveBotData();
    res.json({ ok: true, token, username: pending.username, message: `Cuenta registrada correctamente.\n\nUsuario: ${pending.username}\nContraseña: la que elegiste\n\nYa puedes usar /login y /warcraft.` });
});
app.post('/api/warcraft/login', (req, res) => {
    const username = String(req.body?.username || '').trim().toLowerCase(); const root = warcraftRoot();
    const account = root.accounts[username] || Object.values(root.accounts).find(item => String(item.phone) === normalizeWarcraftPhone(username));
    if (!account) return res.status(401).json({ ok: false, message: 'Usuario no registrado o usuario incorrecto.' });
    if (!checkWarcraftPassword(req.body?.password, account.passwordHash)) return res.status(401).json({ ok: false, message: 'Contraseña incorrecta.' });
    const token = crypto.randomBytes(24).toString('hex'); root.webSessions[token] = { username: account.username, expiresAt: Date.now() + 24 * 60 * 60 * 1000 }; root.sessions[account.phone] = account.username; saveBotData();
    res.json({ ok: true, token, username: account.username, phone: account.phone, message: 'Sesión iniciada. Ya puedes usar /warcraft.' });
});
app.post('/api/warcraft/character', (req, res) => res.status(410).json({ ok: false, message: 'El personaje se crea en WhatsApp con /nombredelpersonaje y /clase.' }));
app.get('/api/warcraft/me', (req, res) => { const account = warcraftAccountFromToken(req.headers.authorization?.replace(/^Bearer\s+/i, '')); if (!account) return res.status(401).json({ ok: false, message: 'Inicia sesión.' }); const root = warcraftRoot(); const player = warcraftGame.playerForAccount(root, account); const rank = player ? warcraftPublicLeaderboard(root).find(entry => entry.username === account.username)?.rank || null : null; const inventoryCounts = player ? warcraftGame.inventoryCounts(player) : {}; const inventoryDetails = Object.entries(inventoryCounts).map(([id, quantity]) => ({ id, quantity, name: warcraftGame.ITEMS[id]?.name || id, rarity: warcraftGame.ITEMS[id]?.rarity || 'common' })); const equipmentDetails = player ? Object.entries(player.equipment || {}).map(([slot, id]) => ({ slot, id, name: warcraftGame.ITEMS[id]?.name || id })) : []; res.json({ ok: true, account: { username: account.username, phone: account.phone }, player: warcraftWebPlayer(player), rank, inventoryDetails, equipmentDetails, combat: player ? root.combat[player.id] || null : null }); });
app.get('/api/warcraft/shop', (req, res) => { const account = warcraftAccountFromToken(req.headers.authorization?.replace(/^Bearer\s+/i, '')); if (!account) return res.status(401).json({ ok: false, message: 'Inicia sesión.' }); const root = warcraftRoot(); const player = warcraftGame.playerForAccount(root, account); if (!player) return res.status(400).json({ ok: false, message: 'Crea tu personaje primero.' }); res.json({ ok: true, items: warcraftGame.shopItems(player), level: player.level }); });
app.get('/api/warcraft/active-users', (req, res) => { const root = warcraftRoot(); const users = warcraftPublicLeaderboard(root).map(({ phone, ...publicPlayer }) => publicPlayer); res.json({ ok: true, totalRegistered: Object.keys(root.accounts || {}).length, totalCharacters: users.length, users }); });
app.post('/api/warcraft/duel', (req, res) => {
    const account = warcraftAccountFromToken(req.headers.authorization?.replace(/^Bearer\s+/i, '')); const root = warcraftRoot(); if (!account) return res.status(401).json({ ok: false, message: 'Inicia sesión.' });
    const player = warcraftGame.playerForAccount(root, account); if (!player) return res.status(400).json({ ok: false, message: 'Crea tu personaje primero.' }); const action = String(req.body?.action || '').toLowerCase(); let result;
    if (action === 'challenge') { const target = String(req.body?.target || '').trim(); const targetAccount = root.accounts[target] || Object.values(root.accounts).find(a => a.phone === normalizeWarcraftPhone(target)); result = targetAccount ? warcraftGame.createDuel(root, player, targetAccount.phone) : { error: 'No se encontró ese usuario.' }; }
    else if (action === 'accept') result = warcraftGame.acceptDuel(root, player);
    else if (action === 'attack') result = warcraftGame.duelAttack(root, player, req.body?.skill || 'auto');
    else if (action === 'forfeit') { const duel = Object.values(root.duels).find(d => d.status === 'active' && d.players.includes(player.id)); result = duel ? (duel.status = 'forfeit', duel.winner = duel.players.find(x => x !== player.id), { ok: true }) : { error: 'No estás en un duelo.' }; }
    else result = { error: 'Acción de duelo desconocida.' };
    if (result.error) return res.status(400).json({ ok: false, message: result.error }); saveBotData(); notifyWarcraftUpdate(); res.json({ ok: true, result });
});
app.get('/api/warcraft/mmo/catalog', (req, res) => res.json({ ok: true, recipes: warcraftGame.RECIPES, sources: warcraftGame.MATERIAL_SOURCES }));
app.post('/api/warcraft/mmo', (req, res) => {
    const account = warcraftAccountFromToken(req.headers.authorization?.replace(/^Bearer\s+/i, '')); const root = warcraftRoot(); if (!account) return res.status(401).json({ ok: false, message: 'Inicia sesión.' }); const player = warcraftGame.playerForAccount(root, account); if (!player) return res.status(400).json({ ok: false, message: 'Crea tu personaje primero.' });
    const action = String(req.body?.action || '').toLowerCase(); let result;
    if (action === 'travel') result = warcraftGame.travel(player, req.body?.zone);
    else if (action === 'learn_profession') result = warcraftGame.learnProfession(player, req.body?.profession);
    else if (action === 'gather') result = warcraftGame.gather(player, req.body?.node);
    else if (action === 'craft') result = warcraftGame.craft(player, req.body?.recipe);
    else if (action === 'daily') result = warcraftGame.daily(player);
    else if (action === 'mount') result = warcraftGame.buyMount(player, req.body?.mount);
    else if (action === 'party_create') result = warcraftGame.createParty(root, player);
    else if (action === 'party_join') result = warcraftGame.joinParty(root, player, req.body?.partyId);
    else if (action === 'party_leave') result = warcraftGame.leaveParty(root, player);
    else if (action === 'mail_claim') result = warcraftGame.claimMail(root, player);
    else if (action === 'enchant') result = warcraftGame.enchant(player, req.body?.enchantId || req.body?.value, req.body?.slot || 'weapon');
    else result = { error: 'Acción MMO desconocida.' };
    if (result.error) return res.status(400).json({ ok: false, message: result.error }); warcraftGame.recalc(player); saveBotData(); notifyWarcraftUpdate(); res.json({ ok: true, result, player: warcraftWebPlayer(player) });
});
app.post('/api/warcraft/action', (req, res) => {
    const account = warcraftAccountFromToken(req.headers.authorization?.replace(/^Bearer\s+/i, '')); const root = warcraftRoot();
    if (!account) return res.status(401).json({ ok: false, message: 'Inicia sesión.' });
    const player = warcraftGame.playerForAccount(root, account); if (!player) return res.status(400).json({ ok: false, message: 'Crea un personaje desde WhatsApp con /pjnombre y /clase.' });
    const action = String(req.body?.action || '').toLowerCase(); let result;
    if (action === 'search') result = warcraftGame.startCombat(root, player, String(req.body?.enemy || 'lobo').toLowerCase());
    else if (action === 'attack') result = warcraftGame.combatAttack(root, player, 'auto');
    else if (action === 'skill') result = warcraftGame.combatAttack(root, player, String(req.body?.skill || '').toLowerCase());
    else if (action === 'use') result = warcraftGame.useItem(player, req.body?.item || 'health_potion');
    else if (action === 'equip') result = warcraftGame.equip(player, req.body?.item || '');
    else if (action === 'buy') result = warcraftGame.buy(player, String(req.body?.item || ''));
    else if (action === 'dungeon') result = warcraftGame.dungeon(player, String(req.body?.dungeon || '').toLowerCase());
    else if (action === 'flee') { if (!root.combat[player.id] || root.combat[player.id].status !== 'active') result = { error: 'No estás en combate.' }; else { root.combat[player.id].status = 'fled'; result = { ok: true, message: 'Has huido del combate.' }; } }
    else result = { error: 'Acción Warcraft desconocida.' };
    if (result.error) return res.status(400).json({ ok: false, message: result.error, player: warcraftWebPlayer(player), combat: root.combat[player.id] || null });
    saveBotData(); notifyWarcraftUpdate(); res.json({ ok: true, result, player: warcraftWebPlayer(player), combat: root.combat[player.id] || null });
});
// El comercio rápido web se retiró; los regalos e intercambios Warcraft se coordinan por WhatsApp.
const LEGACY_DATA_DIR = path.resolve(__dirname, 'data');
const LEGACY_RUNTIME_DIR = path.resolve(__dirname, 'bot');
const LEGACY_AUTH_DIR = path.resolve(__dirname, 'auth_info');
// Default runtime state lives beside the repository, never inside it. This survives git pull,
// reclone and replacement of the working tree. On Railway, use the mounted /data volume even
// when the variable was not copied into the service environment.
const DEFAULT_PERSISTENT_DIR = fs.existsSync('/data') ? '/data/bot' : path.join(__dirname, '..', 'jkbot-data');
const REQUESTED_PERSISTENT_DIR = path.resolve(process.env.PERSISTENT_DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || DEFAULT_PERSISTENT_DIR);
const persistentDirRelativeToRepo = path.relative(__dirname, REQUESTED_PERSISTENT_DIR);
const persistentDirInsideRepo = persistentDirRelativeToRepo === '' || (!persistentDirRelativeToRepo.startsWith(`..${path.sep}`) && persistentDirRelativeToRepo !== '..' && !path.isAbsolute(persistentDirRelativeToRepo));
const LEGACY_IN_REPO_DIR = persistentDirInsideRepo ? REQUESTED_PERSISTENT_DIR : null;
const PERSISTENT_DIR = persistentDirInsideRepo ? path.resolve(DEFAULT_PERSISTENT_DIR) : REQUESTED_PERSISTENT_DIR;
if (persistentDirInsideRepo) {
    console.warn(`[Persistence] La ruta ${REQUESTED_PERSISTENT_DIR} está dentro del repositorio; se usará ${PERSISTENT_DIR} para mantener los datos fuera del código.`);
}
const AUTH_DIR = path.join(PERSISTENT_DIR, 'auth_info');
const UPLOADS_DIR = path.join(PERSISTENT_DIR, 'uploads');
const DATA_FILE = path.join(PERSISTENT_DIR, 'bot_data.json');
const DATA_BACKUP = `${DATA_FILE}.bak`;
const DATA_TEMP = `${DATA_FILE}.tmp`;
const PREMIUM_DATA_FILE = path.join(PERSISTENT_DIR, 'premium_data.json');
const PREMIUM_DATA_TEMP = `${PREMIUM_DATA_FILE}.tmp`;
const PREMIUM_DATA_BACKUP = `${PREMIUM_DATA_FILE}.bak`;
const LEGACY_PREMIUM_FILES = [
    path.join(__dirname, 'premium_data.json'),
    path.join(LEGACY_RUNTIME_DIR, 'premium_data.json'),
    path.join(LEGACY_DATA_DIR, 'premium_data.json'),
    ...(LEGACY_IN_REPO_DIR ? [path.join(LEGACY_IN_REPO_DIR, 'premium_data.json')] : [])
].filter(file => path.resolve(file) !== path.resolve(PREMIUM_DATA_FILE));
fs.ensureDirSync(PERSISTENT_DIR);
fs.ensureDirSync(AUTH_DIR);
fs.ensureDirSync(UPLOADS_DIR);

// First-run migration: preserve old data and merge it without replacing newer persistent data.
function mergeLegacyBotData(sourceFile) {
    if (!fs.existsSync(sourceFile)) return;
    try {
        const source = fs.readJsonSync(sourceFile);
        const target = fs.existsSync(DATA_FILE) ? fs.readJsonSync(DATA_FILE) : {};
        target.premiumUsers = { ...(source.premiumUsers || {}), ...(target.premiumUsers || {}) };
        target.premiumTokens = { ...(source.premiumTokens || {}), ...(target.premiumTokens || {}) };
        for (const key of ['registeredUsers', 'profiles', 'userNames', 'subbots']) {
            target[key] = { ...(source[key] || {}), ...(target[key] || {}) };
        }
        if (!target.broadcastHistory?.length && source.broadcastHistory?.length) target.broadcastHistory = source.broadcastHistory;
        fs.writeJsonSync(DATA_FILE, target, { spaces: 2 });
    } catch (e) {
        console.warn(`[Persistence] No se pudo migrar ${sourceFile}: ${e.message}`);
    }
}
for (const legacyFile of [
    path.join(LEGACY_RUNTIME_DIR, 'bot_data.json'),
    path.join(LEGACY_DATA_DIR, 'bot_data.json'),
    ...(LEGACY_IN_REPO_DIR ? [path.join(LEGACY_IN_REPO_DIR, 'bot_data.json')] : [])
]) {
    if (legacyFile !== DATA_FILE) mergeLegacyBotData(legacyFile);
}
function copyMissingTree(sourceDir, targetDir) {
    if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) return;
    fs.ensureDirSync(targetDir);
    for (const name of fs.readdirSync(sourceDir)) {
        const source = path.join(sourceDir, name);
        const target = path.join(targetDir, name);
        if (!fs.existsSync(target)) fs.copySync(source, target);
        else if (fs.statSync(source).isDirectory() && fs.statSync(target).isDirectory()) copyMissingTree(source, target);
    }
}
if (LEGACY_IN_REPO_DIR) {
    copyMissingTree(path.join(LEGACY_IN_REPO_DIR, 'auth_info'), AUTH_DIR);
    copyMissingTree(path.join(LEGACY_IN_REPO_DIR, 'uploads'), UPLOADS_DIR);
}
if (fs.existsSync(LEGACY_AUTH_DIR)) {
    for (const userId of fs.readdirSync(LEGACY_AUTH_DIR)) {
        const source = path.join(LEGACY_AUTH_DIR, userId);
        const target = path.join(AUTH_DIR, userId);
        if (!fs.existsSync(target)) fs.copySync(source, target);
    }
}
if (LEGACY_RUNTIME_DIR !== PERSISTENT_DIR && fs.existsSync(LEGACY_RUNTIME_DIR)) {
    const legacyAuth = path.join(LEGACY_RUNTIME_DIR, 'auth_info');
    if (fs.existsSync(legacyAuth)) {
        for (const userId of fs.readdirSync(legacyAuth)) {
            const source = path.join(legacyAuth, userId);
            const target = path.join(AUTH_DIR, userId);
            if (!fs.existsSync(target)) fs.copySync(source, target);
        }
    }
}

let botData = { antilinkGroups: {}, adminOnlyGroups: {}, groupAlerts: {}, groupWelcome: {}, groupBye: {}, groupWelcomeText: {}, groupByeText: {}, mutedUsers: {}, totalBots: 0, registeredBots: [], registeredUsers: {}, statusSettings: {}, antiDelete: {}, userNames: {}, antiCall: {}, broadcastHistory: [], comments: [], economy: {}, profiles: {}, warcraft: { players: {}, accounts: {}, trades: {}, guilds: {}, sessions: {}, combat: {}, duels: {}, duelRequests: {}, pendingPurchases: {}, parties: {}, auctions: {}, mail: {}, battlegrounds: {}, world: {} }, premiumUsers: {}, premiumTokens: {}, subbots: {} };
function loadBotDataFromDisk() {
    for (const candidate of [DATA_FILE, DATA_BACKUP]) {
        if (!fs.existsSync(candidate)) continue;
        try {
            botData = fs.readJsonSync(candidate);
            break;
        } catch (e) {}
    }
    normalizeBotDataState();
}

function normalizeBotDataState() {
    if (!botData || typeof botData !== 'object' || Array.isArray(botData)) botData = {};
    if (!Array.isArray(botData.comments)) botData.comments = [];
    if (!botData.economy || typeof botData.economy !== 'object') botData.economy = {};
    if (!botData.profiles || typeof botData.profiles !== 'object') botData.profiles = {};
    if (!botData.premiumUsers || typeof botData.premiumUsers !== 'object' || Array.isArray(botData.premiumUsers)) botData.premiumUsers = {};
    if (!botData.premiumTokens || typeof botData.premiumTokens !== 'object') botData.premiumTokens = {};
    normalizePremiumTokenEntries(botData.premiumTokens);
    if (!botData.subbots || typeof botData.subbots !== 'object' || Array.isArray(botData.subbots)) botData.subbots = {};
    if (!botData.registeredUsers || typeof botData.registeredUsers !== 'object' || Array.isArray(botData.registeredUsers)) botData.registeredUsers = {};
    if (!botData.adminOnlyGroups || typeof botData.adminOnlyGroups !== 'object') botData.adminOnlyGroups = {};
    for (const key of ['groupAlerts', 'groupWelcome', 'groupBye', 'groupWelcomeText', 'groupByeText', 'mutedUsers', 'antiPornGroups', 'antiPhotoGroups', 'antiVideoGroups', 'antiAudioGroups', 'antiStickerGroups', 'antiDocumentGroups', 'antiMediaGroups', 'antiSpamGroups']) {
        if (!botData[key] || typeof botData[key] !== 'object') botData[key] = {};
    }
}

loadBotDataFromDisk();

function loadPremiumDataFromDisk() {
    for (const candidate of [PREMIUM_DATA_FILE, PREMIUM_DATA_BACKUP, ...LEGACY_PREMIUM_FILES]) {
        if (!fs.existsSync(candidate)) continue;
        try {
            const premium = fs.readJsonSync(candidate);
            if (premium && typeof premium === 'object') {
                botData.premiumUsers = { ...(premium.premiumUsers || {}), ...(botData.premiumUsers || {}) };
                botData.premiumTokens = { ...(premium.premiumTokens || {}), ...(botData.premiumTokens || {}) };
                // Do not stop at the first legacy file: merge all available stores so an update cannot discard users.
            }
        } catch (e) {
            console.warn(`[Persistence] No se pudo leer ${candidate}: ${e.message}`);
        }
    }
    normalizePremiumTokenEntries(botData.premiumTokens);
}

loadPremiumDataFromDisk();

function savePremiumData({ backupNow = false } = {}) {
    fs.ensureDirSync(PERSISTENT_DIR);
    const premium = { premiumUsers: botData.premiumUsers || {}, premiumTokens: botData.premiumTokens || {}, updatedAt: new Date().toISOString() };
    fs.writeJsonSync(PREMIUM_DATA_TEMP, premium, { spaces: 2 });
    if (fs.existsSync(PREMIUM_DATA_FILE)) fs.copyFileSync(PREMIUM_DATA_FILE, PREMIUM_DATA_BACKUP);
    fs.renameSync(PREMIUM_DATA_TEMP, PREMIUM_DATA_FILE);
    postgresPremiumStore.scheduleSave(botData.premiumUsers, botData.premiumTokens);
}

function saveBotData({ backupNow = false, skipTelegramBackup = false } = {}) {
    fs.ensureDirSync(PERSISTENT_DIR);
    fs.writeJsonSync(DATA_TEMP, botData, { spaces: 2 });
    if (fs.existsSync(DATA_FILE)) fs.copyFileSync(DATA_FILE, DATA_BACKUP);
    fs.renameSync(DATA_TEMP, DATA_FILE);
    savePremiumData({ backupNow });
    postgresPremiumStore.scheduleAppStateSave(botData);
    if (!skipTelegramBackup) telegramBackupStore.scheduleSave(botData, { immediate: backupNow });
    if (typeof broadcastPremiumData === 'function') broadcastPremiumData();
    if (!telegramBackupStore.enabled()) {
        githubBackup.scheduleBackup(
            { dataFile: DATA_FILE, premiumDataFile: PREMIUM_DATA_FILE, authDir: AUTH_DIR, uploadsDir: UPLOADS_DIR },
            { delayMs: backupNow ? 0 : undefined }
        );
    }
}

// Materialize the independent Premium store immediately, even before the first token is generated.
if (!fs.existsSync(PREMIUM_DATA_FILE)) savePremiumData();

const sessions = {};
const userSockets = {};
const messageLogs = {};
const adminSockets = new Set();

function broadcastPremiumData() {
    const snapshot = premiumSnapshot();
    for (const adminSocket of adminSockets) {
        if (adminSocket.connected && adminSocket.authenticated) adminSocket.emit('admin-premium-data', snapshot);
    }
}

function registeredUsersSnapshot() {
    return Object.values(botData.registeredUsers || {}).sort((a, b) => String(b.lastSeen || '').localeCompare(String(a.lastSeen || '')));
}
function recordRegisteredUser({ jid, name, sessionId, chatId, isGroup }) {
    if (!jid || jid === 'status@broadcast' || jid.endsWith('@g.us') || !jid.endsWith('@s.whatsapp.net')) return;
    const now = new Date().toISOString();
    const isNew = !botData.registeredUsers[jid];
    const current = botData.registeredUsers[jid] || { jid, firstSeen: now, chats: 0 };
    current.name = name || current.name || jid.split('@')[0];
    current.lastSeen = now;
    current.lastSession = sessionId;
    current.lastChat = chatId;
    current.chats = Number(current.chats || 0) + 1;
    current.isGroup = Boolean(isGroup);
    botData.registeredUsers[jid] = current;
    // Persist the first contact immediately so it is available to admin broadcasts.
    if (isNew || current.chats % 10 === 0) {
        saveBotData();
        for (const adminSocket of adminSockets) {
            if (adminSocket.connected && adminSocket.authenticated) adminSocket.emit('admin-users-data', registeredUsersSnapshot());
        }
    }
}
function getDashboardStats() {
    const connectedSessions = Object.values(sessions).filter(session => session.isConnected && session.sock?.user);
    return {
        activeSockets: connectedSessions.length,
        totalUsers: connectedSessions.length,
        registeredUsers: registeredUsersSnapshot().length,
        connectedUsers: connectedSessions.length,
        pendingUsers: Object.keys(sessions).length - connectedSessions.length,
        bots: publicBotsSnapshot(),
        updatedAt: new Date().toISOString()
    };
}
function publicBotsSnapshot() {
    return Object.entries(sessions)
        .filter(([, session]) => session.isConnected && session.sock?.user)
        .map(([sessionId, session], index) => {
            const digits = String(session.phoneNumber || '').replace(/\D/g, '');
            return {
                id: `public-${index}-${sessionId.slice(-6)}`,
                type: botData.subbots?.[sessionId] ? 'Subbot' : 'Bot principal',
                phone: digits ? `+•••• ${digits.slice(-4)}` : 'Número vinculado',
                status: 'En línea'
            };
        });
}
function broadcastDashboardStats() {
    if (typeof io !== 'undefined') io.emit('stats', getDashboardStats());
    if (typeof adminSockets !== 'undefined') {
        for (const adminSocket of adminSockets) {
            if (adminSocket.authenticated) adminSocket.emit('admin-bots-data', botsSnapshot());
        }
    }
}

function botsSnapshot() {
    const ids = new Set([...Object.keys(sessions), ...Object.keys(botData.subbots || {})]);
    return [...ids].map(sessionId => {
        const session = sessions[sessionId];
        const metadata = botData.subbots?.[sessionId];
        const connected = Boolean(session?.isConnected && session.sock?.user);
        return {
            sessionId,
            type: metadata ? 'subbot' : 'bot',
            phoneNumber: session?.phoneNumber || metadata?.phoneNumber || metadata?.requestedNumber || null,
            ownerJid: metadata?.ownerJid || null,
            status: connected ? 'conectado' : (metadata?.status || 'pendiente'),
            connected,
            createdAt: metadata?.createdAt || null,
            mode: metadata?.mode || 'web'
        };
    }).sort((a, b) => Number(b.connected) - Number(a.connected));
}
// Load existing sessions on startup
async function loadExistingSessions() {
    try {
        const authDirs = await fs.readdir(AUTH_DIR);
        for (const userId of authDirs) {
            const authPath = path.join(AUTH_DIR, userId);
            const stats = await fs.stat(authPath);
            if (stats.isDirectory()) {
                const credsFile = path.join(authPath, 'creds.json');
                if (fs.existsSync(credsFile)) {
                    console.log(`[System] Found existing session for: ${userId}. Initializing...`);
                    if (!sessions[userId]) {
                        sessions[userId] = new BotSession(userId);
                        sessions[userId].initialize().catch(err => {
                            console.error(`[System] Failed to auto-initialize session ${userId}:`, err.message);
                        });
                    }
                }
            }
        }
    } catch (err) {
        console.error('[System] Error loading existing sessions:', err.message);
    }
}

// Bold font converter
const toBold = (text) => {
    const boldChars = {
        'a': '\u{1D5EE}', 'b': '\u{1D5EF}', 'c': '\u{1D5F0}', 'd': '\u{1D5F1}', 'e': '\u{1D5F2}', 'f': '\u{1D5F3}', 'g': '\u{1D5F4}', 'h': '\u{1D5F5}', 'i': '\u{1D5F6}', 'j': '\u{1D5F7}', 'k': '\u{1D5F8}', 'l': '\u{1D5F9}', 'm': '\u{1D5FA}', 'n': '\u{1D5FB}', 'o': '\u{1D5FC}', 'p': '\u{1D5FD}', 'q': '\u{1D5FE}', 'r': '\u{1D5FF}', 's': '\u{1D600}', 't': '\u{1D601}', 'u': '\u{1D602}', 'v': '\u{1D603}', 'w': '\u{1D604}', 'x': '\u{1D605}', 'y': '\u{1D606}', 'z': '\u{1D607}',
        'A': '\u{1D5D4}', 'B': '\u{1D5D5}', 'C': '\u{1D5D6}', 'D': '\u{1D5D7}', 'E': '\u{1D5D8}', 'F': '\u{1D5D9}', 'G': '\u{1D5DA}', 'H': '\u{1D5DB}', 'I': '\u{1D5DC}', 'J': '\u{1D5DD}', 'K': '\u{1D5DE}', 'L': '\u{1D5DF}', 'M': '\u{1D5E0}', 'N': '\u{1D5E1}', 'O': '\u{1D5E2}', 'P': '\u{1D5E3}', 'Q': '\u{1D5E4}', 'R': '\u{1D5E5}', 'S': '\u{1D5E6}', 'T': '\u{1D5E7}', 'U': '\u{1D5E8}', 'V': '\u{1D5E9}', 'W': '\u{1D5EA}', 'X': '\u{1D5EB}', 'Y': '\u{1D5EC}', 'Z': '\u{1D5ED}',
        '0': '\u{1D7EC}', '1': '\u{1D7ED}', '2': '\u{1D7EE}', '3': '\u{1D7EF}', '4': '\u{1D7F0}', '5': '\u{1D7F1}', '6': '\u{1D7F2}', '7': '\u{1D7F3}', '8': '\u{1D7F4}', '9': '\u{1D7F5}'
    };
    return text.split('').map(c => boldChars[c] || c).join('');
};

// Italic font converter
const toItalic = (text) => {
    const italicChars = {
        'a': '\u{1D608}', 'b': '\u{1D609}', 'c': '\u{1D60A}', 'd': '\u{1D60B}', 'e': '\u{1D60C}', 'f': '\u{1D60D}', 'g': '\u{1D60E}', 'h': '\u{1D60F}', 'i': '\u{1D610}', 'j': '\u{1D611}', 'k': '\u{1D612}', 'l': '\u{1D613}', 'm': '\u{1D614}', 'n': '\u{1D615}', 'o': '\u{1D616}', 'p': '\u{1D617}', 'q': '\u{1D618}', 'r': '\u{1D619}', 's': '\u{1D61A}', 't': '\u{1D61B}', 'u': '\u{1D61C}', 'v': '\u{1D61D}', 'w': '\u{1D61E}', 'x': '\u{1D61F}', 'y': '\u{1D620}', 'z': '\u{1D621}',
        'A': '\u{1D5CE}', 'B': '\u{1D5CF}', 'C': '\u{1D5D0}', 'D': '\u{1D5D1}', 'E': '\u{1D5D2}', 'F': '\u{1D5D3}'
    };
    return text.split('').map(c => italicChars[c] || c).join('');
};

function senderJid(msg, chatId) {
    return msg?.key?.participant || msg?.participant || chatId;
}

function normalizePhone(value) {
    const phone = String(value || '').replace(/[^0-9]/g, '');
    return phone.length >= 10 && phone.length <= 15 ? phone : null;
}

async function createSubbotSession(parentSession, chatId, msg, mode, requestedNumber = '') {
    if (chatId.endsWith('@g.us')) {
        return parentSession.sock.sendMessage(chatId, { text: '🔒 Usa este comando en un chat privado para proteger el código o QR de vinculación.' }, { quoted: msg });
    }
    const ownerJid = senderJid(msg, chatId);
    const owned = Object.values(botData.subbots).filter(item => item.ownerJid === ownerJid && item.status !== 'revocado');
    if (owned.length >= 5) {
        return parentSession.sock.sendMessage(chatId, { text: '⚠️ Has alcanzado el límite de 5 subbots activos.' }, { quoted: msg });
    }
    const phone = mode === 'code' ? normalizePhone(requestedNumber) : null;
    if (mode === 'code' && !phone) {
        return parentSession.sock.sendMessage(chatId, { text: '📱 Uso: */code número*\nEjemplo: */code 18090000000*' }, { quoted: msg });
    }
    const sessionId = `sub_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
    botData.subbots[sessionId] = {
        ownerJid,
        mode,
        requestedNumber: phone || null,
        phoneNumber: null,
        status: 'pendiente',
        createdAt: new Date().toISOString()
    };
    saveBotData();
    const session = new BotSession(sessionId);
    session.subbotOwner = ownerJid;
    session.pairRequesterJid = ownerJid;
    session.requesterSock = parentSession.sock;
    session.subbotMode = mode;
    sessions[sessionId] = session;
    await parentSession.sock.sendMessage(chatId, {
        text: mode === 'code'
            ? '🔄 Preparando el código de vinculación del subbot. Espera unos segundos...'
            : '🔄 Preparando el QR de vinculación del subbot. Escanéalo cuando aparezca; caduca rápidamente.'
    }, { quoted: msg });
    try {
        await session.initialize(phone);
    } catch (error) {
        botData.subbots[sessionId].status = 'error';
        saveBotData();
        await parentSession.sock.sendMessage(chatId, { text: `❌ No se pudo iniciar el subbot: ${error.message}` }, { quoted: msg });
    }
}

class BotSession {
    constructor(userId) {
        this.userId = userId;
        this.sock = null;
        this.isConnected = false;
        this.aiEnabled = Boolean(botData.statusSettings[userId]?.aiEnabled);
        this.aiHistory = new Map();
        this.aiLastRequestAt = new Map();
        this.autoReact = botData.statusSettings[userId]?.autoReact || false;
        this.isPublic = botData.statusSettings[userId]?.isPublic !== undefined ? botData.statusSettings[userId].isPublic : true;
        this.authPath = path.join(AUTH_DIR, userId);
        this.processedMessages = new Set();
        this.activeInterval = null;
        this.isInitializing = false;
        this.userChats = {};
        this.lastConnectMessageTime = null;
        this.phoneNumber = null;
        this.requestedPhoneNumber = null;
        this.ghostMode = false;
        this.subbotMode = botData.subbots[userId]?.mode || 'bot';
        this.subbotOwner = botData.subbots[userId]?.ownerJid || null;
        this.pairRequesterJid = null;
        this.requesterSock = null;
        this.promoState = {};
    }

    sendLog(message, type = 'info') {
        const logEntry = { timestamp: new Date().toLocaleTimeString(), message, type };
        const socketId = userSockets[this.userId];
        if (socketId) io.to(socketId).emit('console', logEntry);
        console.log(`[${this.userId}] ${message}`);
    }

    sendConnectionStatus() {
        const socketId = userSockets[this.userId];
        if (socketId) {
            io.to(socketId).emit('connection-status', {
                connected: this.isConnected,
                user: this.userId
            });
        }
        const stats = getDashboardStats();
        io.emit('total-active', stats.activeSockets);
        io.emit('stats', stats);
    }

    async getAIResponse(userJid, userMessage, systemPrompt = "Helpful assistant.") {
        const prompt = String(userMessage || '').trim();
        if (!prompt) return '❌ Escribe una pregunta después de */ai*.';
        if (!openai) {
            console.error(`[AI] No hay una clave configurada para ${aiProvider}.`);
            return '❌ La IA no está configurada. Añade la clave del proveedor elegido y reinicia el servicio.';
        }
        try {
            const key = String(userJid || 'global');
            const now = Date.now();
            const lastRequest = this.aiLastRequestAt.get(key) || 0;
            if (now - lastRequest < 1200) return '⏳ Espera un momento antes de enviar otra pregunta.';
            this.aiLastRequestAt.set(key, now);
            const history = this.aiHistory.get(key) || [];
            const completion = await openai.chat.completions.create({
                model: aiModel,
                messages: [
                    { role: 'system', content: `${systemPrompt} Responde siempre en español, de forma clara, amable y útil. Si la pregunta está incompleta, haz una pregunta concreta para aclararla. Si puedes ayudar con pasos, entrégalos ordenados. No inventes datos: indica cuando no estés seguro. Eres el asistente de ᴊᴋ ʙᴏᴛꫂꤪꨤᴼᶠᶜ.` },
                    ...history,
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 700
            }, { timeout: 30000 });
            const content = completion.choices?.[0]?.message?.content;
            const answer = Array.isArray(content)
                ? content.map(part => typeof part === 'string' ? part : part?.text || '').join('').trim()
                : String(content || '').trim();
            if (answer) {
                const nextHistory = [...history, { role: 'user', content: prompt }, { role: 'assistant', content: answer }].slice(-12);
                this.aiHistory.set(key, nextHistory);
                return answer;
            }
            throw new Error('La API no devolvió texto.');
        } catch (error) {
            const status = error.status || error.response?.status;
            console.error('[AI] OpenAI error:', status || error.code || error.message);
            if (status === 401) return `❌ La clave de ${aiProvider} en Railway no es válida. Revisa la variable secreta del proveedor.`;
            if (status === 429) return '⏳ La IA alcanzó el límite temporal de solicitudes del proveedor.';
            if (error.code === 'ETIMEDOUT' || error.name === 'TimeoutError') return '⏳ La IA tardó demasiado en responder. Inténtalo otra vez.';
            return `❌ La IA no pudo responder ahora${status ? ` (HTTP ${status})` : ''}.`;
        }
    }

    clearAIHistory(userJid) {
        this.aiHistory.delete(String(userJid || 'global'));
    }

    setAIEnabled(enabled) {
        this.aiEnabled = Boolean(enabled);
        if (!botData.statusSettings[this.userId]) botData.statusSettings[this.userId] = {};
        botData.statusSettings[this.userId].aiEnabled = this.aiEnabled;
        saveBotData();
    }

    async generateAIImage(prompt) {
        return aiMedia.generateImage(openai, prompt);
    }

    async generateAIShortVideo(prompt) {
        const image = await this.generateAIImage(prompt);
        return aiMedia.imageToShortVideo(image);
    }

    startActiveCheck() {
        if (this.activeInterval) clearInterval(this.activeInterval);
        this.activeInterval = setInterval(async () => {
            if (this.isConnected && this.sock?.user) {
                try {
                    const botNumber = jidNormalizedUser(this.sock.user.id);
                    await this.sock.sendMessage(botNumber, {
                        text: "JK \u{1D5D4}\u{1D5E5}\u{1D5D8}-\u{1D5D3}\u{1D5E6}\u{1D601} \u{1D5F1}\u{1D600} \u{1D603}\u{1D608}\u{1D5F1}\u{1D5F1}\u{1D5F2}\u{1D5F7}\u{1D5F2} \u{1F680}\n\n_Connection check active._"
                    });
                    this.sendLog("Connection check sent to own DM. \u{2705}", "success");
                } catch (e) {
                    this.sendLog("Keep-alive failed: " + e.message, "error");
                }
            }
        }, 60 * 60 * 1000);
    }

    async initialize(pairingNumber = null) {
        if (this.isInitializing) {
            this.sendLog("Initialization already in progress...", "info");
            return;
        }
        if (pairingNumber) this.requestedPhoneNumber = normalizePhone(pairingNumber);
        this.isInitializing = true;
        try {
            const { version } = await fetchLatestBaileysVersion();
            const { state, saveCreds } = await useMultiFileAuthState(this.authPath);

            this.sock = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'fatal' })),
                },
                printQRInTerminal: false,
                logger: P({ level: 'fatal' }),
                browser: Browsers.macOS('Chrome'),
                syncFullHistory: false,
                shouldSyncHistoryMessage: () => false,
                markOnlineOnConnect: true,
                keepAliveIntervalMs: 30000,
                connectTimeoutMs: 60000,
                defaultQueryTimeoutMs: 60000,
                emitOwnEvents: true,
                retryRequestDelayMs: 5000,
                maxMsgRetryCount: 5,
                linkPreviewImageThumbnailWidth: 192,
                transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 3000 },
                getMessage: async (key) => {
                    if (messageLogs[key.id]) {
                        return { conversation: messageLogs[key.id].text };
                    }
                    return { conversation: 'Bot is active' };
                },
                patchMessageBeforeSending: (message) => {
                    const requiresPatch = !!(message.buttonsMessage || message.templateMessage || message.listMessage);
                    if (requiresPatch) {
                        return {
                            viewOnceMessage: {
                                message: {
                                    messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                                    ...message
                                }
                            }
                        };
                    }
                    return message;
                },
                generateHighQualityLinkPreview: true,
            });
            installWhatsAppBrand(this.sock);

            if (pairingNumber && !state.creds.registered) {
                const pairingSocketId = userSockets[this.userId];
                if (pairingSocketId) io.to(pairingSocketId).emit('pairing-started', 'Conectando con WhatsApp para generar tu código...');
                try {
                    // The WhatsApp transport can take longer than the old fixed 3-second delay.
                    // Retry the real Baileys request while the socket becomes ready, never inventing a code.
                    let code;
                    let lastError;
                    for (let attempt = 1; attempt <= 4 && !code; attempt += 1) {
                        try {
                            await delay(attempt === 1 ? 1200 : 2500);
                            code = await Promise.race([
                                this.sock.requestPairingCode(pairingNumber),
                                new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado al contactar WhatsApp.')), 15000))
                            ]);
                            if (!code || typeof code !== 'string') throw new Error('WhatsApp no devolvió un código.');
                        } catch (requestError) {
                            lastError = requestError;
                            this.sendLog(`Solicitud de código ${attempt}/4: ${requestError.message}`, 'warning');
                            if (attempt < 4) await delay(1500);
                        }
                    }
                    if (!code) throw lastError || new Error('WhatsApp no devolvió un código.');
                    code = code.replace(/[^A-Za-z0-9]/g, '').match(/.{1,4}/g)?.join('-') || code;
                    this.sendLog(`\u{1F511} Pairing Code: ${code}`, 'success');

                        if (this.tgChatId && tgBot) {
                            const codeMsg =
                                `\u{25EC}\u{2501}\u{2501}\u{2501}\u{3008} *ᴊᴋ ʙᴏᴛ CODE* \u{3009}\u{2501}\u{2501}\u{2501}\u{25EC}\n\n` +
                                `*\u{1F511} YOUR PAIRING CODE:* \`${code}\`\n\n` +
                                `_Enter this code in your WhatsApp Linked Devices section._\n\n` +
                                `> © POWERED BY ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ v4.1.0`;
                            await tgBot.sendMessage(this.tgChatId, codeMsg, { parse_mode: 'Markdown' });
                        }

                        if (pairingSocketId) io.to(pairingSocketId).emit('pairing-code', code);
                        if (this.subbotMode === 'code' && this.requesterSock && this.pairRequesterJid) {
                            await this.requesterSock.sendMessage(this.pairRequesterJid, {
                                text: `🔗 *VINCULAR WHATSAPP*

🔑 Código: *${code}*
📲 En WhatsApp: Dispositivos vinculados → Vincular con número
⏳ Úsalo antes de que caduque.`
                            });
                        }
                    } catch (err) {
                        this.isInitializing = false;
                        this.sendLog(`\u{274C} Pairing error: ${err.message}`, 'error');
                        const pairingSocketId = userSockets[this.userId];
                        if (pairingSocketId) io.to(pairingSocketId).emit('pair-error', `No se pudo generar el código: ${err.message}`);
                        if (this.tgChatId && tgBot) {
                            await tgBot.sendMessage(this.tgChatId, "\u{274C} Pairing Error: " + err.message);
                        }
                    }
            }

            this.sock.ev.on('creds.update', async (update) => {
                await saveCreds(update);
                // Las credenciales se actualizan con frecuencia; nunca deben
                // reemplazar el respaldo Premium por un payload incompleto.
                githubBackup.scheduleBackup({ dataFile: DATA_FILE, premiumDataFile: PREMIUM_DATA_FILE, authDir: AUTH_DIR, uploadsDir: UPLOADS_DIR });
            });

            this.sock.ev.on('call', async (calls) => {
                if (botData.antiCall[this.userId]) {
                    for (const call of calls) {
                        if (call.status === 'offer') {
                            try {
                                // Properly reject call
                                await this.sock.rejectCall(call.id, call.from);

                                // Send professional rejection message
                                await this.sock.sendMessage(call.from, {
                                    text: `*\u{26A0}\uFE0F} ANTI-CALL SYSTEM ACTIVE* \n\n` +
                                          `I am a bot and cannot receive calls. \n` +
                                          `Please send a text message instead. \n\n` +
                                          `> © POWERED BY ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ`
                                });
                            } catch (e) {}
                        }
                    }
                }
            });

            this.sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
                if (!id || !Array.isArray(participants)) return;
                try {
                    const meta = await this.sock.groupMetadata(id).catch(() => ({ subject: id, desc: '' }));
                    const groupName = meta.subject || id;
                    const mentions = participants;
                    const names = participants.map(jid => `@${String(jid).split('@')[0]}`).join(', ');
                    if ((action === 'add' || action === 'remove') && (action === 'add' ? botData.groupWelcome[id] : botData.groupBye[id])) {
                        const template = action === 'add'
                            ? (botData.groupWelcomeText[id] || '👋 ¡Bienvenido/a @user a @grupo!')
                            : (botData.groupByeText[id] || '👋 @user ha salido de @grupo.');
                        const text = template.replace(/@user/g, names).replace(/@grupo/g, groupName).replace(/@desc/g, meta.desc || '');
                        const welcomeMenu = action === 'add' ? '\n\n📚 *MENÚ DE BIENVENIDA*\n• /menu · comandos del bot\n• /warcraft · secciones del Warcraft RPG\n• /ayuda · instrucciones de comandos' : '';
                        await this.sock.sendMessage(id, { text: `${text}${welcomeMenu}`, mentions });
                    }
                    if (botData.groupAlerts[id] && (action === 'promote' || action === 'demote')) {
                        await this.sock.sendMessage(id, { text: `${action === 'promote' ? '⬆️' : '⬇️'} ${names} ${action === 'promote' ? 'ahora es administrador' : 'ya no es administrador'}.`, mentions });
                    }
                } catch (error) {
                    this.sendLog(`Group admin event error: ${error.message}`, 'warning');
                }
            });

            this.sock.ev.on('messages.upsert', async (m) => {
                if (m.type !== 'notify') return;

                await Promise.all(m.messages.map(async (msg) => {
                    if (msg.messageStubType === 1 || msg.messageStubType === 2) {
                        this.sendLog('Received an undecryptable message. This might be due to a session conflict.', 'warning');
                    }

                    try {
                        const from = msg.key.remoteJid;
                        const isMe = msg.key.fromMe;
                        const isGroup = from.endsWith('@g.us');
                        const isStatus = from === 'status@broadcast';

                        const messageContent = msg.message?.ephemeralMessage?.message || msg.message?.viewOnceMessage?.message || msg.message?.viewOnceMessageV2?.message || msg.message;
                        if (!messageContent) return;


                        let type = Object.keys(messageContent)[0];
                        let text = (messageContent.conversation || messageContent.extendedTextMessage?.text || messageContent.imageMessage?.caption || messageContent.videoMessage?.caption || '').trim();
                        const selectedRowId = messageContent.listResponseMessage?.singleSelectReply?.selectedRowId ||
                            messageContent.buttonsResponseMessage?.selectedButtonId ||
                            messageContent.templateButtonReplyMessage?.selectedId;
                        const flowParams = messageContent.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;
                        if (!selectedRowId && flowParams) {
                            try {
                                const parsed = JSON.parse(flowParams);
                                if (parsed.id) text = parsed.id;
                            } catch (e) {}
                        }
                        if (selectedRowId) text = selectedRowId;
                        if (text.startsWith('menu_')) text = `/${text.slice(5)}`;
                        if (text.startsWith('cmd_')) text = `/${text.slice(4)}`;

                        // Handle snipe for deleted messages
                        if (!isMe && !isStatus) {
                            await handleAutoread(this.sock, msg);
                            await storeMessage(msg);
                            handleSnipe(msg);
                        }

                        if (msg.message?.protocolMessage?.type === 0) {
                            await handleMessageRevocation(this.sock, msg);
                            return;
                        }

                        const msgId = msg.key.id;
                        if (this.processedMessages.has(msgId)) return;
                        this.processedMessages.add(msgId);
                        if (this.processedMessages.size > 1000) this.processedMessages.delete(this.processedMessages.values().next().value);
                        if (!isStatus) {
                            const senderJid = msg.key.participant || (isMe ? this.sock.user?.id : from);
                            recordRegisteredUser({ jid: senderJid, name: msg.pushName, sessionId: this.userId, chatId: from, isGroup });
                            let chatName = this.userChats?.[from]?.name || from;
                            if (isGroup && !this.userChats?.[from]?.name) {
                                try {
                                    const metadata = await this.sock.groupMetadata(from);
                                    chatName = metadata.subject || from;
                                    this.userChats[from] = { name: chatName };
                                } catch (e) {}
                            }
                        }

                        if (!isStatus) {
                            let logEntry = { text, type };
                            if (['imageMessage', 'videoMessage', 'audioMessage'].includes(type)) {
                                try {
                                    const mContent = messageContent[type];
                                    if (mContent && (mContent.directPath || mContent.url)) {
                                        const stream = await downloadContentFromMessage(mContent, type.replace('Message', ''));
                                        let buffer = Buffer.from([]);
                                        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                                        logEntry.buffer = buffer;
                                    }
                                } catch (e) {}
                            }
                            logEntry.pushName = msg.pushName || 'User';
                            messageLogs[msgId] = logEntry;
                            if (Object.keys(messageLogs).length > 2000) delete messageLogs[Object.keys(messageLogs)[0]];
                        }

                        // Auto-react
                        if (this.autoReact && !isMe && !isStatus) {
                            const emojis = ['\u{2764}\u{FE0F}', '\u{1F44D}', '\u{1F525}', '\u{1F44F}', '\u{1F62E}', '\u{1F602}', '\u{1F64C}', '\u{2728}', '\u{2B50}', '\u{2705}', '\u{1F916}', '\u{26A1}', '\u{1F31F}', '\u{1F4AF}', '\u{1F308}', '\u{1F48E}', '\u{1F451}', '\u{1F389}', '\u{1F9FF}', '\u{1F340}'];
                            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                            try { await this.sock.sendMessage(from, { react: { text: randomEmoji, key: msg.key } }); } catch (e) {}
                        }

                        // AI auto-reply
                        if (this.aiEnabled && !isMe && !isGroup && text && !/^\//.test(text.trim())) {
                            try {
                                const aiResponse = await this.getAIResponse(from, text);
                                await this.sock.sendMessage(from, { text: aiResponse }, { quoted: msg });
                            } catch (e) {
                                console.error("AI Auto-Reply Error:", e);
                            }
                        }

                        // Status handling
                        if (isStatus && !isMe) {
                            await handleStatusUpdate(this.sock, m, botData, this.userId);
                            return;
                        }

                        // =================== AUTHORIZATION FIX ===================
                        // THE FIX: Bot now works in ALL chats - personal, group, self

                        const botNumber = jidNormalizedUser(this.sock.user.id);

                        const sender = msg.key.participant || from;
                        const senderClean = sender.split('@')[0].split(':')[0].replace(/\D/g, '');
                        const botNumberClean = botNumber.split('@')[0].split(':')[0].replace(/\D/g, '');
                        const ownerIdentityCandidates = [
                            sender,
                            from,
                            msg.key.participantAlt,
                            msg.key.remoteJidAlt,
                            msg.key.senderPn,
                            msg.key.participantPn
                        ].filter(Boolean);
                        const ownerIdentityMatches = ownerIdentityCandidates.some(value =>
                            String(value).split('@')[0].split(':')[0].replace(/\D/g, '') === OWNER_WHATSAPP_NUMBER
                        );
                        const linkedOwnerSession = this.requestedPhoneNumber === OWNER_WHATSAPP_NUMBER;
                        // Owner is deliberately independent from Premium and environment configuration.
                        // Only the exact WhatsApp number 5350898613 may run Owner commands.
                        // For a self-chat, WhatsApp may omit the sender phone and only mark the message as fromMe.
                        const isOwner = ownerIdentityMatches || (isMe && (botNumberClean === OWNER_WHATSAPP_NUMBER || linkedOwnerSession));
                        const premiumIdentityCandidates = [...ownerIdentityCandidates, this.requestedPhoneNumber].filter(Boolean);

                        const isSessionUser = senderClean === this.phoneNumber || senderClean === this.userId || senderClean === botNumberClean;

                        // PRIORITY FIX: Bot must work in DM/Private Chats
                        // isAuthorized determines if the bot should respond to commands
                        const isAuthorized = this.isPublic || isOwner || isSessionUser || isMe;

                        let isAdmin = isOwner;
                        if (!isAdmin && isGroup) {
                            try {
                                const groupMetadata = await this.sock.groupMetadata(from);
                                const participant = groupMetadata.participants.find(p => p.id === sender);
                                isAdmin = participant && (participant.admin === 'admin' || participant.admin === 'superadmin');
                            } catch (e) {
                                isAdmin = false;
                            }
                        }

                        if (isGroup && !isAdmin && botData.mutedUsers?.[from]?.includes(sender)) {
                            try { await this.sock.sendMessage(from, { delete: msg.key }); } catch (e) {}
                            return;
                        }

                        // Moderación de contenido: aplica solo a participantes, nunca a admins.
                        if (isGroup && await commands.seguridad.enforce(this.sock, from, msg, botData, isAdmin, messageContent, text)) return;

                        // Anti-status in groups
                        if (isGroup && botData.antiStatusGroups && botData.antiStatusGroups[from] && !isAdmin) {
                            const isStatusMsg = msg.message?.protocolMessage?.type === 0 ||
                                           msg.message?.viewOnceMessage ||
                                           msg.message?.viewOnceMessageV2 ||
                                           msg.message?.viewOnceMessageV2Extension ||
                                           (text && (text.includes('whatsapp.com/channel/') || text.includes('status@broadcast')));

                            if (msg.message?.forwardingScore > 0 || isStatusMsg) {
                                try {
                                    await this.sock.sendMessage(from, { delete: msg.key });
                                    return;
                                } catch (e) {}
                            }
                        }

                        // Antilink
                        if (isGroup && botData.antilinkGroups[from] && !isAdmin) {
                            const linkPatterns = [/chat.whatsapp.com\//i, /http:\/\//i, /https:\/\//i, /www\./i, /[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/i];
                            if (linkPatterns.some(pattern => pattern.test(text))) {
                                try {
                                    const mode = botData.antilinkGroups[from];
                                    await this.sock.sendMessage(from, { delete: msg.key });
                                    if (mode === 'kick') await this.sock.groupParticipantsUpdate(from, [sender], "remove");
                                } catch (e) {}
                                return;
                            }
                        }

                        // Ghost mode - only restrict if enabled and NOT owner/session user
                        if (this.ghostMode && !isOwner && !isSessionUser) {
                            return;
                        }

                        // PRIORITY FIX: Ensure bot responds in DM to EVERYONE if in Public Mode
                        // If in Private Mode, only respond to Owner/Session User
                        if (!this.isPublic && !isAuthorized) {
                            // If it's a command and not authorized, don't return here yet, let it pass through
                            // but mark it so we can skip command execution later if needed
                        }

                        const stableSenderId = String(sender || '').split('@')[0].split(':')[0];
                        const ownerAuthKey = `${this.userId}:${stableSenderId}`;
                        const ownerMenuItems = ['public', 'private', 'mode', 'setname', 'block', 'unblock', 'restart', 'shutdown', 'bcall', 'bcgc', 'difunción'];
                        const verifyOwnerPassword = async (supplied) => {
                            const configuredPassword = String(process.env.ADMIN_PASSWORD || '');
                            const clean = String(supplied || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
                            const withoutTrailingStars = clean.replace(/\*+$/, '');
                            const configuredWithoutTrailingStars = configuredPassword.replace(/\*+$/, '');
                            if (!configuredPassword || (clean !== configuredPassword && withoutTrailingStars !== configuredWithoutTrailingStars)) {
                                await this.sock.sendMessage(from, { text: '❌ contraseña incorrecta' }, { quoted: msg });
                                return false;
                            }
                            pendingOwnerPasswords.delete(ownerAuthKey);
                            unlockedOwnerSessions.set(ownerAuthKey, Date.now());
                            await this.sock.sendMessage(from, { text: '✅ contraseña correcta' }, { quoted: msg });
                            await sendCategoryMenu(this.sock, from, msg, '👑 OWNER MENU', ownerMenuItems);
                            return true;
                        };
                        // Owner access is bound exclusively to 5350898613; no password prompt is shown.
                        if (/^\/pss(?:\s|$)/i.test(text.trim())) {
                            if (!isOwner) {
                                await this.sock.sendMessage(from, { text: '🚫 *ACCESO DENEGADO*\n\n👑 La zona Owner solo está disponible para el número autorizado.' }, { quoted: msg });
                            } else {
                                await sendCategoryMenu(this.sock, from, msg, '👑 OWNER MENU', ownerMenuItems);
                            }
                            return;
                        }
                        // Keep plain-text password input working as a fallback.
                        if (pendingOwnerPasswords.has(ownerAuthKey) && !/^\//.test(text.trim())) {
                            await verifyOwnerPassword(text);
                            return;
                        }

                        // Process commands
                        if (/^\//.test(text.trim())) {
                            // Re-check authorization for commands
                            if (!this.isPublic && !isAuthorized) return;
                            const normalizedCommandText = text.replace(/\r/g, '').trim();
                            const cmd = normalizedCommandText.toLowerCase();
                            let args = normalizedCommandText.split(/\s+/).slice(1);
                            let q = args.join(' ');
                            const rawCommandName = cmd.slice(1).split(/\s+/)[0];
                            let commandName = rawCommandName === 'dar' ? 'dar' : rawCommandName === 'ofrecer' ? 'ofrecer' : require('./lib/spanishCommands').canonicalCommand(rawCommandName);
                            if (rawCommandName === 'accept' && /^(?:rem|reembolso)$/i.test(args[0] || '')) { commandName = 'aceptarreembolso'; args = args.slice(1); q = args.join(' '); }
                            if (rawCommandName === 'cancel' && /^(?:rem|reembolso)$/i.test(args[0] || '')) { commandName = 'cancelarreembolso'; args = args.slice(1); q = args.join(' '); }
                            const requiresPremium = PREMIUM_COMMANDS.has(commandName) || OWNER_PASSWORD_COMMANDS.has(commandName) || PREMIUM_COMMANDS.has(rawCommandName) || OWNER_PASSWORD_COMMANDS.has(rawCommandName);
                            if (OWNER_PASSWORD_COMMANDS.has(commandName)) {
                                if (!isOwner) {
                                    await this.sock.sendMessage(from, { text: '🚫 *ACCESO DENEGADO*\n\n👑 Esta sección es exclusiva del número Owner autorizado.' }, { quoted: msg });
                                    return;
                                }
                                if (!isPremiumWhatsApp(premiumIdentityCandidates)) {
                                    await this.sock.sendMessage(from, { text: '💎 *PREMIUM REQUERIDO*\n\n👑 Tu número es el Owner autorizado, pero primero debes activar Premium con */reclamar <token>*.' }, { quoted: msg });
                                    return;
                                }
                                // The exact Owner number is already authenticated; never ask for a password.
                                unlockedOwnerSessions.set(ownerAuthKey, Date.now());
                            }
                            if (requiresPremium && !isPremiumWhatsApp([sender, from])) {
                                await this.sock.sendMessage(from, { text: '💎 *FUNCIÓN PREMIUM*\n\n🔒 Este comando requiere acceso Premium.\n🎟️ Reclama tu token con */reclamar <token>* para activarlo.' }, { quoted: msg });
                                return;
                            }
                            if (isGroup && botData.adminOnlyGroups?.[from] && !isAdmin && !['start', 'menu', 'admin', 'adminmenu', 'help', 'ayuda', 'id', 'ids', 'time', 'hora', 'note', 'nota', 'hi', 'meta', 'ia'].includes(commandName)) {
                                await this.sock.sendMessage(from, { text: '🔐 Este grupo está en modo Solo Admin.' }, { quoted: msg });
                                return;
                            }

                            (async () => {
                                try {
                                    // =================== 120+ COMMAND SWITCH ===================
                                    switch (commandName) {
                                        // ===== MENU =====
                                        case 'start': case 'inicio': case 'menu': case 'menú': {
                                            const customName = botData.userNames[this.userId] || msg.pushName || 'User';
                                            const menuText = decorateText(generateMenuText(customName, this));
                                            try {
                                                await sendOfficialChannelMenu(this.sock, from, menuText, msg);
                                            } catch (e) {
                                                this.sendLog(`Interactive menu fallback: ${e.message}`, 'warning');
                                                await this.sock.sendMessage(from, {
                                                    text: `${menuText}\n\n👑 ${settings.officialChannelName}:\n${settings.whatsappChannel}`
                                                }, { quoted: msg });
                                            }
                                            break;
                                        }
                                        case 'promo-jk-bot':
                                        case 'promojkbot':
                                        case 'promo':
                                            await promoJkBot(this.sock, from, msg, isOwner, this.promoState);
                                            break;
                                        case 'difunción':
                                        case 'difusión':
                                        case 'difusion':
                                        case 'difundir': {
                                            if (!q) {
                                                await this.sock.sendMessage(from, { text: '📣 *DIFUSIÓN OWNER*\n\nUso: */difunción mensaje*\n\nEl texto se enviará a todas las personas privadas registradas.' }, { quoted: msg });
                                                break;
                                            }
                                            await this.sock.sendMessage(from, { text: '📣 Iniciando difusión a los usuarios registrados…' }, { quoted: msg });
                                            const result = await broadcastToRegisteredUsers(q);
                                            await this.sock.sendMessage(from, { text: `✅ *DIFUSIÓN COMPLETADA*\n\n📨 Enviados: ${result.totalSent}\n❌ Fallidos: ${result.totalFailed}\n👥 Destinatarios: ${result.totalRecipients}` }, { quoted: msg });
                                            break;
                                        }
                                        case 'reclamar': {
                                            const tokenText = normalizePremiumToken(args.join(' '));
                                            const token = botData.premiumTokens[hashPremiumToken(tokenText)];
                                            const claimCandidates = [sender, from, this.requestedPhoneNumber].filter(Boolean);
                                            const claimJid = normalizePremiumJid(isOwner ? (this.requestedPhoneNumber || sender) : sender) || normalizePremiumJid(from);
                                            if (!tokenText) {
                                                await this.sock.sendMessage(from, { text: '🎟️ *ACTIVAR PREMIUM*\n\nEscribe */reclamar <token>* para activar tu acceso.\n✨ El token te dará acceso durante el tiempo indicado.' }, { quoted: msg });
                                                break;
                                            }
                                            if (!claimJid) {
                                                await this.sock.sendMessage(from, { text: '❌ No pude identificar tu número de WhatsApp. Intenta de nuevo desde un chat privado.' }, { quoted: msg });
                                                break;
                                            }
                                            if (!token) {
                                                await this.sock.sendMessage(from, { text: '❌ *TOKEN NO VÁLIDO*\n\nEl token no existe o ya fue utilizado.\n🔎 Revisa que lo hayas copiado completo.' }, { quoted: msg });
                                                break;
                                            }
                                            if (new Date(token.expiresAt).getTime() <= Date.now()) {
                                                await this.sock.sendMessage(from, { text: '⏳ *TOKEN EXPIRADO*\n\nEste token Premium ya no se puede activar.\n📩 Solicita uno nuevo al administrador.' }, { quoted: msg });
                                                break;
                                            }
                                            if (isPremiumWhatsApp(claimCandidates)) {
                                                await this.sock.sendMessage(from, { text: '✅ *YA TIENES PREMIUM*\n\nEste número ya cuenta con acceso Premium activo.' }, { quoted: msg });
                                                break;
                                            }
                                            const claims = Array.isArray(token.claimedBy) ? token.claimedBy : (token.claimedBy ? [token.claimedBy] : []);
                                            const maxClaims = Math.min(5, Math.max(1, Number(token.maxClaims) || 5));
                                            if (claims.length >= maxClaims) {
                                                await this.sock.sendMessage(from, { text: `❌ *TOKEN COMPLETO*\n\nEste token ya fue reclamado por ${claims.length}/${maxClaims} personas.\n📩 Solicita otro token al administrador.` }, { quoted: msg });
                                                break;
                                            }
                                            botData.premiumUsers[claimJid] = {
                                                grantedAt: new Date().toISOString(),
                                                expiresAt: token.expiresAt,
                                                source: 'token',
                                                // Keep the original JIDs too: WhatsApp may expose a phone JID, device JID or @lid.
                                                jids: [...new Set(claimCandidates.map(value => String(value).trim().toLowerCase()).filter(Boolean))]
                                            };
                                            token.maxClaims = maxClaims;
                                            token.claimedBy = [...claims, claimJid];
                                            token.claimedAt = [...(Array.isArray(token.claimedAt) ? token.claimedAt : token.claimedAt ? [token.claimedAt] : []), new Date().toISOString()];
                                            saveBotData({ backupNow: true });
                                            const grantedUntil = new Date(token.expiresAt).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });
                                            await this.sock.sendMessage(from, { text: `🎉 *¡PREMIUM ACTIVADO!*\n\n✅ Tu acceso fue confirmado correctamente.\n🪪 Usuario: ${claimJid.split('@')[0]}\n📊 Token reclamado: *${token.claimedBy.length}/${maxClaims}*\n📅 Válido hasta: *${grantedUntil}*\n🔐 Ya puedes usar las funciones Premium.\n\n💡 Guarda este mensaje para recordar la fecha de vencimiento.` }, { quoted: msg });
                                            break;
                                        }
                                        case 'book':
                                            await this.sock.sendMessage(from, { text: '📚 *BOOK PREMIUM*\n\n🔐 Tu cuenta tiene acceso a funciones exclusivas.\n\n👤 /owner\n🛠️ /toolsmenu\n👑 /ownermenu\n🐛 /bugmenu\n\nUsa */menu* para volver al menú principal.' }, { quoted: msg });
                                            break;
                                        case 'allmenu':
                                            await sendCategoryMenu(this.sock, from, msg, '✨ TODOS LOS COMANDOS', ['menu', ...Object.keys(commands).filter(name => name !== 'utils')]);
                                            break;
                                        case 'help': case 'ayuda':
                                            await commands.help(this.sock, from, msg, q);
                                            break;
                                        case 'id': case 'ids':
                                            await commands.id(this.sock, from, msg);
                                            break;
                                        case 'time': case 'hora':
                                            await commands.time(this.sock, from, msg, q);
                                            break;
                                        case 'note': case 'nota':
                                            await commands.note(this.sock, from, msg, q, botData, saveBotData);
                                            break;
                                        case 'uuid': case 'guid':
                                            await commands.uuid(this.sock, from, msg, q);
                                            break;
                                        case 'hash': case 'sha256':
                                            await commands.hash(this.sock, from, msg, commandName === 'sha256' ? `sha256 ${q}` : q);
                                            break;
                                        case 'timestamp': case 'unix': case 'epoch':
                                            await commands.timestamp(this.sock, from, msg, q);
                                            break;
                                        case 'age': case 'edad':
                                            await commands.age(this.sock, from, msg, q);
                                            break;
                                        case 'convert': case 'conversion':
                                            await commands.convert(this.sock, from, msg, q);
                                            break;
                                        case 'json': case 'jsonformat':
                                            await commands.json(this.sock, from, msg, q);
                                            break;
                                        case 'ownermenu': await sendCategoryMenu(this.sock, from, msg, '👑 OWNER MENU', ownerMenuItems); break;
                                        case 'groupmenu': await sendCategoryMenu(this.sock, from, msg, '👥 Control de grupos', ['kick', 'ban', 'add', 'promote', 'demote', 'mute', 'unmute', 'tagall', 'hidetag', 'grouplink', 'groupinfo']); break;
                                        case 'seguridad': await sendCategoryMenu(this.sock, from, msg, '🛡️ Seguridad del grupo', ['antilink', 'antiporno', 'antifoto', 'antivideo', 'antiaudio', 'antisticker', 'antidocumento', 'antimedia', 'antispam', 'welcome', 'setwelcome']); break;
                                        case 'admin': case 'adminmenu': await sendCategoryMenu(this.sock, from, msg, '🛡️ Seguridad', ['open', 'close', 'grouplink', 'revoke', 'add', 'kick', 'ban', 'promote', 'demote', 'tagall', 'hidetag', 'mute', 'unmute', 'mutelist', 'antilink', 'onlyadmin', 'alertas', 'welcome', 'bye', 'setwelcome', 'setbye', 'testwelcome', 'testbye', 'setdesc', 'setppgc', 'antiporno', 'antifoto', 'antivideo', 'antiaudio', 'antisticker', 'antidocumento', 'antimedia', 'antispam']); break;
                                        case 'download':
                                        case 'downloadmenu': await sendCategoryMenu(this.sock, from, msg, '⬇️ DOWNLOAD MENU', ['song', 'video', 'youtube', 'insta', 'tiktok', 'facebook', 'spotify', 'apk', 'playstore', 'mf', 'gdrive']); break;
                                        case 'aimenu': await sendCategoryMenu(this.sock, from, msg, '🤖 AI MENU', ['ai', 'chatbot', 'aiclear', 'imagen', 'videoia', 'gali']); break;
                                        case 'economymenu': await sendCategoryMenu(this.sock, from, msg, '🪙 ECONOMY MENU', ['balance', 'baltop', 'daily', 'work', 'deposit', 'withdraw', 'pay', 'coinflip', 'roulette', 'crime', 'rob', 'slut', 'einfo']); break;
                                        case 'subbotmenu': case 'subbots': await sendSubmenuWithChannel(this.sock, from, '🤖 *VINCULACIÓN DE SUBBOTS*\n\n🔐 */code número*\nGenera un código para vincular otro número como subbot.\n\n📲 */qr*\nGenera un QR temporal para vincular otro número como subbot.\n\n🔒 Usa estos comandos en un chat privado.', msg); break;
                                        case 'tools': case 'toolsmenu': await sendCategoryMenu(this.sock, from, msg, '🛠️ MENÚ DE HERRAMIENTAS', ['help', 'id', 'time', 'note', 'hi', 'meta', 'ia', 'uuid', 'hash', 'timestamp', 'age', 'convert', 'json', 'ping', 'dp', 'vv', 'translate', 'base64', 'qr', 'shorturl', 'calc', 'weather', 'github', 'ipinfo', 'tempmail', 'fakeinfo', 'binlookup', 'whois', 'dnslookup', 'portscan', 'screenshot', 'define', 'google', 'wiki', 'yts', 'playstore', 'npm']); break;
                                        case 'funmenu': await sendCategoryMenu(this.sock, from, msg, '🎉 FUN MENU', ['joke', 'meme', 'dare', 'truth', 'ascii', 'roast', 'compliment', 'ship', 'emojimix', 'character', 'quote', 'fact', 'trivia', 'coinflip', 'roll', 'riddle', 'wouldyourather']); break;
                                        case 'gamemenu': await sendCategoryMenu(this.sock, from, msg, '🎮 MÓDULOS DE JUEGO', ['warcraft', 'balance', 'baltop', 'daily', 'work', 'deposit', 'withdraw', 'pay', 'coinflip', 'roulette', 'crime', 'rob', 'slut', 'einfo']); break;
                                        case 'economy': await commands.economy(this.sock, from, msg, commandName, q, botData, saveBotData, '/'); break;
                                        case 'warcraft': case 'warcraftmenu': case 'ayudaw': case 'comandosw': case 'tutorialw': case 'tutorialwarcraft': case 'mapaw': case 'zonasw': case 'viajarw': case 'profesionesw': case 'aprenderw': case 'recolectarw': case 'recetasw': case 'fabricarw': case 'diariaw': case 'logrosw': case 'monturasw': case 'comprarmonturaw': case 'grupow': case 'subastaw': case 'venderw': case 'comprarsubastaw': case 'correow': case 'reclamarmailw': case 'enviarmailw': case 'encantamientosw': case 'encantarw': case 'pjnombre': case 'clase': case 'loginw': case 'estadow': case 'statusw': case 'personajew': case 'inventariow': case 'equiparw': case 'usarw': case 'pocionw': case 'enemigosw': case 'buscarw': case 'cazarw': case 'atacarw': case 'atacar': case 'attackw': case 'habilidadw': case 'skillw': case 'hechizow': case 'huirw': case 'misionesw': case 'mazmorrasw': case 'mazmorraw': case 'tiendaw': case 'comprarw': case 'confirmarcompra': case 'cancelarcompra': case 'talentosw': case 'guildw': case 'duelo': case 'desafiar': case 'aceptarduel': case 'aceptarduelo': case 'atacarduel': case 'dueloatacar': case 'habilidadduel': case 'rendirse': case 'comerciar': case 'trade': case 'dar': case 'ofrecer': case 'darporreembolso': case 'reembolso': case '-reembolso': case 'aceptarreembolso': case 'cancelarreembolso': case 'aceptc': case 'cancelc': if (['warcraft', 'warcraftmenu', 'ayudaw', 'comandosw'].includes(commandName) && !q.trim()) await sendWarcraftCommandMenu(this.sock, from, msg); else { let changed = false; const saveWarcraftData = (...saveArgs) => { changed = true; return saveBotData(...saveArgs); }; await commands.warcraft(this.sock, from, msg, commandName, q, botData, saveWarcraftData); if (changed) notifyWarcraftUpdate(); } break;
                                        case 'open': case 'abrir': await commands.open(this.sock, from, msg, isAdmin, q); break;
                                        case 'close': case 'cerrar': await commands.close(this.sock, from, msg, isAdmin, q); break;
                                        case 'onlyadmin': case 'adminonly': await commands.onlyadmin(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'alertas': case 'alerts': case 'avisos': await commands.alertas(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'antiporno': case 'antifoto': case 'antivideo': case 'antiaudio': case 'antisticker': case 'antidocumento': case 'antimedia': case 'antispam': await commands.seguridad.command(this.sock, from, msg, isAdmin, botData, saveBotData, args, commandName); break;
                                        case 'welcome': case 'bienvenida': await commands.welcome(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'bye': case 'despedida': await commands.bye(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'setwelcome': await commands.setwelcome(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'setbye': case 'setdespedida': await commands.setbye(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'testwelcome': await commands.testwelcome(this.sock, from, msg, isAdmin, botData); break;
                                        case 'testbye': await commands.testbye(this.sock, from, msg, isAdmin, botData); break;
                                        case 'profilemenu': await sendCategoryMenu(this.sock, from, msg, '👤 PROFILE MENU', ['profile', 'marry', 'divorce', 'history', 'pfp', 'setbio', 'setbirthday', 'setgenre']); break;
                                        case 'profile': case 'perfil': case 'user': case 'marry': case 'casar': case 'divorce': case 'divorciar':
                                        case 'history': case 'historial': case 'historialmatrimonial': case 'marryhistory': case 'pfp': case 'getpfp': case 'foto': case 'avatar':
                                        case 'setbio': case 'setdescription': case 'setdescperfil': case 'setbirth': case 'setcumple': case 'setbirthday': case 'setgenre': case 'setgenero':
                                            await commands.profile(this.sock, from, msg, commandName, q, botData, saveBotData, '/'); break;
                                        case 'balance': case 'bal': case 'coins':
                                        case 'baltop': case 'eboard': case 'economytop':
                                        case 'cf': case 'coinflip': case 'flip': case 'crime': case 'daily':
                                        case 'deposit': case 'dep': case 'd': case 'einfo': case 'economyinfo': case 'cooldowns':
                                        case 'pay': case 'transfer': case 'give': case 'rt': case 'ruleta': case 'roulette': case 'rtl':
                                        case 'slut': case 'rob': case 'steal': case 'robar': case 'with': case 'withdraw': case 'retirar': case 'wd':
                                        case 'work': case 'w': await commands.economy(this.sock, from, msg, commandName, q, botData, saveBotData, '/'); break;
                                        case 'animemenu': await sendCategoryMenu(this.sock, from, msg, '🎌 ANIME MENU', ['anime', 'angry', 'bath', 'bite', 'bleh', 'blush', 'bored', 'coffee', 'cry', 'cuddle', 'dance', 'drunk', 'eat', 'handhold', 'happy', 'highfive', 'hug', 'jump', 'kill', 'kiss', 'kisscheek', 'laugh', 'lick', 'love', 'nope', 'pat', 'pout', 'punch', 'push', 'run', 'sad', 'scared', 'seduce', 'shy', 'slap', 'sleep', 'smile', 'smoke', 'spit', 'step', 'think', 'walk', 'wave', 'wink', 'manga']); break;
                                        case 'stickermenu': await sendCategoryMenu(this.sock, from, msg, '🏷️ STICKER MENU', ['sticker', 'textsticker', 'emojimix', 'toimg']); break;
                                        case 'imagemenu': await sendCategoryMenu(this.sock, from, msg, '🖼️ IMAGE MENU', ['blur', 'invert', 'crop', 'flip', 'grayscale', 'removebg', 'enlarge', 'upscale']); break;
                                        case 'textmakermenu': await sendCategoryMenu(this.sock, from, msg, '✏️ TEXT MAKER MENU', ['ascii', 'base64', 'binary', 'morse', 'qr']); break;
                                        case 'logomenu': await sendCategoryMenu(this.sock, from, msg, '🏢 LOGOS', ['logo']); break;
                                        case 'miscmenu': await sendCategoryMenu(this.sock, from, msg, '🎯 MISC MENU', ['runtime', 'uptime', 'serverinfo', 'speedtest', 'device', 'report', 'news', 'movie']); break;
                                        case 'bugmenu': case 'bugs': {
                                            await sendCategoryMenu(this.sock, from, msg, '🐛 BUG MENU', ['crash', 'freeze', 'bug']);
                                            break;
                                        }

                                        // ===== MEDIA & DOWNLOAD =====
                                        case 'song': await commands.song(this.sock, from, msg); break;
                                        case 'video': await commands.video(this.sock, from, msg); break;
                                        case 'youtube': case 'yt': await commands.youtube(this.sock, from, msg, q); break;
                                        case 'insta': case 'ig': await commands.insta(this.sock, from, msg, q); break;
                                        case 'tiktok': case 'tt': await commands.tiktok(this.sock, from, msg, q); break;
                                        case 'facebook': case 'fb': await commands.facebook(this.sock, from, msg); break;
                                        case 'pinterest': case 'pin': await commands.pinterest(this.sock, from, msg, q); break;
                                        case 'twitter': case 'x': case 'twit': await commands.twitter(this.sock, from, msg, q); break;
                                        case 'reddit': await commands.reddit(this.sock, from, msg, q); break;
                                        case 'spotify': case 'spot': await commands.spotify(this.sock, from, msg, q); break;
                                        case 'mediafire': case 'mf': await commands.mf(this.sock, from, msg, q); break;
                                        case 'gdrive': await commands.gdrive(this.sock, from, msg, q); break;
                                        case 'apk': case 'game': case 'juego': await commands.apk(this.sock, from, msg); break;
                                        case 'playstore': case 'ps': case 'tienda': await commands.playstore(this.sock, from, msg, q); break;

                                        // ===== GROUP MANAGEMENT =====
                                        case 'kick': case 'ban': await commands.kick(this.sock, from, msg, isAdmin); break;
                                        case 'add': await commands.add(this.sock, from, msg, isAdmin, q); break;
                                        case 'promote': await commands.promote(this.sock, from, msg, isAdmin); break;
                                        case 'demote': await commands.demote(this.sock, from, msg, isAdmin); break;
                                        case 'revoke': await commands.revoke(this.sock, from, msg, isAdmin); break;
                                        case 'invite': await commands.invite(this.sock, from, msg, isAdmin); break;
                                        case 'grouplink': case 'gclink': case 'link': case 'enlace': await commands.grouplink(this.sock, from, msg, isAdmin); break;
                                        case 'mute': await commands.mute(this.sock, from, msg, isAdmin, q, botData, saveBotData); break;
                                        case 'unmute': await commands.unmute(this.sock, from, msg, isAdmin, q, botData, saveBotData); break;
                                        case 'mutelist': case 'listmute': case 'silenciados': case 'muteds': await commands.mutelist(this.sock, from, msg, isAdmin, botData); break;
                                        case 'join': await commands.join(this.sock, from, msg, q); break;
                                        case 'leave': await commands.leave(this.sock, from, msg, isAdmin); break;
                                        case 'setdesc': await commands.setdesc(this.sock, from, msg, isAdmin, q); break;
                                        case 'setppgc': await commands.setppgc(this.sock, from, msg, isAdmin); break;
                                        case 'getbio': await commands.getbio(this.sock, from, msg, q); break;
                                        case 'getdp': await commands.getdp(this.sock, from, msg, q); break;
                                        case 'tagadmin': await commands.tagadmin(this.sock, from, msg, isAdmin); break;
                                        case 'kickoffline': await commands.kickoffline(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'hidetag': case 'notify': case 'tag': case 'n': case 'avisar': await commands.hidetag(this.sock, from, msg, isAdmin, q); break;
                                        case 'tagall': await commands.tagall(this.sock, from, msg, isAdmin, q); break;
                                        case 'groupinfo': case 'ginfo': await commands.groupinfo(this.sock, from, msg); break;
                                        case 'accept': await commands.accept(this.sock, from, msg, isAdmin); break;
                                        case 'poll': await commands.poll(this.sock, from, msg, q); break;
                                        case 'everyonemsg': await commands.everyonemsg(this.sock, from, msg, isAdmin, q); break;
                                        case 'listonline': await commands.listonline(this.sock, from, msg); break;

                                        // ===== ADMIN / OWNER =====
                                        case 'private':
                                            await commands.private(this.sock, from, msg, isAdmin, this);
                                            if (!botData.statusSettings[this.userId]) botData.statusSettings[this.userId] = {};
                                            botData.statusSettings[this.userId].isPublic = false;
                                            saveBotData();
                                            break;
                                        case 'public':
                                            await commands.public(this.sock, from, msg, isAdmin, this);
                                            if (!botData.statusSettings[this.userId]) botData.statusSettings[this.userId] = {};
                                            botData.statusSettings[this.userId].isPublic = true;
                                            saveBotData();
                                            break;
                                        case 'owner': await commands.owner(this.sock, from, msg); break;
                                        case 'setname': await commands.setname(this.sock, from, msg, isOwner, botData, saveBotData, this.userId, q); break;
                                        case 'block': await commands.block(this.sock, from, msg, isOwner, q); break;
                                        case 'unblock': await commands.unblock(this.sock, from, msg, isOwner, q); break;
                                        case 'bcgc': await commands.bcgc(this.sock, from, msg, isOwner, q); break;
                                        case 'bcall': await commands.bcall(this.sock, from, msg, isOwner, q); break;
                                        case 'restart': await commands.restart(this.sock, from, msg, isOwner); break;
                                        case 'shutdown': await commands.shutdown(this.sock, from, msg, isOwner); break;
                                        case 'mode': await commands.mode(this.sock, from, msg, isOwner, this); break;
                                        case 'deleteall': await commands.deleteall(this.sock, from, msg, isOwner, q); break;
                                        case 'clone': await commands.clone(this.sock, from, msg, isOwner, q); break;

                                        // ===== PROTECTION =====
                                        case 'antilink': await commands.antilink(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'anticall': await commands.anticall(this.sock, from, msg, isAdmin, botData, saveBotData, this.userId, args); break;
                                        case 'antidelete': await commands.antidelete(this.sock, from, msg, isAdmin, botData, saveBotData, this.userId, args); break;
                                        case 'antistatus': await commands.antistatus(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'antibug': await commands.antibug(this.sock, from, msg, isOwner, botData, saveBotData, args); break;

                                        // ===== STATUS / AUTO =====
                                        case 'status':
                                        case 'autostatus': await commands.autostatus(this.sock, from, msg, isAdmin, botData, saveBotData, this.userId, args); break;
                                        case 'autoreacts': await commands.autoreacts(this.sock, from, msg, isAdmin, this, args); break;
                                        case 'autoread': await commands.autoread(this.sock, from, msg); break;

                                        // ===== AI =====
                                        case 'ai': await commands.ai(this.sock, from, msg, isAdmin, this, args); break;
                                        case 'chatbot': await commands.chatbot(this.sock, from, msg, this, args); break;
                                        case 'imagen': case 'image': case 'imagine': await commands.imagine(this.sock, from, msg, this, args); break;
                                        case 'videoia': case 'aivideo': await commands.aivideo(this.sock, from, msg, this, args); break;
                                        case 'aiclear': case 'clearai': await commands.aiclear(this.sock, from, msg, this); break;
                                        case 'gali': await commands.gali(this.sock, from, msg, this, args); break;

                                        // ===== FUN =====
                                        case 'joke': await commands.joke(this.sock, from, msg); break;
                                        case 'meme': await commands.meme(this.sock, from, msg); break;
                                        case 'dare': await commands.dare(this.sock, from, msg); break;
                                        case 'truth': await commands.truth(this.sock, from, msg); break;
                                        case 'ascii': await commands.ascii(this.sock, from, msg, q); break;
                                        case 'roast': await commands.roast(this.sock, from, msg); break;
                                        case 'compliment': await commands.compliment(this.sock, from, msg); break;
                                        case 'ship': await commands.ship(this.sock, from, msg); break;
                                        case 'emojimix': await commands.emojimix(this.sock, from, msg); break;
                                        case 'character': await commands.character(this.sock, from, msg); break;
                                        case 'quote': await commands.quote(this.sock, from, msg); break;
                                        case 'fact': await commands.fact(this.sock, from, msg); break;
                                        case 'trivia': await commands.trivia(this.sock, from, msg); break;
                                        case 'coinflip': case 'cf': await commands.coinflip(this.sock, from, msg); break;
                                        case 'roll': await commands.roll(this.sock, from, msg, q); break;
                                        case 'riddle': await commands.riddle(this.sock, from, msg); break;
                                        case 'wyr': case 'wouldyourather': await commands.wouldyourather(this.sock, from, msg); break;
                                        case 'angry': case 'enojar': case 'bath': case 'bite': case 'morder': case 'bleh': case 'blush': case 'bored': case 'aburrido':
                                        case 'coffee': case 'cafe': case 'cry': case 'llorar': case 'cuddle': case 'dance': case 'bailar': case 'drunk': case 'eat': case 'comer':
                                        case 'handhold': case 'happy': case 'feliz': case 'highfive': case 'hug': case 'abrazo': case 'jump': case 'kill': case 'matar':
                                        case 'kiss': case 'muak': case 'kisscheek': case 'beso': case 'laugh': case 'lick': case 'love': case 'amor': case 'nope': case 'pat':
                                        case 'pout': case 'punch': case 'pegar': case 'push': case 'run': case 'correr': case 'sad': case 'triste': case 'scared': case 'seduce':
                                        case 'seducir': case 'shy': case 'timido': case 'slap': case 'sleep': case 'smile': case 'sonreir': case 'smoke': case 'fumar':
                                        case 'spit': case 'escupir': case 'step': case 'pisar': case 'think': case 'walk': case 'wave': case 'hola': case 'wink':
                                            await commands.anime(this.sock, from, msg, commandName, q); break;

                                        // ===== TOOLS =====
                                        case 'code': await createSubbotSession(this, from, msg, 'code', q); break;
                                        case 'ping': case 'velocidad': await commands.ping(this.sock, from, msg); break;
                                        case 'dp': case 'foto': case 'fotoperfil': await commands.dp(this.sock, from, msg); break;
                                        case 'vv': case 'veruna': await commands.vv(this.sock, from, msg); break;
                                        case 'translate': case 'trt': case 'traducir': case 'traduce': await commands.translate(this.sock, from, msg, q); break;
                                        case 'base64': await commands.base64(this.sock, from, msg, q); break;
                                        case 'qr':
                                            if (q && !/^(subbot|vincular)$/i.test(q.trim())) await commands.qr(this.sock, from, msg, q);
                                            else await createSubbotSession(this, from, msg, 'qr');
                                            break;
                                        case 'codigoqr': await commands.qr(this.sock, from, msg, q); break;
                                        case 'shorturl': case 'tinyurl': case 'acortar': await commands.utils.short(this.sock, from, msg, q); break;
                                        case 'calc': case 'math': case 'calcular': await commands.utils.calc(this.sock, from, msg, q); break;
                                        case 'weather': case 'clima': await commands.utils.weather(this.sock, from, msg, q); break;
                                        case 'github': case 'gh': await commands.utils.github(this.sock, from, msg, q); break;
                                        case 'ipinfo': case 'infoip': await commands.utils.ip(this.sock, from, msg, q); break;
                                        case 'tempmail': case 'correotemporal': await commands.tempmail(this.sock, from, msg); break;
                                        case 'fakeinfo': case 'datosfalsos': await commands.fakeinfo(this.sock, from, msg); break;
                                        case 'binlookup': case 'bin': await commands.binlookup(this.sock, from, msg, q); break;
                                        case 'whois': await commands.whois(this.sock, from, msg, q); break;
                                        case 'dnslookup': case 'dns': await commands.dnslookup(this.sock, from, msg, q); break;
                                        case 'portscan': case 'scan': case 'escaneo': await commands.portscan(this.sock, from, msg, q); break;
                                        case 'screenshot': case 'ss': case 'captura': await commands.screenshot(this.sock, from, msg, q); break;
                                        case 'define': case 'dictionary': case 'definir': await commands.utils.dict(this.sock, from, msg, q); break;
                                        case 'google': case 'gsearch': case 'buscar': await commands.google(this.sock, from, msg, q); break;
                                        case 'wiki': case 'wikipedia': await commands.utils.wiki(this.sock, from, msg, q); break;
                                        case 'yts': case 'ytsearch': case 'buscarvideo': await commands.yts(this.sock, from, msg, q); break;
                                        case 'npm': case 'paquete': await commands.npm(this.sock, from, msg, q); break;
                                        case 'sticker': case 's': case 'textsticker': await commands.sticker(this.sock, from, msg, q); break;
                                        case 'toimg': case 'img': await commands.toimg(this.sock, from, msg); break;
                                        case 'tomp3': case 'mp3': await commands.tomp3(this.sock, from, msg); break;
                                        case 'tts': await commands.tts(this.sock, from, msg, q); break;
                                        case 'blur': await commands.blur(this.sock, from, msg); break;
                                        case 'invert': await commands.invert(this.sock, from, msg); break;
                                        case 'crop': await commands.crop(this.sock, from, msg); break;
                                        case 'flip': await commands.flip(this.sock, from, msg); break;
                                        case 'grayscale': case 'grey': await commands.grayscale(this.sock, from, msg); break;
                                        case 'removebg': case 'nobg': await commands.removebg(this.sock, from, msg); break;
                                        case 'enlarge': case 'upscale': await commands.enlarge(this.sock, from, msg); break;

                                        // ===== DANGEROUS / KHATARNAK (LIMITED TO 3 SPAM) =====
                                        case 'report': await commands.report(this.sock, from, msg, q); break;
                                        case 'spam': await commands.spam(this.sock, from, msg, q); break;
                                        case 'smsbomb': case 'sms': await commands.smsbomb(this.sock, from, msg, q); break;
                                        case 'callbomb': case 'cbomb': await commands.callbomb(this.sock, from, msg, q); break;
                                        case 'crash': await commands.crash(this.sock, from, msg, isOwner, q); break;
                                        case 'freeze': await commands.freeze(this.sock, from, msg, isOwner, q); break;
                                        case 'bug': case 'bugs': await commands.bug(this.sock, from, msg, isOwner, q); break;
                                        case 'xrestart': await commands.xrestart(this.sock, from, msg, isOwner); break;
                                        case 'xshutdown': await commands.xshutdown(this.sock, from, msg, isOwner); break;
                                        case 'ghostmode': case 'ghost': await commands.ghostmode(this.sock, from, msg, isOwner, this, args); break;
                                        case 'nuke': await commands.nuke(this.sock, from, msg, isOwner); break;

                                        // ===== ISLAMIC =====
                                        case 'quran': await commands.quran(this.sock, from, msg, q); break;
                                        case 'hadith': await commands.hadith(this.sock, from, msg, q); break;
                                        case 'prayer': case 'salah': await commands.prayer(this.sock, from, msg, q); break;
                                        case 'qibla': await commands.qibla(this.sock, from, msg, q); break;
                                        case 'asmaulhusna': case 'asma': await commands.asmaulhusna(this.sock, from, msg, q); break;

                                        // ===== SYSTEM INFO =====
                                        case 'uptime': await commands.uptime(this.sock, from, msg); break;
                                        case 'serverinfo': case 'si': await commands.serverinfo(this.sock, from, msg); break;
                                        case 'speedtest': case 'speed': await commands.speedtest(this.sock, from, msg); break;
                                        case 'device': case 'dev': await commands.device(this.sock, from, msg); break;
                                        case 'runtime': case 'rt': await commands.runtime(this.sock, from, msg); break;

                                        // ===== UTILITIES =====
                                        case 'timer': await commands.timer(this.sock, from, msg, q); break;
                                        case 'password': case 'pass': await commands.password(this.sock, from, msg, q); break;
                                        case 'morse': await commands.morse(this.sock, from, msg, q); break;
                                        case 'binary': case 'bin': await commands.binary(this.sock, from, msg, q); break;
                                        case 'hex': await commands.hex(this.sock, from, msg, q); break;
                                        case 'pastebin': case 'paste': await commands.pastebin(this.sock, from, msg, q); break;
                                        case 'news': await commands.news(this.sock, from, msg, q); break;
                                        case 'crypto': case 'coin': await commands.crypto(this.sock, from, msg, q); break;
                                        case 'movie': case 'imdb': await commands.movie(this.sock, from, msg, q); break;
                                        case 'anime': await commands.anime(this.sock, from, msg, 'anime', q); break;
                                        case 'manga': await commands.manga(this.sock, from, msg, q); break;
                                        case 'logo': await commands.logo(this.sock, from, msg, q); break;
                                        case 'lyrics': await commands.lyrics(this.sock, from, msg, q); break;
                                        case 'remind': case 'reminder': await commands.remind(this.sock, from, msg, q); break;
                                        case 'tagme': await commands.tagme(this.sock, from, msg); break;
                                        case 'mention': await commands.mention(this.sock, from, msg, q); break;
                                        case 'snipe': await commands.snipe(this.sock, from, msg); break;
                                        case 'editmsg': await commands.editmsg(this.sock, from, msg, q); break;
                                        case 'react': await commands.react(this.sock, from, msg, q); break;
                                        case 'send': await commands.send(this.sock, from, msg, isOwner, q); break;
                                        case 'forward': case 'fwd': await commands.forward(this.sock, from, msg, isOwner, q); break;
                                        case 'clear': await commands.clear(this.sock, from, msg); break;
                                        case 'save': await commands.save(this.sock, from, msg); break;
                                        case 'hack': await commands.hack(this.sock, from, msg, q); break;
                                        case 'repo': await commands.repo(this.sock, from, msg, args); break;
                                        case 'backup': await commands.backup(this.sock, from, msg, isOwner); break;
                                        case 'restore': await commands.restore(this.sock, from, msg, isOwner); break;
                                        case 'mycmd': case 'mycommands': await commands.mycmd(this.sock, from, msg); break;
                                        default:
                                            await this.sock.sendMessage(from, {
                                                text: `❓ *COMANDO NO ENCONTRADO*\n\nNo reconozco */${commandName}*.\n📚 Usa */menu* para abrir el menú o */allmenu* para ver todos los comandos.`
                                            }, { quoted: msg });
                                            break;
                                    }
                                } catch (e) {
                                    this.sendLog(`Command error (${commandName}): ` + e.message, 'error');
                                    try {
                                        await this.sock.sendMessage(from, {
                                            text: `❌ No pude completar .${commandName} / ${commandName}. ${e.message || 'Error interno.'}`
                                        }, { quoted: msg });
                                    } catch (replyError) {
                                        this.sendLog(`Command reply error (${commandName}): ` + replyError.message, 'error');
                                    }
                                }
                            })();
                        }
                    } catch (e) {
                        console.error('Message Processing Error:', e);
                    }
                }));
            });

            this.sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;
                if (qr) {
                    const socketId = userSockets[this.userId];
                    if (socketId) io.to(socketId).emit('qr', qr);
                    if (this.subbotMode === 'qr' && this.requesterSock && this.pairRequesterJid) {
                        try {
                            const qrImage = await QRCode.toBuffer(qr, { type: 'png', width: 720, margin: 2 });
                            await this.requesterSock.sendMessage(this.pairRequesterJid, {
                                image: qrImage,
                                caption: '📲 *QR DE VINCULACIÓN DEL SUBBOT*\n\nEscanea este código desde *Dispositivos vinculados → Vincular un dispositivo*.\n\n⏳ El QR cambia y caduca rápidamente.'
                            });
                        } catch (qrError) {
                            this.sendLog(`No se pudo enviar el QR del subbot: ${qrError.message}`, 'error');
                        }
                    }
                }

                if (connection === 'close') {
                    const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                    this.isConnected = false;
                    this.isInitializing = false;
                    this.sendLog(`Connection closed. Reconnecting: ${shouldReconnect}`, 'warning');
                    this.sendConnectionStatus();
                    const statusCode = lastDisconnect?.error?.output?.statusCode;

                    if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                        this.sendLog('Session expired or logged out. Clearing auth data...', 'error');
                        try {
                            if (fs.existsSync(this.authPath)) {
                                const backupPath = `${this.authPath}_backup_${Date.now()}`;
                                fs.moveSync(this.authPath, backupPath);
                                this.sendLog(`Corrupted session backed up to ${backupPath}`, 'info');
                            }
                        } catch (e) {
                            if (fs.existsSync(this.authPath)) fs.removeSync(this.authPath);
                        }
                        if (botData.subbots[this.userId] && botData.subbots[this.userId].status !== 'revocado') {
                            botData.subbots[this.userId].status = 'desconectado';
                            botData.subbots[this.userId].disconnectedAt = new Date().toISOString();
                            saveBotData();
                        }
                        delete sessions[this.userId];
                        this.sendConnectionStatus();
                    } else if (statusCode === DisconnectReason.restartRequired || statusCode === DisconnectReason.connectionLost || statusCode === 428) {
                        this.sendLog(`Connection issue (${statusCode}). Restarting in 3s...`, 'warning');
                        setTimeout(() => this.initialize(), 3000);
                    } else if (statusCode === 515) {
                        this.sendLog('Stream error. Reconnecting immediately...', 'warning');
                        this.initialize();
                    } else {
                        this.sendLog(`Connection closed (${statusCode}). Reconnecting in 5s...`, 'info');
                        setTimeout(() => this.initialize(), 5000);
                    }
                } else if (connection === 'open') {
                    this.isConnected = true;
                    this.isInitializing = false;
                    this.sendLog('Connected successfully! \u{2705}', 'success');
                    this.sendConnectionStatus();
                    this.startActiveCheck();

                    const botNumber = jidNormalizedUser(this.sock.user.id);
                    const botNumberClean = botNumber.split('@')[0];
                    this.phoneNumber = botNumberClean;
                    if (botData.subbots[this.userId]) {
                        botData.subbots[this.userId].phoneNumber = botNumberClean;
                        botData.subbots[this.userId].status = 'conectado';
                        botData.subbots[this.userId].connectedAt = new Date().toISOString();
                        saveBotData();
                    }

                    if (!settings.connectedBots.includes(botNumberClean)) {
                        settings.connectedBots.push(botNumberClean);
                    }

                    const botName = botData.userNames[this.userId] || (this.sock.user && this.sock.user.name) || this.userId;

                    if (this.tgChatId && tgBot) {
                        const successMsg =
                            `\u{25EC}\u{2501}\u{2501}\u{2501}\u{3008} *ᴊᴋ ʙᴏᴛ* \u{3009}\u{2501}\u{2501}\u{2501}\u{25EC}\n\n` +
                            `*\u{2705} CONNECTION SUCCESSFUL!* \n\n` +
                            `Your WhatsApp number has been successfully linked.\n` +
                            `You can now use all commands in your WhatsApp.\n\n` +
                            `> © POWERED BY ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ v4.1.0`;
                        await tgBot.sendMessage(this.tgChatId, successMsg, { parse_mode: 'Markdown' });
                    }

                    this.sendLog(`Bot ${botName} is online.`, 'success');

                    setTimeout(async () => {
                        try {
                            await this.sock.query({
                                tag: 'iq',
                                attrs: { to: '@s.whatsapp.net', type: 'set', xmlns: 'status' },
                                content: [{ tag: 'status', attrs: {}, content: Buffer.from("ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ v4.1.0 - 120+ Commands | Powered by ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ", 'utf-8') }]
                            });
                            this.sendLog("Bio updated successfully! \u{2705}", "success");
                        } catch (e) {
                            this.sendLog("Bio update failed: " + e.message, "error");
                        }
                    }, 5000);

                    if (!this.lastConnectMessageTime || (Date.now() - this.lastConnectMessageTime > 60 * 60 * 1000)) {
                        const commandCount = Object.keys(commands).filter((name) => name !== 'utils').length;
                        const welcomeText = `👋 Hola, soy ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ.\n✅ WhatsApp conectado y listo para usar.\n📚 Escribe */menu* para abrir el centro de funciones.\n👑 ${settings.officialChannelName}: ${settings.whatsappChannel}\n\n🛠️ ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ`;
                        await this.sock.sendMessage(botNumber, { text: welcomeText });

                        try {
                            const channelLink = settings.whatsappChannel;
                            if (channelLink) {
                                const channelKey = channelLink.split('/channel/')[1];
                                if (channelKey) {
                                    const metadata = await this.sock.newsletterMetadata('invite', channelKey, 'GUEST');
                                    if (metadata && metadata.id) {
                                        await this.sock.newsletterFollow(metadata.id);
                                        console.log(`\u{2705} Auto-followed channel: ${metadata.id}`);
                                    }
                                }
                            }
                        } catch (channelErr) {
                            console.log('Channel follow error:', channelErr.message);
                        }
                        this.lastConnectMessageTime = Date.now();
                    }
                }
            });

        } catch (err) {
            this.isInitializing = false;
            const pairingSocketId = userSockets[this.userId];
            if (pairingSocketId && pairingNumber) io.to(pairingSocketId).emit('pair-error', `No se pudo iniciar WhatsApp: ${err.message}`);
            this.sendLog(`Initialization failed: ${err.message}. Retrying in 10s...`, 'error');
            setTimeout(() => this.initialize(), 10000);
        }
    }
}


// =================== MENU GENERATOR ===================
async function sendOfficialChannelMenu(sock, jid, caption, quoted) {
    const categoryButton = {
        name: 'single_select',
        buttonParamsJson: JSON.stringify({
            title: 'Elegir módulos',
            sections: [{
                title: 'Categorías disponibles',
                rows: [
                    ['allmenu', '📚 Centro completo'],
                    ['ownermenu', '👑 Zona del owner'],
                    ['groupmenu', '👥 Control de grupos'],
                    ['adminmenu', '🛡️ Seguridad'],
                    ['profilemenu', '👤 Perfil'],
                    ['aimenu', '🤖 Núcleo IA'],
                    ['downloadmenu', '📥 Descargas'],
                    ['warcraftmenu', '⚔️ Warcraft RPG'],
                    ['gamemenu', '🎮 Mini juegos'],
                    ['subbotmenu', '🔗 Vincular bot'],
                    ['toolsmenu', '🧰 Herramientas'],
                    ['funmenu', '🎉 Diversión'],
                    ['animemenu', '🎌 Anime'],
                    ['stickermenu', '🏷️ Stickers'],
                    ['imagemenu', '🖼️ Imágenes'],
                    ['textmakermenu', '✍️ Texto'],
                    ['logomenu', '🎨 Logos'],
                    ['miscmenu', '📦 Misceláneos'],
                    ['bugmenu', '🐞 Reportes']
                ].map(([id, title]) => ({
                    title: smallCaps(title),
                    description: smallCaps(`Abrir ${title.replace(/^[^ ]+ /, '')}`),
                    id: `menu_${id}`
                }))
            }]
        })
    };
    const channelButton = {
        name: 'cta_url',
        buttonParamsJson: JSON.stringify({
            display_text: settings.officialChannelName,
            url: settings.whatsappChannel,
            merchant_url: settings.whatsappChannel
        })
    };
    const content = {
        interactiveMessage: {
            body: { text: caption },
            footer: { text: `${settings.officialChannelName} · ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ` },
            nativeFlowMessage: {
                buttons: [categoryButton, channelButton],
                messageVersion: 1
            }
        }
    };
    const userJid = sock.user?.id;
    const fullMessage = generateWAMessageFromContent(jid, content, {
        logger: sock.logger,
        userJid,
        messageId: generateMessageIDV2(userJid),
        timestamp: new Date()
    });
    const normalized = normalizeMessageContent(fullMessage.message);
    const additionalNodes = [{
        tag: 'biz',
        attrs: {},
        content: [{
            tag: 'interactive',
            attrs: { type: 'native_flow', v: '1' },
            content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }]
        }]
    }];
    if (!isJidGroup(jid)) additionalNodes.push({ tag: 'bot', attrs: { biz_bot: '1' } });
    await sock.relayMessage(jid, fullMessage.message, {
        messageId: fullMessage.key.id,
        additionalNodes
    });
}


async function sendWarcraftCommandMenu(sock, jid, quoted) {
    const groups = [
        ['🔐 CUENTA Y PERSONAJE', [
            ['login', 'Iniciar sesión', 'Vincula tu cuenta Warcraft'], ['nombredelpersonaje', 'Crear personaje', 'Elige el nombre de tu héroe'],
            ['clase', 'Elegir clase', 'Guerrero, mago o pícaro'], ['estadopersonaje', 'Estado del personaje', 'Vida, ataque, defensa y nivel'],
            ['inventario', 'Inventario', 'Equipo y objetos que posees'], ['equipar', 'Equipar objeto', 'Mejora tu equipo'],
            ['talentos', 'Mejorar talentos', 'Gasta puntos en ataque, defensa o vitalidad'], ['tutorial', 'Tutorial completo', 'Guía paso a paso']
        ]],
        ['⚔️ COMBATE', [
            ['enemigos', 'Ver enemigos', 'Niveles, vida y fuerza'], ['buscar', 'Buscar enemigo', 'Empieza una pelea por turnos'],
            ['atacar', 'Atacar', 'Reduce la vida real del enemigo'], ['habilidad', 'Usar habilidad', 'Ataque especial de tu clase'],
            ['usar', 'Usar poción', 'Recupera vida, incluso tras caer'], ['huir', 'Huir', 'Termina el combate actual']
        ]],
        ['🛒 TIENDA Y PROGRESO', [
            ['tienda', 'Abrir tienda', 'Objetos del tramo de nivel y rarezas'], ['comprar', 'Comprar objeto', 'Compra por el ID mostrado en la tienda'],
            ['confirmarcompra', 'Confirmar compra', 'Completa la compra pendiente'], ['cancelarcompra', 'Cancelar compra', 'Cancela sin gastar oro'],
            ['recompensadiaria', 'Recompensa diaria', 'Recoge oro y experiencia'], ['misiones', 'Misiones', 'Revisa objetivos y recompensas'],
            ['mazmorras', 'Ver mazmorras', 'Mira el nivel y los jefes'], ['mazmorra', 'Entrar a mazmorra', 'Completa una mazmorra'], ['logros', 'Logros', 'Consulta los hitos alcanzados']
        ]],
        ['🗺️ MUNDO Y OFICIOS', [
            ['mapa', 'Mapa', 'Zonas, requisitos y recursos'], ['viajar', 'Viajar', 'Cambia de zona'], ['profesiones', 'Profesiones', 'Consulta oficios y nivel'],
            ['aprender', 'Aprender oficio', 'Minería, herbalismo, alquimia o herrería'], ['recolectar', 'Recolectar', 'Recoge materiales disponibles'],
            ['recetas', 'Recetas', 'Consulta ingredientes necesarios'], ['fabricar', 'Fabricar', 'Crea objetos con materiales'],
            ['encantamientos', 'Encantamientos', 'Mejoras de arma y armadura'], ['encantar', 'Aplicar encantamiento', 'Aplica una mejora de equipo']
        ]],
        ['🤝 JUGADORES Y COMUNIDAD', [
            ['gruporpg', 'Grupo RPG', 'Crear, unirse o salir de un grupo'], ['monturas', 'Monturas', 'Revisa monturas y niveles'], ['comprarmontura', 'Comprar montura', 'Consigue una montura'],
            ['hermandad', 'Hermandad', 'Crea una guild del juego'], ['duelo', 'Desafiar jugador', 'Reta a otro personaje'],
            ['aceptarduelo', 'Aceptar duelo', 'Acepta un reto pendiente'], ['atacarduelo', 'Atacar en duelo', 'Ataca cuando sea tu turno'],
            ['habilidadduelo', 'Habilidad de duelo', 'Usa la habilidad de tu clase'], ['rendirse', 'Rendirse', 'Finaliza el duelo']
        ]],
        ['📬 REGALOS, INTERCAMBIOS Y SUBASTA', [
            ['dar', 'Dar oro u objeto', 'Regalo inmediato: jugador oro 53 u objeto x1'], ['darporreembolso', 'Preparar reembolso', 'Jugador oro 1000 u objeto x1'],
            ['reembolso', 'Indicar lo que pides', 'Objeto x1, oro 53 o 0 si no pides nada'], ['aceptarreembolso', 'Aceptar reembolso', 'También puedes escribir /accept rem'],
            ['cancelarreembolso', 'Cancelar reembolso', 'También puedes escribir /cancel rem'],
            ['subasta', 'Casa de subastas', 'Consulta artículos publicados'], ['vender', 'Publicar objeto', 'Pon un artículo en subasta'],
            ['comprarsubasta', 'Comprar en subasta', 'Compra por el ID de publicación'], ['correo', 'Abrir correo', 'Consulta objetos y monedas recibidos'],
            ['reclamarmail', 'Reclamar correo', 'Recibe los adjuntos pendientes'], ['enviarmail', 'Enviar correo', 'Envía un objeto a otro personaje']
        ]]
    ];
    const selector = { name: 'single_select', buttonParamsJson: JSON.stringify({ title: 'Elegir comando Warcraft', sections: groups.map(([title, rows]) => ({ title, rows: rows.map(([id, label, description]) => ({ title: label, description, id: `cmd_${id}` })) })) }) };
    const channelButton = { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: settings.officialChannelName, url: settings.whatsappChannel, merchant_url: settings.whatsappChannel }) };
    const body = `⚔️ *WARCRAFT RPG*\nElige una sección y pulsa el comando.\n\n📖 Tutorial disponible en el selector.\nLos comandos del juego se escriben sin W final.`;
    const userJid = sock.user?.id;
    const fullMessage = generateWAMessageFromContent(jid, { interactiveMessage: { body: { text: body }, footer: { text: settings.officialChannelName }, nativeFlowMessage: { buttons: [selector, channelButton], messageVersion: 1 } } }, { logger: sock.logger, userJid, messageId: generateMessageIDV2(userJid), timestamp: new Date() });
    const additionalNodes = [{ tag: 'biz', attrs: {}, content: [{ tag: 'interactive', attrs: { type: 'native_flow', v: '1' }, content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }] }] }];
    if (!isJidGroup(jid)) additionalNodes.push({ tag: 'bot', attrs: { biz_bot: '1' } });
    await sock.relayMessage(jid, fullMessage.message, { messageId: fullMessage.key.id, additionalNodes });
}

const TOOL_DISPLAY_NAMES = {
    ping: 'velocidad', dp: 'fotoperfil', vv: 'veruna', translate: 'traducir', base64: 'base64', qr: 'codigoqr',
    shorturl: 'acortar', calc: 'calcular', weather: 'clima', github: 'github', ipinfo: 'infoip', tempmail: 'correotemporal',
    fakeinfo: 'datosfalsos', binlookup: 'bin', whois: 'whois', dnslookup: 'dns', portscan: 'escaneo', screenshot: 'captura',
    define: 'definir', google: 'buscar', wiki: 'wiki', yts: 'buscarvideo', playstore: 'tienda', npm: 'paquete'
};

async function sendCategoryMenu(sock, from, msg, title, names) {
    const economyAliases = commands.economy?.aliases ? Object.values(commands.economy.aliases).flat() : [];
    const animeAliases = commands.anime?.aliases || [];
    const profileAliases = commands.profile?.aliases || [];
    const securityCommands = new Set(['antiporno', 'antifoto', 'antivideo', 'antiaudio', 'antisticker', 'antidocumento', 'antimedia', 'antispam']);
    const available = names.filter(name => name === 'menu' || name === 'difunción' || securityCommands.has(name) || Object.prototype.hasOwnProperty.call(commands, name) || economyAliases.includes(name) || animeAliases.includes(name) || profileAliases.includes(name));
    if (!available.length) {
        await sendSubmenuWithChannel(sock, from, `${title}\n\nNo hay módulos activos en esta sección.`, msg);
        return;
    }
    const titleAliases = {
        '🛠️ MENÚ DE HERRAMIENTAS': 'Herramientas',
        '🎉 FUN MENU': 'Diversión',
        '🏷️ STICKER MENU': 'Stickers',
        '👑 OWNER MENU': 'Zona del owner'
    };
    const sectionIcons = {
        '🛠️ MENÚ DE HERRAMIENTAS': '🧰', '🎉 FUN MENU': '🎉', '🏷️ STICKER MENU': '🏷️',
        '👑 OWNER MENU': '👑', '🤖 AI MENU': '🤖', '📥 DOWNLOAD MENU': '📥', '👥 GROUP MENU': '👥',
        '🪙 ECONOMY MENU': '💰', '👤 PROFILE MENU': '👤', '🎯 MISC MENU': '📦'
    };
    const styledTitle = titleAliases[title] || title.replace(/^[^A-Za-zÁÉÍÓÚáéíóúÑñ]+/u, '').trim();
const descriptions = {
        help: 'ayuda rápida y ejemplos', id: 'IDs del chat y usuarios', time: 'hora mundial', note: 'notas personales',
        ping: 'comprobación de conexión', dp: 'foto de perfil', vv: 'visualización temporal', translate: 'traducción de textos',
        base64: 'codificación de datos', qr: 'códigos QR', shorturl: 'enlaces cortos', calc: 'cálculos rápidos',
        weather: 'consulta del clima', github: 'proyectos y repositorios', ipinfo: 'información de red', tempmail: 'correo temporal',
        fakeinfo: 'datos de prueba', binlookup: 'consulta de tarjetas', whois: 'datos de dominio', dnslookup: 'consulta DNS',
        portscan: 'revisión de puertos', screenshot: 'captura de página', define: 'definición de palabras', google: 'búsqueda web',
        wiki: 'consulta de conocimiento', yts: 'búsqueda de vídeos', playstore: 'aplicaciones', npm: 'paquetes de software',
        sticker: 'convierte una imagen o vídeo en sticker', song: 'descarga audio', video: 'descarga vídeo', youtube: 'busca vídeos', tiktok: 'descarga TikTok',
        meme: 'crea o busca memes', joke: 'cuenta un chiste', quote: 'muestra una frase', ai: 'responde con inteligencia artificial', chatbot: 'conversa con el bot',
        profile: 'muestra tu perfil', pfp: 'muestra una foto de perfil', groupinfo: 'muestra la información del grupo', difunción: 'envía un mensaje a todos los usuarios registrados',
        grouplink: 'enlace del grupo', ban: 'expulsa a un usuario del grupo', kick: 'expulsa a un usuario del grupo', tagall: 'menciones organizadas', hidetag: 'aviso silencioso', profile: 'tarjeta de perfil', status: 'estado del sistema'
    };
    const commandIcons = {
        help: '❔', id: '🪪', time: '🕒', note: '📝', sticker: '🏷️', tempmail: '📩', fakeinfo: '🪪', ai: '🤖', chatbot: '💬', translate: '🌐',
        song: '🎵', video: '🎬', youtube: '▶️', tiktok: '🎵', spotify: '🎧', download: '📥',
        weather: '🌤️', github: '🐙', qr: '🔳', shorturl: '🔗', calc: '🧮', meme: '😂',
        joke: '😄', quote: '💭', profile: '👤', pfp: '🖼️', groupinfo: '👥', grouplink: '🔗',
        tagall: '📣', hidetag: '📢', ban: '🚫', kick: '🚫', welcome: '👋', promote: '⬆️', demote: '⬇️', poll: '📊',
        ping: '🏓', status: '📡', difunción: '📣', default: '🧰'
    };
    const lines = [
        `${sectionIcons[title] || '📚'} ${styledTitle}`,
        `📋 ${available.length} comandos disponibles`,
        '',
        ...available.map((name) => { const localized = require('./lib/spanishCommands').spanishCommand(name); return `${commandIcons[name] || commandIcons.default} /${localized} — ${descriptions[name] || `ejecuta ${localized}`}`; }),
        '',
        '💡 Elige un comando para comenzar.'
    ];
    await sendSubmenuWithChannel(sock, from, smallCaps(lines.join('\n')), msg);
}

async function sendSubmenuWithChannel(sock, jid, text, quoted) {
    const channelButton = {
        name: 'cta_url',
        buttonParamsJson: JSON.stringify({
            display_text: settings.officialChannelName,
            url: settings.whatsappChannel,
            merchant_url: settings.whatsappChannel
        })
    };
    const content = {
        interactiveMessage: {
            body: { text },
            footer: { text: `${settings.officialChannelName} · ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ` },
            nativeFlowMessage: {
                buttons: [channelButton],
                messageVersion: 1
            }
        }
    };
    const userJid = sock.user?.id;
    const fullMessage = generateWAMessageFromContent(jid, content, {
        logger: sock.logger,
        userJid,
        messageId: generateMessageIDV2(userJid),
        timestamp: new Date()
    });
    const additionalNodes = [{
        tag: 'biz',
        attrs: {},
        content: [{
            tag: 'interactive',
            attrs: { type: 'native_flow', v: '1' },
            content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }]
        }]
    }];
    if (!isJidGroup(jid)) additionalNodes.push({ tag: 'bot', attrs: { biz_bot: '1' } });
    try {
        await sock.relayMessage(jid, fullMessage.message, {
            messageId: fullMessage.key.id,
            additionalNodes
        });
    } catch (error) {
        console.error('Submenu interactive message failed:', error.message);
        await sock.sendMessage(jid, {
            __jkRaw: true,
            text: `${text}\n\n👑 ${settings.officialChannelName}: ${settings.whatsappChannel}`
        }, { quoted });
    }
}

function generateMenuText(userName, session) {
    const mode = session.isPublic ? 'PÚBLICO' : 'PRIVADO';
    const botName = settings.botName || 'ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ';
    const ownerName = settings.ownerName || 'ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ';
    return [
        `👋 Hola, ${userName || 'amigo'}`,
        `🤖 ${botName}`,
        '✅ Estado: disponible',
        `🔐 Modo: ${mode}`,
        '',
        '📚 Warcraft RPG: /warcraft · elige sección y comandos del juego',
        '🛡️ /seguridad · filtros antiporno, multimedia y antispam del grupo',
        '👋 /bienvenida · configurar el mensaje y menú de entrada',
        '🎵 /cancion nombre · buscar y enviar audio',
        '🤖 /ia · ayuda, traducción y utilidades',
        '',
        '❔ Usa */ayuda* para ver ejemplos rápidos.',
        '📝 Guarda cosas con */nota agregar texto*.',
        '🕒 Consulta una ciudad con */hora Madrid*.',
        '⚡ Escribe */todos* para ver todos los comandos en español.',
        '📖 Cada módulo explica para qué sirve.',
        `👑 ${settings.officialChannelName}: ${settings.whatsappChannel}`,
        '',
        `🛠️ ${ownerName}`
    ].join('\n');
}

// =================== SOCKET.IO ===================
io.on('connection', (socket) => {
    socket.emit('stats', getDashboardStats());

    // Admin auth
    socket.on('admin-auth', ({ username, password } = {}) => {
        const now = Date.now();
        if (socket.adminLockUntil && socket.adminLockUntil > now) {
            socket.emit('admin-auth-fail');
            return;
        }
        const cleanCredential = (value) => String(value ?? '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
        const adminUser = cleanCredential(process.env.ADMIN_USERNAME || 'jkadmin');
        const adminPass = cleanCredential(process.env.ADMIN_PASSWORD || '04060120**');
        if (cleanCredential(username) === adminUser && cleanCredential(password) === adminPass) {
            socket.authenticated = true;
            socket.adminAttempts = 0;
            adminSockets.add(socket);
            socket.emit('admin-auth-success');
            socket.emit('admin-premium-data', premiumSnapshot());
            socket.emit('admin-bots-data', botsSnapshot());
            socket.emit('admin-users-data', registeredUsersSnapshot());
        } else {
            socket.adminAttempts = (socket.adminAttempts || 0) + 1;
            if (socket.adminAttempts >= 5) {
                socket.adminLockUntil = now + 60 * 1000;
                socket.adminAttempts = 0;
            }
            socket.emit('admin-auth-fail');
        }
    });

    socket.on('admin-premium-add', ({ jid, days } = {}) => {
        if (!socket.authenticated) return;
        const normalized = normalizePremiumJid(jid);
        if (!normalized) {
            socket.emit('admin-premium-status', { ok: false, message: 'Escribe un número válido con prefijo internacional.' });
            return;
        }
        const duration = Number(days);
        const expiresAt = Number.isFinite(duration) && duration > 0
            ? new Date(Date.now() + Math.min(duration, 3650) * 24 * 60 * 60 * 1000).toISOString()
            : null;
        const previous = botData.premiumUsers[normalized];
        botData.premiumUsers[normalized] = {
            ...(previous && typeof previous === 'object' ? previous : {}),
            grantedAt: previous?.grantedAt || new Date().toISOString(),
            expiresAt,
            source: 'admin'
        };
        saveBotData({ backupNow: true });
        socket.emit('admin-premium-status', { ok: true, message: `Premium asignado a ${normalized.split('@')[0]}${expiresAt ? ` por ${Math.min(duration, 3650)} días.` : ' sin vencimiento.'}` });
        socket.emit('admin-premium-data', premiumSnapshot());
    });

    socket.on('admin-premium-generate', ({ days } = {}) => {
        if (!socket.authenticated) return;
        const result = createPremiumToken(days);
        socket.emit('admin-premium-token', result);
        socket.emit('admin-premium-status', { ok: true, message: 'Token Premium generado. Cópialo y entrégaselo al usuario.' });
        socket.emit('admin-premium-data', premiumSnapshot());
    });

    socket.on('admin-premium-data', () => {
        if (!socket.authenticated) return;
        socket.emit('admin-premium-data', premiumSnapshot());
    });

    socket.on('admin-promote-channel', async () => {
        if (!socket.authenticated) return;
        if (global.adminPromotionRunning) {
            socket.emit('admin-promo-result', { error: 'Ya hay una promoción en curso.' });
            return;
        }
        global.adminPromotionRunning = true;
        socket.emit('admin-promo-status', { running: true, message: 'Promoción iniciada. Revisando grupos permitidos...' });
        const totals = { sent: 0, skipped: 0, failed: 0, bots: 0 };
        try {
            for (const session of Object.values(sessions)) {
                if (!session?.isConnected || !session.sock?.user) continue;
                totals.bots++;
                try {
                    const state = session.promoState || (session.promoState = {});
                    const result = await promoJkBot.runPromotion(session.sock, state);
                    totals.sent += result.sent;
                    totals.skipped += result.skipped;
                    totals.failed += result.failed;
                } catch (error) {
                    totals.failed++;
                }
            }
            socket.emit('admin-promo-result', totals);
        } finally {
            global.adminPromotionRunning = false;
            socket.emit('admin-promo-status', { running: false });
        }
    });

    socket.on('admin-premium-remove-user', ({ jid } = {}) => {
        if (!socket.authenticated) return;
        const normalized = normalizePremiumJid(jid);
        if (!normalized || !botData.premiumUsers[normalized]) {
            socket.emit('admin-premium-status', { ok: false, message: 'No se encontró ese usuario Premium.' });
            return;
        }
        delete botData.premiumUsers[normalized];
        saveBotData({ backupNow: true });
        socket.emit('admin-premium-status', { ok: true, message: `Premium retirado: ${normalized.split('@')[0]}` });
        socket.emit('admin-premium-data', premiumSnapshot());
    });

    socket.on('admin-premium-remove-token', ({ id } = {}) => {
        if (!socket.authenticated) return;
        if (!id || !botData.premiumTokens[id]) {
            socket.emit('admin-premium-status', { ok: false, message: 'No se encontró ese token.' });
            return;
        }
        delete botData.premiumTokens[id];
        saveBotData({ backupNow: true });
        socket.emit('admin-premium-status', { ok: true, message: 'Token eliminado correctamente.' });
        socket.emit('admin-premium-data', premiumSnapshot());
    });

    socket.on('set-user', (userId) => {
        userSockets[userId] = socket.id;
        if (!sessions[userId]) sessions[userId] = new BotSession(userId);
        sessions[userId].sendConnectionStatus();
        broadcastDashboardStats();
    });

    // Pair request - still available via web for web users
    socket.on('pair-request', async ({ userId, number } = {}) => {
        const cleanNumber = normalizePhone(number);
        if (!userId || !cleanNumber) {
            socket.emit('pair-error', 'Escribe un número válido con código de país, solo dígitos.');
            return;
        }
        try {
        if (sessions[userId]) {
            if (!botData.statusSettings[userId]) {
                botData.statusSettings[userId] = {
                    autoStatus: false,
                    autoSeen: false,
                    autoLike: false,
                    autoDownload: false,
                    isPublic: true
                };
                saveBotData();
            }
            sessions[userId].tgChatId = null;
            await sessions[userId].initialize(cleanNumber);
        } else {
            sessions[userId] = new BotSession(userId);
            if (!botData.statusSettings[userId]) {
                botData.statusSettings[userId] = {
                    autoStatus: false,
                    autoSeen: false,
                    autoLike: false,
                    autoDownload: false,
                    isPublic: true
                };
                saveBotData();
            }
            sessions[userId].tgChatId = null;
            await sessions[userId].initialize(cleanNumber);
        }
        } catch (error) {
            console.error(`[${userId}] Pair request failed:`, error.message);
            socket.emit('pair-error', `No se pudo iniciar la vinculación: ${error.message}`);
        }
    });


    // BROADCAST MESSAGE - Send the exact admin text to registered private chats.
    socket.on('broadcast', async ({ message } = {}) => {
        if (!socket.authenticated) return;
        const text = String(message || '').trim();
        if (!text) {
            socket.emit('broadcast-result', { ok: false, totalSent: 0, totalFailed: 0, message: 'Escribe un mensaje antes de enviarlo.' });
            return;
        }
        const result = await broadcastToRegisteredUsers(text);
        socket.emit('broadcast-result', {
            ok: result.totalFailed === 0,
            ...result,
            message: result.totalRecipients ? `Difusión completada: ${result.totalSent} enviados, ${result.totalFailed} fallidos.` : 'No hay usuarios privados registrados con una sesión activa.'
        });
    });

    // STOP BOT - Disconnect a specific bot
    socket.on('stop-bot', async ({ sessionId }) => {
        if (!socket.authenticated) return;

        if (sessions[sessionId] && sessions[sessionId].sock) {
            try {
                await sessions[sessionId].sock.logout();
                sessions[sessionId].isConnected = false;
                if (botData.subbots[sessionId]) {
                    botData.subbots[sessionId].status = 'revocado';
                    botData.subbots[sessionId].revokedAt = new Date().toISOString();
                    saveBotData();
                }
                delete sessions[sessionId];
                socket.emit('bot-stopped', { sessionId, success: true });
                socket.emit('admin-bots-data', botsSnapshot());
            } catch (e) {
                socket.emit('bot-stopped', { sessionId, success: false, error: e.message });
            }
        }
    });

    // STOP ALL BOTS
    socket.on('stop-all-bots', async () => {
        if (!socket.authenticated) return;

        let stopped = 0;
        for (const [sessionId, session] of Object.entries(sessions)) {
            try {
                if (session.sock) {
                    await session.sock.logout();
                    session.isConnected = false;
                    if (botData.subbots[sessionId]) {
                        botData.subbots[sessionId].status = 'revocado';
                        botData.subbots[sessionId].revokedAt = new Date().toISOString();
                    }
                    stopped++;
                }
            } catch (e) {}
        }
        saveBotData();
        socket.emit('all-bots-stopped', { stopped });
    });

    // GET CONNECTED BOTS LIST
    socket.on('get-users-list', () => {
        if (!socket.authenticated) return;
        socket.emit('admin-users-data', registeredUsersSnapshot());
    });

    socket.on('get-bots-list', () => {
        if (!socket.authenticated) return;
        socket.emit('bots-list', botsSnapshot());
        socket.emit('admin-bots-data', botsSnapshot());
    });

    // GET BROADCAST HISTORY
    socket.on('get-broadcast-history', () => {
        if (!socket.authenticated) return;
        socket.emit('broadcast-history', botData.broadcastHistory || []);
    });

    socket.on('disconnect', () => {
        adminSockets.delete(socket);
        for (const [userId, socketId] of Object.entries(userSockets)) {
            if (socketId === socket.id) {
                delete userSockets[userId];
                break;
            }
        }
        broadcastDashboardStats();
    });
});
// Start server
const PORT = process.env.PORT || 3000;
async function startServer() {
    console.log(`\u{1F311} JK-BOT-MD v${settings.version} iniciando`);
    console.log(`\u{1F4E1} Total commands loaded: 120+`);
    if (githubBackup.targetsCodeRepository()) {
        console.warn('[Backup] GITHUB_BACKUP_REPO apunta al repositorio de código; se omite para no guardar datos allí.');
    }
    const runningOnRailway = Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_ID || process.env.RAILWAY_PROJECT_ID);
    const hasPersistentVolume = Boolean(process.env.RAILWAY_VOLUME_MOUNT_PATH);
    const hasConfiguredLocalStore = Boolean(process.env.PERSISTENT_DATA_DIR) && !runningOnRailway;
    if (!hasPersistentVolume && !hasConfiguredLocalStore && !githubBackup.enabled() && !postgresPremiumStore.enabled() && !telegramBackupStore.enabled()) {
        console.warn('[Persistence] ADVERTENCIA: no hay PostgreSQL ni volumen persistente detectable. Un redeploy puede borrar datos de la web y tokens; PERSISTENT_DATA_DIR por sí sola no crea un volumen.');
    }
    if (githubBackup.enabled() && !telegramBackupStore.enabled()) {
        try {
            const localPremium = {
                users: { ...(botData.premiumUsers || {}) },
                tokens: { ...(botData.premiumTokens || {}) }
            };
            const restored = await githubBackup.restoreBackup({ dataFile: DATA_FILE, premiumDataFile: PREMIUM_DATA_FILE, authDir: AUTH_DIR, uploadsDir: UPLOADS_DIR });
            if (restored) {
                loadBotDataFromDisk();
                loadPremiumDataFromDisk();
                // Preserve locally-created Premium records while restoring all backed-up bot data.
                botData.premiumUsers = { ...(botData.premiumUsers || {}), ...localPremium.users };
                botData.premiumTokens = { ...(botData.premiumTokens || {}), ...localPremium.tokens };
                normalizePremiumTokenEntries(botData.premiumTokens);
                saveBotData();
            }
        } catch (error) {
            console.error('[Backup] No se pudo restaurar el estado cifrado:', error.response?.data?.message || error.message);
        }
    } else {
        console.log('[Backup] GitHub cifrado no configurado.');
    }
    let postgresStateReady = false;
    if (postgresPremiumStore.enabled()) {
        try {
            await postgresPremiumStore.init();
            const remoteState = await postgresPremiumStore.loadAppState();
            if (remoteState.hasData) {
                // PostgreSQL is the durable source of truth for all web/bot application data.
                botData = remoteState.state;
                normalizeBotDataState();
                // Do not merge stale local JSON over the remote source of truth.
                saveBotData();
                console.log(`[PostgreSQL] Estado completo restaurado; ${Object.keys(botData.premiumUsers || {}).length} usuarios y ${Object.keys(botData.premiumTokens || {}).length} tokens Premium.`);
            } else {
                // Migrate existing JSON/GitHub state, including legacy Premium-only database contents.
                const remotePremium = await postgresPremiumStore.loadPremium();
                if (remotePremium.hasData) {
                    botData.premiumUsers = remotePremium.users;
                    botData.premiumTokens = remotePremium.tokens;
                    normalizePremiumTokenEntries(botData.premiumTokens);
                }
                await postgresPremiumStore.replaceAppState(botData);
                await postgresPremiumStore.replacePremium(botData.premiumUsers, botData.premiumTokens);
                console.log('[PostgreSQL] Migración inicial del estado completo completada.');
            }
            postgresStateReady = true;
        } catch (error) {
            console.error('[PostgreSQL] No se pudo inicializar el estado remoto; se usará el almacenamiento local:', error.message);
        }
    } else {
        console.log('[PostgreSQL] No configurado; el estado completo requiere un volumen persistente o respaldo cifrado.');
    }
    if (telegramBackupStore.enabled()) {
        if (postgresStateReady) {
            telegramBackupStore.scheduleSave(botData, { immediate: true });
            await telegramBackupStore.flush();
            console.log('[Telegram backup] Copia cifrada sincronizada desde el estado principal.');
        } else {
            const restored = await telegramBackupStore.restore();
            if (restored.hasData) {
                botData = restored.state;
                normalizeBotDataState();
                saveBotData({ skipTelegramBackup: true });
                console.log(`[Telegram backup] Estado completo restaurado desde la copia fijada (${restored.messageId}).`);
            } else {
                console.log('[Telegram backup] No había copia fijada; se creará la primera con los datos locales actuales.');
                telegramBackupStore.scheduleSave(botData, { immediate: true });
            }
            await telegramBackupStore.flush();
        }
    } else {
        console.log('[Telegram backup] No configurado; se omitirá el respaldo remoto de Telegram.');
    }
    server.listen(PORT, async () => {
        console.log(`\u{1F310} Web Dashboard disponible en http://localhost:${PORT}`);
        await loadExistingSessions();
        broadcastDashboardStats();
    });
}

startServer().catch(error => {
    console.error('[Startup] No se pudo iniciar JK-BOT-MD:', error.message);
    if (tgBot) {
        tgBot.stopPolling().finally(() => process.exit(1));
    } else {
        process.exit(1);
    }
});

let shutdownStarted = false;
async function flushAndExit(signal) {
    if (shutdownStarted) return;
    shutdownStarted = true;
    console.log(`[Persistence] ${signal}: cerrando y vaciando escrituras remotas pendientes.`);
    if (server.listening) server.close();
    const forceExit = setTimeout(() => process.exit(1), 10000);
    try {
        await postgresPremiumStore.flush();
        await telegramBackupStore.flush();
        await postgresPremiumStore.close();
        clearTimeout(forceExit);
        process.exit(0);
    } catch (error) {
        console.error('[Persistence] No se pudieron vaciar todas las escrituras:', error.message);
        clearTimeout(forceExit);
        process.exit(1);
    }
}
process.once('SIGTERM', () => flushAndExit('SIGTERM'));
process.once('SIGINT', () => flushAndExit('SIGINT'));

setInterval(broadcastDashboardStats, 5000).unref();
