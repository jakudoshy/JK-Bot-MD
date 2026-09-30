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
const BOT_BY = "ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏ 👑"
const CHANNEL = "https://t.me/gg_no_root"

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
                const r = lastDisconnect?.error?.output?.statusCode
                if(r!==DisconnectReason.loggedOut) setTimeout(()=>startBot(),3000)
                else{ try{fs.rmSync('./auth_info',{recursive:true,force:true})}catch{}; setTimeout(()=>startBot(),2000) }
            }
            if(connection === 'open'){
                status="CONECTADO"
                try{
                    // BIENVENIDA AUTOMATICA BACAN AL DM
                    const welcome = 
`┏━━━━━━━━━━━━━━━━━━┓
  ${BOT_NAME} 👑
  ${BOT_BY}
┗━━━━━━━━━━━━━━━━━━┛

ʙɪᴇɴᴠᴇɴɪᴅᴏ ᴀ ${BOT_NAME}

ᴛᴜ ʙᴏᴛ ʏᴀ ᴇѕᴛᴀ ᴀᴄᴛɪᴠᴏ ᴄᴏɴ ᴍᴜᴄʜᴏ ғʟᴏᴡ

┌─ ᴅᴀᴛᴏѕ
│ ᴄᴀɴᴀʟ: t.me/gg_no_root
│ ᴇѕᴛᴀᴅᴏ: ᴀᴄᴛɪᴠᴏ
│ ᴠᴇʀѕɪᴏɴ: ᴠ19 ғʟᴏᴡ
└────────

ѕᴇʟᴇᴄᴄɪᴏɴᴀ ᴜɴ ᴄᴏᴍᴀɴᴅᴏ:

> .ᴍᴇɴᴜ - ᴍᴇɴᴜ ᴄᴏᴍᴘʟᴇᴛᴏ
> .ᴘɪɴɢ - ᴠᴇʟᴏᴄɪᴅᴀᴅ
> .ᴀʏᴜᴅᴀ - ᴀʏᴜᴅᴀ
> .ᴄʀᴇᴀᴅᴏʀ - ɪɴғᴏ ᴄʀᴇᴀᴅᴏʀ

ᴇѕᴄʀɪʙᴇ .ᴍᴇɴᴜ ᴘᴀʀᴀ ᴇᴍᴘᴇᴢᴀʀ
`
                    await sock.sendMessage(sock.user.id, { text: welcome })
                }catch{}
            }
        })
        sock.ev.on('messages.upsert', async ({ messages })=>{
            try{
                const m = messages[0]
                if(!m.message || m.key.fromMe) return
                const text = (m.message.conversation || m.message.extendedTextMessage?.text || "").toLowerCase().trim()
                const from = m.key.remoteJid

                if(text==='.menu'){
                    const menu = 
`┏━ ${BOT_NAME} ᴍᴇɴᴜ ━┓
│ 👑 ${BOT_BY}
┗━━━━━━━━━━━━┛

┌─ ѕᴇʟᴇᴄᴄɪᴏɴᴀ:
│ 1. .ᴘɪɴɢ
│ 2. .ᴇѕᴛᴀᴅᴏ
│ 3. .ᴄʀᴇᴀᴅᴏʀ
│ 4. .ᴀʏᴜᴅᴀ
└────────

ᴛᴏᴄᴀ ᴜɴ ᴄᴏᴍᴀɴᴅᴏ ᴀʀʀɪʙᴀ 👆
`
                    await sock.sendMessage(from, { text: menu })
                }
                if(text==='.ping') await sock.sendMessage(from, { text: `ᴘᴏɴɢ\n${BOT_NAME} ᴀᴄᴛɪᴠᴏ 👑\n${BOT_BY}` })
                if(text==='.estado') await sock.sendMessage(from, { text: `ᴇѕᴛᴀᴅᴏ: ${status}\n${BOT_BY}\nᴄᴀɴᴀʟ: t.me/gg_no_root` })
                if(text==='.creador' || text==='.owner') await sock.sendMessage(from, { text: `👑 ᴄʀᴇᴀᴅᴏʀ\n${BOT_BY}\nᴊᴋ_ʙᴏᴛ ᴇѕᴛᴀ ʜᴇᴄʜᴏ ᴄᴏɴ ғʟᴏᴡ\nᴄᴀɴᴀʟ: t.me/gg_no_root` })
                if(text==='.ayuda') await sock.sendMessage(from, { text: `ᴀʏᴜᴅᴀ ${BOT_NAME}\n\nᴇѕᴄʀɪʙᴇ .ᴍᴇɴᴜ ʏ ѕᴇʟᴇᴄᴄɪᴏɴᴀ ʟᴏ ǫᴜᴇ ǫᴜɪᴇʀᴇѕ\n\n${BOT_BY}` })
            }catch{}
        })
        status="ʟɪѕᴛᴏ"
    }catch{ setTimeout(()=>startBot(),5000) }
}

app.use(express.json())

// V5 INTACTO
app.get('/pair', async(req,res)=>{
    try{
        let num = req.query.number?.replace(/[^0-9]/g,'')
        if(!num || num.length < 8) return res.json({error:"Pon número con código país Ej: 51912345678"})
        if(!sock) return res.json({error:"Bot iniciando, espera 5 segundos y reintenta"})
        if(fs.existsSync('./auth_info/creds.json')){
            try{
                const c = JSON.parse(fs.readFileSync('./auth_info/creds.json','utf8'))
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
        return res.json({code})
    }catch(e){ return res.json({error:e.message}) }
})

app.get('/', (req,res)=>{
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>${BOT_NAME}</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}body{margin:0;background:#05070a;color:#c7d1db;font-family:'Space Grotesk',sans-serif;overflow-x:hidden}
.bg{position:fixed;inset:0;background:radial-gradient(700px at 50% 0%, #0a1a0f 0%, #05070a 70%);z-index:0}
#term{position:fixed;inset:0;background:#040507;z-index:20;display:flex;flex-direction:column;padding:16px;font-family:'JetBrains Mono',monospace}
.thead{display:flex;align-items:center;gap:8px;border-bottom:1px solid #111;padding-bottom:10px}
.dot{width:10px;height:10px;border-radius:50%}.r{background:#ff5f56}.y{background:#ffbd2e}.g{background:#00ff88}
.tbody{flex:1;padding:16px 0;font-size:11px;line-height:17px;color:#5a6a7a}
.line{margin:5px 0}.w{color:#e8e8e8}.gr{color:#00ff88}.bl{color:#2aabee}.rd{color:#ff3b3b}
.bar{height:3px;background:#111;border-radius:10px;overflow:hidden;margin-top:auto}.fill{height:100%;width:0%;background:#00ff88;box-shadow:0 0 10px #00ff88;transition:.15s}
.pct{font-size:11px;color:#4a5a6a;text-align:right;margin-top:8px;letter-spacing:2px}
.main{position:relative;z-index:1;display:none;min-height:100vh;padding:18px;align-items:center;flex-direction:column}
.card{width:100%;max-width:420px;background:linear-gradient(180deg,#12151e 0%,#0a0c10 100%);border:1px solid #1a202d;border-radius:24px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.6)}
.title{text-align:center;font-size:30px;font-weight:800;color:#fff;letter-spacing:1px}
.title span{color:#00ff88}
.crown{text-align:center;font-size:20px;margin-bottom:4px}
.sub{text-align:center;font-size:10px;letter-spacing:4px;color:#4a5a6a;margin-top:4px}
.input{margin-top:20px;display:flex;align-items:center;gap:10px;background:#080a0e;border:1.5px solid #1a242f;border-radius:14px;padding:10px 16px;transition:.2s}
.input:focus-within{border-color:#00ff88;box-shadow:0 0 0 4px rgba(0,255,136,.1)}
input{flex:1;background:transparent;border:none;outline:none;color:#fff;font-family:'JetBrains Mono',monospace;font-size:15px}
.btn{width:100%;margin-top:12px;background:#00ff88;color:#000;border:none;padding:14px;border-radius:14px;font-weight:800;cursor:pointer;letter-spacing:.5px;transition:.2s;box-shadow:0 0 20px rgba(0,255,136,.25)}
.btn:hover{background:#00ff88;box-shadow:0 0 30px rgba(0,255,136,.5);transform:translateY(-1px)}
.btn:active{transform:scale(.97);box-shadow:0 0 10px rgba(0,255,136,.3)}
.btn2{width:100%;margin-top:10px;background:transparent;border:1.5px solid #1a2a1f;color:#00ff88;padding:12px;border-radius:14px;font-weight:700;font-size:11px;letter-spacing:2px;cursor:pointer;transition:.2s}
.btn2:hover{background:rgba(0,255,136,.08);border-color:#00ff88;box-shadow:0 0 15px rgba(0,255,136,.15)}
.codebox{display:none;margin-top:16px;background:#07100a;border:1.5px solid #00ff88;border-radius:14px;padding:16px;text-align:center;animation:pop .3s}
@keyframes pop{0%{transform:scale(.95);opacity:0}100%{transform:scale(1);opacity:1}}
.code{font-family:'JetBrains Mono',monospace;font-size:34px;letter-spacing:12px;color:#fff}
.menu-web{width:100%;max-width:420px;margin-top:16px;background:#0d0f14;border:1px solid #171c26;border-radius:16px;padding:14px}
.menu-web h4{margin:0 0 12px;font-size:10px;letter-spacing:3px;color:#5a6a7a}
.opt{background:#080a0e;border:1px solid #151b27;border-radius:10px;padding:12px;display:flex;align-items:center;justify-content:space-between;margin-top:8px;cursor:pointer;transition:.2s}
.opt:hover{border-color:#00ff88;background:rgba(0,255,136,.05);transform:translateX(3px)}
.opt b{font-size:12px;color:#d0d8e2}.opt span{font-size:10px;color:#4a5a6a}
.credits{width:100%;max-width:420px;margin:18px 0 90px;background:#0a0c10;border:1px solid #151a24;border-radius:16px;padding:16px;text-align:center}
.credits h4{margin:0;font-size:10px;letter-spacing:3px;color:#5a6a7a}.credits p{margin:8px 0 0;font-size:12px;line-height:18px;color:#7a8a9a}.credits b{color:#fff}
.channel{position:fixed;right:14px;bottom:14px;z-index:10;background:#10141c;border:1px solid #1e2f3a;border-radius:30px;padding:8px 14px;display:flex;align-items:center;gap:8px;text-decoration:none;box-shadow:0 10px 30px rgba(0,0,0,.6)}
.channel:hover{border-color:#2aabee;transform:translateY(-2px)}.tg{width:22px;height:22px;background:#2aabee;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:12px}
</style></head><body><div class="bg"></div>

<div id="term">
<div class="thead"><div class="dot r"></div><div class="dot y"></div><div class="dot g"></div><div style="margin-left:10px;font-size:11px;color:#4a5a6a;letter-spacing:3px">ᴊᴋ_ʙᴏᴛ@ᴜʙᴜɴᴛᴜ:~</div><div style="margin-left:auto;font-size:11px;color:#00ff88" id="pctTop">0%</div></div>
<div class="tbody" id="log"></div>
<div class="bar"><div class="fill" id="fill"></div></div>
<div class="pct" id="pct">0%</div>
</div>

<a href="${CHANNEL}" target="_blank" class="channel">
<div style="display:flex;flex-direction:column;line-height:11px"><span style="font-size:11px;color:#fff;font-weight:700">ᴊᴋ ᴄʜᴀɴɴᴇʟ</span><span style="font-size:9px;color:#2aabee">t.me/gg_no_root</span></div>
<div class="tg">✈</div>
</a>

<div class="main" id="main">
<div class="card">
<div class="crown">👑</div>
<div class="title">ᴊᴋ_ʙᴏᴛ</div>
<div class="sub">${BOT_BY}</div>

<div class="input"><span style="color:#3a4a5a">+</span><input id="num" placeholder="51912345678"><span style="color:#00ff88">●</span></div>
<button class="btn" onclick="getCode()">ɢᴇɴᴇʀᴀʀ ᴄᴏᴅɪɢᴏ</button>
<button class="btn2" onclick="window.open('${CHANNEL}','_blank')">ᴄᴀɴᴀʟ ᴛᴇʟᴇɢʀᴀᴍ</button>

<div class="codebox" id="box">
<div style="font-size:9px;letter-spacing:3px;color:#00ff88">ᴄᴏᴅɪɢᴏ</div>
<div class="code" id="code">--------</div>
<div id="st" style="font-size:10px;color:#6a7a8a;margin-top:8px;font-family:'JetBrains Mono',monospace">ᴘᴇɢᴀ ᴇɴ ᴡʜᴀᴛѕᴀᴘᴘ</div>
</div>
</div>

<div class="menu-web">
<h4>ᴍᴇɴᴜ - ѕᴇʟᴇᴄᴄɪᴏɴᴀ</h4>
<div class="opt" onclick="alert('Usa .ᴍᴇɴᴜ en WhatsApp')"><b>.ᴍᴇɴᴜ</b><span>ᴠᴇʀ ᴍᴇɴᴜ</span></div>
<div class="opt" onclick="alert('Usa .ᴘɪɴɢ en WhatsApp')"><b>.ᴘɪɴɢ</b><span>ᴠᴇʟᴏᴄɪᴅᴀᴅ</span></div>
<div class="opt" onclick="alert('Usa .ᴇѕᴛᴀᴅᴏ en WhatsApp')"><b>.ᴇѕᴛᴀᴅᴏ</b><span>ɪɴғᴏ</span></div>
<div class="opt" onclick="alert('Usa .ᴄʀᴇᴀᴅᴏʀ en WhatsApp')"><b>.ᴄʀᴇᴀᴅᴏʀ</b><span>👑 ᴊᴀᴋᴜᴅᴏ</span></div>
</div>

<div class="credits">
<h4>ᴄʀᴇᴅɪᴛѕ</h4>
<p><b style="font-size:14px">👑 ${BOT_BY}</b><br>ᴄʀᴇᴀᴅᴏʀ ᴅᴇʟ ʙᴏᴛ<br>ᴄᴀɴᴀʟ: t.me/gg_no_root<br><br>ʙᴀѕᴇ: ʙᴀɪʟᴇʏѕ 6.7.18<br>2026 - ʜᴇᴄʜᴏ ᴄᴏɴ ғʟᴏᴡ</p>
</div>
</div>

<script>
const logs=[
 "ɪɴɪᴄɪᴀɴᴅᴏ ѕɪѕᴛᴇᴍᴀ...",
 "ᴄᴀʀɢᴀɴᴅᴏ ᴍᴏᴅᴜʟᴏѕ ᴊᴋ...",
 "ᴠᴇʀɪғɪᴄᴀɴᴅᴏ ᴄʀᴇᴀᴅᴏʀ 👑 ᴊᴀᴋᴜᴅᴏ...",
 "ᴄᴏɴᴇᴄᴛᴀɴᴅᴏ ᴄᴀɴᴀʟ t.me/gg_no_root...",
 "ᴀɴᴛɪ-ᴄʀᴀѕʜ ᴀᴄᴛɪᴠᴏ",
 "ғʟᴏᴡ ʜᴀᴄᴋᴇʀ ᴠᴇʀᴅᴇ ᴀᴄᴛɪᴠᴏ",
 "ѕɪѕᴛᴇᴍᴀ ʟɪѕᴛᴏ"
];
const logEl=document.getElementById('log'),fill=document.getElementById('fill'),pct=document.getElementById('pct'),pctTop=document.getElementById('pctTop');
let p=0, li=0;
function boot(){
 if(p<100){
  p+= Math.random()*9+3; if(p>100) p=100;
  fill.style.width=p+"%"; pct.innerText=Math.floor(p)+"%"; pctTop.innerText=Math.floor(p)+"%";
  if(li < logs.length && p > (li+1)*(100/logs.length)){
   const d=document.createElement('div');d.className='line';d.innerHTML="<span class='w'>$</span> "+logs[li];
   logEl.appendChild(d); li++;
  }
  setTimeout(boot, 90);
 }else{
  const d=document.createElement('div');d.className='line';d.innerHTML="<span class='gr'>[100%] ѕʏѕᴛᴇᴍ ʀᴇᴀᴅʏ</span>"; logEl.appendChild(d);
  setTimeout(()=>{document.getElementById('term').style.opacity="0";setTimeout(()=>{document.getElementById('term').style.display="none";document.getElementById('main').style.display="flex"},600)},400);
 }
}
boot();
async function getCode(){
 const n=document.getElementById('num').value.trim();if(!n) return alert('ᴘᴏɴ ɴᴜᴍᴇʀᴏ');
 document.getElementById('st').innerText='ɢᴇɴᴇʀᴀɴᴅᴏ...';
 const r=await fetch('/pair?number='+encodeURIComponent(n)).then(r=>r.json());
 if(r.error){alert(r.error);return}
 document.getElementById('box').style.display='block';
 document.getElementById('code').innerText=r.code;
 document.getElementById('st').innerText='ᴄᴏᴅɪɢᴏ: '+r.code;
}
</script></body></html>`)
})

process.on('uncaughtException', e=>console.log(e.message))
process.on('unhandledRejection', e=>console.log(e.message))
app.listen(PORT, ()=>{ console.log('Servidor en '+PORT); startBot() })