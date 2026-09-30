const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const fs = require('fs')

const app = express()
const PORT = process.env.PORT || 3000
let sock = null
let lastCode = "--------"

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
            syncFullHistory: false,
            markOnlineOnConnect: true
        })
        sock.ev.on('creds.update', saveCreds)
        sock.ev.on('connection.update', async ({connection, lastDisconnect})=>{
            if(connection==='open'){
                console.log('CONECTADO')
                try{ await sock.sendMessage(sock.user.id, { text: `${BRAND} conectado\n\nDevice JK Bot\nMod by Jakudo\n\nEscribe .menu` }) }catch{}
            }
            if(connection==='close' && lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut) setTimeout(startBot,2000)
        })
    }catch(e){ setTimeout(startBot,3000) }
}

app.use(express.json())

app.get('/pair', async(req,res)=>{
    try{
        let num = (req.query.number||"").replace(/[^0-9]/g,'')
        if(!num || num.length < 8) return res.json({error:"Pon número completo"})
        if(!sock) return res.json({error:"Iniciando, espera 3s"})
        if(fs.existsSync('./auth_info/creds.json')){
            try{
                const c = JSON.parse(fs.readFileSync('./auth_info/creds.json','utf8'))
                if(c.registered){ fs.rmSync('./auth_info',{recursive:true,force:true}); await new Promise(r=>setTimeout(r,1000)); await startBot(); await new Promise(r=>setTimeout(r,2000)) }
            }catch{}
        }
        const raw = await sock.requestPairingCode(num)
        const code = raw.match(/.{1,4}/g).join("-")
        lastCode = code
        console.log('CODIGO REAL:', code)
        return res.json({code})
    }catch(e){ return res.json({error:e.message}) }
})

app.get('/', (req,res)=>{
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>${BRAND}</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;600;800&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;font-family:'Outfit',sans-serif}
body{margin:0;background:#060606;color:#fff;min-height:100vh;overflow-x:hidden}
.bg{position:fixed;inset:0;background:radial-gradient(600px at 50% -10%, #0a2e0a 0%, #000 60%), radial-gradient(800px at 90% 90%, #001a00 0%, transparent 60%);z-index:0}
#loader{position:fixed;inset:0;background:#000;z-index:10;display:flex;align-items:center;justify-content:center;padding:20px;transition:.8s}
.loader-card{width:100%;max-width:400px;background:#0a0a0a;border:1px solid #1a1a1a;border-radius:20px;padding:28px;text-align:center}
.logo-load{font-size:28px;font-weight:800;letter-spacing:2px;color:#fff}
.logo-load span{color:#00ff41}
.bar{height:4px;background:#111;border-radius:10px;overflow:hidden;margin:20px 0}
.fill{height:100%;width:0%;background:#00ff41;box-shadow:0 0 12px #00ff41;transition:.3s}
.log{font-family:'JetBrains Mono',monospace;font-size:11px;color:#00ff41;height:140px;overflow:hidden;text-align:left;line-height:16px;opacity:0.8}
.main{position:relative;z-index:1;display:none;min-height:100vh;padding:18px;align-items:center;flex-direction:column}
.card{width:100%;max-width:400px;background:rgba(14,14,14,0.9);backdrop-filter:blur(20px);border:1px solid #1f1f1f;border-radius:22px;padding:22px;margin-top:20px}
.title{font-size:26px;font-weight:800;text-align:center;letter-spacing:1px}
.title span{color:#00ff41}
.subtitle{text-align:center;font-size:11px;color:#777;letter-spacing:3px;margin-top:4px;text-transform:uppercase}
.info{margin:18px 0;background:#000;border:1px solid #111;border-radius:14px;padding:14px;display:grid;grid-template-columns:1fr 1fr;gap:10px}
.item{background:#0a0a0a;border-radius:10px;padding:10px}
.item label{font-size:9px;color:#555;display:block;letter-spacing:1px;text-transform:uppercase;margin-bottom:3px}
.item b{font-size:12px;color:#fff;font-weight:600}
.input-wrap{margin-top:16px;background:#000;border:1px solid #222;border-radius:14px;padding:5px 14px;display:flex;align-items:center;gap:10px;transition:.2s}
.input-wrap:focus-within{border-color:#00ff41;box-shadow:0 0 0 3px rgba(0,255,65,0.1)}
.input-wrap i{color:#333;font-style:normal;font-size:13px}
input{flex:1;background:transparent;border:none;color:#fff;outline:none;padding:12px 0;font-size:15px;letter-spacing:1px}
.btn{width:100%;margin-top:14px;background:#fff;color:#000;border:none;padding:14px;border-radius:14px;font-weight:800;letter-spacing:1px;cursor:pointer;transition:.2s}
.btn:hover{background:#00ff41;box-shadow:0 0 20px rgba(0,255,65,0.4)}
.btn:disabled{opacity:.5}
.code-box{display:none;margin-top:16px;background:#00ff41;border-radius:16px;padding:18px;text-align:center;color:#000;animation:pop .4s}
@keyframes pop{0%{transform:scale(.9);opacity:0}100%{transform:scale(1);opacity:1}}
.code-label{font-size:10px;letter-spacing:2px;opacity:.7;text-transform:uppercase;margin-bottom:6px;font-weight:600}
.code{font-size:38px;font-weight:800;letter-spacing:12px}
.code-hint{font-size:11px;margin-top:8px;opacity:.8;line-height:14px}
.details{width:100%;max-width:400px;margin:18px 0 60px}
.details h4{font-size:12px;color:#555;letter-spacing:2px;text-transform:uppercase;margin:22px 0 10px}
.detail-card{background:#0e0e0e;border:1px solid #151515;border-radius:14px;padding:14px;font-size:12px;color:#aaa;line-height:18px}
.detail-card b{color:#fff}
</style></head><body><div class="bg"></div>

<div id="loader">
<div class="loader-card">
<div class="logo-load">${BRAND.split(' ')[0]} <span>${BRAND.split(' ')[1]||'BOT'}</span></div>
<div style="font-size:10px;color:#555;letter-spacing:3px;margin-top:6px">SYSTEM BOOTING</div>
<div class="bar"><div class="fill" id="fill"></div></div>
<div class="log" id="log"></div>
<div id="perc" style="font-size:10px;color:#333;margin-top:10px">0%</div>
</div>
</div>

<div class="main" id="main">
<div class="card">
<div class="title">${BRAND}</div>
<div class="subtitle">Real Code • Anti Crash • Clean</div>

<div class="info">
<div class="item"><label>Device</label><b>JK Bot</b></div>
<div class="item"><label>Status</label><b style="color:#00ff41">● Online</b></div>
<div class="item"><label>Version</label><b>V14 Clean</b></div>
<div class="item"><label>Support</label><b>+53 / +51 / +57</b></div>
</div>

<div class="input-wrap"><i>+</i><input id="num" placeholder="5351234567" value="53"><i style="color:#00ff41">↗</i></div>
<button class="btn" onclick="getCode()" id="btn">GENERAR CODIGO</button>

<div class="code-box" id="box">
<div class="code-label">Tu codigo real</div>
<div class="code" id="code">---- ----</div>
<div class="code-hint">Abre WhatsApp > Dispositivos vinculados > Vincular con número y pega el código. Expira en 60 segundos.</div>
</div>
</div>

<div class="details">
<h4>Información</h4>
<div class="detail-card">
<b>${BRAND}</b> es un sistema limpio y con estilo. Genera códigos reales de vinculación usando Baileys oficial.<br><br>
<b>Anti Crash</b> integrado para que no se caiga en Railway.<br>
<b>Bienvenida automática</b> llega a tu DM cuando vinculas.
</div>

<h4>Como usar</h4>
<div class="detail-card">
1. Pon tu número con código de país<br>
2. Dale a Generar código<br>
3. Copia el código tipo <b>ABCD-EFGH</b><br>
4. Pégalo en WhatsApp rápido<br><br>
No hagas spam o WhatsApp te bloquea 5 minutos.
</div>

<h4>Creditos</h4>
<div class="detail-card">
<b>Mod by Jakudo</b><br>
<b>Base:</b> Baileys 6.7.18<br>
<b>Estilo:</b> Hacker Clean Minimal<br>
<b>2026</b>
</div>
</div>
</div>

<script>
const logs=["Iniciando sistema exotic...","Cargando modulos JK...","Device JK Bot verificado","Soporte +53 activado","Motor de emparejamiento listo","Anti crash activado","Sistema listo"];
const logEl=document.getElementById('log'),fill=document.getElementById('fill'),perc=document.getElementById('perc');let i=0;
function loader(){
 if(i<logs.length){
  logEl.innerHTML+=logs[i]+"<br>"; logEl.scrollTop=9999;
  let p=Math.floor((i+1)/logs.length*100); fill.style.width=p+"%"; perc.innerText=p+"% "+logs[i];
  i++; setTimeout(loader,300);
 }else{
  setTimeout(()=>{ document.getElementById('loader').style.opacity="0"; setTimeout(()=>{ document.getElementById('loader').style.display="none"; document.getElementById('main').style.display="flex"; },600)},400);
 }
}
loader();
async function getCode(){
 const raw=document.getElementById('num').value.trim();
 if(!raw) return alert('Pon numero');
 const btn=document.getElementById('btn'); btn.innerText='Generando...'; btn.disabled=true;
 try{
  const r=await fetch('/pair?number='+encodeURIComponent(raw)).then(r=>r.json());
  if(r.error){ alert(r.error); btn.innerText='GENERAR CODIGO'; btn.disabled=false; return }
  document.getElementById('box').style.display='block';
  document.getElementById('code').innerText=r.code;
  btn.innerText='CODIGO '+r.code;
  setTimeout(()=>{btn.innerText='GENERAR CODIGO'; btn.disabled=false},4000);
 }catch(e){ alert('Error'); btn.innerText='GENERAR CODIGO'; btn.disabled=false }
}
</script></body></html>`)
})

process.on('uncaughtException', e=>console.log(e.message))
process.on('unhandledRejection', e=>console.log(e.message))
app.listen(PORT, ()=>{ console.log('LISTO EN '+PORT); startBot() })