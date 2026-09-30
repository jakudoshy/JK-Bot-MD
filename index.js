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
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>${BOT_NAME}</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;700;800&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;font-family:'Outfit',sans-serif}
body{margin:0;background:#070a12;color:#fff;min-height:100vh;overflow-x:hidden}
.bg{position:fixed;inset:0;background:radial-gradient(700px at 20% 0%, #0a1e3a 0%, transparent 60%),radial-gradient(600px at 90% 100%, #0a2a1a 0%, #070a12 70%);z-index:0}
#loader{position:fixed;inset:0;background:#070a12;z-index:30;display:flex;align-items:center;justify-content:center;padding:20px;transition:.7s}
.load-card{width:100%;max-width:380px;background:linear-gradient(180deg,#121a2b 0%,#0a0f1a 100%);border:1px solid #1e2f4a;border-radius:24px;padding:28px;text-align:center;box-shadow:0 0 40px rgba(42,135,255,0.15)}
.load-logo{font-size:28px;font-weight:800;letter-spacing:1px}.load-logo span{color:#2aabee}
.bar{height:4px;background:#0f1a2a;border-radius:10px;overflow:hidden;margin:18px 0}
.fill{height:100%;width:0%;background:linear-gradient(90deg,#2aabee,#00ff88);box-shadow:0 0 10px #2aabee;transition:.3s}
.log{font-family:'JetBrains Mono',monospace;font-size:11px;color:#2aabee;text-align:left;height:120px;overflow:hidden;line-height:16px;opacity:.9}
.main{position:relative;z-index:1;display:none;min-height:100vh;padding:20px;flex-direction:column;align-items:center}
.card{width:100%;max-width:400px;background:rgba(18,26,43,0.9);backdrop-filter:blur(20px);border:1px solid #1e2f4a;border-radius:24px;padding:22px;box-shadow:0 10px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)}
.head{display:flex;align-items:center;gap:12px;margin-bottom:14px}
.avatar{width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#2aabee 0%,#00ff88 100%);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;color:#000;box-shadow:0 0 15px rgba(42,171,238,0.4)}
.head-text h1{margin:0;font-size:18px;font-weight:800;letter-spacing:.5px}
.head-text p{margin:2px 0 0;font-size:11px;color:#6a7a90;letter-spacing:1px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0}
.item{background:#0a0f1a;border:1px solid #152033;border-radius:12px;padding:10px}
.item label{font-size:9px;color:#5a6a80;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:2px}
.item b{font-size:12px;color:#fff}
.input-box{display:flex;align-items:center;gap:10px;background:#0a0f1a;border:1.5px solid #152033;border-radius:14px;padding:6px 14px;margin-top:14px;transition:.2s}
.input-box:focus-within{border-color:#2aabee;box-shadow:0 0 0 3px rgba(42,171,238,0.15)}
.input-box span{color:#2aabee;font-weight:700}
input{flex:1;background:transparent;border:none;color:#fff;outline:none;padding:10px 0;font-size:15px}
.btn-telegram{width:100%;margin-top:14px;background:linear-gradient(135deg,#2aabee 0%,#229ed9 100%);color:#fff;border:none;padding:14px;border-radius:14px;font-weight:800;font-size:14px;letter-spacing:.5px;cursor:pointer;box-shadow:0 6px 18px rgba(42,171,238,0.35);display:flex;align-items:center;justify-content:center;gap:8px;transition:.2s}
.btn-telegram:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(42,171,238,0.5)}
.btn-telegram:active{transform:scale(.98)}
.btn-hacker{width:100%;margin-top:10px;background:transparent;border:1.5px solid #00ff88;color:#00ff88;padding:12px;border-radius:14px;font-weight:700;font-size:12px;letter-spacing:1px;cursor:pointer;transition:.2s}
.btn-hacker:hover{background:rgba(0,255,136,0.1);box-shadow:0 0 15px rgba(0,255,136,0.2)}
.codebox{display:none;margin-top:14px;background:linear-gradient(135deg,#0f1f33 0%,#0a1f1a 100%);border:1.5px solid #2aabee;border-radius:16px;padding:16px;text-align:center;animation:pop.4s}
@keyframes pop{0%{transform:scale(.9);opacity:0}100%{transform:scale(1);opacity:1}}
.code{font-family:'JetBrains Mono',monospace;font-size:32px;font-weight:800;letter-spacing:10px;color:#fff;text-shadow:0 0 15px #2aabee}
.status{margin-top:10px;font-size:11px;color:#8a9bb0}
.flow{width:100%;max-width:400px;margin-top:16px;display:flex;gap:8px}
.flow div{flex:1;background:rgba(255,255,255,0.03);border:1px solid #1a2435;border-radius:10px;padding:8px;text-align:center;font-size:10px;color:#6a7a90}
.flow b{display:block;color:#2aabee;font-size:12px;margin-bottom:2px}
</style></head><body><div class="bg"></div>

<div id="loader">
<div class="load-card">
<div style="width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#2aabee,#00ff88);margin:0 auto;display:flex;align-items:center;justify-content:center;font-weight:800;color:#000;font-size:22px;box-shadow:0 0 20px #2aabee">JK</div>
<div style="font-weight:800;margin-top:12px;font-size:18px">${BOT_NAME}</div>
<div style="font-size:10px;color:#5a6a80;letter-spacing:3px;margin-top:4px">TELEGRAM x HACKER FLOW</div>
<div class="bar"><div class="fill" id="fill"></div></div>
<div class="log" id="log"></div>
<div id="perc" style="font-size:10px;color:#334; margin-top:8px">0%</div>
</div>
</div>

<div class="main" id="main">
<div class="card">
<div class="head">
<div class="avatar">JK</div>
<div class="head-text"><h1>${BOT_NAME}</h1><p>${BOT_BY} • TELEGRAM FLOW</p></div>
<div style="margin-left:auto;background:#00ff88;color:#000;font-size:10px;font-weight:800;padding:4px 8px;border-radius:20px">● ONLINE</div>
</div>

<div class="grid">
<div class="item"><label>Device</label><b>Ubuntu 20.04</b></div>
<div class="item"><label>Engine</label><b>Real Code</b></div>
<div class="item"><label>Version</label><b>V15 TG x Hacker</b></div>
<div class="item"><label>By</label><b>Jakudo</b></div>
</div>

<div class="input-box"><span>+</span><input id="num" placeholder="51912345678"><span style="color:#00ff88">◍</span></div>

<button class="btn-telegram" onclick="getCode()">
<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0.27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0.24z"/></svg>
GENERAR CODIGO REAL
</button>
<button class="btn-hacker" onclick="getCode()">↗ GENERAR CON FLOW HACKER</button>

<div class="codebox" id="box">
<div style="font-size:10px;color:#2aabee;letter-spacing:2px;font-weight:700">CODIGO REAL GENERADO</div>
<div class="code" id="code">--------</div>
<div class="status" id="st">Pega en WhatsApp > Dispositivos > Vincular con número</div>
</div>

<div class="flow">
<div><b>⚡</b>Anti Crash</div>
<div><b>✈️</b>Telegram</div>
<div><b>💀</b>Hacker</div>
</div>
</div>
</div>

<script>
const logs=["Iniciando ${BOT_NAME}...","Conectando motor Telegram...","Cargando flow hacker...","Device Ubuntu verificado","Anti crash V5 activo","Sistema listo"];
const logEl=document.getElementById('log'),fill=document.getElementById('fill'),perc=document.getElementById('perc');let i=0;
function load(){
 if(i<logs.length){
  logEl.innerHTML+=logs[i]+"<br>"; logEl.scrollTop=9999;
  let p=Math.floor((i+1)/logs.length*100); fill.style.width=p+"%"; perc.innerText=p+"% "+logs[i];
  i++; setTimeout(load,320);
 }else{ setTimeout(()=>{document.getElementById('loader').style.opacity="0"; setTimeout(()=>{document.getElementById('loader').style.display="none"; document.getElementById('main').style.display="flex"},600)},400)}
}
load();
async function getCode(){
 const n=document.getElementById('num').value.trim();
 if(!n) return alert('Pon numero');
 document.getElementById('st').innerText='Generando codigo real...';
 const r=await fetch('/pair?number='+encodeURIComponent(n)).then(r=>r.json());
 if(r.error){ alert(r.error); document.getElementById('st').innerText=r.error; return }
 document.getElementById('box').style.display='block';
 document.getElementById('code').innerText=r.code;
 document.getElementById('st').innerText='Codigo: '+r.code+' - PEGA YA EN WHATSAPP';
}
</script></body></html>`)
})

process.on('uncaughtException', (e)=>{ console.log('uncaught', e.message) })
process.on('unhandledRejection', (e)=>{ console.log('unhandled', e?.message) })

app.listen(PORT, ()=>{ console.log('Servidor en '+PORT); startBot() })