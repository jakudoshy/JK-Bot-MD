const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const fs = require('fs')

const app = express()
const PORT = process.env.PORT || 3000
let sock = null
let lastCode = null
let lastCodeTime = 0

const BOT_NAME = "ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ"
const BOT_BY = "ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ"
const CHANNEL = "https://t.me/gg_no_root"

async function startBot(){
    try{
        const { state, saveCreds } = await useMultiFileAuthState('./auth_info')
        const { version } = await fetchLatestBaileysVersion()
        sock = makeWASocket({
            version,
            logger: P({ level: 'silent' }),
            printQRInTerminal: false,
            auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })) },
            browser: [BOT_NAME, "Chrome", "1.0"],
            syncFullHistory: false,
            markOnlineOnConnect: true,
            getMessage: async()=>undefined
        })
        sock.ev.on('creds.update', saveCreds)
        sock.ev.on('connection.update', async (u)=>{
            const { connection, lastDisconnect } = u
            if(connection === 'close'){
                const r = lastDisconnect?.error?.output?.statusCode
                if(r!==DisconnectReason.loggedOut) setTimeout(()=>startBot(),3000)
                else { try{fs.rmSync('./auth_info',{recursive:true,force:true})}catch{}; setTimeout(()=>startBot(),2000) }
            }
            if(connection === 'open'){ lastCode = null; }
        })
        sock.ev.on('messages.upsert', async ({ messages, type })=>{
            if(type!=='notify') return
            const m = messages[0]
            if(!m ||!m.message || m.key.fromMe) return
            const text = (m.message.conversation || m.message.extendedTextMessage?.text || "").toLowerCase().trim()
            if(!text) return
            const from = m.key.remoteJid
            await sock.readMessages([m.key])
            if(text==='.menu') await sock.sendMessage(from,{text:`${BOT_NAME}\n${BOT_BY}`},{quoted:m})
        })
    }catch(e){ setTimeout(()=>startBot(),4000) }
}

app.use(express.json())

// MISMO MOTOR UBUNTU QUE SI FUNCIONA
app.get('/pair', async(req,res)=>{
    try{
        let num = req.query.number?.replace(/[^0-9]/g,'')
        if(!num || num.length < 8) return res.json({error:"Pon numero Ej: 51912345678"})
        if(!sock) return res.json({error:"Iniciando espera 4s"})
        const now = Date.now()
        if(lastCode && (now - lastCodeTime) < 35000) return res.json({code: lastCode})
        if(fs.existsSync('./auth_info/creds.json')){
            try{
                const c = JSON.parse(fs.readFileSync('./auth_info/creds.json','utf8'))
                if(c.registered &&!lastCode){
                    fs.rmSync('./auth_info',{recursive:true,force:true})
                    await new Promise(r=>setTimeout(r,1500))
                    await startBot()
                    await new Promise(r=>setTimeout(r,3500))
                }
            }catch{}
        }
        const code = await sock.requestPairingCode(num)
        lastCode = code; lastCodeTime = Date.now()
        return res.json({code})
    }catch(e){
        if(e.message.includes('429')) return res.json({error:"Muchos intentos espera 5 min"})
        return res.json({error: e.message})
    }
})

app.get('/', (req,res)=>{
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>${BOT_NAME}</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:'JetBrains Mono',monospace}
body{background:#020602;height:100vh;overflow-x:hidden}
canvas{position:fixed;inset:0;z-index:0}
.wm{position:fixed;inset:0;z-index:1;opacity:0.045;pointer-events:none;display:flex;flex-wrap:wrap;transform:rotate(-15deg) scale(1.6)}
.wm span{font-size:13px;color:#00ff41;letter-spacing:5px;margin:20px 22px}
.ov{position:fixed;inset:0;background:radial-gradient(800px at 50% 0%, rgba(0,255,65,.1) 0%, rgba(2,6,2,.98) 75%);z-index:2}
#loader{position:fixed;inset:0;z-index:10;display:flex;align-items:center;justify-content:center;flex-direction:column;background:#020602;transition:.8s}
.box{width:330px;border:1px solid rgba(0,255,65,.25);border-radius:16px;padding:22px;background:rgba(5,15,8,.92);box-shadow:0 0 50px rgba(0,255,65,.15)}
.head{display:flex;justify-content:space-between;font-size:9px;color:#2d5a34;letter-spacing:2px;margin-bottom:14px}
.bar{width:100%;height:3px;background:#0a1e0f;border-radius:10px;overflow:hidden}
.fill{height:100%;width:0%;background:#00ff41;box-shadow:0 0 16px #00ff41;transition:.2s}
.pct{font-size:40px;color:#fff;font-weight:800;letter-spacing:2px;margin:16px 0 8px;text-shadow:0 0 25px #00ff41}
.logs{height:130px;overflow:hidden;font-size:10px;line-height:16px;color:#1f4d26;margin-top:12px}
.l{margin:5px 0}.ok{color:#00ff41}
.main{position:relative;z-index:3;display:none;min-height:100vh;padding:20px;align-items:center;flex-direction:column;overflow-y:auto}
.card{width:100%;max-width:410px;background:rgba(5,15,8,.96);border:1px solid rgba(0,255,65,.32);border-radius:24px;padding:26px;box-shadow:0 0 80px rgba(0,255,65,.18), inset 0 0 0 1px rgba(255,255,255,.05)}
.top{display:flex;align-items:center;gap:8px;margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid rgba(0,255,65,.14)}
.dot{width:10px;height:10px;border-radius:50%;background:#102a16}.dot.a{background:#00ff41;box-shadow:0 0 14px #00ff41}
.title{font-size:22px;font-weight:800;color:#fff;letter-spacing:5px;text-shadow:0 0 20px rgba(0,255,65,.7)}
.sub{font-size:10px;color:#00ff41;letter-spacing:4px;margin-top:6px;opacity:.85}
.input{margin-top:20px;display:flex;align-items:center;gap:12px;background:rgba(0,0,0,.75);border:1px solid rgba(0,255,65,.28);border-radius:16px;padding:14px 18px;transition:.25s}
.input:focus-within{border-color:#00ff41;box-shadow:0 0 32px rgba(0,255,65,.3)}
input{flex:1;background:transparent;border:none;outline:none;color:#fff;font-size:15px;letter-spacing:1px}
.btn{width:100%;margin-top:16px;background:#00ff41;color:#000;border:none;padding:15px;border-radius:16px;font-weight:900;cursor:pointer;letter-spacing:2px;font-size:13px;box-shadow:0 0 35px rgba(0,255,65,.5);transition:.2s}
.btn:hover{transform:translateY(-1px);box-shadow:0 0 50px rgba(0,255,65,.8)}
.codebox{display:none;margin-top:18px;background:rgba(0,255,65,.1);border:1px solid #00ff41;border-radius:18px;padding:20px;text-align:center;box-shadow:0 0 40px rgba(0,255,65,.2)}
.code{font-size:38px;letter-spacing:18px;color:#fff;font-weight:800;text-shadow:0 0 24px #00ff41}
.tuto{width:100%;max-width:410px;margin-top:18px;background:rgba(5,15,8,.92);border:1px solid rgba(0,255,65,.2);border-radius:20px;padding:22px}
.tuto h3{font-size:11px;letter-spacing:3px;color:#00ff41;margin-bottom:14px}
.step{display:flex;gap:12px;margin:14px 0;font-size:11px;line-height:16px;color:#7ab883}
.num{min-width:22px;height:22px;background:rgba(0,255,65,.18);border:1px solid #00ff41;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#00ff41;font-weight:800}
.tg{position:fixed;right:16px;bottom:16px;z-index:5;background:#00ff41;border-radius:50px;padding:12px 18px;display:flex;align-items:center;gap:10px;text-decoration:none;box-shadow:0 0 40px rgba(0,255,65,.6);transition:.2s}
.tg:hover{transform:scale(1.06);box-shadow:0 0 60px rgba(0,255,65,.9)}
.tg svg{width:20px;height:20px;fill:#000}
.tg span{font-size:11px;font-weight:900;color:#000;letter-spacing:1px}
.foot{margin-top:16px;text-align:center;font-size:8px;color:#1a4d22;letter-spacing:3px;line-height:13px}
</style></head><body>
<canvas id="rain"></canvas>
<div class="wm" id="wm"></div>
<div class="ov"></div>

<div id="loader">
<div class="box">
<div class="head"><span>${BOT_NAME}</span><span id="ptop">0%</span></div>
<div class="bar"><div class="fill" id="fill"></div></div>
<div class="pct" id="pct">0%</div>
<div class="logs" id="logs"></div>
</div>
<div style="margin-top:16px;font-size:8px;color:#1a4d22;letter-spacing:4px">${BOT_BY}</div>
</div>

<a href="${CHANNEL}" target="_blank" class="tg">
<svg viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.12l-6.893 4.326-2.967-.945c-.64-.203-.658-.64.135-.954l11.6-4.458c.538-.196 1.006.12.832.941z"/></svg>
<span>TELEGRAM</span>
</a>

<div class="main" id="main">
<div class="card">
<div class="top"><div style="display:flex;gap:8px"><div class="dot a"></div><div class="dot"></div><div class="dot"></div></div><div style="margin-left:auto;font-size:8px;color:#2d5a34">${BOT_NAME}</div></div>
<div class="title">${BOT_NAME}</div>
<div class="sub">${BOT_BY}</div>
<div class="input"><span style="color:#00ff41;font-weight:900">+</span><input id="num" placeholder="51912345678"><span style="color:#00ff41">●</span></div>
<button class="btn" id="btn" onclick="getCode()">GENERAR CODIGO</button>
<div class="codebox" id="box">
<div style="font-size:10px;letter-spacing:4px;color:#00ff41;font-weight:800">TU CODIGO</div>
<div class="code" id="code">--------</div>
<div id="st" style="font-size:11px;color:#6a9e72;margin-top:10px">PEGA YA EN WHATSAPP</div>
</div>
<div class="foot">${BOT_NAME}<br>${BOT_BY}<br>GREEN EDITION • FUNCIONAL 100%</div>
</div>

<div class="tuto">
<h3>📲 TUTORIAL VINCULACION</h3>
<div class="step"><div class="num">1</div><span>Escribe tu numero con codigo de pais y toca GENERAR CODIGO</span></div>
<div class="step"><div class="num">2</div><span>Te saldra un codigo de 8 digitos como G5WB-Z35I - Copialo</span></div>
<div class="step"><div class="num">3</div><span>Ve a WhatsApp > Menu (3 puntos) > Dispositivos vinculados > Vincular dispositivo > Vincular con numero de telefono</span></div>
<div class="step"><div class="num">4</div><span>Pega el codigo en menos de 20 segundos. Si te dice "No se pudo vincular" espera 3 minutos y genera uno nuevo, WhatsApp bloquea si pides muchos seguidos</span></div>
</div>
</div>

<script>
const wm=document.getElementById('wm'); let w=""; for(let i=0;i<140;i++) w+="<span>${BOT_BY}</span>"; wm.innerHTML=w;
const c=document.getElementById('rain'),ctx=c.getContext('2d');
function rs(){c.width=innerWidth;c.height=innerHeight} rs(); onresize=rs;
const chars="01${BOT_NAME}${BOT_BY}";
const cols=Math.floor(innerWidth/14); const drops=new Array(cols).fill(0);
function draw(){
 ctx.fillStyle='rgba(2,6,2,0.13)'; ctx.fillRect(0,0,c.width,c.height);
 ctx.fillStyle='#00ff41'; ctx.font='13px JetBrains Mono'; ctx.shadowColor='#00ff41'; ctx.shadowBlur=10;
 for(let i=0;i<drops.length;i++){
  ctx.fillText(chars[Math.floor(Math.random()*chars.length)],i*14,drops[i]*14);
  if(drops[i]*14>c.height && Math.random()>.975) drops[i]=0;
  drops[i]++;
 }
 ctx.shadowBlur=0; requestAnimationFrame(draw);
} draw();
const logsEl=document.getElementById('logs'),pctEl=document.getElementById('pct'),fill=document.getElementById('fill'),ptop=document.getElementById('ptop');
const steps=[
 "[ ok ] booting ${BOT_NAME}",
 "[ ok ] ${BOT_BY} ok",
 "[ ok ] green matrix loaded",
 "[ ok ] ubuntu engine v5",
 "[ ok ] fix vinculacion applied",
 "[ ok ] ${BOT_NAME} ready"
];
let p=0, si=0;
function boot(){
 if(p<100){
  p+= Math.random()*1.7+0.7; if(p>100) p=100;
  pctEl.innerText=Math.floor(p)+"%"; ptop.innerText=Math.floor(p)+"%"; fill.style.width=p+"%";
  if(si < steps.length && p > (si+1)*(100/steps.length)){
   const d=document.createElement('div'); d.className='l ok'; d.innerText=steps[si]; logsEl.appendChild(d); si++;
  }
  setTimeout(boot, 250);
 }else{
  setTimeout(()=>{document.getElementById('loader').style.opacity="0"; setTimeout(()=>{document.getElementById('loader').style.display="none"; document.getElementById('main').style.display="flex"},800)},600);
 }
}
boot();
async function getCode(){
 const n=document.getElementById('num').value.trim();
 if(!n) return alert('pon numero');
 const btn=document.getElementById('btn'), box=document.getElementById('box');
 btn.innerText='GENERANDO...'; btn.disabled=true;
 try{
  const r=await fetch('/pair?number='+encodeURIComponent(n)).then(r=>r.json());
  if(r.error){ alert(r.error); btn.innerText='GENERAR CODIGO'; btn.disabled=false; return; }
  document.getElementById('code').innerText=r.code;
  box.style.display='block';
  btn.innerText='CODIGO '+r.code;
  setTimeout(()=>{btn.innerText='GENERAR CODIGO'; btn.disabled=false},9000);
 }catch(e){ alert('error'); btn.innerText='GENERAR CODIGO'; btn.disabled=false; }
}
</script></body></html>`)
})

process.on('uncaughtException', e=>console.log(e.message))
process.on('unhandledRejection', e=>console.log(e.message))
app.listen(PORT, ()=>{ console.log('${BOT_NAME} listo '+PORT); startBot() })