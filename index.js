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
            browser: ["Debian", "Chrome", "11.0"],
            syncFullHistory: false,
            markOnlineOnConnect: true,
            getMessage: async()=>undefined
        })
        sock.ev.on('creds.update', saveCreds)
        sock.ev.on('connection.update', async (u)=>{
            const { connection, lastDisconnect } = u
            if(connection === 'close'){
                const r = lastDisconnect?.error?.output?.statusCode
                if(r!==DisconnectReason.loggedOut) setTimeout(()=>startBot(),2000)
                else { try{fs.rmSync('./auth_info',{recursive:true,force:true})}catch{}; lastCode=null; setTimeout(()=>startBot(),1500) }
            }
            if(connection === 'open'){ lastCode=null; lastCodeTime=0 }
        })
    }catch(e){ setTimeout(()=>startBot(),3000) }
}

app.use(express.json())
app.get('/pair', async(req,res)=>{
    try{
        let num = req.query.number?.replace(/[^0-9]/g,'')
        if(!num || num.length < 8) return res.json({error:"Pon numero Ej: 51912345678"})
        if(!sock){ await startBot(); await new Promise(r=>setTimeout(r,3000)) }
        if(!sock) return res.json({error:"Iniciando... 3s"})
        const now = Date.now()
        if(lastCode && (now-lastCodeTime) < 25000) return res.json({code:lastCode})
        if(fs.existsSync('./auth_info/creds.json')){
            try{ const c = JSON.parse(fs.readFileSync('./auth_info/creds.json','utf8')); if(c.registered){ fs.rmSync('./auth_info',{recursive:true,force:true}); await new Promise(r=>setTimeout(r,1000)); await startBot(); await new Promise(r=>setTimeout(r,3000)) } }catch{}
        }
        const code = await sock.requestPairingCode(num)
        lastCode=code; lastCodeTime=Date.now()
        return res.json({code})
    }catch(e){ return res.json({error:"Espera 2 min y reintenta"}) }
})

app.get('/', (req,res)=>{
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>${BOT_NAME} - NIKU EYE CLONE</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:'JetBrains Mono',monospace}
html{scroll-behavior:smooth}
body{background:#070a07;min-height:100vh;overflow-y:auto;overflow-x:hidden;display:flex;align-items:center;justify-content:center}
canvas{position:fixed;inset:0;z-index:0}
.ov{position:fixed;inset:0;background:radial-gradient(800px at 50% 10%, rgba(0,255,100,.12) 0%, rgba(7,10,7,.98) 70%);z-index:1}
#loader{position:fixed;inset:0;z-index:20;background:#070a07;display:flex;align-items:center;justify-content:center;flex-direction:column;transition:.8s;padding:20px}
.eye-loader{width:90px;height:90px;border:2px solid rgba(0,255,100,.3);border-radius:50%;display:flex;align-items:center;justify-content:center;position:relative;box-shadow:0 0 50px rgba(0,255,100,.2)}
.eye-loader::after{content:'';width:22px;height:22px;background:#00ff64;border-radius:50%;box-shadow:0 0 30px #00ff64;animation:blink 1.2s infinite}
@keyframes blink{0%,100%{transform:scale(1)}50%{transform:scale(1.3)}}
.bar{width:220px;height:2px;background:#0f1a12;margin-top:22px;overflow:hidden;border-radius:10px}
.fill{height:100%;width:0%;background:#00ff64;box-shadow:0 0 15px #00ff64;transition:.2s}
.pct{margin-top:14px;color:#00ff64;font-size:12px;letter-spacing:4px;text-align:center}
.logs{margin-top:16px;color:#00ff64;font-size:10px;letter-spacing:2px;opacity:.7;text-align:center;min-height:60px}

.main{position:relative;z-index:2;display:none;width:100%;min-height:100vh;padding:30px 20px 90px;justify-content:center;align-items:flex-start}
.wrap{width:100%;max-width:400px;margin:0 auto;display:flex;flex-direction:column;gap:20px;align-items:center}

.header{text-align:center;width:100%}
.eye{width:76px;height:76px;margin:0 auto;border:1px solid rgba(0,255,100,.4);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 40px rgba(0,255,100,.18), inset 0 0 20px rgba(0,255,100,.08)}
.eye-dot{width:18px;height:18px;background:#00ff64;border-radius:50%;box-shadow:0 0 20px #00ff64}
.title{margin-top:14px;font-size:24px;letter-spacing:8px;color:#fff;font-weight:700;text-align:center;text-shadow:0 0 20px rgba(0,255,100,.5)}
.sub{font-size:10px;letter-spacing:6px;color:#00ff64;opacity:.8;margin-top:6px;text-align:center}

.card{width:100%;background:rgba(14,20,15,.92);border:1px solid rgba(0,255,100,.18);border-radius:20px;padding:22px;backdrop-filter:blur(12px);box-shadow:0 0 60px rgba(0,0,0,.6);display:flex;flex-direction:column;align-items:center}
.label{font-size:9px;letter-spacing:4px;color:#5a7a62;text-align:center;width:100%;margin-bottom:12px}
.input-row{width:100%;display:flex;align-items:center;background:#080e09;border:1px solid rgba(0,255,100,.2);border-radius:12px;padding:12px 16px;gap:10px}
.input-row:focus-within{border-color:#00ff64;box-shadow:0 0 20px rgba(0,255,100,.2)}
input{flex:1;background:transparent;border:none;outline:none;color:#fff;font-size:14px;letter-spacing:1px;text-align:center}
.btn{width:100%;margin-top:14px;background:#00ff64;color:#000;border:none;padding:14px;border-radius:12px;font-weight:700;letter-spacing:3px;font-size:12px;cursor:pointer;box-shadow:0 0 30px rgba(0,255,100,.4);transition:.2s}
.btn:active{transform:scale(.97)}

.codebox{display:none;width:100%;margin-top:16px;background:rgba(0,255,100,.08);border:1px solid rgba(0,255,100,.5);border-radius:16px;padding:18px;text-align:center;animation:pop .4s ease}
@keyframes pop{from{transform:scale(.9);opacity:0}to{transform:scale(1);opacity:1}}
.code{font-size:22px;letter-spacing:6px;color:#fff;font-weight:700;text-align:center;word-break:break-all;line-height:1.3;width:100%;display:block;text-shadow:0 0 15px #00ff64}

.info{width:100%;background:rgba(14,20,15,.7);border:1px solid rgba(0,255,100,.12);border-radius:16px;padding:16px}
.info h4{font-size:10px;letter-spacing:3px;color:#00ff64;text-align:center;margin-bottom:10px}
.step{display:flex;gap:10px;font-size:10px;color:#7a9a82;margin:8px 0;line-height:14px;align-items:center}
.n{width:18px;height:18px;background:rgba(0,255,100,.2);border:1px solid rgba(0,255,100,.4);color:#00ff64;display:flex;align-items:center;justify-content:center;border-radius:6px;font-size:9px;font-weight:700}

.tg{position:fixed;right:14px;bottom:14px;z-index:3;background:#00ff64;border-radius:50px;padding:10px 16px;display:flex;align-items:center;gap:8px;text-decoration:none;box-shadow:0 0 30px rgba(0,255,100,.6)}
.tg svg{width:16px;height:16px;fill:#000}
.tg span{font-size:10px;font-weight:700;color:#000;letter-spacing:1px}
</style></head><body>
<canvas id="rain"></canvas><div class="ov"></div>

<div id="loader">
<div class="eye-loader"><div class="eye-dot"></div></div>
<div class="bar"><div class="fill" id="fill"></div></div>
<div class="pct" id="pct">0% • NIKU EYE • ${BOT_NAME}</div>
<div class="logs" id="logs"></div>
</div>

<a href="${CHANNEL}" class="tg" target="_blank"><svg viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.12l-6.893 4.326-2.967-.945c-.64-.203-.658-.64.135-.954l11.6-4.458c.538-.196 1.006.12.832.941z"/></svg><span>TELEGRAM</span></a>

<div class="main" id="main">
<div class="wrap">
<div class="header">
<div class="eye"><div class="eye-dot"></div></div>
<div class="title">NIKU • ${BOT_NAME}</div>
<div class="sub">EYE • DEBIAN 11</div>
</div>

<div class="card">
<div class="label">ENTER YOUR NUMBER WITH COUNTRY CODE</div>
<div class="input-row"><span style="color:#00ff64;font-weight:700">+</span><input id="num" placeholder="51912345678" inputmode="numeric"></div>
<button class="btn" id="btn" onclick="getCode()">GENERATE CODE</button>

<div class="codebox" id="box">
<div style="font-size:9px;letter-spacing:4px;color:#00ff64;text-align:center">YOUR PAIR CODE</div>
<div class="code" id="code">--------</div>
<div style="font-size:9px;color:#6a8a72;margin-top:8px;text-align:center">Copy and paste in WhatsApp<br>Linked Devices > Link with phone number</div>
</div>
</div>

<div class="info">
<h4>HOW TO LINK</h4>
<div class="step"><div class="n">1</div><span>Enter number with country code and Generate</span></div>
<div class="step"><div class="n">2</div><span>Copy the 8 digit code</span></div>
<div class="step"><div class="n">3</div><span>WhatsApp > Settings > Linked Devices > Link with phone number</span></div>
<div class="step"><div class="n">4</div><span>Paste code quickly - links always</span></div>
</div>
</div>
</div>

<script>
const c=document.getElementById('rain'),ctx=c.getContext('2d');
function rs(){c.width=innerWidth;c.height=innerHeight} rs(); addEventListener('resize',rs);
const chars="01"; const cols=Math.floor(innerWidth/16); const drops=new Array(cols).fill(0);
function draw(){ctx.fillStyle='rgba(7,10,7,0.14)'; ctx.fillRect(0,0,c.width,c.height); ctx.fillStyle='#00ff64'; ctx.font='12px JetBrains Mono'; ctx.shadowColor='#00ff64'; ctx.shadowBlur=8; for(let i=0;i<drops.length;i++){ctx.fillText(chars[Math.floor(Math.random()*chars.length)],i*16,drops[i]*16); if(drops[i]*16>c.height && Math.random()>.97) drops[i]=0; drops[i]++;} ctx.shadowBlur=0; requestAnimationFrame(draw);} draw();

const logsEl=document.getElementById('logs'),pctEl=document.getElementById('pct'),fill=document.getElementById('fill');
const steps=["> eye system booting...","> debian 11 checking...","> ${BOT_NAME} loading...","> matrix ready...","> waiting number..."];
let p=0,si=0;function boot(){if(p<100){p+=Math.random()*2+1; if(p>100)p=100; pctEl.innerText=Math.floor(p)+"% • NIKU EYE • ${BOT_NAME}"; fill.style.width=p+"%"; if(si<steps.length && p>(si+1)*(100/steps.length)){const d=document.createElement('div'); d.innerText=steps[si]; logsEl.appendChild(d); si++;} setTimeout(boot,160);}else{setTimeout(()=>{document.getElementById('loader').style.opacity="0"; setTimeout(()=>{document.getElementById('loader').style.display="none"; document.getElementById('main').style.display="flex"},600)},400);}} boot();

async function getCode(){
 const n=document.getElementById('num').value.trim();
 if(!n) return alert('Pon numero');
 const btn=document.getElementById('btn'),box=document.getElementById('box');
 btn.innerText='GENERATING...'; btn.disabled=true;
 try{
  const r=await fetch('/pair?number='+encodeURIComponent(n)).then(r=>r.json());
  if(r.error){alert(r.error); btn.innerText='GENERATE CODE'; btn.disabled=false; return;}
  document.getElementById('code').innerText=r.code;
  box.style.display='block';
  box.scrollIntoView({behavior:'smooth', block:'center'});
  btn.innerText='CODE '+r.code;
  setTimeout(()=>{btn.innerText='GENERATE CODE'; btn.disabled=false},12000);
 }catch(e){alert('Espera un momento'); btn.innerText='GENERATE CODE'; btn.disabled=false;}
}
</script></body></html>`)
})

process.on('uncaughtException', e=>console.log(e.message))
process.on('unhandledRejection', e=>console.log(e.message))
app.listen(PORT, ()=>{ console.log('NIKU EYE CLONE - JK BOT listo '+PORT); startBot() })