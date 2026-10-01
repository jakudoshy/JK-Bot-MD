const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const axios = require('axios')

function c(t){
 const m={'a':'ᴀ','b':'ʙ','c':'ᴄ','d':'ᴅ','e':'ᴇ','f':'ғ','g':'ɢ','h':'ʜ','i':'ɪ','j':'ᴊ','k':'ᴋ','l':'ʟ','m':'ᴍ','n':'ɴ','o':'ᴏ','p':'ᴘ','q':'ǫ','r':'ʀ','s':'s','t':'ᴛ','u':'ᴜ','v':'ᴠ','w':'ᴡ','x':'x','y':'ʏ','z':'ᴢ','A':'ᴀ','B':'ʙ','C':'ᴄ','D':'ᴅ','E':'ᴇ','F':'ғ','G':'ɢ','H':'ʜ','I':'ɪ','J':'ᴊ','K':'ᴋ','L':'ʟ','M':'ᴍ','N':'ɴ','O':'ᴏ','P':'ᴘ','Q':'ǫ','R':'ʀ','S':'s','T':'ᴛ','U':'ᴜ','V':'ᴠ','W':'ᴡ','X':'x','Y':'ʏ','Z':'ᴢ'}
 return t.split('').map(x=>m[x]||x).join('')
}

const app = express()
app.use(express.json())
const PORT = process.env.PORT || 3000
let sock=null, pendingWelcome=false

async function IA(q){
 try{ let r=await axios.get(`https://api.davidcyriltech.my.id/ai/chatbot?query=${encodeURIComponent(q)}`,{timeout:12000}); if(r.data?.result) return r.data.result }catch{}
 try{ let r=await axios.get(`https://api.davidcyriltech.my.id/ai/gemini?query=${encodeURIComponent(q)}`,{timeout:12000}); if(r.data?.result) return r.data.result }catch{}
 return null
}

async function welcome(){
 if(!sock?.user?.id) return
 const msg=`╭─ • ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ • ─\n│ ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ\n│ ${c('todo arreglado pinga')}\n│ Usa.allmenu\n╰─ • ${c('online')} • ─`
 try{ await new Promise(r=>setTimeout(r,2000)); await sock.sendMessage(sock.user.id,{text:msg}) }catch{}
}

async function startBot(){
 const { state, saveCreds } = await useMultiFileAuthState('./auth_info')
 const { version } = await fetchLatestBaileysVersion()
 sock = makeWASocket({ version, logger:P({level:'silent'}), printQRInTerminal:false, auth:{creds:state.creds, keys:makeCacheableSignalKeyStore(state.keys,P({level:'silent'}))}, browser:["Debian","Chrome","118.0.0.0"], syncFullHistory:false, markOnlineOnConnect:true, getMessage:async()=>undefined })
 sock.ev.on('creds.update', saveCreds)
 sock.ev.on('connection.update', async(u)=>{
   if(u.connection==='close' && u.lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut) setTimeout(()=>startBot(),2500)
   if(u.connection==='open' && pendingWelcome){ pendingWelcome=false; await welcome() }
 })
 sock.ev.on('messages.upsert', async({type,messages})=>{
   if(type!=='notify') return
   const m=messages[0]; if(!m?.message) return
   const from=m.key.remoteJid; if(!from||from==='status@broadcast') return

   // FIX PARA TU FOTO - QUE RESPONDA EN (Tú)
   const myId = sock.user?.id || ""
   const myNum = myId.split('@')[0].split(':')[0]
   const fromNum = from.split('@')[0].split(':')[0]
   const isSelfChat = from===myId || myNum!=="" && fromNum===myNum
   if(m.key.fromMe &&!isSelfChat) return

   const txt=m.message.conversation||m.message.extendedTextMessage?.text||m.message.imageMessage?.caption||""; if(!txt) return
   const args=txt.trim().split(/ +/); const cmd=args[0].toLowerCase(); const q=args.slice(1).join(' ')
   const send=async(t)=>{ await sock.sendMessage(from,{text:t}) }

   // UN SOLO CODIGO.allmenu
   if(cmd==='.allmenu' || cmd==='.menu'){
     return await send(`╭─ • ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ • ─
│ ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ
│ ${c('24 tools bkn')}
│
│ 🛠️.ping
│ 🛠️.qr texto
│ 🛠️.base64 texto
│ 🛠️.calc 5+5
│ 🛠️.shorturl link
│ 🛠️.weather Habana
│ 🛠️.github usuario
│ 🛠️.ipinfo 8.8.8.8
│ 🛠️.tempmail
│ 🛠️.fakeinfo
│ 🛠️.binlookup 123456
│ 🛠️.define hello
│ 🛠️.wiki Cuba
│ 🛠️.google tema
│ 🛠️.translate es hello
│ 🛠️.screenshot url
│ 🛠️.yts tema
│ 🛠️.playstore app
│ 🛠️.npm baileys
│ 🤖.ia pregunta
│
│ Pon.allmenu
╰─ • ${c('online')} • ─`)
   }

   if(cmd==='.ping'){ return await send(`⚡ JAKUDOSHY ${Date.now()%1000}ms`) }
   if(cmd==='.qr' && q){ try{ await sock.sendMessage(from,{image:{url:`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(q)}`},caption:`QR: ${q}`}) }catch{} return }
   if(cmd==='.base64' && q){ return await send(Buffer.from(q).toString('base64')) }
   if(cmd==='.calc' && q){ try{ return await send(`${q} = ${eval(q.replace(/[^0-9+\-*/().]/g,''))}`)}catch{ return await send('error')} }
   if(cmd==='.shorturl' && q){ try{ let r=await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(q)}`); return await send(r.data)}catch{} }
   if(cmd==='.weather' && q){ try{ let r=await axios.get(`https://wttr.in/${encodeURIComponent(q)}?format=3`); return await send(r.data)}catch{} }
   if(cmd==='.github' && q){ try{ let r=await axios.get(`https://api.github.com/users/${q}`); return await send(`${r.data.login} - ${r.data.html_url}`)}catch{} }
   if(cmd==='.ipinfo' && q){ try{ let r=await axios.get(`http://ip-api.com/json/${q}`); return await send(`${r.data.query} ${r.data.country}-${r.data.city}`)}catch{} }
   if(cmd==='.tempmail'){ try{ let r=await axios.get('https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1'); return await send(r.data[0])}catch{} }
   if(cmd==='.binlookup' && q){ try{ let r=await axios.get(`https://lookup.binlist.net/${q}`,{headers:{'Accept-Version':'3'}}); return await send(`${r.data.bank?.name||'N/A'} ${r.data.scheme}`)}catch{ return await send('BIN invalido')} }
   if(cmd==='.wiki' && q){ try{ let r=await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`); return await send(r.data.extract)}catch{} }
   if(cmd==='.google' && q){ return await send(`https://www.google.com/search?q=${encodeURIComponent(q)}`) }
   if(cmd==='.ia' || cmd==='.ai'){ let prompt=q||"hola"; await sock.sendPresenceUpdate('composing', from); let r=await IA(prompt); if(r) await sock.sendMessage(from,{text:r}); await sock.sendPresenceUpdate('paused', from) }
 })
}

app.get('/pair', async(req,res)=>{
 try{
   let num=req.query.number?.replace(/[^0-9]/g,''); if(!num) return res.json({error:"error"})
   if(!sock){ await startBot(); await new Promise(r=>setTimeout(r,3000)) }
   if(!sock) return res.json({error:"iniciando"})
   pendingWelcome=true; const code=await sock.requestPairingCode(num); return res.json({code})
 }catch{ return res.json({error:"espera 30s"}) }
})

app.get('/', (req,res)=>{
res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JK BOT PREMIUM</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@900&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;background:#000;font-family:'Outfit';overflow-y:auto;overflow-x:hidden}
.bg{position:fixed;inset:0;background:radial-gradient(800px at 20% 10%, rgba(255,0,0,.35), transparent 60%), #000;z-index:0}
canvas{position:fixed;inset:0;opacity:.3;z-index:1}
.topbar{position:fixed;top:0;left:0;right:0;z-index:50;background:rgba(0,0,0,0.9);backdrop-filter:blur(10px);border-bottom:2px solid #ff0000;box-shadow:0 0 30px rgba(255,0,0,.5);padding:12px;text-align:center}
.topbar-text{font-size:18px;font-weight:900;letter-spacing:4px;color:#fff;text-shadow:0 0 15px #ff0000}
.wrap{position:relative;z-index:3;width:100%;max-width:520px;padding:16px;margin:70px auto 100px auto}
.box{width:100%;background:linear-gradient(145deg, rgba(20,0,0,.98), rgba(0,0,0,.99));border-radius:24px;padding:22px;border:2px solid #ff0000;box-shadow:0 0 80px rgba(255,0,0,.5)}
.header{text-align:center;padding:10px 0 16px;border-bottom:1px solid rgba(255,0,0,.3);margin-bottom:16px}
.title{font-size:32px;font-weight:900;letter-spacing:3px;color:#fff;text-shadow:0 0 20px #ff0000}
.sub{font-size:12px;letter-spacing:2px;color:#ff0000;margin-top:6px;font-weight:900}
#loader{position:fixed;inset:0;z-index:99;background:#000;display:flex;align-items:center;justify-content:center;flex-direction:column}
.load-box{width:90%;max-width:420px;background:linear-gradient(145deg, rgba(20,0,0,.98), rgba(0,0,0,.99));border:2px solid #ff0000;border-radius:20px;padding:28px;box-shadow:0 0 80px rgba(255,0,0,.6);text-align:center}
.load-title{font-size:26px;color:#fff;letter-spacing:3px;font-weight:900;text-shadow:0 0 20px #ff0000}
.load-sub{font-size:11px;color:#ff0000;letter-spacing:2px;margin-top:8px;font-family:'JetBrains Mono'}
.bar-bg{margin-top:22px;background:#111;border:1px solid rgba(255,0,0,.4);border-radius:100px;height:16px;overflow:hidden}
.bar-fill{height:100%;width:0%;background:linear-gradient(90deg,#ff0000,#ff4444);box-shadow:0 0 20px #ff0000;transition:width.1s linear}
.percent{margin-top:16px;font-size:42px;font-weight:900;color:#fff;letter-spacing:4px;text-shadow:0 0 20px #ff0000;font-family:'JetBrains Mono'}
.logs{margin-top:18px;text-align:left;background:#000;border:1px solid rgba(255,0,0,.25);border-radius:10px;padding:10px;height:110px;overflow:hidden}
.log-line{color:#ff0000;font-size:10px;font-family:'JetBrains Mono';line-height:16px;opacity:0;animation:logIn.3s forwards}
@keyframes logIn{to{opacity:1}}
#mainContent{display:none;animation:fadeIn.5s forwards}
@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.card{background:rgba(0,0,0,.7);border:1px solid rgba(255,0,0,.35);border-radius:16px;padding:18px}
.label{font-size:11px;letter-spacing:3px;color:#ff0000;font-weight:900;margin-bottom:10px}
.input-wrap{background:linear-gradient(135deg,#ff0000,#cc0000);padding:2px;border-radius:12px;box-shadow:0 0 30px rgba(255,0,0,.6)}
.input-inner{display:flex;align-items:center;background:#0a0000;border-radius:10px;padding:16px;gap:8px}
.plus{color:#ff0000;font-size:22px;font-weight:900;user-select:none;font-family:'JetBrains Mono'}
input{flex:1;background:transparent;border:none;outline:none;color:#fff;font-size:18px;font-weight:900;text-align:center;font-family:'JetBrains Mono'}
input::placeholder{text-align:center;color:rgba(255,255,255,0.5)}
.btn{width:100%;margin-top:14px;background:linear-gradient(135deg,#ff0000,#990000);padding:2px;border-radius:12px;border:none;cursor:pointer;box-shadow:0 0 40px rgba(255,0,0,.6)}
.btn-inner{background:#000;color:#fff;border-radius:10px;padding:16px;font-weight:900;font-size:13px;letter-spacing:2px;text-align:center}
.codeBox{display:none;margin-top:14px;background:rgba(255,0,0,.12);border:2px solid #ff0000;border-radius:12px;padding:14px}
.code{font-size:32px;color:#fff;text-align:center;letter-spacing:10px;font-weight:900;text-shadow:0 0 20px #ff0000;font-family:'JetBrains Mono'}
.steps{margin-top:16px;background:#000;border:1px solid rgba(255,0,0,.3);border-radius:12px;padding:14px}
.steps-title{color:#ff0000;font-size:11px;letter-spacing:2px;font-weight:900;margin-bottom:10px;font-family:'JetBrains Mono'}
.step{display:flex;gap:10px;margin-bottom:8px}
.step-n{background:#ff0000;color:#000;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;flex-shrink:0}
.step-t{color:#ccc;font-size:11px;line-height:20px;font-family:'JetBrains Mono'}
.step-t b{color:#fff}
.telegram-float{position:fixed;bottom:20px;right:20px;z-index:60;background:linear-gradient(135deg,#ff0000,#990000);padding:2px;border-radius:50px;box-shadow:0 0 30px rgba(255,0,0,.8);text-decoration:none}
.telegram-inner{background:#000;border-radius:50px;padding:10px 18px;display:flex;align-items:center;gap:8px}
.telegram-inner svg{width:20px;height:20px;fill:#ff0000}
.telegram-text{color:#fff;font-size:12px;font-weight:900;letter-spacing:1px;font-family:'JetBrains Mono'}
.spacer{height:100px}
</style></head><body>
<div class="bg"></div><canvas id="c"></canvas>
<div class="topbar"><div class="topbar-text">ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ</div></div>
<div id="loader">
<div class="load-box">
<div class="load-title">ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ</div>
<div class="load-sub">ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ</div>
<div class="bar-bg"><div class="bar-fill" id="bar"></div></div>
<div class="percent" id="percent">0%</div>
<div class="logs" id="logs"></div>
</div>
</div>
<div class="wrap" id="mainContent">
<div class="box">
<div class="header"><div class="title">ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ</div><div class="sub">ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ</div></div>
<div class="card">
<div class="label">ᴠɪɴᴄᴜʟᴀᴄɪᴏɴ ᴘʀᴇᴍɪᴜᴍ</div>
<div class="input-wrap"><div class="input-inner"><div class="plus">+</div><input id="num" placeholder="53XXXXXXXX"></div></div>
<button class="btn" id="btn" onclick="gen()"><div class="btn-inner" id="btnTxt">ɢᴇɴᴇʀᴀʀ ᴄᴏᴅɪɢᴏ</div></button>
<div class="codeBox" id="codeBox"><div class="code" id="codeText"></div></div>
</div>
<div class="steps">
<div class="steps-title">ᴘᴀsᴏs ᴘᴀʀᴀ ᴠɪɴᴄᴜʟᴀʀ:</div>
<div class="step"><div class="step-n">1</div><div class="step-t"><b>ᴘᴏɴ ᴛᴜ ɴᴜᴍᴇʀᴏ</b> ᴄᴏɴ ᴄᴏᴅɪɢᴏ ᴅᴇ ᴘᴀɪs</div></div>
<div class="step"><div class="step-n">2</div><div class="step-t">ᴅᴀʟᴇ <b>ɢᴇɴᴇʀᴀʀ</b> ʏ ᴄᴏᴘɪᴀ ᴇʟ ᴄᴏᴅɪɢᴏ</div></div>
<div class="step"><div class="step-n">3</div><div class="step-t">ᴡʜᴀᴛsᴀᴘᴘ > <b>ᴅɪsᴘᴏsɪᴛɪᴠᴏs ᴠɪɴᴄᴜʟᴀᴅᴏs</b></div></div>
<div class="step"><div class="step-n">4</div><div class="step-t"><b>ᴠɪɴᴄᴜʟᴀʀ ᴄᴏɴ ᴇʟ ᴄᴏᴅɪɢᴏ</b></div></div>
</div>
<div class="spacer"></div>
</div>
</div>
<a class="telegram-float" href="https://t.me/gg_no_root" target="_blank">
  <div class="telegram-inner">
    <svg viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.12l-6.893 4.326-2.967-.945c-.64-.203-.658-.64.135-.954l11.6-4.458c.538-.196 1.006.12.832.941z"/></svg>
    <span class="telegram-text">ᴊᴋ ᴄʜᴀɴɴᴇʟꫂꤪꤨᴼᶠᶜ</span>
  </div>
</a>
<script>
const c=document.getElementById('c'),x=c.getContext('2d');function rs(){c.width=innerWidth;c.height=innerHeight}rs();window.addEventListener('resize',rs);
let cols=Math.floor(innerWidth/10), drops=new Array(cols).fill(0);
function matrix(){x.fillStyle='rgba(0,0,0,0.12)';x.fillRect(0,0,c.width,c.height);x.font='16px monospace';drops.forEach((y,i)=>{x.fillStyle='#ff0000';x.fillText('0',i*10,y*10);if(y*10>c.height && Math.random()>.97) drops[i]=0;drops[i]++});requestAnimationFrame(matrix)}matrix();
const logsData=["[ sɪsᴛᴇᴍᴀ ] ɪɴɪᴄɪᴀɴᴅᴏ ᴍᴏᴅᴜʟᴏs...","[ sɪsᴛᴇᴍᴀ ] ᴄᴀʀɢᴀɴᴅᴏ ᴀᴘɪs ᴘʀᴇᴍɪᴜᴍ...","[ sɪsᴛᴇᴍᴀ ] ᴀᴘɪ ɢᴘᴛ-4 ✓","[ sɪsᴛᴇᴍᴀ ] ᴀᴘɪ ɢᴇᴍɪɴɪ ᴘʀᴏ ✓","[ sɪsᴛᴇᴍᴀ ] 24 ᴛᴏᴏʟs ✓","[ sɪsᴛᴇᴍᴀ ] sᴇʀᴠɪᴅᴏʀ ᴏɴʟɪɴᴇ ✓"];
let pct=0; const bar=document.getElementById('bar'), perc=document.getElementById('percent'), logs=document.getElementById('logs'), loader=document.getElementById('loader'), main=document.getElementById('mainContent');
function addLog(i){ if(i>=logsData.length) return; const d=document.createElement('div'); d.className='log-line'; d.innerHTML=logsData[i]; logs.appendChild(d); logs.scrollTop=logs.scrollHeight; }
let logIdx=0; addLog(0);
let interval=setInterval(()=>{
 pct+= Math.random()*4+1; if(pct>100) pct=100;
 bar.style.width=pct+'%'; perc.innerText=Math.floor(pct)+'%';
 if(pct>14 && logIdx==0){logIdx=1; addLog(1)}
 if(pct>28 && logIdx==1){logIdx=2; addLog(2)}
 if(pct>42 && logIdx==2){logIdx=3; addLog(3)}
 if(pct>56 && logIdx==3){logIdx=4; addLog(4)}
 if(pct>70 && logIdx==4){logIdx=5; addLog(5)}
 if(pct>=100){
  clearInterval(interval);
  perc.innerText='100%'; bar.style.width='100%';
  setTimeout(()=>{ loader.style.transition='opacity.6s'; loader.style.opacity='0'; setTimeout(()=>{ loader.style.display='none'; main.style.display='block'; },600)},400)
 }
}, 45);
async function gen(){const n=document.getElementById('num').value.trim().replace(/[^0-9]/g,'');if(!n) return;document.getElementById('btnTxt').innerText='ɢᴇɴᴇʀᴀɴᴅᴏ...';try{const r=await fetch('/pair?number='+encodeURIComponent(n)).then(r=>r.json());if(r.error){alert(r.error);document.getElementById('btnTxt').innerText='ɢᴇɴᴇʀᴀʀ ᴄᴏᴅɪɢᴏ';return;}document.getElementById('codeText').innerText=r.code;document.getElementById('codeBox').style.display='block';document.getElementById('btnTxt').innerText=r.code;}catch{document.getElementById('btnTxt').innerText='ɢᴇɴᴇʀᴀʀ ᴄᴏᴅɪɢᴏ';}}
</script></body></html>`)
})
app.listen(PORT, ()=>{
  console.log(`[ ${c('SISTEMA')} ] ${c('servidor premium online')}`)
  startBot()
})