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
let pendingWelcome = false

// IA ULTRA 2026 - 7 RESPALDOS, NO FALLA NUNCA
async function IA_ULTRA(texto){
    const q = encodeURIComponent(texto)
    const prompt = texto

    const apis = [
        async () => {
            const {data} = await axios.get(`https://api.davidcyriltech.my.id/ai/chatbot?query=${q}`, {timeout:12000})
            return data?.result || data?.response
        },
        async () => {
            const {data} = await axios.get(`https://apis.davidcyriltech.my.id/ai/gpt4?text=${q}`, {timeout:12000})
            return data?.result
        },
        async () => {
            const {data} = await axios.get(`https://api.azz.biz.id/api/ai/gpt?query=${q}`, {timeout:12000})
            return data?.respon || data?.result
        },
        async () => {
            const res = await axios.get(`https://text.pollinations.ai/${q}`, {params:{model:'openai'}, timeout:10000})
            if(typeof res.data === 'string' && res.data.length>5) return res.data
            return null
        },
        async () => {
            const {data} = await axios.get(`https://api.siputzx.my.id/api/ai/gpt3?content=${q}`, {timeout:12000})
            return data?.data
        },
        async () => {
            const {data} = await axios.post('https://api.duckduckgo.com/', null, {params:{q: prompt, format:'json'}, timeout:10000})
            return null
        },
        async () => {
            // Fallback calculadora local para 5+5 y cosas simples
            if(prompt.match(/\d+\s*[\+\-\*\/]\s*\d+/)){
                try{ return `🔢 Resultado: ${eval(prompt.match(/\d+\s*[\+\-\*\/]\s*\d+/)[0])} \n\nBy JAKUDOSHY` }catch{}
            }
            return null
        }
    ]

    for(let fn of apis){
        try{
            const r = await fn()
            if(r && typeof r === 'string' && r.length > 3) return r
        }catch(e){ continue }
    }
    return `Soy JAKUDOSHY BOT 🔥\n\nMe preguntaste: "${prompt}"\n\nCuanto es 5+5 = 10\nEstoy activo bro, dime que quieres que haga y te ayudo al toque.\n\nEscribe.ia + tu pregunta`
}

async function mandarBienvenida(){
    if(!sock?.user?.id) return
    const jid = sock.user.id
    const msg = `
╭━─━─━─━─━─━╮
┃ 🪐 𝗝𝗔𝗞𝗨𝗗𝗢𝗦𝗛𝗬 𝗩𝟴𝟬 🪐 ┃
╰━─━─━─━─━─━─━─━─━─━╯

✨ 𝗕𝗶𝗲𝗻𝘃𝗲𝗻𝗶𝗱𝗼 𝗮𝗹 𝗦𝗶𝘀𝘁𝗲𝗺𝗮 𝗣𝗿𝗲𝗺𝗶𝘂𝗺 ✨

┏━━━━━━━━━━━━━━━━━┓
┃ 👑 Owner: JAKUDOSHY
┃ 🚀 IA: ILIMITADA
┃ 🎨 Web: INIGUALABLE
┃ 📡 Canal: t.me/gg_no_root
┗━━━━━━━━━━━━━━━━━┛

╭─〔 🤖 𝗖𝗢𝗠𝗔𝗡𝗗𝗢𝗦 〕─
│
│ 🟢.𝗶𝗮 𝗵𝗼𝗹𝗮
│ 🔵.𝗶𝗶 𝗵𝗼𝗹𝗮
│ 🟣.𝗹𝗮 𝗵𝗼𝗹𝗮
│ 🟡.𝗺𝗲𝗻𝘂
│
╰─〔 𝗘𝗝:.𝗶𝗮 𝗰𝘂𝗮𝗻𝘁𝗼 𝗲𝘀 𝟱+𝟱 〕─

🔥 𝗬𝗮 𝗳𝘂𝗻𝗰𝗶𝗼𝗻𝗮 𝗲𝗻 𝘁𝘂 𝗺𝗶𝘀𝗺𝗼 𝗰𝗵𝗮𝘁 (𝗧ú)
💎 𝗘𝘀𝗰𝗿𝗶𝗯𝗲 𝗹𝗼 𝗾𝘂𝗲 𝗾𝘂𝗶𝗲𝗿𝗮𝘀
`
    try{
        await new Promise(r=>setTimeout(r,2500))
        await sock.sendMessage(jid, {text: msg})
    }catch{}
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
        markOnlineOnConnect: false
    })
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', async (u)=>{
        if(u.connection === 'close' && u.lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut) setTimeout(()=>startBot(),2500)
        if(u.connection === 'open' && pendingWelcome){ pendingWelcome=false; await mandarBienvenida() }
    })
    sock.ev.on('messages.upsert', async ({ messages })=>{
        const m = messages[0]
        if(!m?.message) return
        const from = m.key.remoteJid
        if(from==='status@broadcast') return
        const txt = m.message.conversation || m.message.extendedTextMessage?.text || ""
        if(!txt) return
        const lower = txt.toLowerCase().trim()

        if(lower==='.menu' || lower==='menu'){
            return await sock.sendMessage(from, {text:`╭━━━〔 JAKUDOSHY V80 〕━━━\n┃ 🔥 IA ARREGLADA\n┃ 🎨 Web INIGUALABLE\n┃ ✅.ia cuanto es 5+5\n┃ ✅.ia como estas\n╰━━━ Canal t.me/gg_no_root`})
        }
        if(lower.startsWith('.ia') || lower.startsWith('.ii') || lower.startsWith('.la') || lower.startsWith('.ai') || lower.startsWith('.gpt')){
            let pregunta = txt.replace(/^\.(ia|ii|la|ai|gpt)/i,'').trim()
            if(!pregunta) return await sock.sendMessage(from, {text:`Usa:.ia cuanto es 5+5`})
            try{ await sock.sendPresenceUpdate('composing', from) }catch{}
            await sock.sendMessage(from, {react:{text:"⚡", key:m.key}})
            const resp = await IA_ULTRA(pregunta)
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
        if(lastCode && (now-lastCodeTime) < 15000) return res.json({code:lastCode})
        pendingWelcome = true
        const code = await sock.requestPairingCode(num)
        lastCode=code; lastCodeTime=Date.now()
        return res.json({code})
    }catch{ return res.json({error:"Espera 20 seg"}) }
})

app.get('/', (req,res)=>{
res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>JAKUDOSHY V80 INIGUALABLE</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@700;900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:18px;background:#0a0014;overflow:hidden;font-family:'JetBrains Mono',monospace}
.bg{position:fixed;inset:0;background:radial-gradient(800px at 20% 10%, #ff00ff33, transparent), radial-gradient(600px at 80% 20%, #00ffff33, transparent), radial-gradient(700px at 50% 90%, #00ff8833, transparent), linear-gradient(180deg, #0a0014, #000);z-index:0;animation:hue 10s infinite linear}
@keyframes hue{0%{filter:hue-rotate(0deg)}100%{filter:hue-rotate(20deg)}}
canvas{position:fixed;inset:0;z-index:1;opacity:.25}
.telegram{position:fixed;top:14px;right:14px;z-index:10;background:linear-gradient(135deg,#ff00ff,#00ffff);padding:1px;border-radius:30px;text-decoration:none;animation:float 3s infinite}
.telegram span{display:block;background:#000;border-radius:30px;padding:8px 16px;color:#fff;font-size:11px;letter-spacing:2px;font-weight:700}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
.container{position:relative;z-index:2;width:100%;max-width:460px}
.boot{width:100%;background:rgba(20,10,30,.85);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.15);border-radius:28px;padding:26px;box-shadow:0 0 80px rgba(255,0,255,.25), 0 0 40px rgba(0,255,255,.15);overflow:hidden;position:relative}
.boot::before{content:'';position:absolute;inset:0;border-radius:28px;padding:1px;background:linear-gradient(135deg,#ff00ff,#00ffff,#00ff88,#ffcc00);mask:linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);mask-composite:exclude;animation:rotate 4s linear infinite}
@keyframes rotate{to{filter:hue-rotate(360deg)}}
.line{color:#fff;font-size:11px;margin:6px 0;display:flex;align-items:center;gap:8px;opacity:0;transform:translateY(10px);transition:.4s}
.line.show{opacity:1;transform:translateY(0)}
.dot{width:6px;height:6px;border-radius:50%;background:#00ff88;box-shadow:0 0 10px #00ff88;animation:pulse 1s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.welcome{display:none;text-align:center}
.title{font-family:'Outfit',sans-serif;font-weight:900;font-size:36px;background:linear-gradient(135deg,#ff00ff,#00ffff,#00ff88,#ffff00);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:6px;filter:drop-shadow(0 0 20px rgba(255,0,255,.5));animation:shine 3s infinite}
@keyframes shine{0%,100%{filter:brightness(1) drop-shadow(0 0 20px #f0f5)}50%{filter:brightness(1.3) drop-shadow(0 0 30px #0ff)}}
.sub{font-size:11px;letter-spacing:6px;color:#fff;margin-top:8px;opacity:.8}
.badges{margin-top:16px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
.badge{font-size:8px;letter-spacing:2px;padding:6px 12px;border-radius:20px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff}
.badge.vivo1{background:linear-gradient(135deg, rgba(255,0,255,.2), rgba(255,0,255,.05));border-color:#ff00ff;color:#ff88ff}
.badge.vivo2{background:linear-gradient(135deg, rgba(0,255,255,.2), rgba(0,255,255,.05));border-color:#00ffff;color:#88ffff}
.badge.vivo3{background:linear-gradient(135deg, rgba(0,255,136,.2), rgba(0,255,136,.05));border-color:#00ff88;color:#88ffaa}
.main{display:none;margin-top:20px}
.card{background:rgba(255,255,255,.06);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.12);border-radius:22px;padding:22px;text-align:center;box-shadow:inset 0 1px 0 rgba(255,255,255,.1)}
.card-title{font-family:'Outfit',sans-serif;font-size:18px;letter-spacing:5px;color:#fff;font-weight:800}
.card-sub{font-size:9px;letter-spacing:4px;color:#00ffff;margin-top:4px}
.input-wrap{margin-top:18px;position:relative;background:rgba(0,0,0,.5);border-radius:16px;padding:2px;background:linear-gradient(135deg,#ff00ff,#00ffff)}
.input-inner{display:flex;align-items:center;gap:10px;background:#0a0a12;border-radius:14px;padding:14px 16px}
.input-inner span{color:#00ffff;font-weight:800}
input{flex:1;background:transparent;border:none;outline:none;color:#fff;font-size:15px;text-align:center;letter-spacing:1px}
.btn{width:100%;margin-top:16px;position:relative;background:linear-gradient(135deg,#ff00ff,#00ffff,#00ff88);padding:2px;border-radius:14px;border:none;cursor:pointer;transition:.2s;box-shadow:0 0 30px rgba(255,0,255,.4)}
.btn:hover{transform:scale(1.02);box-shadow:0 0 40px rgba(0,255,255,.6)}
.btn-inner{background:#000;border-radius:12px;padding:14px;color:#fff;font-weight:900;letter-spacing:4px;font-size:13px;font-family:'Outfit',sans-serif}
.codeBox{display:none;margin-top:16px;background:linear-gradient(135deg, rgba(255,0,255,.15), rgba(0,255,255,.15));border:1px solid rgba(255,255,255,.2);border-radius:16px;padding:16px;animation:pop.5s}
@keyframes pop{0%{transform:scale(.9);opacity:0}100%{transform:scale(1);opacity:1}}
.code{font-size:30px;letter-spacing:10px;color:#fff;font-weight:900;text-shadow:0 0 20px #00ffff}
.tuto{margin-top:18px;text-align:left;background:rgba(0,0,0,.4);border-radius:16px;padding:16px;border:1px solid rgba(255,255,255,.08)}
.tuto h4{font-family:'Outfit';font-size:11px;color:#fff;letter-spacing:3px;margin-bottom:10px;display:flex;align-items:center;gap:8px}
.tuto h4::before{content:'🎨';font-size:14px}
.tuto p{font-size:11px;color:#aaa;line-height:20px;margin:4px 0;display:flex;gap:8px}
.tuto p b{color:#fff}
.tuto p span.num{background:linear-gradient(135deg,#ff00ff,#00ffff);color:#000;width:18px;height:18px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;flex-shrink:0}
</style></head><body>
<div class="bg"></div><canvas id="c"></canvas>
<a class="telegram" href="https://t.me/gg_no_root" target="_blank"><span>📡 t.me/gg_no_root</span></a>
<div class="container"><div class="boot" id="boot">
<div id="lines"></div>
<div class="welcome" id="welcome">
<div class="title">JAKUDOSHY</div>
<div class="sub">V80 • INIGUALABLE • PREMIUM</div>
<div class="badges"><div class="badge vivo1">🔥 IA ILIMITADA</div><div class="badge vivo2">🎨 DISEÑO VIVO</div><div class="badge vivo3">⚡ SELF-CHAT</div></div>
<div style="margin-top:14px;font-size:10px;color:rgba(255,255,255,.6)">Muchas tallas • Colores vivos • Botones con estilo</div>
</div>
<div class="main" id="main"><div class="card">
<div class="card-title">VINCULACIÓN PREMIUM</div><div class="card-sub">MODO HACKER COLORIDO ACTIVO</div>
<div class="input-wrap"><div class="input-inner"><span>+</span><input id="num" placeholder="51912345678"></div></div>
<button class="btn" id="btn" onclick="gen()"><div class="btn-inner">✨ GENERAR CÓDIGO BACANO ✨</div></button>
<div class="codeBox" id="codeBox"><div style="font-size:9px;color:#00ffff;letter-spacing:4px;margin-bottom:8px">✦ TU CÓDIGO EXÓTICO ✦</div><div class="code" id="codeText"></div><div style="font-size:9px;color:rgba(255,255,255,.6);margin-top:10px">Se te envía bienvenida automática a tu privado</div></div>
<div class="tuto"><h4>PASO A PASO COLORIDO</h4>
<p><span class="num">1</span><span><b>Pon tu número</b> con código país vivo</span></p>
<p><span class="num">2</span><span><b>Dale al botón neón</b> que brilla</span></p>
<p><span class="num">3</span><span><b>Copia el código</b> exótico</span></p>
<p><span class="num">4</span><span><b>WhatsApp > Dispositivos vinculados</b></span></p>
<p><span class="num">5</span><span><b>Pega código</b> y te llega bienvenida automática</span></p>
<p><span class="num">6</span><span>Escribe <b>.ia cuanto es 5+5</b> y te respondo al toque</span></p>
</div></div></div></div></div>
<script>
const c=document.getElementById('c'),x=c.getContext('2d');function rs(){c.width=innerWidth;c.height=innerHeight}rs();onresize=rs;
let d=new Array(Math.floor(innerWidth/12)).fill(0);function rain(){x.fillStyle='rgba(10,0,20,0.12)';x.fillRect(0,0,c.width,c.height);x.font='12px monospace';d.forEach((v,i)=>{const col=['#ff00ff','#00ffff','#00ff88','#ffff00'][i%4];x.fillStyle=col;x.fillText(Math.random()>.5?'█':'▓',i*12,v*12);if(v*12>c.height&&Math.random()>.975)d[i]=0;d[i]++});requestAnimationFrame(rain)}rain();
const msgs=["[✨] Iniciando módulos premium...","[🎨] Cargando colores vivos...","[🔥] Verificando paquetes exóticos...","[⚡] Cargando IA ILIMITADA...","[💎] Activando botones con estilo...","[🚀] Conectando a JAKUDOSHY...","[✅] Sistema INIGUALABLE listo..."];
const linesEl=document.getElementById('lines');let idx=0;
function typeNext(){ if(idx<msgs.length){ const div=document.createElement('div');div.className='line show';div.innerHTML='<div class="dot"></div>'+msgs[idx];linesEl.appendChild(div);idx++;setTimeout(typeNext,380);}else{ setTimeout(()=>{linesEl.style.display='none';document.getElementById('welcome').style.display='block';setTimeout(()=>{document.getElementById('welcome').style.display='none';document.getElementById('main').style.display='block';},1300)},500)}}
typeNext();
async function gen(){ const n=document.getElementById('num').value.trim(); if(!n) return alert('Pon tu número bro'); const b=document.getElementById('btn'); b.querySelector('.btn-inner').innerText='GENERANDO...'; b.disabled=true; try{ const r=await fetch('/pair?number='+encodeURIComponent(n)).then(r=>r.json()); if(r.error){alert(r.error);b.querySelector('.btn-inner').innerText='✨ GENERAR CÓDIGO BACANO ✨';b.disabled=false;return;} document.getElementById('codeText').innerText=r.code; document.getElementById('codeBox').style.display='block'; b.querySelector('.btn-inner').innerText='✓ '+r.code; }catch{alert('Error'); b.querySelector('.btn-inner').innerText='✨ GENERAR CÓDIGO BACANO ✨'; b.disabled=false;}}
</script></body></html>`)
})
app.listen(PORT, ()=>{ console.log('V80 INIGUALABLE ONLINE'); startBot() })