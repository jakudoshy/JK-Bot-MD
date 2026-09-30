const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const axios = require('axios')

function c(t){
 const m={'a':'ᴀ','b':'ʙ','c':'ᴄ','d':'ᴅ','e':'ᴇ','f':'ғ','g':'ɢ','h':'ʜ','i':'ɪ','j':'ᴊ','k':'ᴋ','l':'ʟ','m':'ᴍ','n':'ɴ','o':'ᴏ','p':'ᴘ','q':'ǫ','r':'ʀ','s':'s','t':'ᴛ','u':'ᴜ','v':'ᴠ','w':'ᴡ','x':'x','y':'ʏ','z':'ᴢ'}
 return t.split('').map(x=>m[x]||x).join('')
}

const app = express()
const PORT = process.env.PORT || 3000
let sock=null, lastCode=null, lastNumber=null, lastCodeTime=0, isGenerating=false, welcomeSent=false

// IA AUTOMATICA - RESPONDE AL SEGUNDO - 100% INTERNET
async function IA(txt){
 try{
   const r = await axios.get(`https://text.pollinations.ai/${encodeURIComponent(txt)}`,{timeout:7000})
   if(r.data && typeof r.data==='string' && r.data.length>2) return r.data.trim()
 }catch{}
 try{
   const r = await axios.get(`https://text.pollinations.ai/${encodeURIComponent(txt)}?model=openai`,{timeout:7000})
   if(r.data && typeof r.data==='string') return r.data.trim()
 }catch{}
 return `Hola bro: ${txt} - estoy online 🔴`
}

async function welcome(){
 if(!sock?.user?.id || welcomeSent) return
 welcomeSent=true
 try{ await new Promise(r=>setTimeout(r,1000)); await sock.sendMessage(sock.user.id,{text:`╭─ • ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ • ─\n│ ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏ\n│ ${c('ia automatica activa')}\n│.ia ${c('pregunta')}\n╰─ • ${c('online')} • ─`}) }catch{}
}

async function startBot(){
 const { state, saveCreds } = await useMultiFileAuthState('./auth_info')
 const { version } = await fetchLatestBaileysVersion()
 sock = makeWASocket({ version, logger:P({level:'silent'}), printQRInTerminal:false, auth:{creds:state.creds, keys:makeCacheableSignalKeyStore(state.keys,P({level:'silent'}))}, browser:["Chrome","120"], getMessage:async()=>undefined })
 sock.ev.on('creds.update', saveCreds)
 sock.ev.on('connection.update', async(u)=>{
   if(u.connection==='close' && u.lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut) setTimeout(()=>startBot(),3000)
   if(u.connection==='open' && lastNumber) await welcome()
 })
 sock.ev.on('messages.upsert', async({messages})=>{
   const m=messages[0]; if(!m?.message || m.key.fromMe) return
   const from=m.key.remoteJid; if(from==='status@broadcast') return
   const txt=m.message.conversation||m.message.extendedTextMessage?.text||""; if(!txt) return
   const low=txt.toLowerCase().trim()
   if(low.startsWith('.ia')||low.startsWith('.bot')||low.startsWith('.gpt')||low.startsWith('.ai')||low.startsWith('ia ')){
     let q=txt.replace(/^\.(ia|bot|gpt|ai)/i,'').replace(/^ia/i,'').trim(); if(!q) q="hola"
     try{ await sock.sendMessage(from,{react:{text:"⚡",key:m.key}}) }catch{}
     const r=await IA(q); await sock.sendMessage(from,{text:r},{quoted:m})
   }
 })
}

app.use(express.json())
app.get('/pair', async(req,res)=>{
 try{
   let num=req.query.number?.replace(/[^0-9]/g,''); if(!num) return res.json({error:"numero"})
   if(isGenerating) return res.json({error:"espera"})
   const now=Date.now()
   if(lastNumber===num && lastCode && (now-lastCodeTime)<60000) return res.json({code:lastCode})
   if(lastCode && (now-lastCodeTime)<15000) return res.json({error:"espera 15s"})
   isGenerating=true; if(!sock){ await startBot(); await new Promise(r=>setTimeout(r,2500)) }
   lastNumber=num; welcomeSent=false; const code=await sock.requestPairingCode(num); lastCode=code; lastCodeTime=Date.now(); isGenerating=false; return res.json({code})
 }catch{ isGenerating=false; return res.json({error:"espera 20s"}) }
})

app.get('/', (req,res)=>{ res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JK BOT</title><link href="https://fonts.googleapis.com/css2?family=Outfit:wght@900&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#000;font-family:'Outfit';overflow:hidden}.bg{position:fixed;inset:0;background:radial-gradient(800px at 20% 10%, rgba(255,0,0,.35), transparent 60%), #000}canvas{position:fixed;inset:0;opacity:.3}.wrap{position:relative;z-index:3;width:100%;max-width:520px;padding:16px}.box{width:100%;background:linear-gradient(145deg, rgba(20,0,0,.98), rgba(0,0,0,.99));border-radius:24px;padding:22px;border:2px solid #ff0000;box-shadow:0 0 80px rgba(255,0,0,.5)}.header{text-align:center;padding:10px 0 16px;border-bottom:1px solid rgba(255,0,0,.3);margin-bottom:16px}.title{font-size:32px;font-weight:900;letter-spacing:3px;color:#fff;text-shadow:0 0 20px #ff0000}.sub{font-size:12px;letter-spacing:2px;color:#ff0000;margin-top:6px;font-weight:900}#loader{position:fixed;inset:0;z-index:99;background:#000;display:flex;align-items:center;justify-content:center;flex-direction:column}.load-box{width:90%;max-width:420px;background:linear-gradient(145deg, rgba(20,0,0,.98), rgba(0,0,0,.99));border:2px solid #ff0000;border-radius:20px;padding:28px;box-shadow:0 0 80px rgba(255,0,0,.6);text-align:center}.load-title{font-size:26px;color:#fff;letter-spacing:3px;font-weight:900;text-shadow:0 0 20px #ff0000}.load-sub{font-size:11px;color:#ff0000;letter-spacing:2px;margin-top:8px;font-family:'JetBrains Mono'}.bar-bg{margin-top:22px;background:#111;border:1px solid rgba(255,0,0,.4);border-radius:100px;height:16px;overflow:hidden}.bar-fill{height:100%;width:0%;background:linear-gradient(90deg,#ff0000,#ff4444);box-shadow:0 0 20px #ff0000;transition:width.1s linear}.percent{margin-top:16px;font-size:42px;font-weight:900;color:#fff;letter-spacing:4px;text-shadow:0 0 20px #ff0000;font-family:'JetBrains Mono'}.logs{margin-top:18px;text-align:left;background:#000;border:1px solid rgba(255,0,0,.25);border-radius:10px;padding:10px;height:110px;overflow:hidden}.log-line{color:#ff0000;font-size:10px;font-family:'JetBrains Mono';line-height:16px}#mainContent{display:none}.card{background:rgba(0,0,0,.7);border:1px solid rgba(255,0,0,.35);border-radius:16px;padding:18px}.label{font-size:11px;letter-spacing:3px;color:#ff0000;font-weight:900;margin-bottom:10px}.input-wrap{background:linear-gradient(135deg,#ff0000,#cc0000);padding:2px;border-radius:12px;box-shadow:0 0 30px rgba(255,0,0,.6)}.input-inner{display:flex;align-items:center;background:#0a0000;border-radius:10px;padding:16px}input{flex:1;background:transparent;border:none;outline:none;color:#fff;font-size:18px;font-weight:900;text-align:center;font-family:'JetBrains Mono'}.btn{width:100%;margin-top:14px;background:linear-gradient(135deg,#ff0000,#990000);padding:2px;border-radius:12px;border:none;cursor:pointer;box-shadow:0 0 40px rgba(255,0,0,.6)}.btn:disabled{opacity:.4}.btn-inner{background:#000;color:#fff;border-radius:10px;padding:16px;font-weight:900;font-size:13px;letter-spacing:2px;text-align:center}.codeBox{display:none;margin-top:14px;background:rgba(255,0,0,.12);border:2px solid #ff0000;border-radius:12px;padding:14px}.code{font-size:32px;color:#fff;text-align:center;letter-spacing:10px;font-weight:900;text-shadow:0 0 20px #ff0000;font-family:'JetBrains Mono'}</style></head><body><div class="bg"></div><canvas id="c"></canvas><div id="loader"><div class="load-box"><div class="load-title">ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ</div><div class="load-sub">ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏ</div><div class="bar-bg"><div class="bar-fill" id="bar"></div></div><div class="percent" id="percent">0%</div><div class="logs" id="logs"></div></div></div><div class="wrap" id="mainContent"><div class="box"><div class="header"><div class="title">ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ</div><div class="sub">ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏ • ᴀᴜᴛᴏ ɪᴀ</div></div><div class="card"><div class="label">ᴠɪɴᴄᴜʟᴀᴄɪᴏɴ</div><div class="input-wrap"><div class="input-inner"><input id="num" placeholder="535..."></div></div><button class="btn" id="btn" onclick="gen()"><div class="btn-inner" id="btnTxt">ɢᴇɴᴇʀᴀʀ ᴄᴏᴅɪɢᴏ</div></button><div class="codeBox" id="codeBox"><div class="code" id="codeText"></div></div></div></div></div><script>const c=document.getElementById('c'),x=c.getContext('2d');function rs(){c.width=innerWidth;c.height=innerHeight}rs();let cols=Math.floor(innerWidth/10),drops=new Array(cols).fill(0);function matrix(){x.fillStyle='rgba(0,0,0,0.12)';x.fillRect(0,0,c.width,c.height);x.font='16px monospace';drops.forEach((y,i)=>{x.fillStyle='#ff0000';x.fillText('0',i*10,y*10);if(y*10>c.height&&Math.random()>.97)drops[i]=0;drops[i]++});requestAnimationFrame(matrix)}matrix();const logsData=["[ sɪsᴛᴇᴍᴀ ] ɪɴɪᴄɪᴀɴᴅᴏ...","[ sɪsᴛᴇᴍᴀ ] ɪᴀ ᴀᴜᴛᴏᴍᴀᴛɪᴄᴀ ✓","[ sɪsᴛᴇᴍᴀ ] ᴘᴏʟʟɪɴᴀᴛɪᴏɴs ✓","[ sɪsᴛᴇᴍᴀ ] sᴇʀᴠɪᴅᴏʀ ᴏɴʟɪɴᴇ ✓"];let pct=0;const bar=document.getElementById('bar'),perc=document.getElementById('percent'),logs=document.getElementById('logs'),loader=document.getElementById('loader'),main=document.getElementById('mainContent');function addLog(i){const d=document.createElement('div');d.className='log-line';d.innerHTML=logsData[i];logs.appendChild(d);}let logIdx=0;addLog(0);let inter=setInterval(()=>{pct+=Math.random()*5+2;if(pct>100)pct=100;bar.style.width=pct+'%';perc.innerText=Math.floor(pct)+'%';if(pct>30&&logIdx==0){logIdx=1;addLog(1)}if(pct>60&&logIdx==1){logIdx=2;addLog(2)}if(pct>90&&logIdx==2){logIdx=3;addLog(3)}if(pct>=100){clearInterval(inter);setTimeout(()=>{loader.style.display='none';main.style.display='block'},500)}},40);let isGen=false;async function gen(){if(isGen)return;const n=document.getElementById('num').value.trim();if(!n)return;isGen=true;const b=document.getElementById('btn');const t=document.getElementById('btnTxt');b.disabled=true;t.innerText='ɢᴇɴᴇʀᴀɴᴅᴏ...';try{const r=await fetch('/pair?number='+encodeURIComponent(n)).then(r=>r.json());if(r.error){t.innerText=r.error;setTimeout(()=>{t.innerText='ɢᴇɴᴇʀᴀʀ ᴄᴏᴅɪɢᴏ';b.disabled=false;isGen=false},2000);return}document.getElementById('codeText').innerText=r.code;document.getElementById('codeBox').style.display='block';t.innerText=r.code;setTimeout(()=>{b.disabled=false;isGen=false},30000)}catch{t.innerText='error';b.disabled=false;isGen=false}}</script></body></html>`)})
app.listen(PORT, ()=>{ console.log(`[ ${c('SISTEMA')} ] online`); startBot() })