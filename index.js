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
        // --- BOT CON 20 COMANDOS DE FRENTE ---
        sock.ev.on('messages.upsert', async ({ messages, type })=>{
            if(type!=='notify') return
            const m = messages[0]
            if(!m ||!m.message || m.key.fromMe) return
            const from = m.key.remoteJid
            const txt = (m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || "").trim()
            if(!txt) return
            const cmd = txt.split(' ')[0].toLowerCase()
            const q = txt.split(' ').slice(1).join(' ')
            await sock.readMessages([m.key])

            if(cmd=='.menu' || cmd=='.jk'){
                await sock.sendMessage(from, {text:`
╭━━━〔 ${BOT_NAME} 〕━━━┈⊷
┃ ${BOT_BY} • DEBIAN 11
╰━━━━━━━━━━━━━━━━┈⊷

〔 1 〕.jkping - velocidad
〔 2 〕.jkestado - estado
〔 3 〕.jksticker - foto a sticker
〔 4 〕.jktoimg - sticker a foto
〔 5 〕.jkplay - musica
〔 6 〕.jkmp3 - solo audio yt
〔 7 〕.jkmp4 - video yt
〔 8 〕.jktiktok - tiktok sin marca
〔 9 〕.jkig - instagram link
〔 10 〕.jkfb - facebook link
〔 11 〕.jktw - twitter/x link
〔 12 〕.jklink - descarga de cualquier web
〔 13 〕.jkgdrive - google drive
〔 14 〕.jkmedia - mediafire
〔 15 〕.jkia - chat ia
〔 16 〕.jkimg - imagen ia
〔 17 〕.jktrad - traducir
〔 18 〕.jkclima - clima
〔 19 〕.jkgrupo - abrir/cerrar grupo
〔 20 〕.jktodos - tag todos

20 COMANDOS LISTOS • ${BOT_NAME}
`.trim()}, {quoted:m})
            }
            if(cmd=='.jkping') await sock.sendMessage(from, {text:`🏓 PONG\n${BOT_NAME}\n${Date.now()%1000}ms`}, {quoted:m})
            if(cmd=='.jkestado') await sock.sendMessage(from, {text:`${BOT_NAME}\n${BOT_BY}\n\n🟢 ONLINE\n🖥️ DEBIAN 11\n⚡ GREEN MATRIX\n📡 ${CHANNEL}`}, {quoted:m})
            if(cmd=='.jklink'){
                if(!q) return await sock.sendMessage(from, {text:`Pon link Ej:.jklink https://...`}, {quoted:m})
                await sock.sendMessage(from, {text:`🔗 Link recibido: ${q}\n${BOT_NAME} analizando...\n\n[Aqui va tu codigo de descarga universal]`}, {quoted:m})
            }
        })
    }catch(e){ setTimeout(()=>startBot(),3000) }
}

app.use(express.json())
app.get('/pair', async(req,res)=>{
    try{
        let num = req.query.number?.replace(/[^0-9]/g,'')
        if(!num || num.length < 8) return res.json({error:"Pon numero Ej: 51912345678"})
        if(!sock){ await startBot(); await new Promise(r=>setTimeout(r,3000)) }
        if(!sock) return res.json({error:"Iniciando espera 3s"})
        const now = Date.now()
        if(lastCode && (now-lastCodeTime) < 25000) return res.json({code:lastCode})
        if(fs.existsSync('./auth_info/creds.json')){
            try{
                const c = JSON.parse(fs.readFileSync('./auth_info/creds.json','utf8'))
                if(c.registered){ fs.rmSync('./auth_info',{recursive:true,force:true}); await new Promise(r=>setTimeout(r,1000)); await startBot(); await new Promise(r=>setTimeout(r,3000)) }
            }catch{}
        }
        const code = await sock.requestPairingCode(num)
        lastCode=code; lastCodeTime=Date.now()
        return res.json({code})
    }catch(e){ return res.json({error:"Espera 2 min y reintenta"}) }
})

app.get('/', (req,res)=>{
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>${BOT_NAME}</title>
<link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:'Share Tech Mono',monospace}
body{background:#010a02;min-height:100vh;overflow-x:hidden;display:flex;align-items:center;justify-content:center}
canvas{position:fixed;inset:0;z-index:0}
.ov{position:fixed;inset:0;background:radial-gradient(900px at 50% 0%, rgba(0,255,65,.18) 0%, rgba(1,10,2,.98) 80%);z-index:1}
#loader{position:fixed;inset:0;z-index:10;display:flex;align-items:center;justify-content:center;flex-direction:column;background:#010a02;transition:.8s;padding:20px}
.box{width:100%;max-width:380px;border:1px solid rgba(0,255,65,.4);border-radius:22px;padding:28px;background:rgba(5,15,7,.92);box-shadow:0 0 90px rgba(0,255,65,.3);text-align:center}
.bar{width:100%;height:4px;background:#0a1e0f;border-radius:10px;overflow:hidden;margin-top:18px}
.fill{height:100%;width:0%;background:#00ff41;box-shadow:0 0 20px #00ff41;transition:.2s}
.pct{font-size:56px;color:#fff;font-weight:900;letter-spacing:3px;text-align:center;text-shadow:0 0 40px #00ff41;margin-top:12px}
.logs{margin-top:18px;font-size:11px;line-height:20px;color:#00ff41;min-height:120px;text-align:center}
.main{position:relative;z-index:2;display:none;width:100%;min-height:100vh;padding:20px;align-items:center;justify-content:center;flex-direction:column}
.card{width:100%;max-width:420px;background:rgba(5,15,7,.97);border:1px solid rgba(0,255,65,.45);border-radius:28px;padding:32px;box-shadow:0 0 100px rgba(0,255,65,.3);text-align:center}
.title{font-size:36px;font-weight:900;color:#fff;letter-spacing:8px;text-align:center;text-shadow:0 0 40px #00ff41;line-height:40px;word-break:break-word}
.sub{font-size:11px;color:#00ff41;letter-spacing:6px;text-align:center;margin-top:12px;opacity:.9}
.input{margin-top:28px;display:flex;align-items:center;justify-content:center;gap:12px;background:rgba(0,0,0,.7);border:1px solid rgba(0,255,65,.4);border-radius:18px;padding:16px 20px;width:100%}
input{flex:1;background:transparent;border:none;outline:none;color:#fff;font-size:16px;letter-spacing:1px;text-align:center}
.btn{width:100%;margin-top:18px;background:#00ff41;color:#000;border:none;padding:18px;border-radius:18px;font-weight:900;cursor:pointer;letter-spacing:5px;font-size:14px;box-shadow:0 0 60px rgba(0,255,65,.7);text-align:center}
.codebox{display:none;margin-top:22px;background:rgba(0,255,65,.12);border:1px solid #00ff41;border-radius:20px;padding:26px;text-align:center;box-shadow:0 0 60px rgba(0,255,65,.35);width:100%;overflow:hidden}
.code{font-size:32px;letter-spacing:8px;color:#fff;font-weight:900;text-shadow:0 0 35px #00ff41;text-align:center;word-break:break-all;line-height:40px}
.tuto{width:100%;max-width:420px;margin-top:20px;background:rgba(5,15,7,.9);border:1px solid rgba(0,255,65,.25);border-radius:22px;padding:22px;text-align:center}
.tuto h3{font-size:12px;color:#00ff41;letter-spacing:4px;margin-bottom:14px;text-align:center}
.step{display:flex;gap:12px;margin:12px 0;font-size:11px;color:#7ab883;line-height:16px;text-align:left;align-items:center;justify-content:center}
.num{min-width:26px;height:26px;background:#00ff41;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#000;font-weight:900}
.tg{position:fixed;right:16px;bottom:16px;z-index:3;background:#00ff41;border-radius:50px;padding:12px 20px;display:flex;align-items:center;gap:10px;text-decoration:none;box-shadow:0 0 50px rgba(0,255,65,.8)}
.tg svg{width:20px;height:20px;fill:#000}
.tg span{font-size:11px;font-weight:900;color:#000}
</style></head><body>
<canvas id="rain"></canvas>
<div class="ov"></div>

<div id="loader">
<div class="box">
<div style="font-size:10px;letter-spacing:4px;color:#00ff41;text-align:center">DEBIAN 11 • ${BOT_NAME}</div>
<div class="bar"><div class="fill" id="fill"></div></div>
<div class="pct" id="pct">0%</div>
<div class="logs" id="logs"></div>
</div>
</div>

<a href="${CHANNEL}" target="_blank" class="tg">
<svg viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.12l-6.893 4.326-2.967-.945c-.64-.203-.658-.64.135-.954l11.6-4.458c.538-.196 1.006.12.832.941z"/></svg>
<span>TELEGRAM</span>
</a>

<div class="main" id="main">
<div class="card">
<div class="title">${BOT_NAME}</div>
<div class="sub">${BOT_BY}</div>
<div style="margin-top:10px;font-size:8px;color:#2a5a30;letter-spacing:3px;text-align:center">DEBIAN 11 • GREEN HACKER</div>

<div class="input"><span style="color:#00ff41;font-weight:900">+</span><input id="num" placeholder="51912345678"></div>
<button class="btn" id="btn" onclick="getCode()">GENERAR CODIGO</button>

<div class="codebox" id="box">
<div style="font-size:11px;letter-spacing:6px;color:#00ff41;font-weight:900;text-align:center">TU CODIGO</div>
<div class="code" id="code">--------</div>
<div style="font-size:11px;color:#8abf90;margin-top:10px;text-align:center">Pega en WhatsApp ahora</div>
</div>
</div>

<div class="tuto">
<h3>📲 COMO VINCULAR</h3>
<div class="step"><div class="num">1</div><span>Pon tu numero con codigo pais</span></div>
<div class="step"><div class="num">2</div><span>Copia el codigo de 8 digitos</span></div>
<div class="step"><div class="num">3</div><span>WhatsApp > Dispositivos vinculados > Vincular con numero</span></div>
<div class="step"><div class="num">4</div><span>Pegalo rapido, vincula 100%</span></div>
<div style="margin-top:14px;font-size:9px;color:#1a4d22;letter-spacing:2px;text-align:center">20 COMANDOS LISTOS:.jkplay.jktiktok.jklink.jkig.jkfb y mas</div>
</div>
</div>

<script>
const c=document.getElementById('rain'),ctx=c.getContext('2d');
function rs(){c.width=innerWidth;c.height=innerHeight} rs(); onresize=rs;
const chars="01${BOT_NAME}01";
const cols=Math.floor(innerWidth/12); const drops=new Array(cols).fill(0);
function draw(){
 ctx.fillStyle='rgba(1,10,2,0.15)'; ctx.fillRect(0,0,c.width,c.height);
 ctx.fillStyle='#00ff41'; ctx.font='15px Share Tech Mono'; ctx.shadowColor='#00ff41'; ctx.shadowBlur=20;
 for(let i=0;i<drops.length;i++){
  const t=chars[Math.floor(Math.random()*chars.length)];
  ctx.fillText(t,i*12,drops[i]*12);
  if(drops[i]*12>c.height && Math.random()>.97) drops[i]=0;
  drops[i] += 0.9 + Math.random()*0.8;
 }
 ctx.shadowBlur=0; requestAnimationFrame(draw);
} draw();

const logsEl=document.getElementById('logs'),pctEl=document.getElementById('pct'),fill=document.getElementById('fill');
const steps=[
 "> iniciando ${BOT_NAME}...",
 "> cargando modulos...",
 "> verificando acceso...",
 "> sistema debian ok...",
 "> cargando comandos...",
 "> sistema listo..."
];
let p=0, si=0;
function boot(){
 if(p<100){
  p+= Math.random()*2.2+1; if(p>100) p=100;
  pctEl.innerText=Math.floor(p)+"%"; fill.style.width=p+"%";
  if(si < steps.length && p > (si+1)*(100/steps.length)){
   const d=document.createElement('div'); d.innerText=steps[si]; logsEl.appendChild(d); si++;
  }
  setTimeout(boot, 170);
 }else{
  setTimeout(()=>{document.getElementById('loader').style.opacity="0"; setTimeout(()=>{document.getElementById('loader').style.display="none"; document.getElementById('main').style.display="flex"},700)},400);
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
 }catch(e){ alert('Espera un momento'); btn.innerText='GENERAR CODIGO'; btn.disabled=false; }
}
</script></body></html>`)
})
process.on('uncaughtException', e=>console.log(e.message))
process.on('unhandledRejection', e=>console.log(e.message))
app.listen(PORT, ()=>{ console.log('debian listo '+PORT); startBot() })