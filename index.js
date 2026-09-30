const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const fs = require('fs')

const app = express()
const PORT = process.env.PORT || 3000
let sock = null
let isReady = false

async function startBot(){
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
        if(connection==='open'){
            isReady = true
            console.log('CONECTADO - ENVIANDO BIENVENIDA A TU DM')
            // ESTE ES EL MENSAJE QUE TE LLEGA A TU PROPIO NUMERO (DM GUARDADO)
            try{
                const jid = sock.user.id
                const welcome = `
╭━━━〔 *ᴊᴋ_ʙᴏᴛ ᴏғɪᴄɪᴀʟ* 〕━━━╮
┃
┃ *ʙɪᴇɴᴠᴇɴɪᴅᴏ ᴀ ᴊᴋ_ʙᴏᴛ ᴇxᴏᴛɪᴄ*
┃ *sɪsᴛᴇᴍᴀ ɪɴɪᴄɪᴀᴅᴏ ᴄᴏɴ ᴇxɪᴛᴏ*
┃
┃ ᴜsᴜᴀʀɪᴏ: @${jid.split('@')[0]}
┃ ᴅᴇᴠɪᴄᴇ: *JK Bot*
┃ ᴍᴏᴅ: *ᴊᴀᴋᴜᴅᴏѕʜʏ*
┃ ғᴇᴄʜᴀ: ${new Date().toLocaleString()}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━╯

*┏━〔 💀 ᴍᴇɴᴜ ᴅᴇ ᴄᴏᴍᴀɴᴅᴏs ᴊᴋ 〕━┓*

*┃ ᴍᴀɪɴ:*
*┃* ➤ .ᴍᴇɴᴜ - ᴍᴇɴᴜ ᴘʀɪɴᴄɪᴘᴀʟ
*┃* ➤ .ᴘɪɴɢ - ᴠᴇʟᴏᴄɪᴅᴀᴅ ᴅᴇʟ ʙᴏᴛ
*┃* ➤ .ᴇsᴛᴀᴅᴏ - ᴇsᴛᴀᴅᴏ ᴅᴇʟ sɪsᴛᴇᴍᴀ
*┃* ➤ .ᴏᴡɴᴇʀ - ɪɴғᴏ ᴅᴇʟ ᴄʀᴇᴀᴅᴏʀ
*┃* ➤ .ɪɴғᴏʙᴏᴛ - ɪɴғᴏ ᴅᴇʟ ʙᴏᴛ

*┃ ᴇxᴏᴛɪᴄ ᴛᴏᴏʟs:*
*┃* ➤ .sᴛɪᴄᴋᴇʀ - ᴄʀᴇᴀ sᴛɪᴄᴋᴇʀ
*┃* ➤ .ᴛᴛs ᴛᴇxᴛᴏ - ᴠᴏᴢ
*┃* ➤ .ᴘʟᴀʏ ᴄᴀɴᴄɪᴏɴ - ᴍᴜsɪᴄᴀ
*┃* ➤ .ɪᴀ ᴘʀᴇɢᴜɴᴛᴀ - ᴄʜᴀᴛɢᴘᴛ

*┃ ʜᴀᴄᴋ ᴍᴏᴅᴇ:*
*┃* ➤ .sʜᴇʟʟ - ᴛᴇʀᴍɪɴᴀʟ
*┃* ➤ .ɴᴍᴀᴘ - sᴄᴀɴɴᴇʀ

*┗━━━━━━━━━━━━━━━━━━━━━━━┛*

> *root@jk-bot:~#* echo "sɪsᴛᴇᴍᴀ ʟɪsᴛᴏ - ғʟᴏᴡ ᴇxᴏᴛɪᴄᴏ ᴀᴄᴛɪᴠᴀᴅᴏ"
> _Esᴄʀɪʙᴇ .ᴍᴇɴᴜ ᴘᴀʀᴀ ᴇᴍᴘᴇᴢᴀʀ_

*ᴊᴋ_ʙᴏᴛ ᴏғɪᴄɪᴀʟ - ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏ*
`
                await sock.sendMessage(jid, { text: welcome })
                console.log('BIENVENIDA ENVIADA A TU DM')
            }catch(e){ console.log('Error bienvenida', e.message) }
        }
        if(connection==='close'){
            isReady = false
            if(lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut) setTimeout(startBot,2000)
            else{ try{fs.rmSync('./auth_info',{recursive:true,force:true})}catch{}; setTimeout(startBot,1000) }
        }
    })
    isReady = true
}

app.use(express.json())

app.get('/pair', async(req,res)=>{
    try{
        if(!sock){ await startBot(); await new Promise(r=>setTimeout(r,2500)) }
        let num = (req.query.number||"").replace(/[^0-9]/g,'')
        if(!num || num.length<10) return res.json({error:"Pon numero con codigo pais Ej: 535XXXXXXX"})
        console.log('Generando CODIGO REAL para:', num)
        let code = await sock.requestPairingCode(num)
        code = code?.match(/.{1,4}/g)?.join("-") || code
        console.log('CODIGO REAL:', code)
        return res.json({ code })
    }catch(e){ return res.json({ error: e.message }) }
})

app.get('/', (req,res)=>{
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>JK BOT</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Orbitron:wght@800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;font-family:'JetBrains Mono',monospace}
body{margin:0;background:#000;color:#00ff41;overflow:hidden}
canvas{position:fixed;top:0;left:0;z-index:0}
/* LOADER */
#loader{position:fixed;top:0;left:0;width:100%;height:100%;background:#000;z-index:10;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:20px;transition:0.8s}
.load-box{width:100%;max-width:500px;border:1px solid #00ff41;padding:20px;border-radius:12px;background:rgba(0,20,0,0.8);box-shadow:0 0 30px #00ff41}
.bar{height:6px;background:#001100;border-radius:10px;overflow:hidden;margin:15px 0;border:1px solid #00ff41}
.fill{height:100%;width:0%;background:linear-gradient(90deg,#00ff41,#fff);box-shadow:0 0 15px #00ff41;transition:0.2s}
.log{height:200px;overflow:hidden;font-size:11px;line-height:16px;color:#00ff41}
/* MAIN */
.wrap{position:relative;z-index:1;min-height:100vh;display:none;align-items:center;justify-content:center;padding:15px}
.term{width:100%;max-width:440px;background:rgba(0,0,0,0.96);border:1px solid #00ff41;border-radius:14px;overflow:hidden;box-shadow:0 0 35px #00ff41}
.top{padding:10px 14px;background:#111;border-bottom:1px solid #00ff41;display:flex;gap:6px;align-items:center;font-size:11px}
.dot{width:11px;height:11px;border-radius:50%}.r{background:#ff5f56}.y{background:#ffbd2e}.g{background:#27c93f}
.screen{padding:16px;height:320px;overflow:auto;font-size:11px;line-height:16px}
.input{display:flex;gap:8px;padding:12px;background:#0a0a0a;border-top:1px solid #00ff41;align-items:center}
input{flex:1;background:transparent;border:none;color:#fff;outline:none;font-size:14px}
.btn{width:100%;background:#00ff41;color:#000;border:none;padding:14px;font-weight:900;letter-spacing:3px;cursor:pointer}
.codebox{display:none;margin:12px;border:1px dashed #00ff41;padding:14px;text-align:center;background:#001100}
.code{font-size:36px;letter-spacing:12px;color:#fff;text-shadow:0 0 20px #00ff41;font-family:'Orbitron',monospace;font-weight:800}
</style></head>
<body><canvas id="c"></canvas>

<div id="loader">
<div class="load-box">
<div style="font-family:'Orbitron',monospace;text-align:center;font-size:22px;letter-spacing:6px;color:#fff;text-shadow:0 0 20px #00ff41">ᴊᴋ_ʙᴏᴛ</div>
<div style="text-align:center;font-size:10px;letter-spacing:4px;margin:6px 0 14px;color:#8f8">ᴇxᴏᴛɪᴄ sʏsᴛᴇᴍ ʙᴏᴏᴛɪɴɢ...</div>
<div class="bar"><div class="fill" id="fill"></div></div>
<div class="log" id="log"></div>
<div style="text-align:center;font-size:9px;margin-top:10px;color:#555" id="perc">0%</div>
</div>
</div>

<div class="wrap" id="main">
<div class="term">
<div class="top"><div class="dot r"></div><div class="dot y"></div><div class="dot g"></div><span style="margin-left:10px">root@jk-bot:~# ᴊᴋ_ʙᴏᴛ ᴏғɪᴄɪᴀʟ</span></div>
<div class="screen" id="screen">root@jk-bot:~# system ready<br>root@jk-bot:~# waiting for +53 number...<br></div>
<div class="input"><span style="color:#00ff41">root@jk-bot:~#</span><input id="num" value="+53" placeholder="+53 5XXXXXXX"><button onclick="getCode()" style="padding:6px 12px;background:#00ff41;border:none;font-weight:bold;cursor:pointer">EXEC</button></div>
<button class="btn" onclick="getCode()">[ ɢᴇɴᴇʀᴀʀ ᴄᴏᴅɪɢᴏ ʀᴇᴀʟ ]</button>
<div class="codebox" id="box"><div style="font-size:10px;letter-spacing:3px">ᴄᴏᴅɪɢᴏ ʀᴇᴀʟ - ᴇxᴘɪʀᴀ 60s</div><div class="code" id="code">---- ----</div><div style="font-size:10px;color:#8f8;margin-top:6px">WhatsApp > Dispositivos > Vincular con numero</div><div style="font-size:10px;color:#ff0;margin-top:4px">Cuando lo pegues te llegara la bienvenida a tu DM</div></div>
</div>
</div>

<script>
const logs = [
 "[ᴏᴋ] ʙᴏᴏᴛɪɴɢ ᴋᴇʀɴᴇʟ...",
 "root@jk-bot:~# uname -a",
 "Linux jk-bot 6.1.0-exotic x86_64",
 "root@jk-bot:~# loading niku_eye module...",
 "[▓▓▓▓▓░░░] 68% - ɪɴʏᴇᴄᴛᴀɴᴅᴏ ᴍᴏᴅᴜʟᴏs...",
 "root@jk-bot:~# cat /etc/jk.conf",
 "DEVICE=JK Bot [OK]",
 "COUNTRY=+53 CUBA [OK]",
 "FLOW=ᴇxᴏᴛɪᴄᴏ ᴍᴀʟɪᴀɴᴛᴇ [OK]",
 "root@jk-bot:~# systemctl start jk_bot",
 "● jk_bot.service - active (running)",
 "root@jk-bot:~# ./decrypt.sh",
 "[√] ᴀᴄᴄᴇsᴏ ᴄᴏɴᴄᴇᴅɪᴅᴏ",
 "[√] sɪsᴛᴇᴍᴀ ᴄᴀʀɢᴀᴅᴏ 100%",
 "root@jk-bot:~# clear"
];
const logEl=document.getElementById('log');
const fill=document.getElementById('fill');
const perc=document.getElementById('perc');
let i=0;
function typeLoader(){
 if(i<logs.length){
   logEl.innerHTML+=logs[i]+"<br>"; logEl.scrollTop=9999;
   let p=Math.floor((i+1)/logs.length*100); fill.style.width=p+"%"; perc.innerText=p+"% - "+logs[i];
   i++; setTimeout(typeLoader, 300);
 }else{
   fill.style.width="100%"; perc.innerText="100% - sɪsᴛᴇᴍᴀ ʟɪsᴛᴏ";
   setTimeout(()=>{ document.getElementById('loader').style.opacity="0"; setTimeout(()=>{ document.getElementById('loader').style.display="none"; document.getElementById('main').style.display="flex"; },800) },600);
 }
}
typeLoader();

// matrix
const c=document.getElementById('c'),x=c.getContext('2d');c.width=innerWidth;c.height=innerHeight;const chars="ᴊᴋ_ʙᴏᴛ01+53";const font=13;const cols=Math.floor(c.width/font);const drops=Array(cols).fill(1);setInterval(()=>{x.fillStyle="rgba(0,0,0,0.05)";x.fillRect(0,0,c.width,c.height);x.fillStyle="#00ff41";x.font=font+"px monospace";drops.forEach((y,i)=>{x.fillText(chars[Math.floor(Math.random()*chars.length)],i*font,y*font);if(y*font>c.height&&Math.random()>0.975)drops[i]=0;drops[i]++})},35);

async function getCode(){
 const raw=document.getElementById('num').value;
 const screen=document.getElementById('screen');
 screen.innerHTML+="root@jk-bot:~# ./pair --number "+raw+"<br><span style='color:#888'>[~] ɢᴇɴᴇʀᴀɴᴅᴏ ᴄᴏᴅɪɢᴏ ʀᴇᴀʟ...</span><br>"; screen.scrollTop=9999;
 try{
   const r=await fetch('/pair?number='+encodeURIComponent(raw)).then(r=>r.json());
   if(r.error){ screen.innerHTML+="<span style='color:#f55'>[x] "+r.error+"</span><br>"; return }
   document.getElementById('box').style.display='block'; document.getElementById('code').innerText=r.code;
   screen.innerHTML+="<span style='color:#0f0'>[√] ᴄᴏᴅɪɢᴏ ʀᴇᴀʟ: <b style='color:#fff'>"+r.code+"</b></span><br><span style='color:#ff0'>[!] ᴘᴇɢᴀʟᴏ ʏᴀ - ᴛᴇ ʟʟᴇɢᴀʀᴀ ʙɪᴇɴᴠᴇɴɪᴅᴀ ᴛᴜ ᴅᴍ</span><br>"; screen.scrollTop=9999;
 }catch(e){ screen.innerHTML+="[x] Error<br>"; }
}
</script></body></html>`)
})

process.on('uncaughtException', e=>console.log(e.message))
app.listen(PORT, ()=>{ console.log('JK V9 FINAL EN '+PORT); startBot() })