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

// API GRATIS SIN KEY - LA QUE SI FUNCIONA
async function IA_GRATIS(texto){
    const q = encodeURIComponent(texto)
    try{
        const { data } = await axios.get(`https://text.pollinations.ai/${q}`, {
            params: { model: 'openai' },
            timeout: 15000
        })
        if(data && typeof data === 'string') return data
    }catch{}
    try{
        const { data } = await axios.get(`https://api.giftedtech.my.id/api/ai/gpt?apikey=gifted&q=${q}`, {timeout:12000})
        if(data.result) return data.result
    }catch{}
    try{
        const { data } = await axios.get(`https://api.siputzx.my.id/api/ai/gpt3?content=${q}`, {timeout:12000})
        if(data.data) return data.data
    }catch{}
    return "❌ Sistema ocupado, intenta de nuevo"
}

async function startBot(){
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info')
    const { version } = await fetchLatestBaileysVersion()
    sock = makeWASocket({
        version,
        logger: P({ level: 'silent' }),
        printQRInTerminal: false,
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })) },
        browser: ["Debian", "Chrome", "11.0"], // SOLO AQUI, NO SE VE AFUERA
        getMessage: async()=>undefined
    })
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', async (u)=>{
        if(u.connection === 'close' && u.lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut){
            setTimeout(()=>startBot(),2000)
        }
    })
    sock.ev.on('messages.upsert', async ({ messages })=>{
        const m = messages[0]
        if(!m ||!m.message || m.key.fromMe) return
        const from = m.key.remoteJid
        const txt = m.message.conversation || m.message.extendedTextMessage?.text || ""
        if(!txt) return
        const lower = txt.toLowerCase().trim()

        if(lower === '.menu' || lower === 'menu' || lower === '.help'){
            return await sock.sendMessage(from, {text:`╭━━━〔 ${BOT_NAME} 〕━━━┈⊷
┃ 👑 Owner: ${OWNER}
┃ 🤖 Sistema: Online
┃ 🔓 Funciones: Desbloqueadas
╰━━━━━━━━━━━━━━━━┈⊷

┌───〔 FUNCIONES 〕───┐
│ .ia + pregunta
│ .ii + pregunta
│ Ej: .ia quien eres
│ Ej: .ia hazme un poema
└────────────────┘

Escribe .ia + lo que quieras y te respondo al toque
By ${OWNER} - Canal: JAKUDOSHY`}, {quoted:m})
        }

        if(lower.startsWith('.ia ') || lower.startsWith('.ii ') || lower.startsWith('.ai ') || lower.startsWith('.gpt ')){
            const pregunta = txt.slice(4).trim()
            if(!pregunta) return await sock.sendMessage(from, {text:`Usa:\n.ia hola como estas\n.ii que es javascript`}, {quoted:m})
            await sock.sendMessage(from, {text:`[●] Iniciando módulos IA...\n[●] Conectando a ${BOT_NAME}...`}, {quoted:m})
            const resp = await IA_GRATIS(pregunta)
            await sock.sendMessage(from, {text:`${resp}\n\n— ${BOT_NAME} • ${OWNER}`}, {quoted:m})
        }
    })
}

app.use(express.json())
app.get('/pair', async(req,res)=>{
    try{
        let num = req.query.number?.replace(/[^0-9]/g,'')
        if(!num || num.length < 8) return res.json({error:"Número inválido"})
        if(!sock){ await startBot(); await new Promise(r=>setTimeout(r,3500)) }
        const now = Date.now()
        if(lastCode && (now-lastCodeTime) < 20000) return res.json({code:lastCode})
        if(fs.existsSync('./auth_info/creds.json')){
            try{ const c = JSON.parse(fs.readFileSync('./auth_info/creds.json','utf8')); if(c.registered){ fs.rmSync('./auth_info',{recursive:true,force:true}); await new Promise(r=>setTimeout(r,1000)); await startBot(); await new Promise(r=>setTimeout(r,3500)) } }catch{}
        }
        const code = await sock.requestPairingCode(num)
        lastCode=code; lastCodeTime=Date.now()
        return res.json({code})
    }catch{ return res.json({error:"Espera 1 min y reintenta"}) }
})

app.get('/', (req,res)=>{
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>${BOT_NAME}</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:'JetBrains Mono',monospace}
body{background:#050805;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;overflow:hidden}
canvas{position:fixed;inset:0;z-index:0}
.overlay{position:fixed;inset:0;background:radial-gradient(600px at 50% 0%, rgba(0,255,80,.12) 0%, #050805 75%);z-index:1}
.container{position:relative;z-index:2;width:100%;max-width:420px}
.boot{width:100%;background:rgba(10,16,11,.98);border:1px solid rgba(0,255,80,.3);border-radius:20px;padding:22px;box-shadow:0 0 40px rgba(0,255,80,.15)}
.boot-line{color:#00ff64;font-size:11px;margin:4px 0;opacity:0}
.boot-line.show{opacity:1}
.cursor{animation:blink 1s infinite}
@keyframes blink{0%,50%{opacity:1}51%,100%{opacity:0}}
.welcome-screen{text-align:center}
.welcome-title{font-size:32px;color:#fff;letter-spacing:8px;font-weight:700;text-shadow:0 0 20px #00ff64}
.welcome-sub{font-size:10px;letter-spacing:5px;color:#00ff64;margin-top:8px}
.badge{margin-top:14px;display:inline-block;border:1px solid #00ff64;color:#00ff64;font-size:9px;letter-spacing:3px;padding:6px 14px;border-radius:20px;background:rgba(0,255,80,.1)}
.main-card{display:none;margin-top:18px;background:rgba(16,22,17,.98);border:1px solid rgba(0,255,80,.25);border-radius:20px;padding:24px;text-align:center}
.input-box{margin-top:18px;display:flex;align-items:center;gap:8px;background:#080c08;border:1px solid rgba(0,255,80,.25);border-radius:12px;padding:12px 14px}
input{flex:1;background:transparent;border:none;outline:none;color:#fff;text-align:center;font-size:15px}
.btn{width:100%;margin-top:14px;background:#00ff64;color:#000;border:none;padding:14px;border-radius:12px;font-weight:700;letter-spacing:3px;cursor:pointer;box-shadow:0 0 20px rgba(0,255,80,.4)}
.btn:disabled{opacity:.6}
.code-box{display:none;margin-top:16px;border:1px solid #00ff64;border-radius:14px;padding:16px;background:rgba(0,255,80,.08);animation:glow 2s infinite}
@keyframes glow{0%,100%{box-shadow:0 0 10px rgba(0,255,80,.2)}50%{box-shadow:0 0 20px rgba(0,255,80,.4)}}
.code{font-size:26px;letter-spacing:8px;color:#fff;font-weight:700}
.tuto{margin-top:18px;text-align:left;background:rgba(0,0,0,.4);border-radius:12px;padding:14px;border:1px dashed rgba(0,255,80,.2)}
.tuto h4{font-size:10px;color:#00ff64;letter-spacing:3px;margin-bottom:8px}
.tuto p{font-size:11px;color:#7a9a7e;line-height:18px;margin:3px 0}
.tuto b{color:#fff}
.success-card{display:none;margin-top:16px;background:linear-gradient(135deg, rgba(0,255,80,.15), rgba(0,255,80,.05));border:1px solid #00ff64;border-radius:16px;padding:18px;text-align:center}
</style></head><body>
<canvas id="c"></canvas><div class="overlay"></div>
<div class="container">
<div class="boot" id="boot">
<div id="lines"></div>
<div class="welcome-screen" id="welcomeInit" style="display:none">
<div class="welcome-title">JAKUDOSHY</div>
<div class="welcome-sub">SYSTEM ONLINE</div>
<div class="badge">🔓 TODAS LAS FUNCIONES DESBLOQUEADAS</div>
<div style="margin-top:12px;font-size:11px;color:#5a7a5e">Canal oficial • ${OWNER}</div>
</div>

<div class="main-card" id="mainCard">
<div style="font-size:18px;letter-spacing:5px;color:#fff;font-weight:700">VINCULACIÓN</div>
<div style="font-size:9px;letter-spacing:3px;color:#00ff64;margin-top:4px">MODO HACKER ACTIVO</div>
<div class="input-box"><span style="color:#00ff64">+</span><input id="num" placeholder="51912345678" type="tel"></div>
<button class="btn" id="btn" onclick="gen()">GENERAR CÓDIGO</button>
<div class="code-box" id="codeBox"><div style="font-size:9px;color:#00ff64;letter-spacing:3px;margin-bottom:6px">TU CÓDIGO BACANO</div><div class="code" id="codeText">--------</div><div style="font-size:9px;color:#8aaa8f;margin-top:8px">WhatsApp > Dispositivos vinculados > Vincular con número</div></div>
<div class="success-card" id="successCard"><div style="color:#00ff64;font-size:13px;letter-spacing:2px">✓ BIENVENIDO A JAKUDOSHY BOT</div><div style="color:#fff;font-size:11px;margin-top:8px;line-height:16px">Código generado con éxito<br>Sistema 100% operativo<br><br>📜 CÓDIGOS DISPONIBLES:<br><b style="color:#00ff64">.ia</b> - IA gratis<br><b style="color:#00ff64">.menu</b> - Ver funciones</div><div style="margin-top:10px;font-size:9px;color:#5a7a5e">Pon <b style="color:#fff">.menu</b> en WhatsApp para empezar</div></div>
<div class="tuto"><h4>📖 TUTORIAL RÁPIDO</h4><p><b>1.</b> Pon tu número con código país (Ej: 51)</p><p><b>2.</b> Dale GENERAR CÓDIGO</p><p><b>3.</b> Copia el código de 8 letras</p><p><b>4.</b> Ve a WhatsApp > ⋮ > Dispositivos vinculados</p><p><b>5.</b> Vincular con número de teléfono > Pega código</p><p><b>6.</b> Escribe <b>.menu</b> en el bot</p></div>
</div>
</div>
</div>

<script>
const c=document.getElementById('c'),x=c.getContext('2d');function rs(){c.width=innerWidth;c.height=innerHeight}rs();onresize=rs;
let d=new Array(Math.floor(innerWidth/14)).fill(0);function rain(){x.fillStyle='rgba(5,8,5,0.12)';x.fillRect(0,0,c.width,c.height);x.fillStyle='#00ff64';x.font='11px monospace';d.forEach((v,i)=>{x.fillText(Math.random()>.5?'1':'0',i*14,v*14);if(v*14>c.height&&Math.random()>.975)d[i]=0;d[i]++});requestAnimationFrame(rain)}rain();

const msgs=["[SYSTEM] Iniciando módulos...","[OK] Verificando paquetes...","[OK] Cargando sistemas...","[OK] Conectando a red JAKUDOSHY...","[OK] Desbloqueando funciones...","[OK] Sistema hacker activo...","[OK] Canal oficial verificado..."];
const linesEl=document.getElementById('lines');
let idx=0;
function typeNext(){
 if(idx<msgs.length){
   const div=document.createElement('div');div.className='boot-line show';div.textContent=msgs[idx];linesEl.appendChild(div);idx++;setTimeout(typeNext,280);
 }else{
   setTimeout(()=>{linesEl.style.display='none';document.getElementById('welcomeInit').style.display='block';setTimeout(()=>{document.getElementById('welcomeInit').style.display='none';document.getElementById('mainCard').style.display='block';},900)},600)
 }
}
typeNext();

async function gen(){
 const n=document.getElementById('num').value.trim(); if(!n) return alert('Pon tu número');
 const b=document.getElementById('btn'); b.innerText='GENERANDO...'; b.disabled=true;
 try{
  const r=await fetch('/pair?number='+encodeURIComponent(n)).then(r=>r.json());
  if(r.error){alert(r.error); b.innerText='GENERAR CÓDIGO'; b.disabled=false; return;}
  document.getElementById('codeText').innerText=r.code;
  document.getElementById('codeBox').style.display='block';
  document.getElementById('successCard').style.display='block';
  b.innerText=r.code; b.style.background='#fff';
  setTimeout(()=>{b.innerText='GENERAR CÓDIGO'; b.disabled=false; b.style.background='#00ff64'},15000);
 }catch{alert('Error, reintenta'); b.innerText='GENERAR CÓDIGO'; b.disabled=false;}
}
</script></body></html>`)
})

app.listen(PORT, ()=>{ console.log('JAKUDOSHY V60 ONLINE'); startBot() })