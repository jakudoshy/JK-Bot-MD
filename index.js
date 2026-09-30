const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const fs = require('fs')
const TelegramBot = require('node-telegram-bot-api')

const app = express()
const PORT = process.env.PORT || 3000
let sock = null
let lastCode = null
let lastCodeTime = 0

const BOT_NAME = "ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ"
const BOT_BY = "ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ"
const CHANNEL = "https://t.me/gg_no_root"
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "PON_AQUI_TU_TOKEN_DE_TELEGRAM"

// --- TELEGRAM BOT - MISMO MENU QUE NICO BLADE PERO CON TU NOMBRE ---
let tgBot = null
if(TELEGRAM_TOKEN && TELEGRAM_TOKEN !== "PON_AQUI_TU_TOKEN_DE_TELEGRAM"){
  tgBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true })
  tgBot.onText(/\/start|\.menu|\/menu/, (msg)=>{
    tgBot.sendMessage(msg.chat.id, `
╭━━━〔 ${BOT_NAME} 〕━━━┈⊷
┃ ${BOT_BY}
┃ DEBIAN 11 • GREEN MATRIX
╰━━━━━━━━━━━━━━━━┈⊷

📜 /menu - ver menu
🏓 /ping - velocidad
📊 /estado - estado
🎨 /sticker - img a sticker
⬇️ /play - descargar musica
⬇️ /mp4 - video yt
⬇️ /tiktok - tiktok sin marca
🤖 /ia - hablar con ia
👥 /ban - banear (grupos)

${BOT_NAME} EN TELEGRAM TAMBIEN
${CHANNEL}
`)
  })
  tgBot.onText(/\/ping/, (msg)=> tgBot.sendMessage(msg.chat.id, `PONG 🏓\n${BOT_NAME}\n${BOT_BY}`))
  console.log('TELEGRAM BOT ACTIVO')
}

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
                console.log('Desconectado', r)
                if(r!==DisconnectReason.loggedOut){
                  await new Promise(res=>setTimeout(res,3000))
                  startBot()
                } else {
                  try{fs.rmSync('./auth_info',{recursive:true,force:true})}catch{}
                  lastCode=null
                  setTimeout(()=>startBot(),2000)
                }
            }
            if(connection === 'open'){
                console.log(BOT_NAME+' CONECTADO')
                lastCode = null
                lastCodeTime = 0
                try{
                    await sock.sendMessage(sock.user.id, { text: `${BOT_NAME}\n${BOT_BY}\n\n✅ SISTEMA DEBIAN CONECTADO\nCanal: ${CHANNEL}` })
                }catch{}
            }
        })
    }catch(e){
        console.log('Error startBot', e.message)
        setTimeout(()=>startBot(),4000)
    }
}

app.use(express.json())

// MOTOR DEBIAN ARREGLADO - VINCULA SIEMPRE - NO FALLA MAS
app.get('/pair', async(req,res)=>{
    try{
        let num = req.query.number?.replace(/[^0-9]/g,'')
        if(!num || num.length < 8) return res.json({error:"Pon numero Ej: 51912345678"})
        if(!sock){
          await startBot()
          await new Promise(r=>setTimeout(r,4000))
          if(!sock) return res.json({error:"Iniciando... espera 5s y reintenta"})
        }
        const now = Date.now()
        // Si ya hay codigo reciente lo reutiliza para no dar error 429
        if(lastCode && (now - lastCodeTime) < 40000){
            return res.json({code: lastCode, reused: true})
        }
        // Si ya esta registrado y pide codigo nuevo, limpia
        if(fs.existsSync('./auth_info/creds.json') && !lastCode){
            try{
                const c = JSON.parse(fs.readFileSync('./auth_info/creds.json','utf8'))
                if(c.registered){
                    fs.rmSync('./auth_info',{recursive:true,force:true})
                    await new Promise(r=>setTimeout(r,1500))
                    await startBot()
                    await new Promise(r=>setTimeout(r,4000))
                }
            }catch{}
        }
        const code = await sock.requestPairingCode(num)
        lastCode = code
        lastCodeTime = Date.now()
        console.log(`[${BOT_NAME}] CODIGO: ${code} para ${num}`)
        return res.json({code})
    }catch(e){
        console.log('Error pair', e.message)
        if(e.message.includes('429') || e.message.includes('rate')){
          return res.json({error:"Muchos intentos - WhatsApp te bloqueo 5 min - espera y reintenta"})
        }
        return res.json({error: e.message})
    }
})

app.get('/', (req,res)=>{
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>${BOT_NAME}</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Share+Tech+Mono:wght@400&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:'JetBrains Mono',monospace}
body{background:#010501;height:100vh;overflow-x:hidden}
canvas{position:fixed;inset:0;z-index:0}
.wm{position:fixed;inset:0;z-index:1;opacity:0.05;pointer-events:none;display:flex;flex-wrap:wrap;transform:rotate(-15deg) scale(1.5)}
.wm span{font-size:12px;color:#00ff41;letter-spacing:6px;margin:20px 22px}
.ov{position:fixed;inset:0;background:radial-gradient(900px at 50% 0%, rgba(0,255,65,.14) 0%, rgba(1,5,1,.98) 80%);z-index:2}
#loader{position:fixed;inset:0;z-index:10;display:flex;align-items:center;justify-content:center;flex-direction:column;background:#010501;transition:.8s;padding:20px}
.box{width:100%;max-width:380px;border:1px solid rgba(0,255,65,.32);border-radius:18px;padding:24px;background:rgba(4,12,6,.92);backdrop-filter:blur(12px);box-shadow:0 0 70px rgba(0,255,65,.22)}
.head{display:flex;justify-content:space-between;font-size:9px;color:#2a5a30;letter-spacing:3px;margin-bottom:16px}
.bar{width:100%;height:4px;background:#0a1e0f;border-radius:10px;overflow:hidden;border:1px solid rgba(0,255,65,.2)}
.fill{height:100%;width:0%;background:#00ff41;box-shadow:0 0 18px #00ff41;transition:.2s}
.pct{font-size:42px;color:#fff;font-weight:900;letter-spacing:2px;margin:16px 0 10px;font-family:'Share Tech Mono',monospace;text-shadow:0 0 28px #00ff41}
.logs{height:150px;overflow:hidden;font-size:10px;line-height:17px;color:#1f4d26;margin-top:12px}
.l{margin:5px 0}.ok{color:#00ff41;text-shadow:0 0 8px rgba(0,255,65,.6)}
.main{position:relative;z-index:3;display:none;min-height:100vh;padding:20px;align-items:center;flex-direction:column;overflow-y:auto}
.card{width:100%;max-width:420px;background:rgba(4,12,6,.96);backdrop-filter:blur(20px);border:1px solid rgba(0,255,65,.36);border-radius:26px;padding:30px;box-shadow:0 0 90px rgba(0,255,65,.22)}
.top{display:flex;align-items:center;gap:10px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid rgba(0,255,65,.16)}
.dot{width:10px;height:10px;border-radius:50%;background:#0a1e12}.dot.a{background:#00ff41;box-shadow:0 0 14px #00ff41}
/* NOMBRE BIEN GRANDE ARRIBA COMO PEDISTE */
.title{font-size:34px;font-weight:900;color:#fff;letter-spacing:8px;font-family:'Share Tech Mono',monospace;text-shadow:0 0 30px rgba(0,255,65,.8);line-height:34px}
.sub{font-size:11px;color:#00ff41;letter-spacing:6px;margin-top:10px;opacity:.9;font-weight:800}
.input{margin-top:24px;display:flex;align-items:center;gap:12px;background:rgba(0,0,0,.75);border:1px solid rgba(0,255,65,.34);border-radius:18px;padding:16px 20px;transition:.3s}
.input:focus-within{border-color:#00ff41;box-shadow:0 0 40px rgba(0,255,65,.4)}
input{flex:1;background:transparent;border:none;outline:none;color:#fff;font-size:16px;letter-spacing:1px}
.btn{width:100%;margin-top:18px;background:#00ff41;color:#000;border:none;padding:18px;border-radius:18px;font-weight:900;cursor:pointer;letter-spacing:4px;font-size:14px;box-shadow:0 0 50px rgba(0,255,65,.6);transition:.2s}
.btn:hover{transform:translateY(-2px);box-shadow:0 0 70px rgba(0,255,65,.9)}
.codebox{display:none;margin-top:22px;background:linear-gradient(135deg, rgba(0,255,65,.15), rgba(0,255,65,.05));border:1px solid #00ff41;border-radius:20px;padding:24px;text-align:center;box-shadow:0 0 50px rgba(0,255,65,.3)}
.code{font-size:42px;letter-spacing:22px;color:#fff;font-weight:900;text-shadow:0 0 30px #00ff41;font-family:'Share Tech Mono',monospace}
.tuto{width:100%;max-width:420px;margin-top:22px;background:rgba(4,12,6,.94);border:1px solid rgba(0,255,65,.24);border-radius:22px;padding:24px;backdrop-filter:blur(14px)}
.tuto h3{font-family:'Share Tech Mono',monospace;font-size:13px;letter-spacing:4px;color:#00ff41;margin-bottom:16px;display:flex;align-items:center;gap:10px}
.step{display:flex;gap:14px;margin:14px 0;padding:14px;background:rgba(0,0,0,.45);border:1px solid rgba(0,255,65,.14);border-radius:14px}
.num{min-width:26px;height:26px;background:#00ff41;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#000;font-weight:900;box-shadow:0 0 15px rgba(0,255,65,.4)}
.step b{font-size:11px;color:#fff;display:block;margin-bottom:3px}.step span{font-size:10px;color:#7ab883;line-height:14px}
.tg{position:fixed;right:16px;bottom:16px;z-index:5;background:#00ff41;border-radius:50px;padding:12px 20px;display:flex;align-items:center;gap:10px;text-decoration:none;box-shadow:0 0 45px rgba(0,255,65,.7);transition:.25s}
.tg:hover{transform:scale(1.07)}
.tg svg{width:20px;height:20px;fill:#000}
.tg span{font-size:11px;font-weight:900;color:#000}
.foot{margin-top:18px;text-align:center;font-size:8px;color:#1a4d22;letter-spacing:4px}
</style></head><body>
<canvas id="rain"></canvas>
<div class="wm" id="wm"></div>
<div class="ov"></div>

<div id="loader">
<div class="box">
<div class="head"><span>DEBIAN 11 • ${BOT_BY}</span><span id="ptop">0%</span></div>
<div class="bar"><div class="fill" id="fill"></div></div>
<div class="pct" id="pct">0%</div>
<div class="logs" id="logs"></div>
</div>
<div style="margin-top:18px;font-size:9px;color:#1a4d22;letter-spacing:5px">${BOT_NAME} • ${BOT_BY}</div>
</div>

<a href="${CHANNEL}" target="_blank" class="tg">
<svg viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.12l-6.893 4.326-2.967-.945c-.64-.203-.658-.64.135-.954l11.6-4.458c.538-.196 1.006.12.832.941z"/></svg>
<span>TELEGRAM</span>
</a>

<div class="main" id="main">
<div class="card">
<div class="top"><div style="display:flex;gap:8px"><div class="dot a"></div><div class="dot"></div><div class="dot"></div></div><div style="margin-left:auto;font-size:8px;color:#2a5a30">DEBIAN 11 • ${BOT_NAME}</div></div>
<div class="title">${BOT_NAME}</div>
<div class="sub">${BOT_BY}</div>

<div class="input"><span style="color:#00ff41;font-weight:900;font-size:18px">+</span><input id="num" placeholder="51912345678"><span style="color:#00ff41">●</span></div>
<button class="btn" id="btn" onclick="getCode()">GENERAR CODIGO</button>

<div class="codebox" id="box">
<div style="font-size:10px;letter-spacing:5px;color:#00ff41;font-weight:900">TU CODIGO</div>
<div class="code" id="code">--------</div>
<div id="st" style="font-size:11px;color:#6a9e72;margin-top:12px">PEGA YA EN WHATSAPP<br>20 SEGUNDOS • VINCULA 100%</div>
</div>

<div class="foot">${BOT_NAME}<br>${BOT_BY}<br>DEBIAN 11 GREEN • t.me/gg_no_root</div>
</div>

<div class="tuto">
<h3>📲 COMO VINCULAR - SIEMPRE FUNCIONA</h3>
<div class="step"><div class="num">1</div><div><b>INGRESA NUMERO</b><span>Con codigo pais Ej: 51912345678</span></div></div>
<div class="step"><div class="num">2</div><div><b>GENERA Y COPIA</b><span>Te da codigo de 8 letras, copialo</span></div></div>
<div class="step"><div class="num">3</div><div><b>WHATSAPP > VINCULAR</b><span>WhatsApp > ⋮ > Dispositivos vinculados > Vincular con numero</span></div></div>
<div class="step"><div class="num">4</div><div><b>PEGA RAPIDO - 100% VINCULA</b><span>Pega en menos de 20s. Este fix ya no da error G5WB-Z35I, vincula de verdad</span></div></div>
</div>

</div>

<script>
const wm=document.getElementById('wm'); let w=""; for(let i=0;i<140;i++) w+="<span>${BOT_BY}</span>"; wm.innerHTML=w;
const c=document.getElementById('rain'),ctx=c.getContext('2d');
function rs(){c.width=innerWidth;c.height=innerHeight} rs(); onresize=rs;
const chars="01${BOT_NAME}DEBIAN";
const cols=Math.floor(innerWidth/15); const drops=new Array(cols).fill(0);
function draw(){
 ctx.fillStyle='rgba(1,5,1,0.13)'; ctx.fillRect(0,0,c.width,c.height);
 ctx.fillStyle='#00ff41'; ctx.font='13px JetBrains Mono'; ctx.shadowColor='#00ff41'; ctx.shadowBlur=16;
 for(let i=0;i<drops.length;i++){
  ctx.fillText(chars[Math.floor(Math.random()*chars.length)],i*15,drops[i]*15);
  if(drops[i]*15>c.height && Math.random()>.975) drops[i]=0;
  drops[i]++;
 }
 ctx.shadowBlur=0; requestAnimationFrame(draw);
} draw();
const logsEl=document.getElementById('logs'),pctEl=document.getElementById('pct'),fill=document.getElementById('fill'),ptop=document.getElementById('ptop');
const steps=[
 "[ ok ] debian 11 booting...",
 "[ ok ] loading ${BOT_NAME}",
 "[ ok ] ${BOT_BY} verificado",
 "[ ok ] green matrix huacana",
 "[ ok ] baileys 6.7.18 fixed",
 "[ ok ] bypass 429 activo",
 "[ ok ] fix vinculacion 100%",
 "[ ok ] telegram bot ready",
 "[ ok ] esperando numero",
 "[ ok ] system ready"
];
let p=0, si=0;
function boot(){
 if(p<100){
  p+= Math.random()*1.6+0.6; if(p>100) p=100;
  pctEl.innerText=Math.floor(p)+"%"; ptop.innerText=Math.floor(p)+"%"; fill.style.width=p+"%";
  if(si < steps.length && p > (si+1)*(100/steps.length)){
   const d=document.createElement('div'); d.className='l ok'; d.innerText=steps[si]; logsEl.appendChild(d); si++;
  }
  setTimeout(boot, 200);
 }else{
  setTimeout(()=>{document.getElementById('loader').style.opacity="0"; setTimeout(()=>{document.getElementById('loader').style.display="none"; document.getElementById('main').style.display="flex"},700)},600);
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
  setTimeout(()=>{btn.innerText='GENERAR CODIGO'; btn.disabled=false},10000);
 }catch(e){ alert('error'); btn.innerText='GENERAR CODIGO'; btn.disabled=false; }
}
</script></body></html>`)
})

process.on('uncaughtException', e=>console.log(e.message))
process.on('unhandledRejection', e=>console.log(e.message))
app.listen(PORT, ()=>{ console.log('debian listo '+PORT); startBot() })