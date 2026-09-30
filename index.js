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

// ESTO QUEDA INTACTO, NO LO TOQUE
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

// SOLO CAMBIE EL DISEÑO AQUI, CON MUCHO ESTILO
app.get('/', (req,res)=>{
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>${BOT_NAME}</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;800&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;font-family:'Outfit',sans-serif}
body{margin:0;background:#060606;color:#fff;min-height:100vh;overflow-x:hidden}
.bg{position:fixed;inset:0;background:radial-gradient(500px at 50% 0%, #0e2e0e 0%, #000 65%);z-index:0}
#loader{position:fixed;inset:0;background:#000;z-index:20;display:flex;align-items:center;justify-content:center;padding:20px;transition:.8s}
.load-card{width:100%;max-width:380px;background:#0a0a0a;border:1px solid #1a1a1a;border-radius:20px;padding:26px;text-align:center}
.load-logo{font-weight:800;font-size:26px;letter-spacing:2px}.load-logo span{color:#00ff41}
.bar{height:4px;background:#111;border-radius:10px;overflow:hidden;margin:18px 0}
.fill{height:100%;width:0%;background:#00ff41;box-shadow:0 0 10px #00ff41;transition:.3s}
.log{font-family:'JetBrains Mono',monospace;font-size:11px;color:#00ff41;height:130px;overflow:hidden;text-align:left;line-height:16px;opacity:.8}
.main{position:relative;z-index:1;display:none;min-height:100vh;padding:20px;flex-direction:column;align-items:center}
.card{width:100%;max-width:400px;background:rgba(16,16,16,0.9);backdrop-filter:blur(15px);border:1px solid #222;border-radius:20px;padding:22px}
.title{font-size:26px;font-weight:800;text-align:center}.title span{color:#00ff41}
.sub{text-align:center;font-size:10px;color:#666;letter-spacing:3px;margin-top:4px}
.info{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0}
.box{background:#000;border:1px solid #151515;border-radius:12px;padding:10px}
.box label{font-size:9px;color:#555;text-transform:uppercase;display:block;margin-bottom:2px}
.box b{font-size:12px;color:#fff}
.input{display:flex;align-items:center;gap:10px;background:#000;border:1px solid #222;border-radius:12px;padding:6px 14px;margin-top:14px}
.input:focus-within{border-color:#00ff41}
input{flex:1;background:transparent;border:none;color:#fff;outline:none;padding:10px 0;font-size:14px}
.btn{width:100%;margin-top:12px;background:#fff;color:#000;border:none;padding:13px;border-radius:12px;font-weight:800;cursor:pointer}
.btn:hover{background:#00ff41}
.codebox{display:none;margin-top:14px;background:#00ff41;color:#000;border-radius:14px;padding:16px;text-align:center}
.code{font-family:'JetBrains Mono',monospace;font-size:32px;letter-spacing:8px;font-weight:800}
.hint{font-size:11px;margin-top:6px;opacity:.8}
</style></head><body><div class="bg"></div>

<div id="loader">
<div class="load-card">
<div class="load-logo">ᴊᴋ <span>ʙᴏᴛ</span></div>
<div style="font-size:10px;color:#555;letter-spacing:3px;margin-top:6px">INICIANDO SISTEMA</div>
<div class="bar"><div class="fill" id="fill"></div></div>
<div class="log" id="log"></div>
<div id="perc" style="font-size:10px;color:#333;margin-top:8px">0%</div>
</div>
</div>

<div class="main" id="main">
<div class="card">
<div class="title">ᴊᴋ <span>ʙᴏᴛ</span></div>
<div class="sub">REAL CODE SYSTEM</div>

<div class="info">
<div class="box"><label>Device</label><b>JK Bot</b></div>
<div class="box"><label>Status</label><b style="color:#00ff41">Online</b></div>
<div class="box"><label>Version</label><b>Anti Crash V5</b></div>
<div class="box"><label>By</label><b>Jakudo</b></div>
</div>

<div class="input"><span style="color:#555">+</span><input id="num" placeholder="51912345678"><span style="color:#00ff41">↗</span></div>
<button class="btn" onclick="getCode()">GENERAR CODIGO</button>

<div class="codebox" id="box">
<div style="font-size:10px;letter-spacing:2px;opacity:.7">TU CODIGO REAL</div>
<div class="code" id="code">--------</div>
<div class="hint" id="st">Pega en WhatsApp > Dispositivos vinculados</div>
</div>
</div>
</div>

<script>
const logs=["Iniciando sistemas...","Cargando modulos...","Verificando device JK Bot","Anti crash activo","Motor de pairing listo","Sistema listo"];
const logEl=document.getElementById('log'),fill=document.getElementById('fill'),perc=document.getElementById('perc');let i=0;
function load(){
 if(i<logs.length){
  logEl.innerHTML+=logs[i]+"<br>"; logEl.scrollTop=9999;
  let p=Math.floor((i+1)/logs.length*100); fill.style.width=p+"%"; perc.innerText=p+"% "+logs[i];
  i++; setTimeout(load,300);
 }else{ setTimeout(()=>{document.getElementById('loader').style.opacity="0"; setTimeout(()=>{document.getElementById('loader').style.display="none"; document.getElementById('main').style.display="flex"},600)},400)}
}
load();
async function getCode(){
 const n=document.getElementById('num').value;
 if(!n) return alert('Pon numero');
 document.getElementById('st').innerText='Generando...';
 const r=await fetch('/pair?number='+n).then(r=>r.json();
 if(r.error){alert(r.error); document.getElementById('st').innerText=r.error; return}
 document.getElementById('box').style.display='block';
 document.getElementById('code').innerText=r.code;
 document.getElementById('st').innerText='Codigo: '+r.code+' - Pega YA en WhatsApp';
}
</script></body></html>`)
})

process.on('uncaughtException', (e)=>{ console.log('uncaught', e.message) })
process.on('unhandledRejection', (e)=>{ console.log('unhandled', e?.message) })

app.listen(PORT, ()=>{ console.log('Servidor en '+PORT); startBot() })