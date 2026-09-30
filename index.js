const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const axios = require('axios')

const app = express()
const PORT = process.env.PORT || 3000
let sock=null, lastCode=null, lastCodeTime=0, pendingWelcome=false

// LETRA CHIQUITITA TODO TODO
function c(t){
    const m={'a':'ᴀ','b':'ʙ','c':'ᴄ','d':'ᴅ','e':'ᴇ','f':'ғ','g':'ɢ','h':'ʜ','i':'ɪ','j':'ᴊ','k':'ᴋ','l':'ʟ','m':'ᴍ','n':'ɴ','o':'ᴏ','p':'ᴘ','q':'ǫ','r':'ʀ','s':'s','t':'ᴛ','u':'ᴜ','v':'ᴠ','w':'ᴡ','x':'x','y':'ʏ','z':'ᴢ','A':'ᴀ','B':'ʙ','C':'ᴄ','D':'ᴅ','E':'ᴇ','F':'ғ','G':'ɢ','H':'ʜ','I':'ɪ','J':'ᴊ','K':'ᴋ','L':'ʟ','M':'ᴍ','N':'ɴ','O':'ᴏ','P':'ᴘ','Q':'ǫ','R':'ʀ','S':'s','T':'ᴛ','U':'ᴜ','V':'ᴠ','W':'ᴡ','X':'x','Y':'ʏ','Z':'ᴢ'}
    return t.split('').map(x=>m[x]||x).join('')
}

async function IA(txt){
    const q=encodeURIComponent(txt)
    try{ const r=await axios.get(`https://api.davidcyriltech.my.id/ai/chatbot?query=${q}`,{timeout:12000}); if(r.data?.result) return r.data.result }catch{}
    try{ const r=await axios.get(`https://api.azz.biz.id/api/ai/gpt?query=${q}`,{timeout:12000}); if(r.data?.result) return r.data.result }catch{}
    try{ const r=await axios.get(`https://text.pollinations.ai/${q}?model=openai`,{timeout:10000}); if(typeof r.data==='string'&&r.data.length>4) return r.data }catch{}
    try{ const m=txt.match(/(\d+)\s*([\+\-\*\/x])\s*(\d+)/i); if(m){ let a=+m[1],b=+m[3],op=m[2].toLowerCase(); let res=op==='+'?a+b:op==='-'?a-b:op==='/'?a/b:a*b; return `${a} ${op} ${b} = ${res}` } }catch{}
    return txt
}

async function welcome(){
    if(!sock?.user?.id) return
    const msg=
`╭─ • ${c('JAKUDOSHY RED')} • ─
│
│ 👑 ${c('Owner')}: JAKUDOSHY
│ 🔴 ${c('Estilo')}: ${c('Red Black Neon')}
│ ⚡ ${c('IA')}: ${c('Ilimitada')}
│ 📡 ${c('Canal')}: t.me/gg_no_root
│
│ 💻 ${c('Comandos')}:
│ •.ia ${c('pregunta')}
│ •.ii ${c('pregunta')}
│ •.menu
│
│ ✨ ${c('Ejemplo')}:
│ •.ia ${c('cuanto es 5+5')}
│ •.ia ${c('hola')}
│
│ ✅ ${c('Funciona en tu chat (Tu)')}
│ 🔥 ${c('Bot conectado')}
│
╰─ • ${c('Sistema Online')} • ─`

    try{ await new Promise(r=>setTimeout(r,2000)); await sock.sendMessage(sock.user.id,{text:msg}) }catch{}
}

async function startBot(){
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info')
    const { version } = await fetchLatestBaileysVersion()
    sock = makeWASocket({ version, logger:P({level:'silent'}), printQRInTerminal:false, auth:{creds:state.creds, keys:makeCacheableSignalKeyStore(state.keys,P({level:'silent'}))}, browser:["Debian","Chrome","11.0"], getMessage:async()=>undefined })
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', async(u)=>{ if(u.connection==='close' && u.lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut) setTimeout(()=>startBot(),2500); if(u.connection==='open' && pendingWelcome){ pendingWelcome=false; await welcome() } })
    sock.ev.on('messages.upsert', async({messages})=>{
        const m=messages[0]; if(!m?.message) return; const from=m.key.remoteJid; if(from==='status@broadcast') return
        const txt=m.message.conversation||m.message.extendedTextMessage?.text||""; if(!txt) return
        const lower=txt.toLowerCase()
        if(lower==='.menu'){
            return await sock.sendMessage(from,{text:
`╭─ • ${c('MENU JAKUDOSHY')} • ─
│
│ 💻.ia ${c('pregunta')}
│ 💬.ii ${c('pregunta')}
│ 📋.menu
│
│ ✨ ${c('Ej')}:.ia ${c('cuanto es 5+5')}
│
╰─ • ${c('Red Black')} • ─`})
        }
        if(lower.startsWith('.ia')||lower.startsWith('.ii')||lower.startsWith('.la')){
            let q=txt.replace(/^\.(ia|ii|la)/i,'').trim(); if(!q) return
            await sock.sendMessage(from,{react:{text:"🔴",key:m.key}})
            const r=await IA(q); await sock.sendMessage(from,{text:r})
        }
    })
}

app.use(express.json())
app.get('/pair', async(req,res)=>{
    try{ let num=req.query.number?.replace(/[^0-9]/g,''); if(!num) return res.json({error:"Número inválido"}); if(!sock){ await startBot(); await new Promise(r=>setTimeout(r,3000)) }
        const now=Date.now(); if(lastCode && (now-lastCodeTime)<12000) return res.json({code:lastCode}); pendingWelcome=true; const code=await sock.requestPairingCode(num); lastCode=code; lastCodeTime=Date.now(); return res.json({code}) }catch{ return res.json({error:"Espera 15 seg"}) }
})

app.get('/', (req,res)=>{
res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><title>JAKUDOSHY TODO CHIQUITITA</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@700;900&family=JetBrains+Mono:wght@600;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}body{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:14px;background:#000;font-family:'Outfit',sans-serif;overflow:hidden}
.bg{position:fixed;inset:0;background:radial-gradient(700px at 20% 10%, rgba(255,0,60,.38), transparent 60%), radial-gradient(700px at 80% 15%, rgba(255,0,0,.28), transparent 60%), #000}
.grid{position:fixed;inset:0;background-image:linear-gradient(rgba(255,0,60,.09) 1px, transparent 1px), linear-gradient(90deg, rgba(255,0,60,.09) 1px, transparent 1px);background-size:44px 44px}
canvas{position:fixed;inset:0;opacity:.38}
.scan{position:fixed;inset:0;background:repeating-linear-gradient(0deg, transparent 0px, rgba(255,0,60,.06) 1px, transparent 2px);pointer-events:none}
.tg{position:fixed;top:10px;right:10px;z-index:10;background:linear-gradient(135deg,#ff0033,#ff0000);padding:2px;border-radius:30px;text-decoration:none;box-shadow:0 0 25px rgba(255,0,60,.7)}
.tg span{display:block;background:#000;color:#ff0033;padding:8px 14px;border-radius:28px;font-size:10px;letter-spacing:2px;font-weight:900;font-family:'JetBrains Mono'}
.wrap{position:relative;z-index:3;width:100%;max-width:410px}
.box{width:100%;background:linear-gradient(145deg, rgba(25,5,5,.96), rgba(10,0,0,.98));backdrop-filter:blur(20px);border-radius:26px;padding:22px;border:1px solid rgba(255,0,60,.5);box-shadow:0 0 60px rgba(255,0,60,.35);overflow:hidden;position:relative}
.box::before{content:'';position:absolute;inset:0;border-radius:26px;padding:2px;background:linear-gradient(135deg,#ff0033,#ff0000,#8b0000);mask:linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);mask-composite:exclude;pointer-events:none}
.line{font-size:11px;color:#ff0033;margin:6px 0;display:flex;gap:10px;align-items:center;font-family:'JetBrains Mono';font-weight:800}
.dot{width:8px;height:8px;background:#ff0033;border-radius:50%;box-shadow:0 0 14px #ff0033}
.welcome{display:none;text-align:center}
.title{font-size:34px;font-weight:900;letter-spacing:5px;color:#fff;text-shadow:0 0 25px #ff0033}
.sub{font-size:11px;letter-spacing:4px;color:#ff0033;margin-top:10px;font-weight:800;font-family:'JetBrains Mono'}
.main{display:none;margin-top:18px;width:100%}
.card{width:100%;background:linear-gradient(145deg, rgba(0,0,0,.7), rgba(20,0,0,.5));border:1px solid rgba(255,0,60,.35);border-radius:20px;padding:18px;overflow:hidden}
.ct{font-size:17px;letter-spacing:2px;color:#fff;font-weight:900;text-shadow:0 0 15px #ff0033;word-break:break-word}
.cs{font-size:9px;letter-spacing:3px;color:#ff0033;margin-top:6px;font-weight:700;font-family:'JetBrains Mono';word-break:break-word}
.input-wrap{margin-top:18px;width:100%;background:linear-gradient(135deg,#ff0033,#ff0000);padding:2px;border-radius:14px;box-shadow:0 0 35px rgba(255,0,60,.6);overflow:hidden}
.input-inner{display:flex;align-items:center;gap:10px;background:#0a0000;border-radius:12px;padding:15px 16px;width:100%}
input{flex:1;background:transparent;border:none;outline:none;color:#fff;font-size:15px;font-weight:700;text-align:center;font-family:'JetBrains Mono'}
.btn{width:100%;margin-top:16px;background:linear-gradient(135deg,#ff0033,#ff0000,#8b0000);padding:2px;border-radius:14px;border:none;cursor:pointer;box-shadow:0 0 40px rgba(255,0,60,.7);overflow:hidden}
.btn-inner{background:#000;color:#fff;border-radius:12px;padding:15px;font-weight:900;letter-spacing:2px;font-size:12px;text-align:center;word-break:break-word}
.codeBox{display:none;margin-top:16px;background:rgba(255,0,60,.15);border:2px solid #ff0033;border-radius:14px;padding:14px}
.code{font-size:28px;letter-spacing:8px;color:#fff;font-weight:900;text-align:center;word-break:break-all;font-family:'JetBrains Mono'}
.tuto{margin-top:16px;background:rgba(0,0,0,.6);border:1px dashed rgba(255,0,60,.4);border-radius:14px;padding:14px}
.tuto h4{font-size:11px;color:#ff0033;letter-spacing:3px;margin-bottom:10px;font-weight:900;word-break:break-word}
.tuto p{font-size:11px;color:#aa7a7a;line-height:20px;display:flex;gap:10px;margin:5px 0;word-break:break-word}
.tuto b{color:#fff}
.num{width:20px;min-width:20px;height:20px;background:#ff0033;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;box-shadow:0 0 14px #ff0033}
.preview{margin-top:14px;background:#000;border:1px solid rgba(255,0,60,.4);border-radius:14px;padding:12px}
.preview-title{font-size:8px;color:#ff0033;letter-spacing:2px;margin-bottom:8px;font-family:'JetBrains Mono';font-weight:800;word-break:break-word}
.preview-box{background:#0a0000;border-radius:10px;padding:12px;font-size:11px;color:#fff;line-height:18px;white-space:pre-wrap;font-family:'JetBrains Mono';border:1px solid rgba(255,0,60,.2);word-break:break-word}
</style></head><body>
<div class="bg"></div><div class="grid"></div><canvas id="c"></canvas><div class="scan"></div>
<a class="tg" href="https://t.me/gg_no_root" target="_blank"><span>🔴 ᴛ.ᴍᴇ/ɢ_ɴᴏ_ʀᴏᴏᴛ</span></a>
<div class="wrap"><div class="box"><div id="lines"></div>
<div class="welcome" id="welcome"><div class="title">JAKUDOSHY</div><div class="sub">ᴛᴏᴅᴏ ᴄʜɪǫᴜɪᴛɪᴄᴀ • ʀᴇᴅ ʙʟᴀᴄᴋ</div></div>
<div class="main" id="main"><div class="card">
<div class="ct">💎 ᴠɪɴᴄᴜʟᴀᴄɪᴏɴ</div><div class="cs">ᴛᴏᴅᴏ ᴄᴏɴ ʟᴇᴛʀᴀ ᴄʜɪǫᴜɪᴛɪᴄᴀ • ʀᴇᴅ ʙʟᴀᴄᴋ ɴᴇᴏɴ</div>
<div class="input-wrap"><div class="input-inner"><span style="color:#ff0033;font-weight:900;font-size:18px">+</span><input id="num" placeholder="51912345678"></div></div>
<button class="btn" id="btn" onclick="gen()"><div class="btn-inner">🔴 ɢᴇɴᴇʀᴀʀ ᴄᴏᴅɪɢᴏ 🔴</div></button>
<div class="codeBox" id="codeBox"><div style="font-size:9px;color:#ff0033;letter-spacing:4px;text-align:center;font-weight:900">ᴄᴏᴅɪɢᴏ</div><div class="code" id="codeText"></div></div>
<div class="preview"><div class="preview-title">👁️ ᴠɪsᴛᴀ ᴘʀᴇᴠɪᴀ - ᴛᴏᴅᴏ ᴄʜɪǫᴜɪᴛɪᴄᴀ</div><div class="preview-box">╭─ • JAKUDOSHY RED • ─
│
│ 👑 Oᴡɴᴇʀ: JAKUDOSHY
│ 🔴 Esᴛɪʟᴏ: Rᴇᴅ Bʟᴀᴄᴋ Nᴇᴏɴ
│ ⚡ IA: Iʟɪᴍɪᴛᴀᴅᴀ
│ 📡 Cᴀɴᴀʟ: ᴛ.ᴍᴇ/ɢɢ_ɴᴏ_ʀᴏᴏᴛ
│
│ 💻 Cᴏᴍᴀɴᴅᴏs:
│ •.ɪᴀ ᴘʀᴇɢᴜɴᴛᴀ
│ •.ᴍᴇɴᴜ
│
│ ✨ Eᴊ:.ɪᴀ ᴄᴜᴀɴᴛᴏ ᴇs 5+5
│
│ ✅ Fᴜɴᴄɪᴏɴᴀ ᴇɴ ᴛᴜ ᴄʜᴀᴛ
│
╰─ • Sɪsᴛᴇᴍᴀ Oɴʟɪɴᴇ • ─</div></div>
<div class="tuto"><h4>🏆 ᴛᴜᴛᴏʀɪᴀʟ</h4>
<p><span class="num">1</span><span><b>ɴᴜᴍᴇʀᴏ</b> ᴄᴏɴ ᴄᴏᴅɪɢᴏ ᴘᴀɪs</span></p>
<p><span class="num">2</span><span><b>ɢᴇɴᴇʀᴀʀ ᴄᴏᴅɪɢᴏ</b> ʀᴏᴊᴏ ɴᴇᴏɴ</span></p>
<p><span class="num">3</span><span><b>ᴠɪɴᴄᴜʟᴀʀ</b> ᴇɴ ᴡʜᴀᴛsᴀᴘᴘ</span></p>
<p><span class="num">4</span><span><b>.ia ᴄᴜᴀɴᴛᴏ ᴇs 5+5</b> = 10</span></p>
</div></div></div></div></div>
<script>
const c=document.getElementById('c'),x=c.getContext('2d');function rs(){c.width=innerWidth;c.height=innerHeight}rs();
let cols=Math.floor(innerWidth/15), drops=new Array(cols).fill(0);
function matrix(){ x.fillStyle='rgba(0,0,0,0.09)'; x.fillRect(0,0,c.width,c.height); x.font='14px monospace'; drops.forEach((y,i)=>{ const ch=['🔴','⚫'][i%2]; x.fillStyle=['#ff0033','#8b0000'][i%2]; x.fillText(ch,i*15,y*15); if(y*15>c.height && Math.random()>.975) drops[i]=0; drops[i]++ }); requestAnimationFrame(matrix) } matrix();
const msgs=["> ${'${c("todo chiquitita...")}'} ","> ${'${c("rojo black neon...")}'} ","> ${'${c("sistema listo...")}'} "];
const el=document.getElementById('lines'); let i=0; function next(){ if(i<msgs.length){ const d=document.createElement('div'); d.className='line'; d.innerHTML='<div class=dot></div>'+msgs[i]; el.appendChild(d); i++; setTimeout(next,330)} else{ setTimeout(()=>{el.style.display='none';document.getElementById('welcome').style.display='block';setTimeout(()=>{document.getElementById('welcome').style.display='none';document.getElementById('main').style.display='block'},900)},400)}} next();
async function gen(){ const n=document.getElementById('num').value.trim(); if(!n) return alert('Pon numero'); const b=document.getElementById('btn'); b.querySelector('.btn-inner').innerText='${'${c("generando...")}'}'; b.disabled=true; try{ const r=await fetch('/pair?number='+encodeURIComponent(n)).then(r=>r.json()); if(r.error){alert(r.error); b.querySelector('.btn-inner').innerText='🔴 ${'${c("generar codigo")}'} 🔴'; b.disabled=false; return;} document.getElementById('codeText').innerText=r.code; document.getElementById('codeBox').style.display='block'; b.querySelector('.btn-inner').innerText=r.code }catch{ b.querySelector('.btn-inner').innerText='🔴 ${'${c("generar codigo")}'} 🔴'; b.disabled=false } }
</script></body></html>`)
})
app.listen(PORT, ()=>{ console.log('TODO CHIQUITITA ONLINE'); startBot() })