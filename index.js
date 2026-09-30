const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const fs = require('fs')

const app = express()
const PORT = process.env.PORT || 3000
let sock = null
let lastCode = "--------"
let status = "INICIANDO..."

const BOT_NAME = "ᴊᴋ_ʙᴏᴛ"
const BOT_BY = "ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏ"

async function startBot(){
    try{
        const { state, saveCreds } = await useMultiFileAuthState('./auth_info')
        const { version } = await fetchLatestBaileysVersion()
        sock = makeWASocket({
            version,
            logger: P({ level: 'silent' }),
            printQRInTerminal: false,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' }))
            },
            browser: ["Ubuntu", "Chrome", "20.0.04"],
            syncFullHistory: false,
            markOnlineOnConnect: false
        })
        sock.ev.on('creds.update', saveCreds)
        sock.ev.on('connection.update', async (u)=>{
            const { connection, lastDisconnect } = u
            if(connection === 'close'){
                const reason = lastDisconnect?.error?.output?.statusCode
                status = "DESCONECTADO - RECONECTANDO EN 3s"
                console.log('Desconectado:', reason)
                if(reason!== DisconnectReason.loggedOut){
                    setTimeout(()=>startBot(), 3000)
                } else {
                    try{ if(fs.existsSync('./auth_info')) fs.rmSync('./auth_info',{recursive:true, force:true}) }catch{}
                    setTimeout(()=>startBot(), 2000)
                }
            }
            if(connection === 'open'){
                status = "CONECTADO ✓"
                console.log('BOT CONECTADO')
                try{
                    await sock.sendMessage(sock.user.id, { text: `${BOT_NAME} CONECTADO ✓\n${BOT_BY}\nEscribe.menu` })
                }catch{}
            }
        })

        sock.ev.on('messages.upsert', async ({ messages })=>{
            try{
                const m = messages[0]
                if(!m.message || m.key.fromMe) return
                const text = m.message.conversation || m.message.extendedTextMessage?.text || ""
                const from = m.key.remoteJid
                if(text.toLowerCase() === '.menu' || text.toLowerCase() === '.menú'){
                    await sock.sendMessage(from, { text: `╭━〔 ${BOT_NAME} 〕━┈\n│.ping\n│.estado\n╰ ${BOT_BY}` })
                }
                if(text.toLowerCase() === '.ping'){
                    await sock.sendMessage(from, { text: `PONG! ${BOT_NAME} ACTIVO` })
                }
            }catch(e){ console.log('Error mensaje:', e.message) }
        })

        status = "ESPERANDO NUMERO..."
    }catch(e){
        console.log('Error startBot:', e)
        status = "ERROR: " + e.message
        setTimeout(()=>startBot(), 5000)
    }
}

app.use(express.json())

app.get('/pair', async(req,res)=>{
    try{
        let num = req.query.number?.replace(/[^0-9]/g,'')
        if(!num || num.length < 8) return res.json({error:"Pon número con código país Ej: 51912345678"})
        if(!sock){
            return res.json({error:"Bot iniciando, espera 5 segundos y reintenta"})
        }
        // Si ya está registrado, borra y crea nuevo
        if(fs.existsSync('./auth_info/creds.json')){
            try{
                const data = fs.readFileSync('./auth_info/creds.json','utf8')
                const c = JSON.parse(data)
                if(c.registered){
                    try{ fs.rmSync('./auth_info',{recursive:true, force:true}) }catch{}
                    await new Promise(r=>setTimeout(r,1000))
                    await startBot()
                    await new Promise(r=>setTimeout(r,3000))
                }
            }catch{}
        }
        const code = await sock.requestPairingCode(num)
        lastCode = code
        status = "CODIGO: "+code
        return res.json({code})
    }catch(e){
        console.log('Error pair:', e)
        return res.json({error: e.message})
    }
})

app.get('/status', (req,res)=> res.json({status, code:lastCode}))

app.get('/', (req,res)=>{
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>${BOT_NAME}</title><style>@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');*{font-family:'Share Tech Mono',monospace}body{margin:0;background:#000;color:#0f0;overflow:hidden}canvas{position:fixed;top:0;left:0;z-index:0}.box{position:relative;z-index:2;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px}.panel{width:100%;max-width:400px;background:rgba(0,20,0,0.9);border:1px solid #0f0;padding:22px;border-radius:12px;box-shadow:0 0 20px #0f0}input{width:100%;background:#000;border:1px solid #0f0;color:#0f0;padding:14px;border-radius:6px;outline:none}button{width:100%;margin-top:12px;background:#0f0;color:#000;border:none;padding:14px;font-weight:bold;cursor:pointer;border-radius:6px}.codebox{margin-top:15px;border:1px dashed #0f0;padding:12px;text-align:center;display:none}.code{font-size:32px;letter-spacing:8px;color:#fff}</style></head><body><canvas id="c"></canvas><div class="box"><div class="panel"><h2 style="text-align:center;margin:0">${BOT_NAME}</h2><p style="text-align:center;font-size:10px">${BOT_BY} - ANTI CRASH V5</p><input id="num" placeholder="51912345678"><button onclick="getCode()">GENERAR CODIGO</button><div class="codebox" id="box"><div id="code" class="code">--------</div></div><div id="st" style="margin-top:10px;font-size:11px;text-align:center"></div></div></div><script>const c=document.getElementById('c'),x=c.getContext('2d');c.width=innerWidth;c.height=innerHeight;const a="01";const b=14;const d=Math.floor(c.width/b);const e=Array(d).fill(1);setInterval(()=>{x.fillStyle="rgba(0,0,0,0.05)";x.fillRect(0,0,c.width,c.height);x.fillStyle="#0f0";x.font=b+"px monospace";e.forEach((y,i)=>{x.fillText(a[Math.floor(Math.random()*a.length)],i*b,y*b);if(y*b>c.height&&Math.random()>0.975)e[i]=0;e[i]++})},35);async function getCode(){const n=document.getElementById('num').value;if(!n)return alert('Pon numero');document.getElementById('st').innerText='Generando...';const r=await fetch('/pair?number='+n).then(r=>r.json());if(r.error){alert(r.error);document.getElementById('st').innerText=r.error;return}document.getElementById('box').style.display='block';document.getElementById('code').innerText=r.code;document.getElementById('st').innerText='Codigo: '+r.code+' - Pega YA'}</script></body></html>`)
})

// Evita que se caiga el proceso
process.on('uncaughtException', (e)=>{ console.log('uncaught', e.message) })
process.on('unhandledRejection', (e)=>{ console.log('unhandled', e?.message) })

app.listen(PORT, ()=>{ console.log('Servidor en '+PORT); startBot() })