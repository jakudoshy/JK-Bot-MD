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
let sock=null, lastCode=null, lastNumber=null, lastCodeTime=0, isGenerating=false, welcomeSent=false
console.log(`[ ${c('SISTEMA')} ] ${c('apis premium cargadas')}`)

// --- APIS 100% INTERNET - GRATIS - NUNCA LOCAL ---
async function IA_PREMIUM(txt){
 const q=encodeURIComponent(txt)
 try{ const r=await axios.get(`https://text.pollinations.ai/${q}?model=openai`,{timeout:15000}); if(r.data && typeof r.data==='string' && r.data.length>5) return r.data }catch{}
 try{ const r=await axios.get(`https://text.pollinations.ai/${q}?model=mistral`,{timeout:15000}); if(r.data && typeof r.data==='string' && r.data.length>5) return r.data }catch{}
 try{ const r=await axios.post('https://www.blackbox.ai/api/chat',{messages:[{role:"user",content:txt}]},{timeout:15000}); if(r.data){ let d=typeof r.data==='string'?r.data:r.data.message||""; if(d.length>5) return d } }catch{}
 try{ const r=await axios.get(`https://api.davidcyriltech.my.id/ai/chatbot?query=${q}`,{timeout:12000}); if(r.data?.result) return r.data.result }catch{}
 try{ const r=await axios.get(`https://api.davidcyriltech.my.id/ai/gemini?query=${q}`,{timeout:12000}); if(r.data?.result) return r.data.result }catch{}
 try{ const r=await axios.get(`https://api.azz.biz.id/api/ai/gpt?query=${q}`,{timeout:12000}); if(r.data?.result) return r.data.result }catch{}
 try{ const r=await axios.get(`https://api.siputzx.my.id/api/ai/gpt3?content=${q}`,{timeout:12000}); if(r.data?.data) return r.data.data }catch{}
 return `🔴 ${c('intenta de nuevo')} - ${c('apis saturadas')}`
}

async function welcome(){
 if(!sock?.user?.id || welcomeSent) return
 welcomeSent=true
 const msg=`╭─ • ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ • ─\n│ ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ\n│ ${c('apis premium activas')}\n│ ${c('gg_no_root')}\n│.ia ${c('pregunta')}\n╰─ • ${c('online')} • ─`
 try{ await new Promise(r=>setTimeout(r,1500)); await sock.sendMessage(sock.user.id,{text:msg}) }catch{}
}

async function startBot(){
 const { state, saveCreds } = await useMultiFileAuthState('./auth_info')
 const { version } = await fetchLatestBaileysVersion()
 sock = makeWASocket({ version, logger:P({level:'silent'}), printQRInTerminal:false, auth:{creds:state.creds, keys:makeCacheableSignalKeyStore(state.keys,P({level:'silent'}))}, browser:["Debian","Chrome","11.0"], getMessage:async()=>undefined, markOnlineOnConnect:false, syncFullHistory:false })
 sock.ev.on('creds.update', saveCreds)
 sock.ev.on('connection.update', async(u)=>{
   if(u.connection==='close' && u.lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut) setTimeout(()=>startBot(),3000)
   if(u.connection==='open'){
     console.log(`[ ${c('SISTEMA')} ] ${c('conectado')}`)
     if(lastNumber) await welcome()
   }
 })
 sock.ev.on('messages.upsert', async({messages})=>{
   const m=messages[0]; if(!m?.message) return; const from=m.key.remoteJid; if(from==='status@broadcast'||m.key.fromMe) return
   const txt=m.message.conversation||m.message.extendedTextMessage?.text||""; if(!txt) return
   const low=txt.toLowerCase()
   if(low==='.menu'){ return await sock.sendMessage(from,{text:`╭─ • ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ • ─\n│ ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ\n│ ${c('apis premium')}\n│.ia ${c('pregunta')}\n│.menu\n╰─ • ${c('online')} • ─`}) }
   if(low.startsWith('.ia')||low.startsWith('.bot')||low.startsWith('.gpt')){
     let q=txt.replace(/^\.(ia|bot|gpt)/i,'').trim(); if(!q) return
     const r=await IA_PREMIUM(q); await sock.sendMessage(from,{text:r},{quoted:m})
   }
 })
}

app.use(express.json())

// --- PAIR ARREGLADO - SIN DOBLE CODIGO ---
app.get('/pair', async(req,res)=>{
 try{
   let num=req.query.number?.replace(/[^0-9]/g,'');
   if(!num || num.length<8) return res.json({error:"numero invalido"})

   if(isGenerating) return res.json({error:"generando, espera"})
   const now=Date.now()

   // Si es el mismo numero y hace menos de 60s, devuelve el mismo codigo - NO GENERA OTRO
   if(lastNumber===num && lastCode && (now-lastCodeTime)<60000){
     return res.json({code:lastCode, wait: Math.ceil((60000-(now-lastCodeTime))/1000)})
   }
   // Si es diferente numero, espera 15s minimo
   if(lastCode && (now-lastCodeTime)<15000){
     return res.json({error:`espera ${Math.ceil((15000-(now-lastCodeTime))/1000)}s`})
   }

   isGenerating=true
   if(!sock){ await startBot(); await new Promise(r=>setTimeout(r,3000)) }

   lastNumber=num
   welcomeSent=false
   const code=await sock.requestPairingCode(num)
   lastCode=code
   lastCodeTime=Date.now()
   isGenerating=false
   console.log(`[ ${c('CODIGO')} ] ${num} => ${code}`)
   return res.json({code})
 }catch(e){
   isGenerating=false
   console.log(e)
   return res.json({error:"error, espera 20s y reintenta"})
 }
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
.log-line{color:#ff0000;font-size:10px;font-family:'JetBrains Mono';line-height:16px}
#mainContent{display:none;animation:fadeIn.5s forwards}
@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.card{background:rgba(0,0,0,.7);border:1px solid rgba(255,0,0,.35);border-radius:16px;padding:18px}
.label{font-size:11px;letter-spacing:3px;color:#ff0000;font-weight:900;margin-bottom:10px}
.input-wrap{background:linear-gradient(135deg,#ff0000,#cc0000);padding:2px;border-radius:12px;box-shadow:0 0 30px rgba(255,0,0,.6)}
.input-inner{display:flex;align-items:center;background:#0a0000;border-radius:10px;padding:16px}
input{flex:1;background:transparent;border:none;outline:none;color:#fff;font-size:18px;font-weight:900;text-align:center;font-family:'JetBrains Mono'}
.btn{width:100%;margin-top:14px;background:linear-gradient(135deg,#ff0000,#990000);padding:2px;border-radius:12px;border:none;cursor:pointer;box-shadow:0 0 40px rgba(255,0,0,.6);transition:opacity.3s}
.btn:disabled{opacity:.4;pointer-events:none}
.btn-inner{background:#000;color:#fff;border-radius:10px;padding:16px;font-weight:900;font-size:13px;letter-spacing:2px;text-align:center}
.codeBox{display:none;margin-top:14px;background:rgba(255,0,0,.12);border:2px solid #ff0000;border-radius:12px;padding:14px}
.code{font-size:32px;color:#fff;text-align:center;letter-spacing:10px;font-weight:900;text-shadow:0 0 20px #ff0000;font-family:'JetBrains Mono'}
.steps{margin-top:16px;background:#000;border:1px solid rgba(255,0,0,.3);border-radius:12px;padding:14px}
.steps-title{color:#ff0000;font-size:11px;letter-spacing:2px;font-weight:900;margin-bottom:10px;font-family:'JetBrains Mono'}
.step{display:flex;gap:10px;margin-bottom:8px}
.step-n{background:#ff0000;color:#000;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;flex-shrink:0}
.step-t{color:#ccc;font-size:11px;line-height:20px;font-family:'JetBrains Mono'}
.step-t b{color:#fff}
.api-box{margin-top:12px;background:rgba(255,0,0,.08);border:1px dashed rgba(255,0,0,.4);border-radius:10px;padding:10px}
.api-line{color:#ff0000;font-size:10px;font-family:'JetBrains Mono'}
.api-line span{color:#fff}
</style></head><body>
<div class="bg"></div><canvas id="c"></canvas>
<div id="loader"><div class="load-box"><div class="load-title">ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ</div><div class="load-sub">ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ</div><div class="bar-bg"><div class="bar-fill" id="bar"></div></div><div class="percent" id="percent">0%</div><div class="logs" id="logs"></div></div></div>
<div class="wrap" id="mainContent"><div class="box"><div class="header"><div class="title">ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ</div><div class="sub">ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ • ᴘʀᴇᴍɪᴜᴍ ᴀᴘɪs</div></div><div class="card"><div class="label">ᴠɪɴᴄᴜʟᴀᴄɪᴏɴ ᴘʀᴇᴍɪᴜᴍ</div><div class="input-wrap"><div class="input-inner"><input id="num" placeholder="51912345678"></div></div><button class="btn" id="btn" onclick="gen()"><div class="btn-inner" id="btnTxt">ɢᴇɴᴇʀᴀʀ ᴄᴏᴅɪɢᴏ</div></button><div class="codeBox" id="codeBox"><div class="code" id="codeText"></div><div id="waitMsg" style="text-align:center;color:#ff0000;font-size:10px;margin-top:8px;font-family:'JetBrains Mono'"></div></div><div class="api-box"><div class="api-line">[ ᴀᴘɪ ] <span>ɢᴘᴛ-4 ᴘʀᴇᴍɪᴜᴍ ᴀᴄᴛɪᴠᴀ ✓</span></div><div class="api-line">[ ᴀᴘɪ ] <span>ɢᴇᴍɪɴɪ ᴘʀᴏ ᴀᴄᴛɪᴠᴀ ✓</span></div><div class="api-line">[ ᴀᴘɪ ] <span>ᴘᴏʟʟɪɴᴀᴛɪᴏɴs ᴀᴄᴛɪᴠᴀ ✓</span></div><div class="api-line">[ ᴀᴘɪ ] <span>ᴍᴏᴅᴜʟᴏs ᴘʀᴇᴍɪᴜᴍ ✓</span></div></div></div><div class="steps"><div class="steps-title">ᴘᴀsᴏs ᴘᴀʀᴀ ᴠɪɴᴄᴜʟᴀʀ:</div><div class="step"><div class="step-n">1</div><div class="step-t"><b>ᴘᴏɴ ᴛᴜ ɴᴜᴍᴇʀᴏ</b> ᴄᴏɴ ᴄᴏᴅɪɢᴏ ᴅᴇ ᴘᴀɪs</div></div><div class="step"><div class="step-n">2</div><div class="step-t">ᴅᴀʟᴇ <b>ɢᴇɴᴇʀᴀʀ</b> ʏ ᴄᴏᴘɪᴀ ᴇʟ ᴄᴏᴅɪɢᴏ</div></div><div class="step"><div class="step-n">3</div><div class="step-t">ᴡʜᴀᴛsᴀᴘᴘ > <b>ᴅɪsᴘᴏsɪᴛɪᴠᴏs ᴠɪɴᴄᴜʟᴀᴅᴏs</b></div></div><div class="step"><div class="step-n">4</div><div class="step-t"><b>ᴠɪɴᴄᴜʟᴀʀ ᴄᴏɴ ɴᴜᴍᴇʀᴏ</b> ʏ ᴘᴇɢᴀ</div></div></div></div></div>
<script>
const c=document.getElementById('c'),x=c.getContext('2d');function rs(){c.width=innerWidth;c.height=innerHeight}rs();
let cols=Math.floor(innerWidth/10), drops=new Array(cols).fill(0);
function matrix(){x.fillStyle='rgba(0,0,0,0.12)';x.fillRect(0,0,c.width,c.height);x.font='16px monospace';drops.forEach((y,i)=>{x.fillStyle='#ff0000';x.fillText('0',i*10,y*10);if(y*10>c.height && Math.random()>.97) drops[i]=0;drops[i]++});requestAnimationFrame(matrix)}matrix();
const logsData=["[ sɪsᴛᴇᴍᴀ ] ɪɴɪᴄɪᴀɴᴅᴏ ᴍᴏᴅᴜʟᴏs...","[ sɪsᴛᴇᴍᴀ ] ᴄᴀʀɢᴀɴᴅᴏ ᴀᴘɪs ᴘʀᴇᴍɪᴜᴍ...","[ sɪsᴛᴇᴍᴀ ] ᴀᴘɪ ɢᴘᴛ-4 ✓","[ sɪsᴛᴇᴍᴀ ] ᴀᴘɪ ɢᴇᴍɪɴɪ ᴘʀᴏ ✓","[ sɪsᴛᴇᴍᴀ ] ᴀᴘɪ ᴘᴏʟʟɪɴᴀᴛɪᴏɴs ✓","[ sɪsᴛᴇᴍᴀ ] ᴄᴀʀɢᴀɴᴅᴏ ʙᴀɪʟᴇʏs...","[ sɪsᴛᴇᴍᴀ ] sᴇʀᴠɪᴅᴏʀ ᴏɴʟɪɴᴇ ✓","[ sɪsᴛᴇᴍᴀ ] ᴘʀᴇᴍɪᴜᴍ ʟɪsᴛᴏ ✓"];
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

// --- BOTON ARREGLADO - NO DOBLE CODIGO ---
let isGen=false
async function gen(){
 if(isGen) return
 const numEl=document.getElementById('num')
 const n=numEl.value.trim()
 if(!n){ numEl.focus(); return }
 isGen=true
 const b=document.getElementById('btn')
 const txt=document.getElementById('btnTxt')
 const box=document.getElementById('codeBox')
 const codeText=document.getElementById('codeText')
 const waitMsg=document.getElementById('waitMsg')
 b.disabled=true
 txt.innerText='ɢᴇɴᴇʀᴀɴᴅᴏ...'
 waitMsg.innerText=''
 try{
   const r=await fetch('/pair?number='+encodeURIComponent(n)).then(r=>r.json())
   if(r.error){
     txt.innerText=r.error
     setTimeout(()=>{ txt.innerText='ɢᴇɴᴇʀᴀʀ ᴄᴏᴅɪɢᴏ'; b.disabled=false; isGen=false },2000)
     return
   }
   codeText.innerText=r.code
   box.style.display='block'
   txt.innerText='ᴄᴏᴅɪɢᴏ: '+r.code
   if(r.wait) waitMsg.innerText='valido por '+r.wait+'s - mismo codigo'
   else waitMsg.innerText='copia este codigo - no generes otro'
   // Bloquea 30s para evitar spam
   let t=30
   let int=setInterval(()=>{
     t--
     waitMsg.innerText='espera '+t+'s para generar otro'
     if(t<=0){ clearInterval(int); b.disabled=false; isGen=false; txt.innerText='ɢᴇɴᴇʀᴀʀ ᴄᴏᴅɪɢᴏ'; waitMsg.innerText='' }
   },1000)
 }catch{
   txt.innerText='error - reintenta'
   b.disabled=false
   isGen=false
 }
}
</script></body></html>`)
})
app.listen(PORT, ()=>{
  console.log(`[ ${c('SISTEMA')} ] ${c('servidor premium online')}`)
  console.log(`[ ${c('SISTEMA')} ] ${c('apis premium activas')}`)
  startBot()
})