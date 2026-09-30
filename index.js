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
            if(connection === 'open'){
                lastCode = null
                try{ await sock.sendMessage(sock.user.id, { text: `${BOT_NAME}\n${BOT_BY}\n\nconectado\n.menu` }) }catch{}
            }
        })
        sock.ev.on('messages.upsert', async ({ messages, type })=>{
            if(type!=='notify') return
            const m = messages[0]
            if(!m ||!m.message || m.key.fromMe) return
            const text = (m.message.conversation || m.message.extendedTextMessage?.text || "").toLowerCase().trim()
            if(!text) return
            const from = m.key.remoteJid
            await sock.readMessages([m.key])
            if(text==='.menu') await sock.sendMessage(from,{text:`${BOT_NAME}\n${BOT_BY}\n\n.menu\n.ping\n.sticker\n.play`},{quoted:m})
            if(text==='.ping') await sock.sendMessage(from,{text:`pong ${BOT_NAME}`},{quoted:m})
        })
    }catch(e){ setTimeout(()=>startBot(),4000) }
}

app.use(express.json())

app.get('/pair', async(req,res)=>{
    try{
        let num = req.query.number?.replace(/[^0-9]/g,'')
        if(!num || num.length < 8) return res.json({error:"Pon numero Ej: 51912345678"})
        if(!sock) return res.json({error:"Bot iniciando espera 4s"})
        const now = Date.now()
        if(lastCode && (now - lastCodeTime) < 35000) return res.json({code: lastCode, reused: true})
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
        if(!sock) return res.json({error:"Reiniciando intenta en 5s"})
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
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Share+Tech+Mono&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:'JetBrains Mono',monospace}
body{background:#040608;height:100vh;overflow-x:hidden}
canvas{position:fixed;inset:0;z-index:0}
.wm{position:fixed;inset:0;z-index:1;opacity:0.035;pointer-events:none;display:flex;flex-wrap:wrap;transform:rotate(-15deg) scale(1.4)}
.wm span{font-size:13px;color:#00e5ff;letter-spacing:5px;margin:20px 24px}
.ov{position:fixed;inset:0;background:radial-gradient(700px at 50% 0%, rgba(0,229,255,.06) 0%, rgba(4,6,8,.96) 72%);z-index:2}
#loader{position:fixed;inset:0;z-index:10;display:flex;align-items:center;justify-content:center;flex-direction:column;background:#040608;transition:.8s}
.box{width:320px;border:1px solid rgba(0,229,255,.18);border-radius:14px;padding:20px;background:rgba(6,10,14,.9)}
.head{display:flex;justify-content:space-between;font-size:9px;color:#2a5a5e;letter-spacing:2px;margin-bottom:14px}
.bar{width:100%;height:2px;background:#0a1a1e;border-radius:10px;overflow:hidden}
.fill{height:100%;width:0%;background:linear-gradient(90deg,#00e5ff,#00ff88);box-shadow:0 0 12px #00e5ff;transition:.2s}
.pct{font-size:32px;color:#fff;font-weight:700;letter-spacing:3px;margin:16px 0 8px;font-family:'Share Tech Mono'}
.logs{height:110px;overflow:hidden;font-size:9px;line-height:15px;color:#2a5a5e;margin-top:10px}
.l{margin:4px 0}.ok{color:#00e5ff}
.main{position:relative;z-index:3;display:none;min-height:100vh;padding:18px;align-items:center;flex-direction:column;overflow-y:auto}
.card{width:100%;max-width:400px;background:rgba(8,12,15,.92);backdrop-filter:blur(16px);border:1px solid rgba(0,229,255,.24);border-radius:20px;padding:22px;box-shadow:0 0 60px rgba(0,229,255,.1)}
.top{display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid rgba(0,229,255,.1)}
.dot{width:8px;height:8px;border-radius:50%;background:#0a1e22}.dot.a{background:#00e5ff;box-shadow:0 0 10px #00e5ff}
.title{font-size:19px;font-weight:700;color:#fff;letter-spacing:4px;font-family:'Share Tech Mono'}
.sub{font-size:9px;color:#00e5ff;letter-spacing:4px;margin-top:4px;opacity:.7}
.input{margin-top:16px;display:flex;align-items:center;gap:10px;background:rgba(0,0,0,.65);border:1px solid rgba(0,229,255,.18);border-radius:12px;padding:12px 16px;transition:.2s}
.input:focus-within{border-color:#00e5ff;box-shadow:0 0 20px rgba(0,229,255,.18)}
input{flex:1;background:transparent;border:none;outline:none;color:#fff;font-size:14px;letter-spacing:1px}
.btn{width:100%;margin-top:12px;background:linear-gradient(90deg,#00e5ff,#00ff88);color:#000;border:none;padding:13px;border-radius:12px;font-weight:800;cursor:pointer;letter-spacing:1px}
.btn:active{transform:scale(.97)}
.codebox{display:none;margin-top:14px;background:rgba(0,229,255,.06);border:1px solid #00e5ff;border-radius:14px;padding:16px;text-align:center}
.code{font-size:34px;letter-spacing:14px;color:#fff;font-weight:700;text-shadow:0 0 20px #00e5ff;font-family:'Share Tech Mono'}
.tuto{width:100%;max-width:400px;margin-top:14px;background:rgba(8,12,15,.85);border:1px solid rgba(0,229,255,.12);border-radius:16px;padding:18px;backdrop-filter:blur(10px)}
.tuto h3{font-size:10px;letter-spacing:3px;color:#00e5ff;margin-bottom:10px}
.step{display:flex;gap:10px;margin:10px 0;font-size:10px;line-height:14px;color:#7a9aa0}
.num{min-width:18px;height:18px;background:rgba(0,229,255,.15);border:1px solid rgba(0,229,255,.3);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#00e5ff}
.func{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
.f{background:rgba(0,0,0,.4);border:1px solid rgba(0,229,255,.1);border-radius:10px;padding:10px}
.f b{display:block;font-size:8px;color:#00e5ff;letter-spacing:2px;margin-bottom:3px}.f span{font-size:9px;color:#8ab0b6;line-height:12px}
.chan{position:fixed;right:12px;bottom:12px;z-index:4;background:rgba(8,12,15,.9);border:1px solid rgba(0,229,255,.25);border-radius:24px;padding:8px 14px;display:flex;align-items:center;gap:8px;text-decoration:none;font-size:10px;color:#5a7a80}
.chan:hover{border-color:#00e5ff;color:#00e5ff}
.foot{margin-top:12px;text-align:center;font-size:8px;color:#1a3a40;letter-spacing:3px}
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
<div style="margin-top:14px;font-size:8px;color:#1a3a40;letter-spacing:4px">${BOT_BY}</div>
</div>

<a href="${CHANNEL}" target="_blank" class="chan">${BOT_BY} ></a>

<div class="main" id="main">
<div class="card">
<div class="top"><div style="display:flex;gap:6px"><div class="dot a"></div><div class="dot"></div><div class="dot"></div></div><div style="margin-left:auto;font-size:8px;color:#2a5a5e;letter-spacing:2px">${BOT_NAME} • SECURE</div></div>
<div class="title">${BOT_NAME}</div>
<div class="sub">${BOT_BY}</div>

<div class="input"><span style="color:#00e5ff">+</span><input id="num" placeholder="51912345678"><span style="color:#00e5ff;font-size:8px">●</span></div>
<button class="btn" id="btn" onclick="getCode()">GENERAR CODIGO</button>

<div class="codebox" id="box">
<div style="font-size:8px;letter-spacing:4px;color:#00e5ff">CODIGO</div>
<div class="code" id="code">--------</div>
<div id="st" style="font-size:9px;color:#5a7a80;margin-top:8px">PEGA YA EN WHATSAPP<br>EXPIRA EN 20S</div>
</div>

<div class="foot">${BOT_NAME}<br>${BOT_BY}</div>
</div>

<div class="tuto">
<h3>COMO VINCULAR - TUTORIAL</h3>
<div class="step"><div class="num">1</div><span>pon tu numero con codigo pais ej: 51912345678 y dale generar codigo</span></div>
<div class="step"><div class="num">2</div><span>copia el codigo de 8 digitos que te sale arriba</span></div>
<div class="step"><div class="num">3</div><span>abre whatsapp > menu > dispositivos vinculados > vincular con numero de telefono</span></div>
<div class="step"><div class="num">4</div><span>pega el codigo rapido, expira en 20 segundos. si da error espera 3 min y genera otro</span></div>

<h3 style="margin-top:16px">FUNCIONES DEL BOT</h3>
<div class="func">
<div class="f"><b>.MENU</b><span>muestra todos los comandos del bot</span></div>
<div class="f"><b>.PING</b><span>verifica si el bot esta online</span></div>
<div class="f"><b>.STICKER</b><span>convierte imagen a sticker</span></div>
<div class="f"><b>.PLAY</b><span>descarga musica de youtube</span></div>
<div class="f"><b>.IA</b><span>habla con inteligencia artificial</span></div>
<div class="f"><b>.GRUPOS</b><span>comandos de admin para grupos</span></div>
</div>
</div>

</div>

<script>
const wm=document.getElementById('wm'); let w=""; for(let i=0;i<120;i++) w+="<span>${BOT_BY}</span>"; wm.innerHTML=w;

const c=document.getElementById('rain'),ctx=c.getContext('2d');
function rs(){c.width=innerWidth;c.height=innerHeight} rs(); onresize=rs;
const chars="01${BOT_NAME}${BOT_BY}<>01";
const cols=Math.floor(innerWidth/16); const drops=new Array(cols).fill(0);
function draw(){
 ctx.fillStyle='rgba(4,6,8,0.11)'; ctx.fillRect(0,0,c.width,c.height);
 ctx.font='13px JetBrains Mono';
 for(let i=0;i<drops.length;i++){
  ctx.fillStyle= Math.random()>.5? '#00e5ff' : '#00ff88';
  ctx.fillText(chars[Math.floor(Math.random()*chars.length)],i*16,drops[i]*16);
  if(drops[i]*16>c.height && Math.random()>.97) drops[i]=0;
  drops[i]++;
 }
 requestAnimationFrame(draw);
} draw();

const logsEl=document.getElementById('logs'),pctEl=document.getElementById('pct'),fill=document.getElementById('fill'),ptop=document.getElementById('ptop');
const steps=[
 "[ ok ] ${BOT_NAME} kernel",
 "[ ok ] ${BOT_BY}",
 "[ ok ] loading modules",
 "[ ok ] security check ok",
 "[ ok ] baileys engine v5",
 "[ ok ] anti-crash on",
 "[ ok ] pair system ready",
 "[ ok ] ${BOT_NAME} ready"
];
let p=0, si=0;
function boot(){
 if(p<100){
  p+= Math.random()*1.6+0.6; if(p>100) p=100;
  pctEl.innerText=Math.floor(p)+"%"; ptop.innerText=Math.floor(p)+"%"; fill.style.width=p+"%";
  if(si < steps.length && p > (si+1)*(100/steps.length)){
   const d=document.createElement('div'); d.className='l ok'; d.innerText=steps[si]; logsEl.appendChild(d); si++;
  }
  setTimeout(boot, 240);
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
  document.getElementById('st').innerHTML='CODIGO: '+r.code+'<br>PEGA YA EN WHATSAPP';
  btn.innerText='CODIGO '+r.code;
  setTimeout(()=>{btn.innerText='GENERAR CODIGO'; btn.disabled=false},9000);
 }catch(e){ alert('error'); btn.innerText='GENERAR CODIGO'; btn.disabled=false; }
}
</script></body></html>`)
})

process.on('uncaughtException', e=>console.log(e.message))
process.on('unhandledRejection', e=>console.log(e.message))
app.listen(PORT, ()=>{ console.log('${BOT_NAME} listo '+PORT); startBot() })