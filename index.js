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
                try{
                    await sock.sendMessage(sock.user.id, { text: `${BOT_NAME}\n${BOT_BY}\n\n${BOT_NAME} conectado` })
                }catch{}
            }
        })
        sock.ev.on('messages.upsert', async ({ messages, type })=>{
            if(type!=='notify') return
            const m = messages[0]
            if(!m || !m.message || m.key.fromMe) return
            const text = (m.message.conversation || m.message.extendedTextMessage?.text || "").toLowerCase().trim()
            if(!text) return
            const from = m.key.remoteJid
            await sock.readMessages([m.key])
            if(text==='.menu') await sock.sendMessage(from,{text:`${BOT_NAME}\n${BOT_BY}\n\n.menu\n.ping`},{quoted:m})
            if(text==='.ping') await sock.sendMessage(from,{text:`pong ${BOT_NAME}`},{quoted:m})
        })
    }catch(e){ setTimeout(()=>startBot(),4000) }
}

app.use(express.json())

// MISMO MOTOR QUE SI FUNCIONA - NO SE TOCA
app.get('/pair', async(req,res)=>{
    try{
        let num = req.query.number?.replace(/[^0-9]/g,'')
        if(!num || num.length < 8) return res.json({error:"Pon numero con codigo pais Ej: 51912345678"})
        if(!sock) return res.json({error:"Bot iniciando espera 4s"})
        const now = Date.now()
        if(lastCode && (now - lastCodeTime) < 30000){
            return res.json({code: lastCode, reused: true})
        }
        if(fs.existsSync('./auth_info/creds.json')){
            try{
                const c = JSON.parse(fs.readFileSync('./auth_info/creds.json','utf8'))
                if(c.registered && !lastCode){
                    fs.rmSync('./auth_info',{recursive:true,force:true})
                    await new Promise(r=>setTimeout(r,1500))
                    await startBot()
                    await new Promise(r=>setTimeout(r,3500))
                }
            }catch{}
        }
        if(!sock) return res.json({error:"Reiniciando intenta en 5s"})
        const code = await sock.requestPairingCode(num)
        lastCode = code
        lastCodeTime = Date.now()
        console.log('CODIGO:', code, 'para', num)
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
body{background:#020602;height:100vh;overflow-x:hidden}
canvas{position:fixed;inset:0;z-index:0}
.wm{position:fixed;inset:0;z-index:1;opacity:0.04;pointer-events:none;display:flex;flex-wrap:wrap;transform:rotate(-15deg) scale(1.4)}
.wm span{font-size:13px;color:#00ff41;letter-spacing:5px;margin:20px 24px}
.overlay{position:fixed;inset:0;background:radial-gradient(700px at 50% 0%, rgba(0,255,65,.09) 0%, rgba(2,6,2,.96) 70%);z-index:2}
#loader{position:fixed;inset:0;z-index:10;display:flex;align-items:center;justify-content:center;flex-direction:column;background:#020602;transition:.8s}
.box{width:320px;border:1px solid rgba(0,255,65,.22);border-radius:14px;padding:20px;background:rgba(6,14,8,.9);backdrop-filter:blur(10px);box-shadow:0 0 40px rgba(0,255,65,.12)}
.head{display:flex;justify-content:space-between;font-size:9px;color:#2a5a30;letter-spacing:2px;margin-bottom:14px}
.bar{width:100%;height:3px;background:#0a1e0f;border-radius:10px;overflow:hidden}
.fill{height:100%;width:0%;background:#00ff41;box-shadow:0 0 12px #00ff41;transition:.2s}
.pct{font-size:32px;color:#fff;font-weight:700;letter-spacing:3px;margin:16px 0 8px;font-family:'Share Tech Mono',monospace;text-shadow:0 0 20px #00ff41}
.logs{height:130px;overflow:hidden;font-size:9px;line-height:15px;color:#1f4d26;margin-top:10px}
.l{margin:4px 0}.ok{color:#00ff41}
.main{position:relative;z-index:3;display:none;min-height:100vh;padding:18px;align-items:center;flex-direction:column;overflow-y:auto}
.card{width:100%;max-width:390px;background:rgba(6,14,8,.92);backdrop-filter:blur(16px);border:1px solid rgba(0,255,65,.3);border-radius:20px;padding:24px;box-shadow:0 0 60px rgba(0,255,65,.15)}
.top{display:flex;align-items:center;gap:10px;margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid rgba(0,255,65,.14)}
.dot{width:8px;height:8px;border-radius:50%;background:#0a1e12}.dot.active{background:#00ff41;box-shadow:0 0 10px #00ff41}
.title{font-size:20px;font-weight:700;color:#fff;letter-spacing:4px;font-family:'Share Tech Mono',monospace;text-shadow:0 0 18px rgba(0,255,65,.6)}
.sub{font-size:9px;color:#00ff41;letter-spacing:4px;margin-top:4px;opacity:.8}
.input{margin-top:18px;display:flex;align-items:center;gap:10px;background:rgba(0,0,0,.65);border:1px solid rgba(0,255,65,.22);border-radius:12px;padding:12px 16px;transition:.2s}
.input:focus-within{border-color:#00ff41;box-shadow:0 0 20px rgba(0,255,65,.22)}
input{flex:1;background:transparent;border:none;outline:none;color:#fff;font-size:14px;letter-spacing:1px}
.btn{width:100%;margin-top:14px;background:#00ff41;color:#000;border:none;padding:13px;border-radius:12px;font-weight:900;cursor:pointer;letter-spacing:1px;transition:.2s;box-shadow:0 0 30px rgba(0,255,65,.4)}
.btn:hover{transform:translateY(-1px);box-shadow:0 0 40px rgba(0,255,65,.7)}
.btn:active{transform:scale(.97)}
.codebox{display:none;margin-top:16px;background:rgba(0,255,65,.08);border:1px solid #00ff41;border-radius:14px;padding:18px;text-align:center}
.code{font-size:34px;letter-spacing:14px;color:#fff;font-weight:700;text-shadow:0 0 20px #00ff41;font-family:'Share Tech Mono',monospace}
.tuto{width:100%;max-width:390px;margin-top:16px;background:rgba(6,14,8,.88);border:1px solid rgba(0,255,65,.18);border-radius:16px;padding:18px;backdrop-filter:blur(10px)}
.tuto h3{font-size:10px;letter-spacing:3px;color:#00ff41;margin-bottom:12px}
.step{display:flex;gap:10px;margin:11px 0;font-size:10px;line-height:15px;color:#7ab883}
.num{min-width:20px;height:20px;background:rgba(0,255,65,.15);border:1px solid #00ff41;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#00ff41;font-weight:800}
.tg{position:fixed;right:14px;bottom:14px;z-index:4;background:#00ff41;border-radius:30px;padding:10px 16px;display:flex;align-items:center;gap:10px;text-decoration:none;box-shadow:0 0 35px rgba(0,255,65,.6);transition:.2s}
.tg:hover{transform:scale(1.05);box-shadow:0 0 50px rgba(0,255,65,.9)}
.tg svg{width:18px;height:18px;fill:#000}
.tg span{font-size:10px;font-weight:900;color:#000;letter-spacing:1px}
.foot{margin-top:16px;text-align:center;font-size:8px;color:#1a4a20;letter-spacing:3px;line-height:12px}
</style></head><body>
<canvas id="rain"></canvas>
<div class="wm" id="wm"></div>
<div class="overlay"></div>

<div id="loader">
<div class="box">
<div class="head"><span>${BOT_NAME} • ${BOT_BY}</span><span id="ptop">0%</span></div>
<div class="bar"><div class="fill" id="fill"></div></div>
<div class="pct" id="pct">0%</div>
<div class="logs" id="logs"></div>
</div>
<div style="margin-top:16px;font-size:8px;color:#1a4a20;letter-spacing:4px">${BOT_NAME} • ${BOT_BY}</div>
</div>

<a href="${CHANNEL}" target="_blank" class="tg">
<svg viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.12l-6.893 4.326-2.967-.945c-.64-.203-.658-.64.135-.954l11.6-4.458c.538-.196 1.006.12.832.941z"/></svg>
<span>TELEGRAM</span>
</a>

<div class="main" id="main">
<div class="card">
<div class="top"><div style="display:flex;gap:6px"><div class="dot active"></div><div class="dot"></div><div class="dot"></div></div><div style="margin-left:auto;font-size:8px;color:#2a5a30;letter-spacing:2px">${BOT_NAME} • SECURE</div></div>
<div class="title">${BOT_NAME}</div>
<div class="sub">${BOT_BY}</div>

<div class="input"><span style="color:#00ff41">+</span><input id="num" placeholder="51912345678"><span style="color:#00ff41;font-size:8px">●</span></div>
<button class="btn" id="btn" onclick="getCode()">GENERAR CODIGO</button>

<div class="codebox" id="box">
<div style="font-size:8px;letter-spacing:4px;color:#00ff41">CODIGO DE VINCULACION</div>
<div class="code" id="code">--------</div>
<div id="st" style="font-size:9px;color:#5a7a80;margin-top:10px;line-height:14px">PEGA YA EN WHATSAPP<br>EXPIRA EN 20 SEGUNDOS</div>
</div>

<div class="foot">${BOT_NAME}<br>${BOT_BY}<br>t.me/gg_no_root</div>
</div>

<div class="tuto">
<h3>📲 COMO VINCULAR</h3>
<div class="step"><div class="num">1</div><span>Pon tu numero con codigo pais Ej: 51912345678 y toca GENERAR CODIGO</span></div>
<div class="step"><div class="num">2</div><span>Copia el codigo de 8 digitos que te sale</span></div>
<div class="step"><div class="num">3</div><span>Abre WhatsApp > Dispositivos vinculados > Vincular con numero</span></div>
<div class="step"><div class="num">4</div><span>Pega el codigo RAPIDO, expira en 20s. Si dice "No se pudo vincular" espera 3 min y genera otro</span></div>
</div>

</div>

<script>
const wm=document.getElementById('wm'); let w=""; for(let i=0;i<130;i++) w+="<span>${BOT_BY}</span>"; wm.innerHTML=w;

const c=document.getElementById('rain'),ctx=c.getContext('2d');
function rs(){c.width=innerWidth;c.height=innerHeight} rs(); onresize=rs;
const chars="01${BOT_NAME}${BOT_BY}";
const cols=Math.floor(innerWidth/16); const drops=new Array(cols).fill(0);
function draw(){
 ctx.fillStyle='rgba(2,6,2,0.11)'; ctx.fillRect(0,0,c.width,c.height);
 ctx.fillStyle='#00ff41'; ctx.font='13px JetBrains Mono'; ctx.shadowColor='#00ff41'; ctx.shadowBlur=10;
 for(let i=0;i<drops.length;i++){
  ctx.fillText(chars[Math.floor(Math.random()*chars.length)],i*16,drops[i]*16);
  if(drops[i]*16>c.height && Math.random()>.97) drops[i]=0;
  drops[i]++;
 }
 ctx.shadowBlur=0;
 requestAnimationFrame(draw);
} draw();

const logsEl=document.getElementById('logs'),pctEl=document.getElementById('pct'),fill=document.getElementById('fill'),ptop=document.getElementById('ptop');
const steps=[
 "[ ok ] ${BOT_NAME} booting",
 "[ ok ] ${BOT_BY} verificado",
 "[ ok ] green matrix loaded",
 "[ ok ] baileys 6.7.18",
 "[ ok ] anti 429 enabled",
 "[ ok ] fix G5WB-Z35I",
 "[ ok ] pair ready",
 "[ ok ] esperando numero",
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
  setTimeout(boot, 220);
 }else{
  const d=document.createElement('div'); d.className='l ok'; d.innerText="[ ok ] ${BOT_NAME} listo"; logsEl.appendChild(d);
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