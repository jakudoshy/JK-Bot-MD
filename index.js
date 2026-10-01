const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const axios = require('axios')
const fs = require('fs')

const app = express()
const PORT = process.env.PORT || 3000
let sock=null, currentPairNumber=null
let economy={}
if(fs.existsSync('./economy.json')){ try{ economy=JSON.parse(fs.readFileSync('./economy.json')) }catch{} }

async function IA(txt){
 const q=encodeURIComponent(txt)
 const urls=[
  `https://text.pollinations.ai/${q}`,
  `https://api.davidcyriltech.my.id/ai/llama?query=${q}`,
  `https://api.davidcyriltech.my.id/ai/metaai?query=${q}`,
  `https://api.davidcyriltech.my.id/ai/gemini?query=${q}`,
 ]
 for(let u of urls){
  try{ const r=await axios.get(u,{timeout:7000}); let res=r.data?.result||r.data?.response||r.data; if(typeof res==='string'&&res.length>3) return res.trim() }catch{}
 }
 return "IA ocupada bro, intenta de nuevo"
}

function getBal(jid){ if(!economy[jid]) economy[jid]={bal:0}; return economy[jid].bal }
function addBal(jid,n){ if(!economy[jid]) economy[jid]={bal:0}; economy[jid].bal+=n; fs.writeFileSync('./economy.json',JSON.stringify(economy)) }

async function startBot(newAuth=false){
 if(newAuth && fs.existsSync('./auth_info')){ try{ fs.rmSync('./auth_info',{recursive:true,force:true}) }catch{} }
 const { state, saveCreds } = await useMultiFileAuthState('./auth_info')
 const { version } = await fetchLatestBaileysVersion()
 sock = makeWASocket({
   version,
   logger:P({level:'silent'}),
   printQRInTerminal:false,
   auth:{creds:state.creds,keys:makeCacheableSignalKeyStore(state.keys,P({level:'silent'}))},
   browser:["Debian","Chrome","110.0.0.558"], // <--- DEBIAN COMO QUERIAS
   markOnlineOnConnect:true,
   syncFullHistory:false
 })
 sock.ev.on('creds.update', saveCreds)
 sock.ev.on('connection.update', async(u)=>{
  if(u.connection==='close' && u.lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut) setTimeout(()=>startBot(),3000)
  if(u.connection==='open') console.log("BOT CONECTADO DEBIAN")
 })
 sock.ev.on('messages.upsert', async({type,messages})=>{
  if(type!=='notify') return
  const m=messages[0]; if(!m?.message) return
  const from=m.key.remoteJid; if(!from||from==='status@broadcast') return
  const isSelf=from===sock.user?.id
  if(m.key.fromMe &&!isSelf) return
  const txt=m.message.conversation||m.message.extendedTextMessage?.text||m.message.imageMessage?.caption||""
  if(!txt) return
  const args=txt.trim().split(/ +/); const cmd=args[0].toLowerCase(); const q=args.slice(1).join(' ')
  const send=async(t)=>{ await sock.sendMessage(from,{text:t}) }

  if(cmd==='.allmenu'||cmd==='.menu'||cmd==='menu'){
   return send(`╭─ • ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ • ─
│ ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ
│ DEBIAN • FUNCIONAL

✨.ownermenu
👥.groupmenu
🛡️.adminmenu
🤖.aimenu
⬇️.download
🪙.economymenu
🛠️.toolsmenu
🎉.funmenu

> t.me/gg_no_root
╰─ • ONLINE • ─`)
  }
  if(cmd==='.toolsmenu'){ return send(`『 🛠️ TOOLS MENU 』
-.ping -.dp -.vv -.translate -.base64 -.qr -.shorturl -.calc -.weather -.github -.ipinfo -.tempmail -.fakeinfo -.binlookup -.whois -.dnslookup -.screenshot -.define -.wiki -.npm -.yts -.playstore`) }
  if(cmd==='.aimenu'){ return send(`『 🤖 AI MENU 』\n-.ai <pregunta>\n-.chatbot <pregunta>`) }
  if(cmd==='.economymenu'){ return send(`『 🪙 ECONOMY 』\n-.balance -.daily -.work -.coinflip`) }
  if(cmd==='.download'){ return send(`『 ⬇️ DOWNLOAD 』\n-.song -.video -.tiktok -.insta -.facebook`) }

  if(cmd==='.ping'){ const s=Date.now(); await send('Pong!'); return send(`⚡ ${Date.now()-s}ms`) }
  if(cmd==='.qr'){ if(!q) return send('.qr texto'); let url=`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(q)}`; await sock.sendMessage(from,{image:{url},caption:`QR: ${q}`}); return }
  if(cmd==='.base64'){ if(!q) return send('.base64 texto'); return send(`B64: ${Buffer.from(q).toString('base64')}`) }
  if(cmd==='.calc'){ try{ let r=eval(q.replace(/[^0-9+\-*/().]/g,'')); return send(`${q} = ${r}`) }catch{ return send('Error calc') } }
  if(cmd==='.ipinfo'){ try{ let r=await axios.get(`http://ip-api.com/json/${q}`); return send(`IP: ${r.data.query}\nPais: ${r.data.country}\nCity: ${r.data.city}`) }catch{} return }
  if(cmd==='.tempmail'){ try{ let r=await axios.get('https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1'); return send(`📧 ${r.data[0]}`) }catch{} return }
  if(['.ai','.chatbot','.ia','.bot','.gpt'].includes(cmd)){ if(!q) return send('Pregunta?'); await sock.sendPresenceUpdate('composing',from); let res=await IA(q); await sock.sendMessage(from,{text:res}); return }
  if(cmd==='.balance'){ return send(`💰 $${getBal(from)}`) }
  if(cmd==='.daily'){ addBal(from,100); return send(`+100 daily\nBalance $${getBal(from)}`) }
 })
}

app.get('/pair', async(req,res)=>{
 try{
  let num=req.query.number?.replace(/[^0-9]/g,''); if(!num||num.length<8) return res.json({error:"Numero invalido"})
  if(currentPairNumber && currentPairNumber!==num){ try{ if(sock) sock.end() }catch{}; sock=null; await startBot(true); await new Promise(r=>setTimeout(r,3500)) }
  if(!sock){ await startBot(); await new Promise(r=>setTimeout(r,4000)) }
  currentPairNumber=num
  const code=await sock.requestPairingCode(num)
  let formatted=code; if(!code.includes('-')&&code.length==8) formatted=code.slice(0,4)+'-'+code.slice(4)
  return res.json({code:formatted})
 }catch(e){ try{ fs.rmSync('./auth_info',{recursive:true,force:true}) }catch{}; sock=null; return res.json({error:"Error vinculando, espera 10s"}) }
})

app.get('/', (req,res)=>{
res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JK BOT</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@900&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;background:#000;overflow-y:auto;display:flex;justify-content:center;font-family:'Outfit'}
.bg{position:fixed;inset:0;background:radial-gradient(900px at 50% 0%, rgba(255,0,0,.45), transparent 60%), #000;z-index:0}
canvas{position:fixed;inset:0;opacity:.25;z-index:1}
.topbar{position:fixed;top:0;left:0;right:0;z-index:50;background:rgba(0,0,0,.95);backdrop-filter:blur(10px);border-bottom:2px solid #ff0000;box-shadow:0 0 40px rgba(255,0,0,.6);padding:14px;text-align:center}
.topbar-text{font-size:20px;font-weight:900;letter-spacing:5px;color:#fff;text-shadow:0 0 20px #ff0000}
.wrap{position:relative;z-index:3;width:100%;max-width:520px;padding:16px;margin:85px auto 120px auto}
.box{width:100%;background:linear-gradient(145deg, rgba(25,0,0,.98), #000);border-radius:26px;padding:26px;border:2px solid #ff0000;box-shadow:0 0 80px rgba(255,0,0,.5);text-align:center}
.header{text-align:center;padding:12px 0 18px;border-bottom:1px solid rgba(255,0,0,.4);margin-bottom:18px}
.title{font-size:34px;font-weight:900;letter-spacing:4px;color:#fff;text-shadow:0 0 20px #ff0000}
.sub{font-size:12px;letter-spacing:3px;color:#ff0000;margin-top:8px;font-weight:900}
#loader{position:fixed;inset:0;z-index:99;background:#000;display:flex;align-items:center;justify-content:center;flex-direction:column}
.load-box{width:90%;max-width:420px;background:linear-gradient(145deg, rgba(25,0,0,.98), #000);border:2px solid #ff0000;border-radius:22px;padding:30px;box-shadow:0 0 80px rgba(255,0,0,.7);text-align:center}
.load-title{font-size:28px;color:#fff;letter-spacing:4px;font-weight:900;text-shadow:0 0 20px #ff0000}
.load-sub{font-size:11px;color:#ff0000;letter-spacing:3px;margin-top:10px;font-family:'JetBrains Mono'}
.bar-bg{margin-top:24px;background:#111;border:1px solid rgba(255,0,0,.5);border-radius:100px;height:18px;overflow:hidden}
.bar-fill{height:100%;width:0%;background:linear-gradient(90deg,#ff0000,#ff4444);box-shadow:0 0 20px #ff0000;transition:width.1s linear}
.percent{margin-top:18px;font-size:44px;font-weight:900;color:#fff;letter-spacing:5px;text-shadow:0 0 20px #ff0000;font-family:'JetBrains Mono'}
.logs{margin-top:20px;text-align:left;background:#000;border:1px solid rgba(255,0,0,.3);border-radius:12px;padding:12px;height:120px;overflow:hidden;box-shadow:inset 0 0 20px rgba(255,0,0,.1)}
.log-line{color:#ff3333;font-size:10px;font-family:'JetBrains Mono';line-height:18px;opacity:0;animation:logIn.3s forwards}
@keyframes logIn{to{opacity:1}}
#mainContent{display:none;width:100%;animation:fadeIn.6s forwards}
@keyframes fadeIn{from{opacity:0;transform:translateY(15px)}to{opacity:1;transform:translateY(0)}}
.card{background:rgba(0,0,0,.6);border:1px solid rgba(255,0,0,.4);border-radius:18px;padding:20px;text-align:center}
.label{font-size:12px;letter-spacing:4px;color:#ff0000;font-weight:900;margin-bottom:14px;text-align:center;text-shadow:0 0 10px #ff0000}
.input-wrap{background:linear-gradient(135deg,#ff0000,#990000);padding:2.5px;border-radius:14px;box-shadow:0 0 40px rgba(255,0,0,.7);width:100%}
.input-inner{position:relative;display:flex;align-items:center;justify-content:center;background:#0a0000;border-radius:12px;padding:18px 18px 18px 50px;width:100%}
.plus{position:absolute;left:18px;top:50%;transform:translateY(-50%);color:#ff0000;font-size:26px;font-weight:900;font-family:'JetBrains Mono'}
input{width:100%;background:transparent;border:none;outline:none;color:#fff;font-size:20px;font-weight:900;text-align:center;font-family:'JetBrains Mono';letter-spacing:2px}
input::placeholder{text-align:center;color:rgba(255,255,255,.35)}
.btn{width:100%;margin-top:16px;background:linear-gradient(135deg,#ff0000,#990000);padding:2.5px;border-radius:14px;border:none;cursor:pointer;box-shadow:0 0 50px rgba(255,0,0,.7)}
.btn-inner{background:#000;color:#fff;border-radius:12px;padding:18px;font-weight:900;font-size:14px;letter-spacing:3px;text-align:center;text-shadow:0 0 10px #ff0000}
.codeBox{display:none;margin-top:18px;background:linear-gradient(135deg, rgba(255,0,0,.25), rgba(0,0,0,.9));border:2px solid #ff0000;border-radius:14px;padding:20px;text-align:center;box-shadow:0 0 40px rgba(255,0,0,.6)}
.code{font-size:36px;color:#fff;text-align:center;letter-spacing:14px;font-weight:900;text-shadow:0 0 20px #ff0000;font-family:'JetBrains Mono'}
.steps{margin-top:18px;background:linear-gradient(145deg, #000, #0a0000);border:1px solid rgba(255,0,0,.35);border-radius:16px;padding:18px;text-align:center;box-shadow:0 0 30px rgba(255,0,0,.15)}
.steps-title{color:#ff0000;font-size:12px;letter-spacing:3px;font-weight:900;margin-bottom:14px;font-family:'JetBrains Mono';text-align:center;text-shadow:0 0 10px #ff0000}
.step{display:flex;gap:12px;margin-bottom:10px;align-items:center;justify-content:flex-start}
.step-n{background:linear-gradient(135deg,#ff0000,#990000);color:#fff;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;box-shadow:0 0 15px rgba(255,0,0,.6)}
.step-t{color:#ddd;font-size:12px;line-height:24px;font-family:'JetBrains Mono';text-align:left}
.step-t b{color:#fff}
.telegram-float{position:fixed;bottom:24px;right:24px;z-index:60;background:linear-gradient(135deg,#ff0000,#990000);padding:2px;border-radius:50px;box-shadow:0 0 40px rgba(255,0,0,.9);text-decoration:none}
.telegram-inner{background:#000;border-radius:50px;padding:12px 20px;display:flex;align-items:center;gap:10px}
.telegram-inner svg{width:22px;height:22px;fill:#ff0000}
.telegram-text{color:#fff;font-size:13px;font-weight:900;font-family:'JetBrains Mono'}
.spacer{height:40px}
</style></head><body>
<div class="bg"></div><canvas id="c"></canvas>
<div class="topbar"><div class="topbar-text">ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ</div></div>

<div id="loader">
<div class="load-box">
<div class="load-title">ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ</div>
<div class="load-sub">ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ • DEBIAN</div>
<div class="bar-bg"><div class="bar-fill" id="bar"></div></div>
<div class="percent" id="percent">0%</div>
<div class="logs" id="logs"></div>
</div>
</div>

<div class="wrap" id="mainContent">
<div class="box">
<div class="header"><div class="title">ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ</div><div class="sub">ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ • DEBIAN</div></div>
<div class="card">
<div class="label">ᴠɪɴᴄᴜʟᴀᴄɪᴏɴ ᴘʀᴇᴍɪᴜᴍ</div>
<div class="input-wrap"><div class="input-inner"><div class="plus">+</div><input id="num" type="tel" placeholder="53XXXXXXXX"></div></div>
<button class="btn" onclick="gen()"><div class="btn-inner" id="btnTxt">ɢᴇɴᴇʀᴀʀ ᴄᴏᴅɪɢᴏ</div></button>
<div class="codeBox" id="codeBox"><div class="code" id="codeText"></div></div>
</div>
<div class="steps">
<div class="steps-title">ᴘᴀsᴏs ᴘᴀʀᴀ ᴠɪɴᴄᴜʟᴀʀ:</div>
<div class="step"><div class="step-n">1</div><div class="step-t"><b>ᴘᴏɴ ᴛᴜ ɴᴜᴍᴇʀᴏ</b> 53XXXXXXXX</div></div>
<div class="step"><div class="step-n">2</div><div class="step-t">ᴅᴀʟᴇ <b>ɢᴇɴᴇʀᴀʀ</b> ʏ ᴄᴏᴘɪᴀ ᴄᴏᴅɪɢᴏ</div></div>
<div class="step"><div class="step-n">3</div><div class="step-t">ᴡʜᴀᴛsᴀᴘᴘ > <b>ᴅɪsᴘᴏsɪᴛɪᴠᴏs ᴠɪɴᴄᴜʟᴀᴅᴏs</b></div></div>
<div class="step"><div class="step-n">4</div><div class="step-t"><b>ᴠɪɴᴄᴜʟᴀʀ ᴄᴏɴ ᴇʟ ɴᴜᴍᴇʀᴏ</b></div></div>
</div>
<div class="spacer"></div>
</div>
</div>

<a class="telegram-float" href="https://t.me/gg_no_root" target="_blank"><div class="telegram-inner"><svg viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.12l-6.893 4.326-2.967-.945c-.64-.203-.658-.64.135-.954l11.6-4.458c.538-.196 1.006.12.832.941z"/></svg><span class="telegram-text">ᴊᴋ ᴄʜᴀɴɴᴇʟꫂꤪꤨᴼᶠᶜ</span></div></a>

<script>
const c=document.getElementById('c'),x=c.getContext('2d');function rs(){c.width=innerWidth;c.height=innerHeight}rs();window.addEventListener('resize',rs);
let drops=new Array(Math.floor(innerWidth/14)).fill(0);
function matrix(){x.fillStyle='rgba(0,0,0,0.12)';x.fillRect(0,0,c.width,c.height);x.font='16px monospace';drops.forEach((y,i)=>{x.fillStyle='#ff0000';x.fillText('0',i*14,y*14);if(y*14>c.height&&Math.random()>.97)drops[i]=0;drops[i]++});requestAnimationFrame(matrix)}matrix();
const logsData=[
"[ SISTEMA ] INICIANDO MODULOS...",
"[ SISTEMA ] CARGANDO APIS PREMIUM...",
"[ SISTEMA ] API GPT-4 ✓",
"[ SISTEMA ] API GEMINI PRO ✓",
"[ SISTEMA ] API POLLINATIONS ✓",
"[ SISTEMA ] CARGANDO BAILEYS DEBIAN...",
"[ SISTEMA ] SERVIDOR ONLINE ✓",
"[ SISTEMA ] PREMIUM LISTO ✓"
];
let pct=0; const bar=document.getElementById('bar'), perc=document.getElementById('percent'), logs=document.getElementById('logs'), loader=document.getElementById('loader'), main=document.getElementById('mainContent');
function addLog(i){ if(i>=logsData.length) return; const d=document.createElement('div'); d.className='log-line'; d.innerHTML=logsData[i]; logs.appendChild(d); logs.scrollTop=logs.scrollHeight; }
let logIdx=0; addLog(0);
let int=setInterval(()=>{
 pct+=Math.random()*4+1; if(pct>100) pct=100;
 bar.style.width=pct+'%'; perc.innerText=Math.floor(pct)+'%';
 if(pct>14&&logIdx==0){logIdx=1;addLog(1)}
 if(pct>28&&logIdx==1){logIdx=2;addLog(2)}
 if(pct>42&&logIdx==2){logIdx=3;addLog(3)}
 if(pct>56&&logIdx==3){logIdx=4;addLog(4)}
 if(pct>70&&logIdx==4){logIdx=5;addLog(5)}
 if(pct>85&&logIdx==5){logIdx=6;addLog(6)}
 if(pct>95&&logIdx==6){logIdx=7;addLog(7)}
 if(pct>=100){ clearInterval(int); perc.innerText='100%'; bar.style.width='100%'; setTimeout(()=>{ loader.style.transition='opacity.6s'; loader.style.opacity='0'; setTimeout(()=>{ loader.style.display='none'; main.style.display='block'; },600)},400) }
},45);
async function gen(){
 const n=document.getElementById('num').value.trim().replace(/[^0-9]/g,'')
 if(!n||n.length<10){ alert('Pon numero completo 53XXXXXXXX'); return }
 const btn=document.getElementById('btnTxt'); btn.innerText='GENERANDO...'
 try{
  const r=await fetch('/pair?number='+encodeURIComponent(n)).then(r=>r.json())
  if(r.error){ btn.innerText=r.error; setTimeout(()=>btn.innerText='GENERAR CODIGO',4000); return }
  let code=r.code; if(!code.includes('-')&&code.length==8) code=code.slice(0,4)+'-'+code.slice(4)
  document.getElementById('codeText').innerText=code
  document.getElementById('codeBox').style.display='block'
  btn.innerText=code
  setTimeout(()=>{btn.innerText='GENERAR OTRO'},5000)
 }catch{ btn.innerText='ERROR, REINTENTA'; setTimeout(()=>btn.innerText='GENERAR CODIGO',3000) }
}
</script></body></html>`)
})
app.listen(PORT, ()=>{ console.log("DEBIAN ONLINE"); startBot() })