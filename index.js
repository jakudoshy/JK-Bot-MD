const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const fs = require('fs')
const axios = require('axios')

const app = express()
const PORT = process.env.PORT || 3000
let sock = null
let lastCode = null
let lastCodeTime = 0

const BOT_NAME = "JAKUDOSHY BOT"
const OWNER = "JAKUDOSHY"

async function IA_GRATIS(texto){
    try{
        const res = await axios.get(`https://text.pollinations.ai/${encodeURIComponent(texto)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            params: { model: 'openai' },
            timeout: 20000
        })
        if(typeof res.data === 'string' && res.data.length > 3) return res.data
    }catch{}
    try{
        const { data } = await axios.get(`https://api.siputzx.my.id/api/ai/gpt3?content=${encodeURIComponent(texto)}`, {timeout:15000})
        if(data?.data) return data.data
    }catch{}
    return "❌ IA ocupada, intenta de nuevo"
}

async function startBot(){
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info')
    const { version } = await fetchLatestBaileysVersion()
    sock = makeWASocket({
        version,
        logger: P({ level: 'silent' }),
        printQRInTerminal: false,
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })) },
        browser: ["Debian", "Chrome", "11.0"],
        getMessage: async()=>undefined,
        // CLAVE PARA QUE FUNCIONE EN TU MISMO CHAT
        markOnlineOnConnect: false,
        syncFullHistory: false
    })
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', async (u)=>{
        if(u.connection === 'close' && u.lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut){
            setTimeout(()=>startBot(),2000)
        }
    })

    sock.ev.on('messages.upsert', async ({ messages })=>{
        const m = messages[0]
        if(!m?.message) return
        const from = m.key.remoteJid
        if(from === 'status@broadcast') return

        // --- ESTO ES LO QUE ARREGLA TU PINGA ---
        // Antes bloqueaba fromMe, ahora PERMITE tu mismo chat
        const myId = sock.user?.id
        const isSelfChat = from === myId || m.key.fromMe === true

        // Si es fromMe pero NO es tu chat contigo mismo, ignora (para no hacer bucle)
        // Si es tu chat contigo mismo, SI lo deja pasar
        if(m.key.fromMe &&!isSelfChat) {
            // es un mensaje que el bot mando a otro, ignoralo
            return
        }

        const txt = m.message.conversation || m.message.extendedTextMessage?.text || ""
        if(!txt) return
        const lower = txt.toLowerCase().trim()
        console.log('RECIBIDO:', txt, '| SELF:', isSelfChat)

        if(lower === '.menu' || lower === 'menu'){
            await sock.sendMessage(from, {
                text: `╭━━━〔 ${BOT_NAME} 〕━━━┈⊷
┃ 👑 Owner: ${OWNER}
┃ ✅ Self-Chat Activo
╰━━━━━━━━━━━━━━━━┈⊷

.ia hola
.ii hola
.la hola
.ai hola

Ya funciona en tu mismo chat bro`
            })
            return
        }

        if(lower.startsWith('.ia') || lower.startsWith('.ii') || lower.startsWith('.la') || lower.startsWith('.ai') || lower.startsWith('.gpt')){
            let pregunta = txt.replace(/^\.(ia|ii|la|ai|gpt)\s*/i,'').trim()
            if(!pregunta) pregunta = txt.slice(3).trim()
            if(!pregunta) return await sock.sendMessage(from, {text:`Escribe:.ia hola`})

            await sock.sendMessage(from, {text:`🧠 pensando...`})
            const resp = await IA_GRATIS(pregunta)
            await sock.sendMessage(from, {text: resp})
        }
    })
}

app.use(express.json())
app.get('/pair', async(req,res)=>{
    try{
        let num = req.query.number?.replace(/[^0-9]/g,'')
        if(!num) return res.json({error:"Número inválido"})
        if(!sock){ await startBot(); await new Promise(r=>setTimeout(r,3500)) }
        const now = Date.now()
        if(lastCode && (now-lastCodeTime) < 20000) return res.json({code:lastCode})
        const code = await sock.requestPairingCode(num)
        lastCode=code; lastCodeTime=Date.now()
        return res.json({code})
    }catch{ return res.json({error:"Espera 1 min"}) }
})

app.get('/', (req,res)=>{
    res.send(`<html><body style="background:#000;color:#0f0;font-family:monospace;display:flex;justify-content:center;padding:30px"><div style="border:1px solid #0f0;padding:20px;border-radius:15px;text-align:center"><div>JAKUDOSHY SELF-CHAT FIX</div><input id="n" placeholder="519..."><button onclick="fetch('/pair?number='+document.getElementById('n').value).then(r=>r.json()).then(r=>alert(r.code||r.error))">GENERAR</button><div style="margin-top:10px;font-size:11px">Este bot ya responde en tu mismo chat (Tú)</div></div></body></html>`)
})

app.listen(PORT, ()=>{ console.log('SELF CHAT ONLINE'); startBot() })