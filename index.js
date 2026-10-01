const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const axios = require('axios')

function c(t){
 const m={'a':'ᴀ','b':'ʙ','c':'ᴄ','d':'ᴅ','e':'ᴇ','f':'ғ','g':'ɢ','h':'ʜ','i':'ɪ','j':'ᴊ','k':'ᴋ','l':'ʟ','m':'ᴍ','n':'ɴ','o':'ᴏ','p':'ᴘ','q':'ǫ','r':'ʀ','s':'s','t':'ᴛ','u':'ᴜ','v':'ᴠ','w':'ᴡ','x':'x','y':'ʏ','z':'ᴢ','A':'ᴀ','B':'ʙ','C':'ᴄ','D':'ᴅ','E':'ᴇ','F':'ғ','G':'ɢ','H':'ʜ','I':'ɪ','J':'ᴊ','K':'ᴋ','L':'ʟ','M':'ᴍ','N':'ɴ','O':'ᴏ','P':'ᴘ','Q':'ǫ','R':'ʀ','S':'s','T':'ᴛ','U':'ᴜ','V':'ᴠ','W':'ᴡ','X':'x','Y':'ʏ','Z':'ᴢ'}
 return t.split('').map(x=>m[x]||x).join('')
}

const app = express()
const PORT = process.env.PORT || 3000
let sock=null

// IA DURA QUE NUNCA FALLA
async function IA_PREMIUM(txt){
 const q = encodeURIComponent(txt)
 const APIS = [
   `https://text.pollinations.ai/${q}`,
   `https://api.davidcyriltech.my.id/ai/llama?query=${q}`,
   `https://api.davidcyriltech.my.id/ai/metaai?query=${q}`,
   `https://api.davidcyriltech.my.id/ai/deepseek?query=${q}`,
   `https://api.davidcyriltech.my.id/ai/gemini?query=${q}`,
   `https://api.davidcyriltech.my.id/ai/chatbot?query=${q}`,
   `https://api.azz.biz.id/api/ai/blackbox?query=${q}`,
   `https://api.azz.biz.id/api/ai/gpt?query=${q}`
 ]
 for(let url of APIS){
   try{
     const r = await axios.get(url, {timeout: 8000})
     let res = r.data?.result || r.data?.response || r.data?.message || r.data
     if(typeof res === 'string' && res.trim().length > 2) return res.trim()
   }catch{ continue }
 }
 return `🤖 Estoy online bro, dime de nuevo: ${txt}`
}

async function startBot(){
 const { state, saveCreds } = await useMultiFileAuthState('./auth_info')
 const { version } = await fetchLatestBaileysVersion()
 sock = makeWASocket({
   version,
   logger:P({level:'silent'}),
   printQRInTerminal:false,
   auth:{creds:state.creds, keys:makeCacheableSignalKeyStore(state.keys,P({level:'silent'}))},
   browser:["Ubuntu","Chrome","110.0.0"],
   syncFullHistory:false,
   markOnlineOnConnect:true,
   getMessage:async()=>undefined
 })
 sock.ev.on('creds.update', saveCreds)
 sock.ev.on('connection.update', async(u)=>{
   if(u.connection==='close' && u.lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut) setTimeout(()=>startBot(),3000)
   if(u.connection==='open'){
     console.log(`[ ${c('BOT CONECTADO')} ]`)
     if(sock.user?.id){
       try{
         await new Promise(r=>setTimeout(r,1500))
         await sock.sendMessage(sock.user.id,{text:`╭─ • ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ • ─\n│ ${c('conectado con exito')}\n│ ${c('ia dura activa')}\n│ Escribe.ia pregunta en TÚ\n╰─ • ONLINE • ─`})
       }catch{}
     }
   }
 })

 sock.ev.on('messages.upsert', async({type,messages})=>{
   if(type!=='notify') return
   const m=messages[0]
   if(!m?.message) return
   const from=m.key.remoteJid
   if(!from || from==='status@broadcast') return

   const isSelfChat = from === sock.user?.id
   if(m.key.fromMe &&!isSelfChat) return

   const txt = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || ""
   if(!txt) return
   const low = txt.toLowerCase().trim()

   if(low==='.menu' || low==='menu'){
     return await sock.sendMessage(from,{text:`╭─ • ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ • ─\n│ ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ\n│ IA DURA SIN ERRORES\n│.ia pregunta\n│.ping\n╰─ • ONLINE • ─`})
   }
   if(low==='.ping' || low==='ping'){
     return await sock.sendMessage(from,{text:`⚡ ONLINE - IA DURA ACTIVA`})
   }

   let q=null
   if(low.startsWith('.ia') || low.startsWith('.bot') || low.startsWith('.gpt') || low.startsWith('.ai') || low.startsWith('ia ')){
     q = txt.replace(/^\.(ia|bot|gpt|ai)|^(ia|bot)/i,'').trim()
     if(!q) q = "Hola"
   }

   if(q){
     try{
       await sock.sendPresenceUpdate('composing', from)
       const r = await IA_PREMIUM(q)
       await sock.sendMessage(from,{text:r})
       await sock.sendPresenceUpdate('paused', from)
     }catch{
       try{ await sock.sendMessage(from,{text:"❌ Error, intenta de nuevo bro"}) }catch{}
     }
   }
 })
}

app.use(express.json())

// PAIR ARREGLADO - AHORA SI VINCULA
app.get('/pair', async(req,res)=>{
 try{
   let num = req.query.number?.replace(/[^0-9]/g,'')
   if(!num || num.length < 8) return res.json({error:"Numero invalido"})

   if(!sock){
     await startBot()
     await new Promise(r=>setTimeout(r,4000))
   }
   if(!sock) return res.json({error:"Iniciando bot, espera 3s"})

   const code = await sock.requestPairingCode(num)
   console.log(`[ CODIGO ] ${code} para ${num}`)
   return res.json({code})
 }catch(e){
   console.log("Error pair:", e.message)
   return res.json({error:"Espera 10s e intenta de nuevo"})
 }
})

app.get('/', (req,res)=>{
res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JK BOT</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@900&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;background:#000;font-family:'Outfit';overflow-y:auto;overflow-x:hidden;display:flex;justify-content:center}
.bg{position:fixed;inset:0;background:radial-gradient(900px at 50% 0%, rgba(255,0,0,.4), transparent 60%), #000;z-index:0}
canvas{position:fixed;inset:0;opacity:.25;z-index:1}
.topbar{position:fixed;top:0;left:0;right:0;z-index:50;background:rgba(0,0,0,0.95);backdrop-filter:blur(12px);border-bottom:2px solid #ff0000;box-shadow:0 0 40px rgba(255,0,0,.6);padding:14px;text-align:center}
.topbar-text{font-size:20px;font-weight:900;letter-spacing:5px;color:#fff;text-shadow:0 0 20px #ff0000, 0 0 40px #ff0000}
.wrap{position:relative;z-index:3;width:100%;max-width:520px;padding:16px;margin:80px auto 120px auto;display:flex;flex-direction:column;align-items:center}
.box{width:100%;background:linear-gradient(145deg, rgba(25,0,0,.98), rgba(0,0,0,.99));border-radius:26px;padding:26px;border:2px solid #ff0000;box-shadow:0 0 80px rgba(255,0,0,.5), inset 0 0 20px rgba(255,0,0,.15);text-align:center}
.header{text-align:center;padding:12px 0 18px;border-bottom:1px solid rgba(255,0,0,.4);margin-bottom:18px}
.title{font-size:34px;font-weight:900;letter-spacing:4px;color:#fff;text-shadow:0 0 20px #ff0000, 0 0 40px #ff0000}
.sub{font-size:12px;letter-spacing:3px;color:#ff0000;margin-top:8px;font-weight:900;text-shadow:0 0 10px #ff0000}
#loader{position:fixed;inset:0;z-index:99;background:#000;display:flex;align-items:center;justify-content:center;flex-direction:column}
.load-box{width:90%;max-width:420px;background:linear-gradient(145deg, rgba(25,0,0,.98), rgba(0,0,0,.99));border:2px solid #ff0000;border-radius:22px;padding:30px;box-shadow:0 0 80px rgba(255,0,0,.7);text-align:center}
.load-title{font-size:28px;color:#fff;letter-spacing:4px;font-weight:900;text-shadow:0 0 20px #ff0000}
.load-sub{font-size:11px;color:#ff0000;letter-spacing:3px;margin-top:10px;font-family:'JetBrains Mono'}
.bar-bg{margin-top:24px;background:#111;border:1px solid rgba(255,0,0,.5);border-radius:100px;height:18px;overflow:hidden;box-shadow:inset 0 0 10px rgba(0,0,0,.8)}
.bar-fill{height:100%;width:0%;background:linear-gradient(90deg,#ff0000,#ff4444,#ff0000);box-shadow:0 0 20px #ff0000;transition:width.1s linear}
.percent{margin-top:18px;font-size:44px;font-weight:900;color:#fff;letter-spacing:5px;text-shadow:0 0 20px #ff0000;font-family:'JetBrains Mono'}
.logs{margin-top:20px;text-align:left;background:#000;border:1px solid rgba(255,0,0,.3);border-radius:12px;padding:12px;height:120px;overflow:hidden;box-shadow:inset 0 0 20px rgba(255,0,0,.1)}
.log-line{color:#ff3333;font-size:10px;font-family:'JetBrains Mono';line-height:18px;opacity:0;animation:logIn.3s forwards}
@keyframes logIn{to{opacity:1}}
#mainContent{display:none;animation:fadeIn.6s forwards;width:100%}
@keyframes fadeIn{from{opacity:0;transform:translateY(15px)}to{opacity:1;transform:translateY(0)}}
.card{background:rgba(0,0,0,.6);border:1px solid rgba(255,0,0,.4);border-radius:18px;padding:20px;box-shadow:0 0 30px rgba(255,0,0,.15);text-align:center}
.label{font-size:12px;letter-spacing:4px;color:#ff0000;font-weight:900;margin-bottom:14px;text-shadow:0 0 10px #ff0000;text-align:center}
.input-wrap{background:linear-gradient(135deg,#ff0000,#990000);padding:2px;border-radius:14px;box-shadow:0 0 40px rgba(255,0,0,.7)}
.input-inner{display:flex;align-items:center;justify-content:center;background:#0a0000;border-radius:12px;padding:18px;gap:10px}
.plus{color:#ff0000;font-size:24px;font-weight:900;font-family:'JetBrains Mono'}
input{flex:1;background:transparent;border:none;outline:none;color:#fff;font-size:20px;font-weight:900;text-align:center;font-family:'JetBrains Mono';letter-spacing:1px}
input::placeholder{text-align:center;color:rgba(255,255,255,0.4);font-size:18px}
.btn{width:100%;margin-top:16px;background:linear-gradient(135deg,#ff0000,#990000);padding:2px;border-radius:14px;border:none;cursor:pointer;box-shadow:0 0 50px rgba(255,0,0,.7);transition:transform.1s}
.btn:active{transform:scale(0.98)}
.btn-inner{background:#000;color:#fff;border-radius:12px;padding:18px;font-weight:900;font-size:14px;letter-spacing:3px;text-align:center;text-shadow:0 0 10px #ff0000}
.codeBox{display:none;margin-top:18px;background:linear-gradient(135deg, rgba(255,0,0,.2), rgba(0,0,0,.8));border:2px solid #ff0000;border-radius:14px;padding:18px;box-shadow:0 0 40px rgba(255,0,0,.5);text-align:center;animation:fadeIn.3s}
.code{font-size:36px;color:#fff;text-align:center;letter-spacing:12px;font-weight:900;text-shadow:0 0 20px #ff0000, 0 0 40px #ff0000;font-family:'JetBrains Mono'}
.steps{margin-top:18px;background:linear-gradient(145deg, #000, #0a0000);border:1px solid rgba(255,0,0,.35);border-radius:16px;padding:18px;text-align:left;box-shadow:0 0 30px rgba(255,0,0,.15)}
.steps-title{color:#ff0000;font-size:12px;letter-spacing:3px;font-weight:900;margin-bottom:14px;font-family:'JetBrains Mono';text-align:center;text-shadow:0 0 10px #ff0000}
.step{display:flex;gap:12px;margin-bottom:10px;align-items:center;justify-content:flex-start}
.step-n{background:linear-gradient(135deg,#ff0000,#990000);color:#fff;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;flex-shrink:0;box-shadow:0 0 15px rgba(255,0,0,.6)}
.step-t{color:#ddd;font-size:12px;line-height:24px;font-family:'JetBrains Mono';text-align:left}
.step-t b{color:#fff;text-shadow:0 0 8px #ff0000}
.telegram-float{position:fixed;bottom:24px;right:24px;z-index:60;background:linear-gradient(135deg,#ff0000,#990000);padding:2px;border-radius:50px;box-shadow:0 0 40px rgba(255,0,0,.9);text-decoration:none;transition:transform.2s}
.telegram-float:hover{transform:scale(1.05)}
.telegram-inner{background:#000;border-radius:50px;padding:12px 20px;display:flex;align-items:center;gap:10px}
.telegram-inner svg{width:22px;height:22px;fill:#ff0000;filter:drop-shadow(0 0 8px #ff0000)}
.telegram-text{color:#fff;font-size:13px;font-weight:900;letter-spacing:1px;font-family:'JetBrains Mono';text-shadow:0 0 10px #ff0000}
.spacer{height:40px}
</style></head><body>
<div class="bg"></div><canvas id="c"></canvas>
<div class="topbar"><div class="topbar-text">ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ</div></div>
<div id="loader"><div class="load-box"><div class="load-title">ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ</div><div class="load-sub">ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ</div><div class="bar-bg"><div class="bar-fill" id="bar"></div></div><div class="percent" id="percent">0%</div><div class="logs" id="logs"></div></div></div>
<div class="wrap" id="mainContent">
<div class="box">
<div class="header"><div class="title">ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ</div><div class="sub">ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ • IA DURA</div></div>
<div class="card">
<div class="label">ᴠɪɴᴄᴜʟᴀᴄɪᴏɴ ᴘʀᴇᴍɪᴜᴍ</div>
<div class="input-wrap"><div class="input-inner"><div class="plus">+</div><input id="num" placeholder="53XXXXXXXX"></div></div>
<button class="btn" id="btn" onclick="gen()"><div class="btn-inner" id="btnTxt">ɢᴇɴᴇʀᴀʀ ᴄᴏᴅɪɢᴏ</div></button>
<div class="codeBox" id="codeBox"><div class="code" id="codeText"></div></div>
</div>
<div class="steps">
<div class="steps-title">ᴘᴀsᴏs ᴘᴀʀᴀ ᴠɪɴᴄᴜʟᴀʀ:</div>
<div class="step"><div class="step-n">1</div><div class="step-t"><b>ᴘᴏɴ ᴛᴜ ɴᴜᴍᴇʀᴏ</b> 53XXXXXXXX</div></div>
<div class="step"><div class="step-n">2</div><div class="step-t">ᴅᴀʟᴇ <b>ɢᴇɴᴇʀᴀʀ</b> ʏ ᴄᴏᴘɪᴀ ᴄᴏᴅɪɢᴏ</div></div>
<div class="step"><div class="step-n">3</div><div class="step-t">ᴡʜᴀᴛsᴀᴘᴘ > <b>ᴅɪsᴘᴏsɪᴛɪᴠᴏs</b></div></div>
<div class="step"><div class="step-n">4</div><div class="step-t"><b>ᴠɪɴᴄᴜʟᴀʀ ᴄᴏɴ ᴄᴏᴅɪɢᴏ</b></div></div>
</div>
<div class="spacer"></div>
</div>
</div>
<a class="telegram-float" href="https://t.me/gg_no_root" target="_blank"><div class="telegram-inner"><svg viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.12l-6.893 4.326-2.967-.945c-.64-.203-.658-.64.135-.954l11.6-4.458c.538-.196 1.006.12.832.941z"/></svg><span class="telegram-text">ᴊᴋ ᴄʜᴀɴɴᴇʟꫂꤪꤨᴼᶠᶜ</span></div></a>
<script>
const c=document.getElementById('c'),x=c.getContext('2d');function rs(){c.width=innerWidth;c.height=innerHeight}rs();window.addEventListener('resize',rs);
let cols=Math.floor(innerWidth/14), drops=new Array(cols).fill(0);
function matrix(){x.fillStyle='rgba(0,0,0,0.12)';x.fillRect(0,0,c.width,c.height);x.font='16px monospace';drops.forEach((y,i)=>{x.fillStyle='#ff0000';x.fillText('0',i*14,y*14);if(y*14>c.height && Math.random()>.97) drops[i]=0;drops[i]++});requestAnimationFrame(matrix)}matrix();
const logsData=["[ SISTEMA ] INICIANDO...","[ IA ] CARGANDO APIS FREE...","[ IA ] MODO TÚ ACTIVADO ✓","[ SISTEMA ] LISTO PARA VINCULAR ✓"];
let pct=0; const bar=document.getElementById('bar'), perc=document.getElementById('percent'), logs=document.getElementById('logs'), loader=document.getElementById('loader'), main=document.getElementById('mainContent');
function addLog(i){ if(i>=logsData.length) return; const d=document.createElement('div'); d.className='log-line'; d.innerHTML=logsData[i]; logs.appendChild(d); logs.scrollTop=logs.scrollHeight; }
let logIdx=0; addLog(0);
let interval=setInterval(()=>{
 pct+= Math.random()*5+2; if(pct>100) pct=100;
 bar.style.width=pct+'%'; perc.innerText=Math.floor(pct)+'%';
 if(pct>30 && logIdx==0){logIdx=1; addLog(1)}
 if(pct>65 && logIdx==1){logIdx=2; addLog(2)}
 if(pct>90 && logIdx==2){logIdx=3; addLog(3)}
 if(pct>=100){
  clearInterval(interval); perc.innerText='100%'; bar.style.width='100%';
  setTimeout(()=>{ loader.style.transition='opacity.6s'; loader.style.opacity='0'; setTimeout(()=>{ loader.style.display='none'; main.style.display='block'; },600)},400)
 }
}, 50);
async function gen(){
 const n=document.getElementById('num').value.trim().replace(/[^0-9]/g,'')
 if(!n || n.length < 8){ alert('Pon tu numero completo 53XXXXXXXX'); return }
 const btnTxt=document.getElementById('btnTxt')
 btnTxt.innerText='ɢᴇɴᴇʀᴀɴᴅᴏ...'
 try{
   const r=await fetch('/pair?number='+encodeURIComponent(n)).then(r=>r.json())
   if(r.error){ btnTxt.innerText='ERROR: '+r.error; setTimeout(()=>{btnTxt.innerText='ɢᴇɴᴇʀᴀʀ ᴄᴏᴅɪɢᴏ'},3000); return }
   document.getElementById('codeText').innerText=r.code
   document.getElementById('codeBox').style.display='block'
   btnTxt.innerText='CODIGO: '+r.code
   setTimeout(()=>{btnTxt.innerText='ɢᴇɴᴇʀᴀʀ ᴏᴛʀᴏ'},5000)
 }catch(e){
   btnTxt.innerText='ERROR, REINTENTA'
   setTimeout(()=>{btnTxt.innerText='ɢᴇɴᴇʀᴀʀ ᴄᴏᴅɪɢᴏ'},3000)
 }
}
</script></body></html>`)
})
app.listen(PORT, ()=>{ console.log(`[ SISTEMA ] ONLINE - IA DURA + CODIGOS OK`); startBot() })