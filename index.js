const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const fs = require('fs')

const app = express()
const PORT = process.env.PORT || 3000
let sock = null
let lastCode = null
let lastCodeTime = 0

const BOT_NAME = "ᴊᴋ_ʙᴏᴛꫂꤪꤨᴼᶠᶜ"
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
            browser: ["Ubuntu", "Chrome", "20.0.04"],
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
                    await sock.sendMessage(sock.user.id, { text: `${BOT_NAME}\n${BOT_BY}\n\nconected\n${CHANNEL}\n.menu` })
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

// MOTOR QUE SI FUNCIONA - FIX VINCULACION
app.get('/pair', async(req,res)=>{
    try{
        let num = req.query.number?.replace(/[^0-9]/g,'')
        if(!num || num.length < 8) return res.json({error:"Pon numero Ej: 51912345678"})
        if(!sock) return res.json({error:"Iniciando espera 4s"})
        const now = Date.now()
        if(lastCode && (now - lastCodeTime) < 35000){
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
        console.log('CODIGO', code, num)
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
body{background:#020602;height:100vh;overflow:hidden}
canvas{position:fixed;inset:0;z-index:0}
.wm{position:fixed;inset:0;z-index:1;opacity:0.04;pointer-events:none;display:flex;flex-wrap:wrap;transform:rotate(-14deg) scale(1.5)}
.wm span{font-size:13px;color:#00ff41;letter-spacing:5px;margin:18px 20px}
.ov{position:fixed;inset:0;background:radial-gradient(700px at 50% 0%, rgba(0,255,65,.07) 0%, rgba(2,6,2,.94) 70%);z-index:2}
#loader{position:fixed;inset:0;z-index:10;display:flex;align-items:center;justify-content:center;flex-direction:column;background:#020602;transition:.8s}
.lbox{width:310px;border:1px solid rgba(0,255,65,.18);border-radius:12px;padding:18px;background:rgba(4,12,6,.9)}
.lhead{display:flex;justify-content:space-between;font-size:9px;color:#1e4a24;letter-spacing:2px;margin-bottom:12px}
.bar{width:100%;height:2px;background:#0a1a0c;border-radius:10px;overflow:hidden}
.fill{height:100%;width:0%;background:#00ff41;box-shadow:0 0 12px #00ff41;transition:.2s}
.pct{font-size:32px;color:#fff;font-weight:700;letter-spacing:3px;margin:14px 0 6px}
.logs{height:120px;overflow:hidden;font-size:9px;line-height:14px;color:#1a4a20;margin-top:10px}
.main{position:relative;z-index:3;display:none;min-height:100vh;padding:18px;align-items:center;justify-content:center;flex-direction:column}
.card{width:100%;max-width:380px;background:rgba(6,12,8,.9);backdrop-filter:blur(14px);border:1px solid rgba(0,255,65,.22);border-radius:18px;padding:22px;box-shadow:0 0 50px rgba(0,255,65,.12)}
.title{text-align:center;font-size:20px;font-weight:700;color:#fff;letter-spacing:4px}
.sub{text-align:center;font-size:9px;color:#00ff41;letter-spacing:4px;margin-top:8px;opacity:.8}
.input{margin-top:18px;display:flex;align-items:center;gap:10px;background:rgba(0,0,0,.7);border:1px solid rgba(0,255,65,.18);border-radius:10px;padding:11px 14px}
.input:focus-within{border-color:#00ff41;box-shadow:0 0 18px rgba(0,255,65,.18)}
input{flex:1;background:transparent;border:none;outline:none;color:#fff;font-size:14px}
.btn{width:100%;margin-top:14px;background:#00ff41;color:#000;border:none;padding:13px;border-radius:10px;font-weight:800;cursor:pointer;letter-spacing:1px;transition:.2s;box-shadow:0 0 22px rgba(0,255,65,.35)}
.btn:hover{transform:translateY(-1px);box-shadow:0 0 35px rgba(0,255,65,.55)}
.btn:active{transform:scale(.97)}
.codebox{display:none;margin-top:16px;background:rgba(0,255,65,.07);border:1px solid #00ff41;border-radius:12px;padding:16px;text-align:center}
.code{font-size:32px;letter-spacing:12px;color:#fff;font-weight:700;text-shadow:0 0 18px #00ff41}
.chan{position:fixed;right:12px;bottom:12px;z-index:4;background:rgba(6,12,8,.9);border:1px solid rgba(0,255,65,.25);border-radius:22px;padding:7px 12px;display:flex;align-items:center;gap:8px;text-decoration:none;font-size:10px;color:#5a7a60}
.chan:hover{border-color:#00ff41;color:#00ff41}
.foot{margin-top:14px;text-align:center;font-size:8px;color:#1a4a20;letter-spacing:3px;line-height:12px}
</style></head><body>
<canvas id="rain"></canvas>
<div class="wm" id="wm"></div>
<div class="ov"></div>

<div id="loader">
<div class="lbox">
<div class="lhead"><span>${BOT_BY}</span><span id="ptop">0%</span></div>
<div class="bar"><div class="fill" id="fill"></div></div>
<div class="pct" id="pct">0%</div>
<div class="logs" id="logs"></div>
</div>
<div style="margin-top:14px;font-size:8px;color:#1a4a20;letter-spacing:4px">${BOT_NAME}</div>
</div>

<a href="${CHANNEL}" target="_blank" class="chan">${BOT_BY} ></a>

<div class="main" id="main">
<div class="card">
<div class="title">${BOT_NAME}</div>
<div class="sub">${BOT_BY}</div>

<div class="input"><span style="color:#00ff41">+</span><input id="num" placeholder="51912345678"><span style="color:#00ff41;font-size:8px">●</span></div>
<button class="btn" id="btn" onclick="getCode()">ɢᴇɴᴇʀᴀʀ ᴄᴏᴅɪɢᴏ</button>

<div class="codebox" id="box">
<div style="font-size:8px;letter-spacing:4px;color:#00ff41">ᴄᴏᴅɪɢᴏ</div>
<div class="code" id="code">--------</div>
<div id="st" style="font-size:9px;color:#5a7a60;margin-top:8px">ᴘᴇɢᴀ ʏᴀ ᴇɴ ᴡʜᴀᴛѕᴀᴘᴘ<br>ᴇxᴘɪʀᴀ ᴇɴ 20ѕ</div>
</div>

<div class="foot">${BOT_NAME}<br>${BOT_BY}<br>ᴛ.ᴍᴇ/ɢɢ_ɴᴏ_ʀᴏᴏᴛ</div>
</div>
</div>

<script>
const wm=document.getElementById('wm'); let w=""; for(let i=0;i<130;i++) w+="<span>${BOT_BY}</span>"; wm.innerHTML=w;

const c=document.getElementById('rain'),ctx=c.getContext('2d');
function rs(){c.width=innerWidth;c.height=innerHeight} rs(); onresize=rs;
const chars="01${BOT_BY}${BOT_NAME}01";
const cols=Math.floor(innerWidth/14); const drops=new Array(cols).fill(0);
function draw(){
 ctx.fillStyle='rgba(2,6,2,0.10)'; ctx.fillRect(0,0,c.width,c.height);
 ctx.fillStyle='#00ff41'; ctx.font='12px JetBrains Mono';
 for(let i=0;i<drops.length;i++){
  const t=chars[Math.floor(Math.random()*chars.length)];
  ctx.fillText(t,i*14,drops[i]*14);
  if(drops[i]*14>c.height && Math.random()>.975) drops[i]=0;
  drops[i]++;
 }
 requestAnimationFrame(draw);
} draw();

const logsEl=document.getElementById('logs'),pctEl=document.getElementById('pct'),fill=document.getElementById('fill'),ptop=document.getElementById('ptop');
const steps=[
 "[  ok  ] ${BOT_NAME}",
 "[  ok  ] ${BOT_BY}",
 "[  ok  ] kernel loaded",
 "[  ok  ] canal gg_no_root",
 "[  ok  ] engine v5",
 "[  ok  ] fix vinculacion",
 "[  ok  ] ready"
];
let p=0, si=0;
function boot(){
 if(p<100){
  p+= Math.random()*1.5+0.5; if(p>100) p=100;
  pctEl.innerText=Math.floor(p)+"%"; ptop.innerText=Math.floor(p)+"%"; fill.style.width=p+"%";
  if(si < steps.length && p > (si+1)*(100/steps.length)){
   const d=document.createElement('div'); d.innerText=steps[si]; d.style.color="#00ff41"; d.style.margin="4px 0"; logsEl.appendChild(d); si++;
  }
  setTimeout(boot, 260);
 }else{
  setTimeout(()=>{document.getElementById('loader').style.opacity="0"; setTimeout(()=>{document.getElementById('loader').style.display="none"; document.getElementById('main').style.display="flex"},800)},500);
 }
}
boot();

async function getCode(){
 const n=document.getElementById('num').value.trim();
 if(!n) return alert('pon numero');
 const btn=document.getElementById('btn'), box=document.getElementById('box');
 btn.innerText='generando...'; btn.disabled=true;
 try{
  const r=await fetch('/pair?number='+encodeURIComponent(n)).then(r=>r.json());
  if(r.error){ alert(r.error); btn.innerText='generar codigo'; btn.disabled=false; return; }
  document.getElementById('code').innerText=r.code;
  box.style.display='block';
  document.getElementById('st').innerHTML='codigo: '+r.code+'<br>pega YA<br>si da error espera 3 min';
  btn.innerText='codigo '+r.code;
  setTimeout(()=>{btn.innerText='generar codigo'; btn.disabled=false},9000);
 }catch(e){ alert('error'); btn.innerText='generar codigo'; btn.disabled=false; }
}
</script></body></html>`)
})

process.on('uncaughtException', e=>console.log(e.message))
process.on('unhandledRejection', e=>console.log(e.message))
app.listen(PORT, ()=>{ console.log('listo '+PORT); startBot() })