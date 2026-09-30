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
console.log(`[ ${c('SISTEMA')} ] ${c('modulos cargados')}`)

async function IA(txt){
 const q=encodeURIComponent(txt)
 try{ const r=await axios.get(`https://api.davidcyriltech.my.id/ai/chatbot?query=${q}`,{timeout:12000}); if(r.data?.result) return r.data.result }catch{}
 try{ const r=await axios.get(`https://text.pollinations.ai/${q}?model=openai`,{timeout:10000}); if(typeof r.data==='string'&&r.data.length>4) return r.data }catch{}
 try{ const m2=txt.match(/(\d+)\s*([\+\-\*\/x])\s*(\d+)/i); if(m2){ let a=+m2[1],b=+m2[3],op=m2[2]; let res=op==='+'?a+b:op==='-'?a-b:op==='/'?a/b:a*b; return `${a} ${op} ${b} = ${res}` } }catch{}
 return txt
}

async function welcome(){
 if(!sock?.user?.id) return
 const msg=`╭─ • ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ • ─\n│ ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ\n│ ${c('gg_no_root')}\n│.ia ${c('pregunta')}\n╰─ • ${c('online')} • ─`
 try{ await new Promise(r=>setTimeout(r,1500)); await sock.sendMessage(sock.user.id,{text:msg}); console.log(`[ ${c('SISTEMA')} ] ${c('bienvenida enviada')}`) }catch{}
}

async function startBot(){
 console.log(`[ ${c('SISTEMA')} ] ${c('iniciando baileys...')}`)
 const { state, saveCreds } = await useMultiFileAuthState('./auth_info')
 const { version } = await fetchLatestBaileysVersion()
 sock = makeWASocket({ version, logger:P({level:'silent'}), printQRInTerminal:false, auth:{creds:state.creds, keys:makeCacheableSignalKeyStore(state.keys,P({level:'silent'}))}, browser:["Debian","Chrome","11.0"], getMessage:async()=>undefined })
 console.log(`[ ${c('SISTEMA')} ] ${c('baileys iniciado')}`)
 sock.ev.on('creds.update', saveCreds)
 sock.ev.on('connection.update', async(u)=>{
   if(u.connection==='close' && u.lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut){ console.log(`[ ${c('SISTEMA')} ] ${c('reconectando...')}`); setTimeout(()=>startBot(),2500) }
   if(u.connection==='open'){ console.log(`[ ${c('SISTEMA')} ] ${c('conectado correctamente')}`); if(pendingWelcome){ pendingWelcome=false; await welcome() } }
 })
 sock.ev.on('messages.upsert', async({messages})=>{
   const m=messages[0]; if(!m?.message) return; const from=m.key.remoteJid; if(from==='status@broadcast') return
   const txt=m.message.conversation||m.message.extendedTextMessage?.text||""; if(!txt) return
   if(txt.toLowerCase()==='.menu'){ return await sock.sendMessage(from,{text:`╭─ • ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ • ─\n│.ia ${c('pregunta')}\n╰─ • ${c('online')} • ─`}) }
   if(txt.toLowerCase().startsWith('.ia')){
     let q=txt.replace(/^\.ia/i,'').trim(); if(!q) return
     const r=await IA(q); await sock.sendMessage(from,{text:r})
   }
 })
}

app.use(express.json())
app.get('/pair', async(req,res)=>{
 try{
   let num=req.query.number?.replace(/[^0-9]/g,''); if(!num) return res.json({error:"error"})
   if(!sock){ await startBot(); await new Promise(r=>setTimeout(r,3000)) }
   const now=Date.now(); if(lastCode && (now-lastCodeTime)<12000) return res.json({code:lastCode})
   console.log(`[ ${c('SISTEMA')} ] ${c('generando codigo para')} ${num}`)
   pendingWelcome=true; const code=await sock.requestPairingCode(num); lastCode=code; lastCodeTime=Date.now(); console.log(`[ ${c('SISTEMA')} ] ${c('codigo')}: ${code}`); return res.json({code})
 }catch{ return res.json({error:"espera"}) }
})

app.get('/', (req,res)=>{
res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JK BOT</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@900&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}body{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px;background:#000;font-family:'Outfit'}
.bg{position:fixed;inset:0;background:radial-gradient(800px at 20% 10%, rgba(255,0,0,.35), transparent 60%), #000}
canvas{position:fixed;inset:0;opacity:.3}
.wrap{position:relative;z-index:3;width:100%;max-width:520px}
.box{width:100%;background:linear-gradient(145deg, rgba(20,0,0,.98), rgba(0,0,0,.99));border-radius:24px;padding:22px;border:2px solid #ff0000;box-shadow:0 0 80px rgba(255,0,0,.5)}
.header{text-align:center;padding:10px 0 16px;border-bottom:1px solid rgba(255,0,0,.3);margin-bottom:16px}
.title{font-size:34px;font-weight:900;letter-spacing:3px;color:#fff;text-shadow:0 0 20px #ff0000}
.sub{font-size:13px;letter-spacing:2px;color:#ff0000;margin-top:6px;font-weight:900}
.terminal{background:#000;border:1px solid rgba(255,0,0,.4);border-radius:12px;padding:12px;margin-bottom:16px;font-family:'JetBrains Mono'}
.term-line{color:#ff0000;font-size:11px;line-height:18px;letter-spacing:1px}
.term-line span{color:#fff}
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
.step-t{color:#ccc;font-size:12px;line-height:20px;font-family:'JetBrains Mono'}
.step-t b{color:#fff}
</style></head><body>
<div class="bg"></div><canvas id="c"></canvas>
<div class="wrap"><div class="box">
<div class="header"><div class="title">ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ</div><div class="sub">ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ • ʀᴇᴅ ʙʟᴀᴄᴋ</div></div>

<div class="terminal">
<div class="term-line">[ sɪsᴛᴇᴍᴀ ] <span>ɪɴɪᴄɪᴀɴᴅᴏ ᴍᴏᴅᴜʟᴏs...</span></div>
<div class="term-line">[ sɪsᴛᴇᴍᴀ ] <span>ɪɴɪᴄɪᴀɴᴅᴏ sᴇʀᴠɪᴅᴏʀ...</span></div>
<div class="term-line">[ sɪsᴛᴇᴍᴀ ] <span>ᴄᴀʀɢᴀɴᴅᴏ ʙᴀɪʟᴇʏs...</span></div>
<div class="term-line">[ sɪsᴛᴇᴍᴀ ] <span>sᴇʀᴠɪᴅᴏʀ ᴏɴʟɪɴᴇ - ʟɪsᴛᴏ</span></div>
</div>

<div class="card">
<div class="label">ᴠɪɴᴄᴜʟᴀᴄɪᴏɴ</div>
<div class="input-wrap"><div class="input-inner"><input id="num" placeholder="51912345678"></div></div>
<button class="btn" id="btn" onclick="gen()"><div class="btn-inner" id="btnTxt">ɢᴇɴᴇʀᴀʀ ᴄᴏᴅɪɢᴏ</div></button>
<div class="codeBox" id="codeBox"><div class="code" id="codeText"></div></div>
</div>

<div class="steps">
<div class="steps-title">ᴘᴀsᴏs ᴘᴀʀᴀ ᴠɪɴᴄᴜʟᴀʀ:</div>
<div class="step"><div class="step-n">1</div><div class="step-t"><b>ᴘᴏɴ ᴛᴜ ɴᴜᴍᴇʀᴏ ᴀʀʀɪʙᴀ</b> ᴄᴏɴ ᴄᴏᴅɪɢᴏ ᴅᴇ ᴘᴀɪs</div></div>
<div class="step"><div class="step-n">2</div><div class="step-t">ᴅᴀʟᴇ <b>ɢᴇɴᴇʀᴀʀ ᴄᴏᴅɪɢᴏ</b> ʏ ᴄᴏᴘɪᴀ</div></div>
<div class="step"><div class="step-n">3</div><div class="step-t">ᴀʙʀᴇ <b>ᴡʜᴀᴛsᴀᴘᴘ > ᴅɪsᴘᴏsɪᴛɪᴠᴏs</b></div></div>
<div class="step"><div class="step-n">4</div><div class="step-t"><b>ᴠɪɴᴄᴜʟᴀʀ ᴄᴏɴ ɴᴜᴍᴇʀᴏ</b> ʏ ᴘᴇɢᴀ ᴇʟ ᴄᴏᴅɪɢᴏ</div></div>
</div>

</div></div>
<script>
const c=document.getElementById('c'),x=c.getContext('2d');function rs(){c.width=innerWidth;c.height=innerHeight}rs();
let cols=Math.floor(innerWidth/10), drops=new Array(cols).fill(0);
function matrix(){x.fillStyle='rgba(0,0,0,0.12)';x.fillRect(0,0,c.width,c.height);x.font='16px monospace';drops.forEach((y,i)=>{x.fillStyle='#ff0000';x.fillText('0',i*10,y*10);if(y*10>c.height && Math.random()>.97) drops[i]=0;drops[i]++});requestAnimationFrame(matrix)}matrix();
async function gen(){const n=document.getElementById('num').value.trim();if(!n) return;const b=document.getElementById('btn');document.getElementById('btnTxt').innerText='ɢᴇɴᴇʀᴀɴᴅᴏ...';b.disabled=true;try{const r=await fetch('/pair?number='+encodeURIComponent(n)).then(r=>r.json());if(r.error){document.getElementById('btnTxt').innerText='ɢᴇɴᴇʀᴀʀ ᴄᴏᴅɪɢᴏ';b.disabled=false;return;}document.getElementById('codeText').innerText=r.code;document.getElementById('codeBox').style.display='block';document.getElementById('btnTxt').innerText=r.code}catch{document.getElementById('btnTxt').innerText='ɢᴇɴᴇʀᴀʀ ᴄᴏᴅɪɢᴏ';b.disabled=false}}
</script></body></html>`)
})
app.listen(PORT, ()=>{
  console.log(`[ ${c('SISTEMA')} ] ${c('servidor online')}`)
  console.log(`[ ${c('SISTEMA')} ] ${c('puerto')}: ${PORT}`)
  console.log(`[ ${c('SISTEMA')} ] ${c('listo para vincular')}`)
  startBot()
})