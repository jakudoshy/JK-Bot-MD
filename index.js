const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const fs = require('fs')

const app = express()
const PORT = process.env.PORT || 3000
let sock = null
const BRAND = "ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ"

async function startBot(){
    try{
        const { state, saveCreds } = await useMultiFileAuthState('./auth_info')
        const { version } = await fetchLatestBaileysVersion()
        sock = makeWASocket({
            version,
            logger: P({ level: 'silent' }),
            printQRInTerminal: false,
            auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })) },
            browser: ["JK Bot", "Chrome", "1.0.0"],
            markOnlineOnConnect: true
        })
        sock.ev.on('creds.update', saveCreds)
        sock.ev.on('connection.update', async ({connection, lastDisconnect})=>{
            if(connection==='open'){
                console.log('CONECTADO '+BRAND)
                try{
                    await sock.sendMessage(sock.user.id, { 
                        text: `*${BRAND} CONECTADO ✓*\n\n*Bot:* ${BRAND}\n*Device:* JK Bot\n*Mod:* Jakudo\n*Status:* Online\n\nEscribe .menu` 
                    })
                }catch{}
            }
            if(connection==='close' && lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut){
                setTimeout(startBot, 2000)
            }
        })
    }catch(e){ console.log(e); setTimeout(startBot, 3000) }
}

app.use(express.json())

app.get('/pair', async (req,res)=>{
    try{
        let num = (req.query.number||"").replace(/[^0-9]/g,'')
        if(!num) return res.json({error:"Pon tu numero"})
        if(!sock) {
            await startBot()
            await new Promise(r=>setTimeout(r,2000))
        }
        // Si pide código nuevo, borra sesión vieja
        if(fs.existsSync('./auth_info/creds.json')){
            const c = JSON.parse(fs.readFileSync('./auth_info/creds.json'))
            if(c.registered){
                fs.rmSync('./auth_info',{recursive:true,force:true})
                await new Promise(r=>setTimeout(r,1000))
                await startBot()
                await new Promise(r=>setTimeout(r,2000))
            }
        }
        console.log('PAIR REAL PARA:', num)
        const code = await sock.requestPairingCode(num)
        const formatted = code.match(/.{1,4}/g).join("-")
        console.log('CODIGO REAL:', formatted)
        res.json({ code: formatted })
    }catch(e){
        console.log('Error pair:', e.message)
        res.json({ error: e.message })
    }
})

app.get('/', (req,res)=>{
    res.send(`<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>${BRAND}</title>
<link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@600&display=swap" rel="stylesheet">
<style>
*{font-family:'Share Tech Mono',monospace;box-sizing:border-box}
body{margin:0;background:#050505;color:#00ff41;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:15px}
.bg{position:fixed;inset:0;background:radial-gradient(circle at center, #002200 0%, #000 70%);z-index:0}
.card{position:relative;z-index:1;width:100%;max-width:420px;background:rgba(0,15,0,0.9);border:1px solid #00ff41;border-radius:18px;padding:22px;box-shadow:0 0 30px rgba(0,255,65,0.25)}
.header{text-align:center;margin-bottom:18px}
.logo{font-family:'Orbitron',monospace;font-size:28px;color:#fff;text-shadow:0 0 15px #00ff41;letter-spacing:3px}
.sub{font-size:10px;color:#8f8;letter-spacing:4px;margin-top:4px}
.info{border:1px solid #003300;background:#000;border-radius:10px;padding:12px;margin:14px 0;font-size:11px;line-height:18px;color:#8f8}
.info b{color:#00ff41}
.info .row{display:flex;justify-content:space-between;margin:3px 0}
.label{width:100%;display:flex;gap:8px;background:#000;border:1px solid #00ff41;border-radius:10px;padding:4px 12px;align-items:center;margin-top:10px}
.label span{font-size:11px;color:#555}
input{flex:1;background:transparent;border:none;color:#fff;outline:none;font-size:15px;padding:10px 0;letter-spacing:1px}
.btn{width:100%;margin-top:12px;background:#00ff41;color:#000;border:none;padding:13px;border-radius:10px;font-weight:bold;letter-spacing:2px;cursor:pointer;box-shadow:0 0 15px #00ff41;transition:0.2s}
.btn:hover{background:#fff;box-shadow:0 0 25px #00ff41}
.code-panel{display:none;margin-top:16px;background:#000;border:1.5px solid #00ff41;border-radius:14px;padding:16px;text-align:center;box-shadow:inset 0 0 15px rgba(0,255,65,0.2)}
.code-title{font-size:10px;letter-spacing:3px;color:#8f8;margin-bottom:8px}
.code{font-family:'Orbitron',monospace;font-size:36px;letter-spacing:12px;color:#fff;text-shadow:0 0 20px #00ff41;font-weight:800}
.hint{font-size:10px;color:#aaa;margin-top:10px;line-height:14px}
.hint y{color:#ff0}
.footer{text-align:center;margin-top:16px;font-size:9px;color:#444;letter-spacing:2px}
</style></head>
<body><div class="bg"></div>
<div class="card">
<div class="header">
<div class="logo">${BRAND}</div>
<div class="sub">EXOTIC SYSTEM • ANTI-CRASH • REAL CODE</div>
</div>

<div class="info">
<div class="row"><span>Bot Name:</span><b>${BRAND}</b></div>
<div class="row"><span>Device:</span><b>JK Bot</b></div>
<div class="row"><span>Version:</span><b>V12 BKN</b></div>
<div class="row"><span>Support:</span><b>+53 Cuba • +51 • +52</b></div>
<div class="row"><span>Status:</span><b style="color:#0f0">● Online</b></div>
<div class="row"><span>Mode:</span><b>Hacker Clean</b></div>
</div>

<div class="label"><span>+</span><input id="num" placeholder="5351234567" value="53"><span style="color:#00ff41">✎</span></div>
<button class="btn" onclick="getCode()">GENERAR CODIGO REAL</button>

<div class="code-panel" id="box">
<div class="code-title">◤ TU CODIGO REAL ◥</div>
<div class="code" id="code">---- ----</div>
<div class="hint">
<y>WhatsApp > Dispositivos vinculados > Vincular con número</y><br>
Pega el código en menos de 40 segundos<br>
Te llegará bienvenida a tu DM automáticamente
</div>
</div>

<div class="footer">MOD BY JAKUDO • ${BRAND} • DUAL ENABLED</div>
</div>

<script>
async function getCode(){
 const input=document.getElementById('num');
 let raw=input.value.trim();
 if(!raw || raw.length<8) return alert('Pon tu numero completo con 53');
 let btn=document.querySelector('.btn');
 btn.innerText='GENERANDO...'; btn.disabled=true;
 try{
  const r=await fetch('/pair?number='+encodeURIComponent(raw)).then(r=>r.json());
  if(r.error){ alert(r.error); btn.innerText='GENERAR CODIGO REAL'; btn.disabled=false; return }
  document.getElementById('box').style.display='block';
  document.getElementById('code').innerText=r.code;
  btn.innerText='CODIGO: '+r.code;
  setTimeout(()=>{btn.innerText='GENERAR CODIGO REAL'; btn.disabled=false}, 5000)
 }catch(e){ alert('Error red, reintenta'); btn.innerText='GENERAR CODIGO REAL'; btn.disabled=false }
}
</script>
</body></html>`)
})

process.on('uncaughtException', e=>console.log('uncaught',e.message))
process.on('unhandledRejection', e=>console.log('unhandled',e?.message))
app.listen(PORT, ()=>{ console.log(BRAND+' LISTO EN '+PORT); startBot() })