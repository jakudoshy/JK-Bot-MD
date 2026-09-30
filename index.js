const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const axios = require('axios')

const app = express()
const PORT = process.env.PORT || 3000
let sock=null, lastCode=null, lastCodeTime=0, pendingWelcome=false

// LETRA CHIQUITICA TIPO JAKUDOSHY - LA QUE TE GUSTA
function ch(t){
    const m={'a':'ᴀ','b':'ʙ','c':'ᴄ','d':'ᴅ','e':'ᴇ','f':'ғ','g':'ɢ','h':'ʜ','i':'ɪ','j':'ᴊ','k':'ᴋ','l':'ʟ','m':'ᴍ','n':'ɴ','o':'ᴏ','p':'ᴘ','q':'ǫ','r':'ʀ','s':'s','t':'ᴛ','u':'ᴜ','v':'ᴠ','w':'ᴡ','x':'x','y':'ʏ','z':'ᴢ','A':'ᴀ','B':'ʙ','C':'ᴄ','D':'ᴅ','E':'ᴇ','F':'ғ','G':'ɢ','H':'ʜ','I':'ɪ','J':'ᴊ','K':'ᴋ','L':'ʟ','M':'ᴍ','N':'ɴ','O':'ᴏ','P':'ᴘ','Q':'ǫ','R':'ʀ','S':'s','T':'ᴛ','U':'ᴜ','V':'ᴠ','W':'ᴡ','X':'x','Y':'ʏ','Z':'ᴢ'}
    return t.split('').map(c=>m[c]||c).join('')
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
    // BIENVENIDA CON LETRA CHIQUITICA - NO SE SOBRESALE
    const msg=`◤ ${ch('JAKUDOSHY')} ◥\n\n✦ ${ch('bienvenido')} ✦\n\n👑 ${ch('Owner')}: JAKUDOSHY\n📡 ${ch('Canal')}: gg_no_root\n\n${ch('Comandos')}:\n-.ia ${ch('pregunta')}\n-.ii ${ch('pregunta')}\n-.menu\n\n${ch('Ejemplo')}:\n-.ia ${ch('cuanto es 5+5')}\n\n✓ ${ch('Funciona en tu (Tu)')}`
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
        if(lower==='.menu'){ return await sock.sendMessage(from,{text:`◤ ${ch('JAKUDOSHY')} ◥\n-.ia ${ch('pregunta')}\n${ch('Ejemplo')}:.ia ${ch('cuanto es 5+5')}`}) }
        if(lower.startsWith('.ia')||lower.startsWith('.ii')||lower.startsWith('.la')){
            let q=txt.replace(/^\.(ia|ii|la)/i,'').trim(); if(!q) return; await sock.sendMessage(from,{react:{text:"✨",key:m.key}}); const r=await IA(q); await sock.sendMessage(from,{text:r})
        }
    })
}

app.use(express.json())
app.get('/pair', async(req,res)=>{
    try{ let num=req.query.number?.replace(/[^0-9]/g,''); if(!num) return res.json({error:"Número inválido"}); if(!sock){ await startBot(); await new Promise(r=>setTimeout(r,3000)) }
        const now=Date.now(); if(lastCode && (now-lastCodeTime)<12000) return res.json({code:lastCode}); pendingWelcome=true; const code=await sock.requestPairingCode(num); lastCode=code; lastCodeTime=Date.now(); return res.json({code}) }catch{ return res.json({error:"Espera 15 seg"}) }
})

app.get('/', (req,res)=>{
res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><title>JAKUDOSHY - LETRA CHIQUITICA + VISUAL PREMIUM</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@800;900&family=Share+Tech+Mono&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}body{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:12px;background:#000;font-family:'Share Tech Mono';overflow-x:hidden}
.bg{position:fixed;inset:0;background:radial-gradient(800px at 20% 10%, rgba(255,215,0,.35), transparent 60%), radial-gradient(700px at 80% 15%, rgba(255,0,255,.28), transparent 60%), radial-gradient(800px at 50% 90%, rgba(0,255,255,.2), transparent 60%), #000}
.grid{position:fixed;inset:0;background-image:linear-gradient(rgba(255,215,0,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,215,0,.08) 1px, transparent 1px);background-size:44px 44px}
canvas{position:fixed;inset:0;opacity:.3}
.tg{position:fixed;top:10px;right:10px;z-index:10;background:linear-gradient(135deg,#FFD700,#FFA500);padding:2px;border-radius:30px;text-decoration:none;box-shadow:0 0 25px #FFD700}
.tg span{display:block;background:#000;color:#FFD700;padding:7px 12px;border-radius:28px;font-size:10px;letter-spacing:2px;font-weight:900}
.wrap{position:relative;z-index:3;width:100%;max-width:410px}
.box{width:100%;background:linear-gradient(145deg, rgba(25,18,5,.96), rgba(12,8,0,.98));backdrop-filter:blur(20px);border-radius:26px;padding:22px;border:1px solid rgba(255,215,0,.45);box-shadow:0 0 60px rgba(255,215,0,.35), 0 0 100px rgba(255,0,255,.18), inset 0 1px 0 rgba(255,215,0,.4);overflow:hidden;position:relative}
.box::before{content:'';position:absolute;inset:0;border-radius:26px;padding:2px;background:linear-gradient(135deg,#FFD700,#FF00FF,#00FFFF,#FFD700);mask:linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);mask-composite:exclude;pointer-events:none;animation:hue 3s linear infinite}
@keyframes hue{to{filter:hue-rotate(360deg)}}
.line{font-size:10px;color:#FFD700;margin:5px 0;display:flex;gap:8px;align-items:center;text-shadow:0 0 8px #FFD700}
.dot{width:7px;height:7px;background:#FFD700;border-radius:50%;box-shadow:0 0 12px #FFD700}
.welcome{display:none;text-align:center}
.title{font-family:'Outfit';font-size:32px;font-weight:900;letter-spacing:5px;color:#fff;text-shadow:0 0 25px #FFD700, 0 0 50px #FFD700}
.sub{font-size:9px;letter-spacing:4px;color:#FFD700;margin-top:8px}
.badges{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-top:12px}
.badge{font-size:7px;padding:6px 10px;border-radius:20px;border:1px solid #FFD700;background:linear-gradient(135deg, rgba(255,215,0,.18), rgba(255,215,0,.05));color:#FFD700;box-shadow:0 0 15px rgba(255,215,0,.3)}
.main{display:none;margin-top:16px;width:100%}
.card{width:100%;background:linear-gradient(145deg, rgba(0,0,0,.6), rgba(20,15,0,.4));border:1px solid rgba(255,215,0,.3);border-radius:20px;padding:18px;box-shadow:inset 0 1px 0 rgba(255,215,0,.2), 0 15px 35px rgba(0,0,0,.5);overflow:hidden}
.ct{font-size:15px;letter-spacing:3px;color:#fff;font-weight:900;text-shadow:0 0 15px #FFD700;word-break:break-word}
.cs{font-size:8px;letter-spacing:3px;color:#FFD700;margin-top:4px}
.input-wrap{margin-top:16px;width:100%;background:linear-gradient(135deg,#FFD700,#FFA500,#FFD700);padding:2px;border-radius:14px;box-shadow:0 0 30px rgba(255,215,0,.5), inset 0 1px 0 rgba(255,255,255,.5);overflow:hidden}
.input-inner{display:flex;align-items:center;gap:10px;background:linear-gradient(145deg,#0a0800,#000);border-radius:12px;padding:14px 16px;width:100%;box-shadow:inset 0 2px 6px rgba(0,0,0,.8)}
input{flex:1;background:transparent;border:none;outline:none;color:#FFD700;font-family:'Share Tech Mono';font-size:15px;text-align:center;letter-spacing:2px;font-weight:700}
.btn{width:100%;margin-top:14px;position:relative;background:linear-gradient(135deg,#FFD700,#FFA500,#FFD700,#FF00FF);padding:2px;border-radius:14px;border:none;cursor:pointer;box-shadow:0 0 35px rgba(255,215,0,.6), 0 6px 18px rgba(0,0,0,.5);transition:.2s;overflow:hidden}
.btn::before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.45),transparent);transform:translateX(-100%);animation:shine 2s infinite}
@keyframes shine{100%{transform:translateX(100%)}}
.btn:hover{transform:translateY(-2px) scale(1.01);box-shadow:0 0 50px rgba(255,215,0,.8)}
.btn:active{transform:scale(.98)}
.btn-inner{background:linear-gradient(145deg,#000,#0a0800);color:#FFD700;border-radius:12px;padding:14px;font-weight:900;letter-spacing:3px;font-size:11px;font-family:'Outfit';text-shadow:0 0 15px #FFD700;box-shadow:inset 0 1px 0 rgba(255,215,0,.3);text-align:center}
.codeBox{display:none;margin-top:14px;width:100%;background:linear-gradient(135deg, rgba(255,215,0,.15), rgba(255,0,255,.1));border:1.5px solid #FFD700;border-radius:14px;padding:14px;box-shadow:0 0 30px rgba(255,215,0,.3)}
.code{font-size:28px;letter-spacing:10px;color:#fff;font-weight:900;text-align:center;text-shadow:0 0 20px #FFD700;word-break:break-all}
.tuto{margin-top:16px;background:linear-gradient(145deg, rgba(0,0,0,.5), rgba(20,15,0,.3));border:1px dashed rgba(255,215,0,.35);border-radius:14px;padding:14px}
.tuto h4{font-size:10px;color:#FFD700;letter-spacing:3px;margin-bottom:10px}
.tuto p{font-size:10px;color:#aa9a6a;line-height:18px;display:flex;gap:8px;margin:4px 0}
.tuto b{color:#FFD700}
.num{width:18px;min-width:18px;height:18px;background:linear-gradient(135deg,#FFD700,#FFA500);color:#000;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;box-shadow:0 0 12px #FFD700}
</style></head><body>
<div class="bg"></div><div class="grid"></div><canvas id="c"></canvas>
<a class="tg" href="https://t.me/gg_no_root" target="_blank"><span>💎 ᴊᴀᴋᴜᴅᴏsʜʏ • ᴄʜɪǫᴜɪᴛɪᴄᴀ 💎</span></a>
<div class="wrap"><div class="box"><div id="lines"></div>
<div class="welcome" id="welcome"><div class="title">JAKUDOSHY</div><div class="sub">ʟᴇᴛʀᴀ ᴄʜɪǫᴜɪᴛɪᴄᴀ + ᴠɪsᴜᴀʟ ᴘʀᴇᴍɪᴜᴍ</div><div class="badges"><div class="badge">✦ ᴄʜɪǫᴜɪᴛɪᴄᴀ</div><div class="badge">💎 ᴠɪsᴜᴀʟ ᴘʀᴇᴍɪᴜᴍ</div><div class="badge">⚡ ɪᴀ ғɪxᴇᴅ</div></div></div>
<div class="main" id="main"><div class="card">
<div class="ct">💎 ᴠɪɴᴄᴜʟᴀᴄɪᴏɴ</div>
<div class="cs">ʟᴇᴛʀᴀ ᴄʜɪǫᴜɪᴛɪᴄᴀ + ᴇsᴛɪʟᴏ ᴘʀᴇᴍɪᴜᴍ</div>
<div class="input-wrap"><div class="input-inner"><span style="color:#FFD700;font-weight:900">+</span><input id="num" placeholder="51912345678"></div></div>
<button class="btn" id="btn" onclick="gen()"><div class="btn-inner">💎 ɢᴇɴᴇʀᴀʀ ᴄᴏᴅɪɢᴏ 💎</div></button>
<div class="codeBox" id="codeBox"><div style="font-size:8px;color:#FFD700;letter-spacing:3px;text-align:center">✦ ᴄᴏᴅɪɢᴏ ✦</div><div class="code" id="codeText"></div></div>
<div class="tuto"><h4>🏆 ᴘᴀsᴏs</h4>
<p><span class="num">1</span><span><b>ɴᴜᴍᴇʀᴏ</b> - ${'${ch("con codigo pais")}'} </span></p>
<p><span class="num">2</span><span><b>ɢᴇɴᴇʀᴀʀ ᴄᴏᴅɪɢᴏ</b> - ${'${ch("boton premium 3d")}'} </span></p>
<p><span class="num">3</span><span><b>ᴠɪɴᴄᴜʟᴀʀ</b> - ${'${ch("en whatsapp")}'} </span></p>
<p><span class="num">4</span><span><b>.ia ${ch('cuanto es 5+5')} = 10</b></span></p>
</div></div></div></div></div>
<script>
const c=document.getElementById('c'),x=c.getContext('2d');function rs(){c.width=innerWidth;c.height=innerHeight}rs();addEventListener('resize',rs);
let cols=Math.floor(innerWidth/14), drops=new Array(cols).fill(0);
function matrix(){ x.fillStyle='rgba(0,0,0,0.09)'; x.fillRect(0,0,c.width,c.height); x.font='14px monospace'; drops.forEach((y,i)=>{ const ch=['💎','✦'][i%2]; x.fillStyle=['#FFD700','#FF00FF','#00FFFF'][i%3]; x.fillText(ch,i*14,y*14); if(y*14>c.height && Math.random()>.975) drops[i]=0; drops[i]++ }); requestAnimationFrame(matrix) } matrix();
const msgs=["> ${ch('letra chiquitica jakudoshy')}...","> ${ch('visual premium activado')}...","> ${ch('botones premium 3d')}...","> ${ch('sistema listo')}..."];
const el=document.getElementById('lines'); let idx=0; function next(){ if(idx<msgs.length){ const d=document.createElement('div'); d.className='line'; d.innerHTML='<div class=dot></div>'+msgs[idx]; el.appendChild(d); idx++; setTimeout(next,350)} else{ setTimeout(()=>{el.style.display='none';document.getElementById('welcome').style.display='block';setTimeout(()=>{document.getElementById('welcome').style.display='none';document.getElementById('main').style.display='block'},900)},400)}} next();
async function gen(){ const n=document.getElementById('num').value.trim(); if(!n) return alert('Pon numero'); const b=document.getElementById('btn'); b.querySelector('.btn-inner').innerText='💎 ${ch('generando')}...'; b.disabled=true; try{ const r=await fetch('/pair?number='+encodeURIComponent(n)).then(r=>r.json()); if(r.error){alert(r.error); b.querySelector('.btn-inner').innerText='💎 ${ch('generar codigo')} 💎'; b.disabled=false; return;} document.getElementById('codeText').innerText=r.code; document.getElementById('codeBox').style.display='block'; b.querySelector('.btn-inner').innerText='💎 '+r.code+' 💎' }catch{ b.querySelector('.btn-inner').innerText='💎 ${ch('generar codigo')} 💎'; b.disabled=false } }
</script></body></html>`)
})
app.listen(PORT, ()=>{ console.log('V125 LETRA CHIQUITICA + VISUAL PREMIUM'); startBot() })