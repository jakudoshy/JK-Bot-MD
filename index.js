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

const BOT_NAME = "ᴊᴋ ʙᴏᴛ"
const OWNER = "JAKUDOSHY"

// API GRATIS QUE TE CONSEGUI - NO NECESITA KEY
async function IA_GRATIS(texto){
    try{
        // Pollinations - IA gratis ilimitada
        const prompt = encodeURIComponent(texto)
        const { data } = await axios.get(`https://text.pollinations.ai/${prompt}?model=openai&system=Eres ${BOT_NAME} creado por ${OWNER}, responde corto, útil y en español`, {
            timeout: 20000
        })
        return data
    }catch(e){
        // Respaldo 2 - DuckDuckGo AI gratis
        try{
            const { data } = await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(texto)}&format=json`)
            return data.AbstractText || "No entendí, intenta de nuevo"
        }catch{
            return "❌ La IA gratis está ocupada, intenta en 5 seg"
        }
    }
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
        getMessage: async()=>undefined
    })
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', async (u)=>{
        if(u.connection === 'close' && u.lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut){
            setTimeout(()=>startBot(),2000)
        }
    })

    sock.ev.on('messages.upsert', async ({ messages })=>{
        const m = messages[0]
        if(!m ||!m.message || m.key.fromMe) return
        const from = m.key.remoteJid
        const txt = m.message.conversation || m.message.extendedTextMessage?.text || ""
        if(!txt) return

        const cmd = txt.trim().split(' ')[0].toLowerCase()
        const q = txt.trim().split(' ').slice(1).join(' ').trim()
        const linkMatch = txt.match(/https?:\/\/[^\s]+/)

        // IA GRATIS -.ia
        if(cmd === '.ia' || cmd === '.gpt' || cmd === '.ai' || cmd === '.jakudoshy'){
            if(!q) return await sock.sendMessage(from, {text:`Usa:\n.ia hola como estas\n.ia hazme un poema de ${OWNER}\n.ia que es javascript`}, {quoted:m})

            await sock.sendMessage(from, {text:`🧠 Pensando...`}, {quoted:m})
            const resp = await IA_GRATIS(q)
            await sock.sendMessage(from, {text: `${resp}\n\n${BOT_NAME} • ${OWNER}`}, {quoted:m})
            return
        }

        // DESCARGA AUTOMATICA
        if(linkMatch){
            const url = linkMatch[0]
            if(url.includes('whatsapp.com')) return
            if(cmd === '.downlink' ||!txt.startsWith('.')){
                if(url.includes('tiktok') || url.includes('instagram') || url.includes('facebook') || url.includes('youtu') || cmd === '.downlink'){
                    await sock.sendMessage(from, {text:`⬇️ Descargando...`}, {quoted:m})
                    try{
                        let videoUrl = null
                        if(url.includes('tiktok')){
                            const { data } = await axios.get(`https://tikwm.com/api/?url=${url}`)
                            if(data.data?.play) videoUrl = data.data.play
                        }else{
                            const { data } = await axios.post('https://api.cobalt.tools/api/json', {url}, {
                                headers:{Accept:'application/json','Content-Type':'application/json'}
                            })
                            if(data.url) videoUrl = data.url
                        }
                        if(videoUrl) await sock.sendMessage(from, {video:{url:videoUrl}, caption:`${BOT_NAME}`}, {quoted:m})
                    }catch{}
                }
            }
        }

        if(cmd === '.menu'){
            await sock.sendMessage(from, {text:`${BOT_NAME} • ${OWNER}

.ia + pregunta - IA GRATIS sin key
.downlink + link - descarga video
Manda link y baja automático`}, {quoted:m})
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
        if(lastCode && (now-lastCodeTime) < 25000) return res.json({code:lastCode})
        if(fs.existsSync('./auth_info/creds.json')){
            try{ const c = JSON.parse(fs.readFileSync('./auth_info/creds.json','utf8')); if(c.registered){ fs.rmSync('./auth_info',{recursive:true,force:true}); await new Promise(r=>setTimeout(r,1000)); await startBot(); await new Promise(r=>setTimeout(r,3500)) } }catch{}
        }
        const code = await sock.requestPairingCode(num)
        lastCode=code; lastCodeTime=Date.now()
        return res.json({code})
    }catch{ return res.json({error:"Espera 2 min"}) }
})

app.get('/', (req,res)=>{
    res.send(`<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{background:#080c08;color:#fff;font-family:monospace;display:flex;justify-content:center;padding:30px}.c{background:#111;border:1px solid #00ff64;border-radius:20px;padding:24px;width:100%;max-width:360px;text-align:center} input{width:100%;padding:12px;border-radius:10px;background:#080c08;border:1px solid #00ff64;color:#fff;text-align:center;margin-top:12px} button{width:100%;padding:12px;border-radius:10px;background:#00ff64;border:none;font-weight:700;margin-top:12px}.code{margin-top:12px;font-size:22px;letter-spacing:5px;word-break:break-all}</style></head><body><div class="c"><div>${BOT_NAME}</div><div style="color:#00ff64;font-size:10px">${OWNER} • IA GRATIS</div><input id="n" placeholder="51912345678"><button onclick="g()">GENERAR</button><div id="b" style="display:none;margin-top:12px;border:1px solid #00ff64;padding:12px;border-radius:10px"><div id="co" class="code"></div></div><div style="font-size:10px;color:#5a7a62;margin-top:10px">.ia + pregunta funciona sin key</div></div><script>async function g(){const v=document.getElementById('n').value; const r=await fetch('/pair?number='+v).then(r=>r.json()); if(r.code){document.getElementById('co').innerText=r.code; document.getElementById('b').style.display='block';}else alert(r.error)}</script></body></html>`)
})

app.listen(PORT, ()=>{ console.log('JK + IA GRATIS listo'); startBot() })