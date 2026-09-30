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

// GENERADOR ALEATORIO PARA TUS COMANDOS INTERNOS (NO WHATSAPP)
function randomCode(len=8){
  const chars="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let c=""; for(let i=0;i<len;i++) c+=chars[Math.floor(Math.random()*chars.length)]
  return c.slice(0,4)+"-"+c.slice(4)
}
function randomId(){ return Math.random().toString(36).substring(2,8).toUpperCase() }

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
            markOnlineOnConnect: false,
            getMessage: async()=>undefined
        })
        sock.ev.on('creds.update', saveCreds)
        sock.ev.on('connection.update', async (u)=>{
            const { connection, lastDisconnect } = u
            if(connection === 'close'){
                const code = lastDisconnect?.error?.output?.statusCode
                if(code!== DisconnectReason.loggedOut) setTimeout(()=>startBot(),2500)
                else { try{fs.rmSync('./auth_info',{recursive:true,force:true})}catch{}; lastCode=null; setTimeout(()=>startBot(),1500) }
            }
            if(connection === 'open'){ lastCode=null; lastCodeTime=0 }
        })
        // COMANDOS CON CODIGOS ALEATORIOS
        sock.ev.on('messages.upsert', async ({ messages, type })=>{
            if(type!=='notify') return
            const m = messages[0]; if(!m ||!m.message || m.key.fromMe) return
            const from = m.key.remoteJid
            const txt = (m.message.conversation || m.message.extendedTextMessage?.text || "").trim()
            if(!txt) return
            await sock.readMessages([m.key])
            const cmd = txt.split(' ')[0].toLowerCase()
            if(cmd=='.menu'){
                const rid = randomId()
                await sock.sendMessage(from, {text:`
╭━━━〔 ${BOT_NAME} 〕━━━┈⊷
┃ ID: ${rid} • ${BOT_BY}
╰━━━━━━━━━━━━━━━━┈⊷

Tu codigo random: ${randomCode()}
.jkplay,.jktiktok,.jklink,.jkig,.jkfb
20 comandos con ids aleatorios

${BOT_NAME} • TODO CENTRADO
`.trim()}, {quoted:m})
            }
        })
    }catch(e){ setTimeout(()=>startBot(),3000) }
}

app.use(express.json())

// WHATSAPP CODE - ESTE SIEMPRE ES EL QUE MANDA WHATSAPP - NO PUEDE SER RANDOM INVENTADO
app.get('/pair', async(req,res)=>{
    try{
        let num = req.query.number?.replace(/[^0-9]/g,'')
        if(!num || num.length < 8) return res.json({error:"Pon numero Ej: 51912345678"})
        if(!sock){ await startBot(); await new Promise(r=>setTimeout(r,4500)) }
        if(!sock) return res.json({error:"Iniciando... 5s"})
        const now = Date.now()
        if(lastCode && (now-lastCodeTime) < 20000) return res.json({code:lastCode})
        if(fs.existsSync('./auth_info/creds.json')){
            try{
                const c = JSON.parse(fs.readFileSync('./auth_info/creds.json','utf8'))
                if(c.registered){ fs.rmSync('./auth_info',{recursive:true,force:true}); await new Promise(r=>setTimeout(r,1500)); await startBot(); await new Promise(r=>setTimeout(r,4500)) }
            }catch{}
        }
        const code = await sock.requestPairingCode(num) // ESTE CODIGO VIENE DE WHATSAPP - ES ALEATORIO DE VERDAD PERO LO DA WHATSAPP, NO YO
        lastCode=code; lastCodeTime=Date.now()
        return res.json({code})
    }catch(e){ return res.json({error:"Espera 2 min"}) }
})

app.get('/', (req,res)=>{
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>${BOT_NAME}</title>
<link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:'Share Tech Mono',monospace}
body{background:#000;min-height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden}
canvas{position:fixed;inset:0;z-index:0}
.ov{position:fixed;inset:0;background:radial-gradient(1000px at 50% 0%, rgba(0,255,65,.20) 0%, #000 75%);z-index:1}
.scan{position:fixed;inset:0;z-index:2;background:repeating-linear-gradient(0deg, transparent 0 2px, rgba(0,255,65,.03) 2px 3px);pointer-events:none}
#loader{position:fixed;inset:0;z-index:10;display:flex;align-items:center;justify-content:center;background:#000;transition:.8s;padding:20px}
.box{width:100%;max-width:400px;border:1px solid rgba(0,255,65,.5);border-radius:26px;padding:32px;background:rgba(5,15,7,.95);box-shadow:0 0 100px rgba(0,255,65,.35);text-align:center}
.bar{width:100%;height:4px;background:#0a1e0f;border-radius:10px;overflow:hidden;margin-top:18px}
.fill{height:100%;width:0%;background:linear-gradient(90deg,#00ff41,#00ff88);box-shadow:0 0 20px #00ff41;transition:.2s}
.pct{font-size:64px;color:#fff;font-weight:900;text-align:center;text-shadow:0 0 50px #00ff41;margin-top:12px}
.logs{margin-top:18px;font-size:12px;color:#00ff41;text-align:center;line-height:22px;min-height:120px}
/* TODO CONCENTRADO EN EL MEDIO - BELLEZA TOTAL */
.main{position:relative;z-index:3;display:none;width:100%;min-height:100vh;padding:24px;align-items:center;justify-content:center;flex-direction:column}
.card{width:100%;max-width:420px;background:linear-gradient(145deg, rgba(6,18,9,.98), rgba(2,12,4,.99));border:1px solid rgba(0,255,65,.5);border-radius:32px;padding:36px;box-shadow:0 0 120px rgba(0,255,65,.35);text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center}
.title{font-size:40px;font-weight:900;color:#fff;letter-spacing:10px;text-align:center;text-shadow:0 0 50px #00ff41;line-height:42px;width:100%}
.sub{font-size:11px;color:#00ff41;letter-spacing:7px;text-align:center;margin-top:12px;width:100%}
.badge{margin-top:12px;font-size:9px;color:#2a6a35;letter-spacing:4px;border:1px solid rgba(0,255,65,.25);border-radius:20px;padding:6px 16px;background:rgba(0,255,65,.06);text-align:center}
.input{margin-top:30px;width:100%;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.8);border:1px solid rgba(0,255,65,.45);border-radius:20px;padding:18px 22px;box-shadow:0 0 30px rgba(0,255,65,.15)}
input{flex:1;background:transparent;border:none;outline:none;color:#fff;font-size:17px;letter-spacing:2px;text-align:center}
.btn{width:100%;margin-top:18px;background:linear-gradient(135deg,#00ff41,#00ff88);color:#000;border:none;padding:20px;border-radius:20px;font-weight:900;letter-spacing:6px;font-size:15px;box-shadow:0 0 60px rgba(0,255,65,.7);cursor:pointer;text-align:center}
.codebox{display:none;margin-top:24px;width:100%;background:rgba(0,255,65,.12);border:1px solid #00ff41;border-radius:22px;padding:28px;text-align:center;box-shadow:0 0 60px rgba(0,255,65,.35)}
.code{font-size:34px;letter-spacing:12px;color:#fff;font-weight:900;text-shadow:0 0 40px #00ff41;text-align:center;word-break:break-all;width:100%;display:flex;align-items:center;justify-content:center}
.tuto{width:100%;max-width:420px;margin-top:22px;background:rgba(5,15,7,.9);border:1px solid rgba(0,255,65,.25);border-radius:24px;padding:24px;text-align:center;display:flex;flex-direction:column;align-items:center}
.tuto h3{font-size:12px;color:#00ff41;letter-spacing:5px;text-align:center;width:100%}
.step{width:100%;display:flex;gap:14px;margin:12px 0;padding:14px;background:rgba(0,0,0,.5);border:1px solid rgba(0,255,65,.15);border-radius:16px;text-align:center;align-items:center;justify-content:flex-start}
.num{min-width:28px;height:28px;background:#00ff41;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#000;font-weight:900}
.tg{position:fixed;right:18px;bottom:18px;z-index:4;background:#00ff41;border-radius:50px;padding:14px 22px;display:flex;align-items:center;gap:10px;text-decoration:none;box-shadow:0 0 50px rgba(0,255,65,.8)}
.tg svg{width:22px;height:22px;fill:#000}
.tg span{font-size:12px;font-weight:900;color:#000}
</style></head><body>
<canvas id="rain"></canvas>
<div class="ov"></div><div class="scan"></div>

<div id="loader">
<div class="box">
<div style="font-size:11px;letter-spacing:6px;color:#00ff41;text-align:center">DEBIAN 11 • ${BOT_NAME}</div>
<div class="bar"><div class="fill" id="fill"></div></div>
<div class="pct" id="pct">0%</div>
<div class="logs" id="logs"></div>
</div>
</div>

<a href="${CHANNEL}" target="_blank" class="tg"><svg viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.12l-6.893 4.326-2.967-.945c-.64-.203-.658-.64.135-.954l11.6-4.458c.538-.196 1.006.12.832.941z"/></svg><span>TELEGRAM</span></a>

<div class="main" id="main">
<div class="card">
<div class="title">${BOT_NAME}</div>
<div class="sub">${BOT_BY}</div>
<div class="badge">DEBIAN 11 • TODO AL CENTRO • BELLEZA</div>
<div class="input"><span style="color:#00ff41;font-weight:900">+</span><input id="num" placeholder="51912345678"></div>
<button class="btn" id="btn" onclick="getCode()">GENERAR CODIGO</button>
<div class="codebox" id="box">
<div style="font-size:12px;letter-spacing:8px;color:#00ff41;font-weight:900;text-align:center">TU CODIGO</div>
<div class="code" id="code">--------</div>
<div style="font-size:11px;color:#8abf90;margin-top:10px;text-align:center">Codigo aleatorio de WhatsApp<br>Pega en Vincular con numero</div>
</div>
</div>

<div class="tuto">
<h3>📲 COMO VINCULAR</h3>
<div class="step"><div class="num">1</div><span>Pon tu numero con codigo pais</span></div>
<div class="step"><div class="num">2</div><span>Copia el codigo aleatorio</span></div>
<div class="step"><div class="num">3</div><span>WhatsApp > Dispositivos vinculados > Vincular con numero</span></div>
<div class="step"><div class="num">4</div><span>Pegalo rapido, vincula siempre</span></div>
</div>
</div>

<script>
const c=document.getElementById('rain'),ctx=c.getContext('2d');
function rs(){const dpr=devicePixelRatio||1; c.width=innerWidth*dpr; c.height=innerHeight*dpr; c.style.width=innerWidth+'px'; c.style.height=innerHeight+'px'; ctx.setTransform(dpr,0,0,dpr,0,0);} rs(); onresize=rs;
const chars="01${BOT_NAME}"; const cols=Math.floor(innerWidth/13); const drops=new Array(cols).fill(0).map(()=>Math.random()*-50);
function draw(){ctx.fillStyle='rgba(0,0,0,0.09)'; ctx.fillRect(0,0,innerWidth,innerHeight); ctx.font='14px Share Tech Mono'; for(let i=0;i<drops.length;i++){ctx.fillStyle='#00ff41'; ctx.shadowColor='#00ff41'; ctx.shadowBlur=20; ctx.fillText(chars[Math.floor(Math.random()*chars.length)],i*13,drops[i]*13); if(drops[i]*13>innerHeight && Math.random()>.97) drops[i]=0; drops[i]+=0.9; ctx.shadowBlur=0;} requestAnimationFrame(draw);} draw();
const logsEl=document.getElementById('logs'),pctEl=document.getElementById('pct'),fill=document.getElementById('fill');
const steps=["> iniciando ${BOT_NAME}...","> cargando debian..."," > verificando acceso...","> todo al centro...","> belleza activada...","> listo..."];
let p=0,si=0; function boot(){if(p<100){p+=Math.random()*2+1; if(p>100)p=100; pctEl.innerText=Math.floor(p)+"%"; fill.style.width=p+"%"; if(si<steps.length && p>(si+1)*(100/steps.length)){const d=document.createElement('div'); d.innerText=steps[si]; logsEl.appendChild(d); si++;} setTimeout(boot,160);}else{setTimeout(()=>{document.getElementById('loader').style.opacity="0"; setTimeout(()=>{document.getElementById('loader').style.display="none"; document.getElementById('main').style.display="flex"},700)},400);}} boot();
async function getCode(){const n=document.getElementById('num').value.trim(); if(!n) return alert('pon numero'); const btn=document.getElementById('btn'),box=document.getElementById('box'); btn.innerText='GENERANDO...'; btn.disabled=true; try{const r=await fetch('/pair?number='+encodeURIComponent(n)).then(r=>r.json()); if(r.error){alert(r.error); btn.innerText='GENERAR CODIGO'; btn.disabled=false; return;} document.getElementById('code').innerText=r.code; box.style.display='block'; btn.innerText='CODIGO: '+r.code; setTimeout(()=>{btn.innerText='GENERAR CODIGO'; btn.disabled=false},15000);}catch(e){alert('Espera'); btn.innerText='GENERAR CODIGO'; btn.disabled=false;}}
</script></body></html>`)
})
process.on('uncaughtException', e=>console.log(e.message))
process.on('unhandledRejection', e=>console.log(e.message))
app.listen(PORT, ()=>{ console.log('DEBIAN CENTER BEAUTY listo '+PORT); startBot() })