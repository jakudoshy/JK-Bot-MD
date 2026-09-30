const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const fs = require('fs')

const app = express()
const PORT = process.env.PORT || 3000
let sock = null

async function startBot(){
    try{
        const { state, saveCreds } = await useMultiFileAuthState('./auth_info')
        const { version } = await fetchLatestBaileysVersion()
        sock = makeWASocket({
            version,
            logger: P({ level: 'silent' }),
            printQRInTerminal: false,
            auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })) },
            browser: ["JK Bot", "Chrome", "1.0.0"],
            syncFullHistory: false,
            markOnlineOnConnect: true
        })
        sock.ev.on('creds.update', saveCreds)
        sock.ev.on('connection.update', async (u)=>{
            const { connection, lastDisconnect } = u
            if(connection==='close'){
                const r=lastDisconnect?.error?.output?.statusCode
                if(r!==DisconnectReason.loggedOut) setTimeout(startBot,3000)
                else{ try{fs.rmSync('./auth_info',{recursive:true,force:true})}catch{}; setTimeout(startBot,2000) }
            }
            if(connection==='open'){
                console.log('JK BOT CONECTADO')
                // MENSAJE DE BIENVENIDA A TI MISMO CON HERRAMIENTAS
                try{
                    const id = sock.user.id
                    const welcome = `╭━─━─━─━─━─━─━─━─━─━─━─━─╮
┃ *ᴊᴋ_ʙᴏᴛ - ᴇxᴏᴛɪᴄ ᴛᴇʀᴍɪɴᴀʟ ᴠ8*
┃ *ʟɪɴᴜx ʜᴀᴄᴋ sʏsᴛᴇᴍ ᴀᴄᴛɪᴠᴀᴅᴏ*
╰━─━─━─━─━─━─━─━─╯

*root@jk-bot:~#*./welcome.sh
[√] ᴀᴄᴄᴇsᴏ ᴄᴏɴᴄᴇᴅɪᴅᴏ
[√] ᴅᴇᴠɪᴄᴇ: *JK Bot*
[√] ᴜsᴇʀ: @${id.split('@')[0]}
[√] ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏ

*┏━〔 🧰 ᴛᴏᴏʟs ᴍᴇɴᴜ - ᴘᴀʀᴀ ᴘʀᴏʙᴀʀ 〕━*
┃
┃ *› sɪsᴛᴇᴍᴀ:*
┃ ➤.ᴍᴇɴᴜ - ᴍᴇɴᴜ ᴘʀɪɴᴄɪᴘᴀʟ
┃ ➤.ᴘɪɴɢ - ᴠᴇʟᴏᴄɪᴅᴀᴅ
┃ ➤.ᴇsᴛᴀᴅᴏ - ᴇsᴛᴀᴅᴏ ᴅᴇʟ ʙᴏᴛ
┃ ➤.ᴏᴡɴᴇʀ - ᴄʀᴇᴀᴅᴏʀ
┃
┃ *› ʜᴀᴄᴋ ᴛᴏᴏʟs (ᴅᴇᴍᴏ):*
┃ ➤.ɴᴍᴀᴘ 127.0.0.1
┃ ➤.sǫʟɪɴᴊᴇᴄᴛ
┃ ➤.ᴅᴅᴏs
┃ ➤.sʜᴇʟʟ
┃ ➤.ᴇɴᴄʀʏᴘᴛ
┃
┃ *› ᴇxᴏᴛɪᴄ:*
┃ ➤.ᴛᴛs - ᴛᴇxᴛᴏ ᴀ ᴀᴜᴅɪᴏ
┃ ➤.sᴛɪᴄᴋᴇʀ
┃ ➤.ᴘʟᴀʏ
┃
┗━━━━━━━━━━━━━━━━━━━━━━

*root@jk-bot:~#* echo "ᴊᴋ_ʙᴏᴛ ɪɴɪᴄɪᴀᴅᴏ ᴄᴏɴ ғʟᴏᴡ ᴇxᴏᴛɪᴄᴏ"
> ${new Date().toLocaleString()}
> +53 sᴜᴘᴘᴏʀᴛ ᴇɴᴀʙʟᴇᴅ

_ᴘʀᴜᴇʙᴀ ʟᴀs ʜᴇʀʀᴀᴍɪᴇɴᴛᴀs ᴇsᴄʀɪʙɪᴇɴᴅᴏ.ᴍᴇɴᴜ_`

                    await sock.sendMessage(id, { text: welcome })
                }catch(e){ console.log('Error welcome', e.message) }
            }
        })

        sock.ev.on('messages.upsert', async ({ messages })=>{
            try{
                const m=messages[0]; if(!m.message || m.key.fromMe) return
                const text=m.message.conversation||m.message.extendedTextMessage?.text||""
                const from=m.key.remoteJid
                const t=text.toLowerCase()

                if(t==='.menu' || t==='.menú' || t==='.ᴍᴇɴᴜ'){
                    await sock.sendMessage(from,{ text: `*root@jk-bot:~#* cat menu.txt\n\n` + `ᴊᴋ_ʙᴏᴛ ᴇxᴏᴛɪᴄ ᴛᴇʀᴍɪɴᴀʟ\n\n.sᴛᴀᴛᴜs\n.ᴘɪɴɢ\n.ᴏᴡɴᴇʀ\n\n[ᴛᴏᴏʟs ᴅᴇᴍᴏ ʟɪsᴛᴀs ᴘᴀʀᴀ ᴘʀᴏʙᴀʀ]` })
                }
                if(t==='.ping' || t==='.ᴘɪɴɢ'){ await sock.sendMessage(from,{ text: `*root@jk-bot:~#* ping -c 1 whatsapp\n\nPONG! 12ms - ᴊᴋ_ʙᴏᴛ ᴀᴄᴛɪᴠᴏ ✓` }) }
                if(t==='.estado' || t==='.ᴇsᴛᴀᴅᴏ'){ await sock.sendMessage(from,{ text: `*root@jk-bot:~#* systemctl status jk_bot\n\n● jk_bot.service - active (running)` }) }
                if(t.startsWith('.nmap')){ await sock.sendMessage(from,{ text: `*root@jk-bot:~#* nmap ${text.split(' ')[1]||'127.0.0.1'}\n\nPORT 22 open\nPORT 80 open\nPORT 443 open\n\n[√] sᴄᴀɴ ᴄᴏᴍᴘʟᴇᴛᴇ` }) }
                if(t==='.shell' || t==='.sʜᴇʟʟ'){ await sock.sendMessage(from,{ text: `*root@jk-bot:~#* bash\n\n$ whoami\nroot\n$ ls\njk_bot tools exotic` }) }
            }catch{}
        })
    }catch(e){ setTimeout(startBot,4000) }
}

app.use(express.json())

app.get('/pair', async(req,res)=>{
    try{
        let num=(req.query.number||"").replace(/[^0-9]/g,'')
        if(!num) return res.json({error:"ᴘᴏɴ +53..."})
        if(!sock) return res.json({error:"ɪɴɪᴄɪᴀɴᴅᴏ..."})
        if(fs.existsSync('./auth_info/creds.json')){
            try{ const c=JSON.parse(fs.readFileSync('./auth_info/creds.json','utf8')); if(c.registered){ try{fs.rmSync('./auth_info',{recursive:true,force:true})}catch{}; await new Promise(r=>setTimeout(r,800)); await startBot(); await new Promise(r=>setTimeout(r,2500)) } }catch{}
        }
        const code=await sock.requestPairingCode(num)
        return res.json({code})
    }catch(e){ return res.json({error:e.message}) }
})

app.get('/', (req,res)=>{
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>root@jk-bot</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
*{font-family:'JetBrains Mono',monospace;box-sizing:border-box}
body{margin:0;background:#000;color:#00ff41;overflow:hidden}
canvas{position:fixed;top:0;left:0;z-index:0}
.wrap{position:relative;z-index:2;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:12px}
.terminal{width:100%;max-width:460px;background:rgba(0,0,0,0.96);border:1px solid #00ff41;border-radius:12px;box-shadow:0 0 30px #00ff41, inset 0 0 15px rgba(0,255,65,0.15);overflow:hidden}
.topbar{background:#111;border-bottom:1px solid #00ff41;padding:8px 14px;display:flex;align-items:center;gap:8px}
.dot{width:12px;height:12px;border-radius:50%}
.d1{background:#ff5f56}.d2{background:#ffbd2e}.d3{background:#27c93f}
.top-title{margin-left:10px;font-size:11px;color:#8f8}
.screen{padding:16px;height:420px;overflow-y:auto;font-size:11.5px;line-height:16px;background:#000}
.cursor{animation:blink 1s infinite;background:#00ff41;color:#000}
@keyframes blink{0%,50%{opacity:1}51%,100%{opacity:0}}
.line{margin:2px 0}.green{color:#00ff41}.white{color:#fff}.yellow{color:#ff0}.gray{color:#888}
.input-area{display:flex;border-top:1px solid #00ff41;background:#0a0a0a;padding:10px;align-items:center;gap:8px}
.prompt{color:#00ff41;font-weight:bold;white-space:nowrap}
#num{flex:1;background:transparent;border:none;color:#fff;outline:none;font-size:14px}
.btn{width:100%;background:#00ff41;color:#000;border:none;padding:12px;font-weight:bold;letter-spacing:2px;cursor:pointer}
.btn:hover{background:#fff}
.codebox{display:none;margin-top:10px;border:1px dashed #00ff41;padding:12px;text-align:center;background:#001100}
.code{font-size:34px;letter-spacing:12px;color:#fff;text-shadow:0 0 20px #00ff41;font-weight:bold}
</style></head>
<body><canvas id="c"></canvas>
<div class="wrap"><div class="terminal">
<div class="topbar"><div class="dot d1"></div><div class="dot d2"></div><div class="dot d3"></div><div class="top-title">root@jk-bot: ~ - ᴇxᴏᴛɪᴄ ᴛᴇʀᴍɪɴᴀʟ</div></div>
<div class="screen" id="screen"></div>
<div class="input-area"><span class="prompt">root@jk-bot:~#</span><input id="num" placeholder="./pair --number +535XXXXXXX" value="+53"><button onclick="getCode()" style="width:auto;padding:8px 14px;background:#00ff41;border:none;font-weight:bold;cursor:pointer;border-radius:4px">ᴇxᴇᴄ</button></div>
<button class="btn" onclick="getCode()">[./ɪɴᴊᴇᴄᴛ_ᴄᴏᴅᴇ.sʜ +53 ]</button>
<div class="codebox" id="codebox"><div style="font-size:10px">ᴄᴏᴅɪɢᴏ ɢᴇɴᴇʀᴀᴅᴏ:</div><div class="code" id="code">--------</div><div style="font-size:10px;color:#8f8">ᴘᴇɢᴀʟᴏ ᴇɴ ᴡʜᴀᴛsᴀᴘᴘ > ᴅɪsᴘᴏsɪᴛɪᴠᴏs</div></div>
</div></div>
<script>
const screen=document.getElementById('screen');
const logs=[
"ʙᴏᴏᴛɪɴɢ ᴊᴋ_ʙᴏᴛ ᴇxᴏᴛɪᴄ ᴋᴇʀɴᴇʟ...",
"[ᴏᴋ] ᴄʜᴇᴄᴋɪɴɢ ᴅᴇᴘᴇɴᴅᴇɴᴄɪᴇs...",
"root@jk-bot:~# uname -a",
"Linux jk-bot 6.1.0-exotic #1 SMP x86_64 GNU/Linux",
"root@jk-bot:~# lsmod | grep niku",
"niku_eye 20480 0 - Live 0xffffffffc0a00000",
"root@jk-bot:~#./init_exotic.sh --flow maliante",
"[▓▓▓▓▓▓] 100% ᴇxᴏᴛɪᴄ ᴍᴏᴅᴇ ᴇɴᴀʙʟᴇᴅ",
"root@jk-bot:~# cat /etc/device.conf",
"DEVICE_NAME=JK Bot",
"DEVICE_MODEL=JK Bot Exotic",
"COUNTRY=+53 CUBA [OK]",
"root@jk-bot:~# systemctl status jk_bot",
"● jk_bot.service - ᴊᴋ_ʙᴏᴛ ᴇxᴏᴛɪᴄ ᴛᴇʀᴍɪɴᴀʟ",
" Active: active (running)",
" Tools: nmap, sqlinject, shell, encrypt, tts, sticker",
"root@jk-bot:~# echo 'ᴇsᴘᴇʀᴀɴᴅᴏ ɴᴜᴍᴇʀᴏ +53...'",
"ᴇsᴘᴇʀᴀɴᴅᴏ ɴᴜᴍᴇʀᴏ +53... █"
];
let i=0;
function addLog(){
 if(i>=logs.length) return;
 const div=document.createElement('div'); div.className='line'; div.innerHTML=logs[i]; screen.appendChild(div); screen.scrollTop=screen.scrollHeight; i++; setTimeout(addLog, 180);
}
addLog();

const c=document.getElementById('c'), x=c.getContext('2d'); c.width=innerWidth; c.height=innerHeight;
const chars="01root@jk-bot:+53ᴊᴋ_ʙᴏᴛ"; const font=13; const cols=Math.floor(c.width/font); const drops=Array(cols).fill(1);
setInterval(()=>{ x.fillStyle="rgba(0,0,0,0.05)"; x.fillRect(0,0,c.width,c.height); x.fillStyle="#00ff41"; x.font=font+"px monospace"; drops.forEach((y,i)=>{ x.fillText(chars[Math.floor(Math.random()*chars.length)], i*font, y*font); if(y*font>c.height && Math.random()>0.975) drops[i]=0; drops[i]++ })},35);

async function getCode(){
 const raw=document.getElementById('num').value;
 if(!raw) return;
 const d=document.createElement('div'); d.className='line white'; d.innerHTML="root@jk-bot:~#./pair --number "+raw+"<br><span class='gray'>[~] ɪɴʏᴇᴄᴛᴀɴᴅᴏ ᴘᴀʏʟᴏᴀᴅ...</span>"; screen.appendChild(d); screen.scrollTop=screen.scrollHeight;
 try{
   const r=await fetch('/pair?number='+encodeURIComponent(raw)).then(r=>r.json());
   if(r.error){
     const e=document.createElement('div'); e.className='line'; e.style.color='#ff5555'; e.innerHTML="[x] ᴇʀᴏʀ: "+r.error; screen.appendChild(e);
     return;
   }
   document.getElementById('codebox').style.display='block';
   document.getElementById('code').innerText=r.code;
   const s=document.createElement('div'); s.className='line green'; s.innerHTML="[√] <b style='color:#fff'>ᴄᴏᴅɪɢᴏ: "+r.code+"</b> - ᴘᴇɢᴀʟᴏ ᴇɴ ᴡʜᴀᴛsᴀᴘᴘ! <br><span class='yellow'>[~] ᴇxᴘɪʀᴀ ᴇɴ 60s - sᴇ ᴇɴᴠɪᴀʀᴀ ʙɪᴇɴᴠᴇɴɪᴅᴀ ᴀᴜᴛᴏᴍᴀᴛɪᴄᴀ ᴄᴜᴀɴᴅᴏ sᴇ ᴠɪɴᴄᴜʟᴇ</span>"; screen.appendChild(s);
   screen.scrollTop=screen.scrollHeight;
 }catch(e){
   const ee=document.createElement('div'); ee.innerHTML="[x] ɴᴇᴛᴡᴏʀᴋ ᴇʀʀᴏʀ"; screen.appendChild(ee);
 }
}
</script></body></html>`)
})

process.on('uncaughtException', e=>console.log(e.message))
process.on('unhandledRejection', e=>console.log(e?.message))
app.listen(PORT, ()=>{ console.log('JK V8 LINUX TERMINAL EN '+PORT); startBot() })