const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const fs = require('fs')

const app = express()
const PORT = process.env.PORT || 3000
let sock = null
let lastCode = "--------"
let status = "INICIANDO..."

const BOT_NAME = "ᴊᴋ_ʙᴏᴛ"
const BOT_BY = "ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ"

async function startBot(){
    try{
        const { state, saveCreds } = await useMultiFileAuthState('./auth_info')
        const { version } = await fetchLatestBaileysVersion()
        sock = makeWASocket({
            version,
            logger: P({ level: 'silent' }),
            printQRInTerminal: false,
            auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })) },
            browser: ["Ubuntu", "Chrome", "20.0.04"],
            syncFullHistory: false,
            markOnlineOnConnect: false
        })
        sock.ev.on('creds.update', saveCreds)
        sock.ev.on('connection.update', async (u)=>{
            const { connection, lastDisconnect } = u
            if(connection === 'close'){
                const reason = lastDisconnect?.error?.output?.statusCode
                status = "DESCONECTADO"
                if(reason!== DisconnectReason.loggedOut) setTimeout(()=>startBot(), 3000)
                else { try{fs.rmSync('./auth_info',{recursive:true,force:true})}catch{}; setTimeout(()=>startBot(),2000) }
            }
            if(connection === 'open'){
                status = "CONECTADO"
                console.log('CONECTADO')
                try{
                    await sock.sendMessage(sock.user.id, { 
                        text: `ᴊᴋ_ʙᴏᴛ ᴄᴏɴᴇᴄᴛᴀᴅᴏ\n${BOT_BY}\n\nᴅᴇᴠɪᴄᴇ: ᴜʙᴜɴᴛᴜ 20.04\nᴇɴɢɪɴᴇ: ʀᴇᴀʟ ᴄᴏᴅᴇ ᴠ5\nғʟᴏᴡ: ʟɪɴᴜx x ʜᴀᴄᴋᴇʀ\n\nᴇѕᴄʀɪʙᴇ .ᴍᴇɴᴜ` 
                    })
                }catch{}
            }
        })
        sock.ev.on('messages.upsert', async ({ messages })=>{
            try{
                const m = messages[0]
                if(!m.message || m.key.fromMe) return
                const text = (m.message.conversation || m.message.extendedTextMessage?.text || "").toLowerCase().trim()
                const from = m.key.remoteJid
                if(text === '.menu'){
                    await sock.sendMessage(from, { text: `ᴊᴋ_ʙᴏᴛ ᴍᴇɴᴜ\n${BOT_BY}\n\n.ᴘɪɴɢ - ᴇѕᴛᴀᴅᴏ\n.ᴇѕᴛᴀᴅᴏ - ɪɴғᴏ\n.ᴏᴡɴᴇʀ - ᴄʀᴇᴀᴅᴏʀ\n.ʜᴇʟᴘ - ᴀʏᴜᴅᴀ` })
                }
                if(text === '.ping'){
                    await sock.sendMessage(from, { text: `ᴘᴏɴɢ ${BOT_NAME} ᴀᴄᴛɪᴠᴏ` })
                }
                if(text === '.estado'){
                    await sock.sendMessage(from, { text: `ᴇѕᴛᴀᴅᴏ: ${status}\nᴅᴇᴠɪᴄᴇ: ᴜʙᴜɴᴛᴜ\n${BOT_BY}` })
                }
            }catch{}
        })
        status = "ᴇѕᴘᴇʀᴀɴᴅᴏ ɴᴜᴍᴇʀᴏ"
    }catch(e){ status = "ᴇʀᴏʀ: "+e.message; setTimeout(()=>startBot(),5000) }
}

app.use(express.json())

// V5 INTACTO NO SE TOCA
app.get('/pair', async(req,res)=>{
    try{
        let num = req.query.number?.replace(/[^0-9]/g,'')
        if(!num || num.length < 8) return res.json({error:"Pon número con código país Ej: 51912345678"})
        if(!sock){ return res.json({error:"Bot iniciando, espera 5 segundos y reintenta"}) }
        if(fs.existsSync('./auth_info/creds.json')){
            try{
                const data = fs.readFileSync('./auth_info/creds.json','utf8')
                const c = JSON.parse(data)
                if(c.registered){
                    try{ fs.rmSync('./auth_info',{recursive:true, force:true}) }catch{}
                    await new Promise(r=>setTimeout(r,1000))
                    await startBot()
                    await new Promise(r=>setTimeout(r,3000))
                }
            }catch{}
        }
        const code = await sock.requestPairingCode(num)
        lastCode = code
        status = "CODIGO: "+code
        return res.json({code})
    }catch(e){ console.log('Error pair:', e); return res.json({error: e.message}) }
})

app.get('/status', (req,res)=> res.json({status, code:lastCode}))

app.get('/', (req,res)=>{
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>${BOT_NAME}</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}
body{margin:0;background:#050608;color:#c7d1db;font-family:'Space Grotesk',sans-serif;overflow-x:hidden}
.bg{position:fixed;inset:0;background:radial-gradient(900px at 50% -10%, #0f1d14 0%, #050608 65%);z-index:0}
#term{position:fixed;inset:0;background:#040505;z-index:20;display:flex;flex-direction:column;padding:14px;font-family:'JetBrains Mono',monospace;transition:.8s}
.term-head{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #111}
.dot{width:12px;height:12px;border-radius:50%}.r{background:#ff5f56}.y{background:#ffbd2e}.g{background:#27c93f}
.term-body{flex:1;overflow:hidden;padding:14px 0;font-size:12px;line-height:16px;color:#7a8a8a}
.line{margin:4px 0;opacity:0;transform:translateY(4px);animation:in .3s forwards}
@keyframes in{to{opacity:1;transform:none}}
.cmd{color:#c7d1db}.ok{color:#00ff88}.warn{color:#ffbd2e}.info{color:#5aa9ff}
.bar{height:2px;background:#111;margin-top:auto;overflow:hidden}
.fill{height:100%;width:0%;background:linear-gradient(90deg,#00ff88,#5aa9ff);transition:.3s}
.main{position:relative;z-index:1;display:none;min-height:100vh;padding:18px;align-items:center;flex-direction:column}
.card{width:100%;max-width:420px;background:linear-gradient(180deg, #11141a 0%, #0c0e13 100%);border:1px solid #1b232f;border-radius:20px;padding:20px;box-shadow:0 20px 50px rgba(0,0,0,.6)}
.title{font-size:28px;font-weight:700;letter-spacing:1px;text-align:center;color:#fff}
.title span{color:#00ff88}
.sub{text-align:center;font-size:10px;letter-spacing:4px;color:#4a5a6a;margin-top:6px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:18px 0}
.box{background:#080a0e;border:1px solid #151c27;border-radius:12px;padding:11px}
.box label{font-size:9px;letter-spacing:2px;color:#3d4a5a;display:block;margin-bottom:3px}
.box b{font-size:12px;color:#d0d8e2;font-weight:500}
.input-wrap{display:flex;align-items:center;gap:10px;background:#080a0e;border:1px solid #1b2636;border-radius:12px;padding:8px 14px;margin-top:14px;transition:.2s}
.input-wrap:focus-within{border-color:#00ff88;box-shadow:0 0 0 3px rgba(0,255,136,.08)}
input{flex:1;background:transparent;border:none;color:#fff;outline:none;font-family:'JetBrains Mono',monospace;font-size:14px}
.btn{width:100%;margin-top:12px;background:#e8e8e8;color:#000;border:none;padding:13px;border-radius:12px;font-weight:700;letter-spacing:.5px;cursor:pointer;transition:.2s}
.btn:hover{background:#fff;transform:translateY(-1px)}
.btn2{width:100%;margin-top:10px;background:transparent;border:1px solid #1e2a3a;color:#7a8a9a;padding:11px;border-radius:12px;font-size:11px;letter-spacing:2px;cursor:pointer}
.btn2:hover{border-color:#00ff88;color:#00ff88}
.codebox{display:none;margin-top:16px;background:#070a0a;border:1px solid #00ff88;border-radius:14px;padding:16px;text-align:center}
.code{font-family:'JetBrains Mono',monospace;font-size:32px;font-weight:700;letter-spacing:10px;color:#fff}
.channel{position:fixed;right:14px;bottom:14px;z-index:10;background:#0f1218;border:1px solid #1e2a3a;border-radius:30px;padding:8px 14px;display:flex;align-items:center;gap:8px;box-shadow:0 8px 24px rgba(0,0,0,.5);text-decoration:none;transition:.2s}
.channel:hover{border-color:#5aa9ff;transform:translateY(-2px)}
.channel-dot{width:8px;height:8px;background:#5aa9ff;border-radius:50%;box-shadow:0 0 8px #5aa9ff;animation:pulse 2s infinite}
@keyframes pulse{0%{opacity:1}50%{opacity:.4}100%{opacity:1}}
.info-section{width:100%;max-width:420px;margin:18px 0 90px}
.sec{background:#0c0e13;border:1px solid #151c27;border-radius:14px;padding:14px;margin-top:12px}
.sec h4{margin:0 0 8px;font-size:11px;letter-spacing:3px;color:#5a6a7a}
.sec p{margin:0;font-size:12px;line-height:18px;color:#7a8a9a}
.sec b{color:#c7d1db}
</style></head><body><div class="bg"></div>

<div id="term">
<div class="term-head"><div class="dot r"></div><div class="dot y"></div><div class="dot g"></div><div style="margin-left:10px;font-size:11px;color:#4a5a6a;letter-spacing:2px">ᴊᴋ_ʙᴏᴛ@ᴜʙᴜɴᴛᴜ:~</div></div>
<div class="term-body" id="log"></div>
<div class="bar"><div class="fill" id="fill"></div></div>
</div>

<a href="https://whatsapp.com/channel/0029Va..." target="_blank" class="channel">
<div class="channel-dot"></div>
<div style="font-size:11px;color:#c7d1db;font-weight:600;letter-spacing:1px">ᴄᴀɴᴀʟ ᴊᴋ</div>
<div style="font-size:10px;color:#5aa9ff">↗</div>
</a>

<div class="main" id="main">
<div class="card">
<div class="title">ᴊᴋ_ʙᴏᴛ<span> ꫂꤪꤨᴼᶠᶜ</span></div>
<div class="sub">${BOT_BY}</div>

<div class="grid">
<div class="box"><label>ᴅᴇᴠɪᴄᴇ</label><b>ᴜʙᴜɴᴛᴜ 20.04</b></div>
<div class="box"><label>ᴇɴɢɪɴᴇ</label><b>ʀᴇᴀʟ ᴄᴏᴅᴇ ᴠ5</b></div>
<div class="box"><label>ѕᴛᴀᴛᴜѕ</label><b style="color:#00ff88">● ᴏɴʟɪɴᴇ</b></div>
<div class="box"><label>ᴍᴏᴅᴇ</label><b>ʟɪɴᴜx x ʜᴀᴄᴋᴇʀ</b></div>
</div>

<div class="input-wrap"><span style="color:#4a5a6a;font-family:'JetBrains Mono',monospace">+</span><input id="num" placeholder="51912345678"><span style="color:#00ff88;font-size:10px">●</span></div>
<button class="btn" onclick="getCode()">ɢᴇɴᴇʀᴀʀ ᴄᴏᴅɪɢᴏ ʀᴇᴀʟ</button>
<button class="btn2" onclick="getCode()">ѕʏѕᴛᴇᴍ.ʀᴇǫᴜᴇѕᴛ_ᴘᴀɪʀɪɴɢ()</button>

<div class="codebox" id="box">
<div style="font-size:9px;letter-spacing:3px;color:#00ff88">ᴛᴜ ᴄᴏᴅɪɢᴏ ʀᴇᴀʟ</div>
<div class="code" id="code">--------</div>
<div id="st" style="font-size:11px;color:#6a7a8a;margin-top:6px;font-family:'JetBrains Mono',monospace">ᴘᴇɢᴀ ᴇɴ ᴡʜᴀᴛѕᴀᴘᴘ > ᴅɪѕᴘᴏѕɪᴛɪᴠᴏѕ</div>
</div>
</div>

<div class="info-section">
<div class="sec">
<h4>ɪɴғᴏ ᴅᴇʟ ʙᴏᴛ</h4>
<p><b>${BOT_NAME}</b> ᴇѕ ᴜɴ ѕɪѕᴛᴇᴍᴀ ᴄᴏɴ ᴍᴜᴄʜᴏ ғʟᴏᴡ, ᴛᴇʀᴍɪɴᴀʟ ʟɪɴᴜx ʀᴇᴀʟ, ᴀɴᴛɪ ᴄʀᴀѕʜ ɪɴᴛᴇɢʀᴀᴅᴏ ʏ ᴄᴏᴅɪɢᴏ ʀᴇᴀʟ ᴅᴇ ʙᴀɪʟᴇʏѕ.<br><br>
<b>ᴅᴍ ᴀᴜᴛᴏ</b> ᴄᴜᴀɴᴅᴏ ᴠɪɴᴄᴜʟᴀѕ ᴛᴇ ʟᴇɢᴀ ʙɪᴇɴᴠᴇɴɪᴅᴀ ᴀᴜᴛᴏᴍᴀᴛɪᴄᴀ.<br>
<b>ғᴜɴᴄɪᴏɴᴀᴍɪᴇɴᴛᴏ</b> ᴄᴏᴍᴘʟᴇᴛᴏ ᴇɴ ᴡʜᴀᴛѕᴀᴘᴘ ᴄᴏɴ .ᴍᴇɴᴜ .ᴘɪɴɢ .ᴇѕᴛᴀᴅᴏ</p>
</div>

<div class="sec">
<h4>ᴄᴏᴍᴏ ᴜѕᴀʀ</h4>
<p>1. ᴘᴏɴ ᴛᴜ ɴᴜᴍᴇʀᴏ ᴄᴏɴ ᴄᴏᴅɪɢᴏ ᴅᴇ ᴘᴀɪѕ<br>
2. ɢᴇɴᴇʀᴀ ᴇʟ ᴄᴏᴅɪɢᴏ<br>
3. ᴄᴏᴘɪᴀ ᴇʟ ᴄᴏᴅɪɢᴏ ᴛɪᴘᴏ ABCD-EFGH<br>
4. ᴘᴇɢᴀʟᴏ ᴇɴ ᴡʜᴀᴛѕᴀᴘᴘ ʀᴀᴘɪᴅᴏ<br><br>
ɴᴏ ʜᴀɢᴀѕ ѕᴘᴀᴍ ᴏ ᴛᴇ ʙʟᴏǫᴜᴇᴀ 5 ᴍɪɴᴜᴛᴏѕ</p>
</div>

<div class="sec">
<h4>ѕʏѕᴛᴇᴍ ѕᴘᴇᴄѕ</h4>
<p><b>ʙᴀѕᴇ:</b> @whiskeysockets/baileys 6.7.18<br>
<b>ʟᴀɴɢ:</b> ɴᴏᴅᴇᴊѕ 20<br>
<b>ᴜᴘᴛɪᴍᴇ:</b> 24/7<br>
<b>ᴍᴏᴅ:</b> ${BOT_BY}<br>
<b>2026 - ʜᴇᴄʜᴏ ᴘᴀʀᴀ ᴘʀᴏʙᴀʀ</b></p>
</div>
</div>
</div>

<script>
const logs=[
 "<span class='cmd'>ᴊᴋ_ʙᴏᴛ@ᴜʙᴜɴᴛᴜ:~$</span> ./start.sh --flow",
 "<span class='info'>[ᴋᴇʀɴᴇʟ]</span> ʟᴏᴀᴅɪɴɢ ᴜʙᴜɴᴛᴜ 20.04...",
 "<span class='ok'>[ᴏᴋ]</span> ᴅᴇᴠɪᴄᴇ ᴠᴇʀɪғɪᴇᴅ: ᴜʙᴜɴᴛᴜ",
 "<span class='ok'>[ᴏᴋ]</span> ᴍᴏᴅ ${BOT_BY}",
 "<span class='info'>[ɴᴇᴛ]</span> ᴄʜᴇᴄᴋɪɴɢ ʙᴀɪʟᴇʏѕ ᴇɴɢɪɴᴇ...",
 "<span class='ok'>[ᴏᴋ]</span> ʀᴇᴀʟ ᴄᴏᴅᴇ ᴇɴɢɪɴᴇ ᴀᴄᴛɪᴠᴇ",
 "<span class='info'>[ѕᴇᴄ]</span> ᴀɴᴛɪ-ᴄʀᴀѕʜ ᴇɴᴀʙʟᴇᴅ",
 "<span class='info'>[ᴅᴍ]</span> ᴀᴜᴛᴏ ᴅᴍ ѕʏѕᴛᴇᴍ ʀᴇᴀᴅʏ",
 "<span class='info'>[ᴡᴀ]</span> ᴡʜᴀᴛѕᴀᴘᴘ ʙᴏᴛ ʜᴀɴᴅʟᴇʀ ʀᴇᴀᴅʏ",
 "<span class='warn'>[ᴡᴀɪᴛ]</span> ᴇѕᴘᴇʀᴀɴᴅᴏ ɴᴜᴍᴇʀᴏ...",
 "<span class='ok'>[100%]</span> ѕʏѕᴛᴇᴍ ʀᴇᴀᴅʏ - ${BOT_NAME}"
];
const logEl=document.getElementById('log'),fill=document.getElementById('fill');let i=0;
function boot(){
 if(i<logs.length){
  const d=document.createElement('div');d.className='line';d.innerHTML=logs[i];logEl.appendChild(d);setTimeout(()=>d.style.opacity=1,10);
  logEl.scrollTop=9999;fill.style.width=Math.floor((i+1)/logs.length*100)+"%";
  i++; setTimeout(boot,280);
 }else{ setTimeout(()=>{document.getElementById('term').style.opacity="0";setTimeout(()=>{document.getElementById('term').style.display="none";document.getElementById('main').style.display="flex"},700)},600)}
}
boot();
async function getCode(){
 const n=document.getElementById('num').value.trim();if(!n) return alert('ᴘᴏɴ ɴᴜᴍᴇʀᴏ');
 document.getElementById('st').innerText='ɢᴇɴᴇʀᴀɴᴅᴏ ᴄᴏᴅɪɢᴏ ʀᴇᴀʟ...';
 const r=await fetch('/pair?number='+encodeURIComponent(n)).then(r=>r.json());
 if(r.error){alert(r.error);document.getElementById('st').innerText=r.error;return}
 document.getElementById('box').style.display='block';
 document.getElementById('code').innerText=r.code;
 document.getElementById('st').innerText='ᴄᴏᴅɪɢᴏ: '+r.code+' - ᴘᴇɢᴀ ʏᴀ';
}
</script></body></html>`)
})

process.on('uncaughtException', e=>console.log('uncaught',e.message))
process.on('unhandledRejection', e=>console.log('unhandled',e.message))
app.listen(PORT, ()=>{ console.log('Servidor en '+PORT); startBot() })