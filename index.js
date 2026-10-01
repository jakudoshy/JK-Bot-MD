const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const axios = require('axios')

function c(t){
 const m={'a':'ᴀ','b':'ʙ','c':'ᴄ','d':'ᴅ','e':'ᴇ','f':'ғ','g':'ɢ','h':'ʜ','i':'ɪ','j':'ᴊ','k':'ᴋ','l':'ʟ','m':'ᴍ','n':'ɴ','o':'ᴏ','p':'ᴘ','q':'ǫ','r':'ʀ','s':'s','t':'ᴛ','u':'ᴜ','v':'ᴠ','w':'ᴡ','x':'x','y':'ʏ','z':'ᴢ','A':'ᴀ','B':'ʙ','C':'ᴄ','D':'ᴅ','E':'ᴇ','F':'ғ','G':'ɢ','H':'ʜ','I':'ɪ','J':'ᴊ','K':'ᴋ','L':'ʟ','M':'ᴍ','N':'ɴ','O':'ᴏ','P':'ᴘ','Q':'ǫ','R':'ʀ','S':'s','T':'ᴛ','U':'ᴜ','V':'ᴠ','W':'ᴡ','X':'x','Y':'ʏ','Z':'ᴢ'}
 return t.split('').map(x=>m[x]||x).join('')
}

console.log(`[ ${c('SISTEMA')} ] ${c('iniciando modulos...')}`)
const app = express()
const PORT = process.env.PORT || 3000
let sock=null, lastCode=null, lastCodeTime=0, pendingWelcome=false
console.log(`[ ${c('SISTEMA')} ] ${c('apis premium cargadas')}`)

// --- APIS CON META AI ---
const APIS = {
  meta: "https://api.davidcyriltech.my.id/ai/llama?query=", // META AI LLAMA 3
  meta2: "https://api.davidcyriltech.my.id/ai/metaai?query=", // META AI OFICIAL
  gpt: "https://api.davidcyriltech.my.id/ai/chatbot?query=",
  poll: "https://text.pollinations.ai/"
}

async function IA_PREMIUM(txt){
 const q=encodeURIComponent(txt)
 // META AI - PRINCIPAL
 try{ const r=await axios.get(APIS.meta+q,{timeout:12000}); if(r.data?.result) return r.data.result }catch{}
 try{ const r=await axios.get(APIS.meta2+q,{timeout:12000}); if(r.data?.result || r.data?.response) return r.data.result || r.data.response }catch{}
 // META AI VIA POLLINATIONS LLAMA
 try{ const r=await axios.get(APIS.poll+q+"?model=llama",{timeout:10000}); if(typeof r.data==='string'&&r.data.length>4) return r.data }catch{}
 // RESPALDOS
 try{ const r=await axios.get(APIS.gpt+q,{timeout:12000}); if(r.data?.result) return r.data.result }catch{}
 try{ const r=await axios.get(APIS.poll+q+"?model=openai",{timeout:10000}); if(typeof r.data==='string'&&r.data.length>4) return r.data }catch{}
 try{ const m2=txt.match(/(\d+)\s*([\+\-\*\/x])\s*(\d+)/i); if(m2){ let a=+m2[1],b=+m2[3],op=m2[2]; let res=op==='+'?a+b:op==='-'?a-b:op==='/'?a/b:a*b; return `${a} ${op} ${b} = ${res}` } }catch{}
 return txt
}

async function welcome(){
 if(!sock?.user?.id) return
 const msg=`╭─ • ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ • ─\n│ ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ\n│ ${c('meta ai activa')}\n│ ${c('gg_no_root')}\n│.ia ${c('pregunta')}\n╰─ • ${c('online')} • ─`
 try{ await new Promise(r=>setTimeout(r,1500)); await sock.sendMessage(sock.user.id,{text:msg}) }catch{}
}

async function startBot(){
 const { state, saveCreds } = await useMultiFileAuthState('./auth_info')
 const { version } = await fetchLatestBaileysVersion()
 sock = makeWASocket({ version, logger:P({level:'silent'}), printQRInTerminal:false, auth:{creds:state.creds, keys:makeCacheableSignalKeyStore(state.keys,P({level:'silent'}))}, browser:["Debian","Chrome","11.0"], getMessage:async()=>undefined })
 sock.ev.on('creds.update', saveCreds)
 sock.ev.on('connection.update', async(u)=>{
   if(u.connection==='close' && u.lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut) setTimeout(()=>startBot(),2500)
   if(u.connection==='open' && pendingWelcome){ pendingWelcome=false; await welcome() }
 })
 sock.ev.on('messages.upsert', async({messages})=>{
   const m=messages[0]; if(!m?.message) return; const from=m.key.remoteJid; if(from==='status@broadcast') return
   const txt=m.message.conversation||m.message.extendedTextMessage?.text||""; if(!txt) return
   const low=txt.toLowerCase()
   if(low==='.menu'){ return await sock.sendMessage(from,{text:`╭─ • ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ • ─\n│ ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ\n│ ${c('meta ai premium')}\n│.ia ${c('pregunta')}\n│.menu\n╰─ • ${c('online')} • ─`}) }
   if(low.startsWith('.ia')||low.startsWith('.bot')||low.startsWith('.gpt')||low.startsWith('.meta')){
     let q=txt.replace(/^\.(ia|bot|gpt|meta)/i,'').trim(); if(!q) return
     const r=await IA_PREMIUM(q); await sock.sendMessage(from,{text:r})
   }
 })
}

app.use(express.json())
app.get('/pair', async(req,res)=>{
 try{
   let num=req.query.number?.replace(/[^0-9]/g,''); if(!num) return res.json({error:"error"})
   if(!sock){ await startBot(); await new Promise(r=>setTimeout(r,3000)) }
   const now=Date.now(); if(lastCode && (now-lastCodeTime)<12000) return res.json({code:lastCode})
   pendingWelcome=true; const code=await sock.requestPairingCode(num); lastCode=code; lastCodeTime=Date.now(); return res.json({code})
 }catch{ return res.json({error:"espera"}) }
})

app.get('/', (req,res)=>{
res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JK BOT PREMIUM</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@900&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#000;font-family:'Outfit';overflow:hidden}
.bg{position:fixed;inset:0;background:radial-gradient(800px at 20% 10%, rgba(255,0,0,.35), transparent 60%), #000}
canvas{position:fixed;inset:0;opacity:.3}
.wrap{position:relative;z-index:3;width:100%;max-width:520px;padding:16px}
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
.log-line span{color:#00ff00}
@keyframes logIn{to{opacity:1}}
#mainContent{display:none;animation:fadeIn.5s forwards}
@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.card{background:rgba(0,0,0,.7);border:1px solid rgba(255,0,0,.35);border-radius:16px;padding:18px}
.label{font-size:11px;letter-spacing:3px;color:#ff0000;font-weight:900;margin-bottom:10px}
.input-wrap{background:linear-gradient(135deg,#ff0000,#cc0000);padding:2px;border-radius:12px;box-shadow:0 0 30px rgba(255,0,0,.6)}
.input-inner{display:flex;align-items:center;background:#0a0000;border-radius:10px;padding:16px}
input{flex:1;background:transparent;border:none;outline:none;color:#fff;font-size:18px;font-weight:900;text-align:center;font-family:'JetBrains Mono'}
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
</style></head><body>
<div class="bg"></div><canvas id="c"></canvas>

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
<div class="header"><div class="title">ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ</div><div class="sub">ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ • ᴍᴇᴛᴀ ᴀɪ</div></div>
<div class="card">
<div class="label">ᴠɪɴᴄᴜʟᴀᴄɪᴏɴ ᴘʀᴇᴍɪᴜᴍ</div>
<div class="input-wrap"><div class="input-inner"><input id="num" placeholder="51912345678"></div></div>
<button class="btn" id="btn" onclick="gen()"><div class="btn-inner" id="btnTxt">ɢᴇɴᴇʀᴀʀ ᴄᴏᴅɪɢᴏ</div></button>
<div class="codeBox" id="codeBox"><div class="code" id="codeText"></div></div>
</div>
<div class="steps">
<div class="steps-title">ᴘᴀsᴏs ᴘᴀʀᴀ ᴠɪɴᴄᴜʟᴀʀ:</div>
<div class="step"><div class="step-n">1</div><div class="step-t"><b>ᴘᴏɴ ᴛᴜ ɴᴜᴍᴇʀᴏ</b> ᴄᴏɴ ᴄᴏᴅɪɢᴏ ᴅᴇ ᴘᴀɪs</div></div>
<div class="step"><div class="step-n">2</div><div class="step-t">ᴅᴀʟᴇ <b>ɢᴇɴᴇʀᴀʀ</b> ʏ ᴄᴏᴘɪᴀ ᴇʟ ᴄᴏᴅɪɢᴏ</div></div>
<div class="step"><div class="step-n">3</div><div class="step-t">ᴡʜᴀᴛsᴀᴘᴘ > <b>ᴅɪsᴘᴏsɪᴛɪᴠᴏs ᴠɪɴᴄᴜʟᴀᴅᴏs</b></div></div>
<div class="step"><div class="step-n">4</div><div class="step-t"><b>ᴠɪɴᴄᴜʟᴀʀ ᴄᴏɴ ɴᴜᴍᴇʀᴏ</b> ʏ ᴘᴇɢᴀ</div></div>
</div>
</div>
</div>

<script>
const c=document.getElementById('c'),x=c.getContext('2d');function rs(){c.width=innerWidth;c.height=innerHeight}rs();
let cols=Math.floor(innerWidth/10), drops=new Array(cols).fill(0);
function matrix(){x.fillStyle='rgba(0,0,0,0.12)';x.fillRect(0,0,c.width,c.height);x.font='16px monospace';drops.forEach((y,i)=>{x.fillStyle='#ff0000';x.fillText('0',i*10,y*10);if(y*10>c.height && Math.random()>.97) drops[i]=0;drops[i]++});requestAnimationFrame(matrix)}matrix();
const logsData=[
"[ sɪsᴛᴇᴍᴀ ] ɪɴɪᴄɪᴀɴᴅᴏ ᴍᴏᴅᴜʟᴏs...",
"[ sɪsᴛᴇᴍᴀ ] ᴄᴀʀɢᴀɴᴅᴏ ᴍᴇᴛᴀ ᴀɪ...",
"[ sɪsᴛᴇᴍᴀ ] ᴀᴘɪ ᴍᴇᴛᴀ ᴀɪ ✓",
"[ sɪsᴛᴇᴍᴀ ] ᴀᴘɪ ʟᴀᴍᴀ 3 ✓",
"[ sɪsᴛᴇᴍᴀ ] ᴀᴘɪ ɢᴘᴛ-4 ✓",
"[ sɪsᴛᴇᴍᴀ ] ᴄᴀʀɢᴀɴᴅᴏ ʙᴀɪʟᴇʏs...",
"[ sɪsᴛᴇᴍᴀ ] sᴇʀᴠɪᴅᴏʀ ᴏɴʟɪɴᴇ ✓",
"[ sɪsᴛᴇᴍᴀ ] ᴍᴇᴛᴀ ᴀɪ ʟɪsᴛᴏ ✓"
];
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
 if(pct>85 && logIdx==5){logIdx=6; addLog(6)}
 if(pct>95 && logIdx==6){logIdx=7; addLog(7)}
 if(pct>=100){
  clearInterval(interval);
  perc.innerText='100%'; bar.style.width='100%';
  setTimeout(()=>{ loader.style.transition='opacity.6s'; loader.style.opacity='0'; setTimeout(()=>{ loader.style.display='none'; main.style.display='block'; },600)},400)
 }
}, 45);
async function gen(){const n=document.getElementById('num').value.trim();if(!n) return;const b=document.getElementById('btn');document.getElementById('btnTxt').innerText='ɢᴇɴᴇʀᴀɴᴅᴏ...';b.disabled=true;try{const r=await fetch('/pair?number='+encodeURIComponent(n)).then(r=>r.json());if(r.error){document.getElementById('btnTxt').innerText='ɢᴇɴᴇʀᴀʀ ᴄᴏᴅɪɢᴏ';b.disabled=false;return;}document.getElementById('codeText').innerText=r.code;document.getElementById('codeBox').style.display='block';document.getElementById('btnTxt').innerText=r.code}catch{document.getElementById('btnTxt').innerText='ɢᴇɴᴇʀᴀʀ ᴄᴏᴅɪɢᴏ';b.disabled=false}}
</script></body></html>`)
})
app.listen(PORT, ()=>{
  console.log(`[ ${c('SISTEMA')} ] ${c('servidor premium online')}`)
  console.log(`[ ${c('SISTEMA')} ] ${c('meta ai activa')}`)
  startBot()
})