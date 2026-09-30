const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const fs = require('fs')

const app = express()
const PORT = process.env.PORT || 3000
let sock = null
let lastCode = "--------"
let status = "INICIANDO..."
const BRAND = "ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ"

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
            if(connection === 'close'){
                const reason = lastDisconnect?.error?.output?.statusCode
                status = "DESCONECTADO - RECONECTANDO..."
                console.log('Desconectado:', reason)
                if(reason!== DisconnectReason.loggedOut){
                    setTimeout(()=>startBot(), 3000)
                } else {
                    try{ if(fs.existsSync('./auth_info')) fs.rmSync('./auth_info',{recursive:true, force:true}) }catch{}
                    setTimeout(()=>startBot(), 2000)
                }
            }
            if(connection === 'open'){
                status = "CONECTADO ✓"
                console.log('CONECTADO '+BRAND)
                try{
                    const jid = sock.user.id
                    const welcome = `╭━━━〔 *${BRAND}* 〕━━━╮
┃ ᴄᴏɴᴇᴄᴛᴀᴅᴏ ✓ - sɪsᴛᴇᴍᴀ ᴇxᴏᴛɪᴄᴏ
┃ ᴅᴇᴠɪᴄᴇ: JK Bot
┃ ${BRAND}
╰━━━━━━━━━━━━━━━━━━━━━━━╯

Escribe.menu para ver el menu
`
                    await sock.sendMessage(jid, { text: welcome })
                }catch{}
            }
        })

        sock.ev.on('messages.upsert', async ({ messages })=>{
            try{
                const m = messages[0]
                if(!m.message || m.key.fromMe) return
                const text = m.message.conversation || m.message.extendedTextMessage?.text || ""
                const from = m.key.remoteJid
                if(text.toLowerCase() === '.menu' || text.toLowerCase() === '.menú'){
                    await sock.sendMessage(from, { text: `╭━〔 ${BRAND} 〕━\n│.ping\n│.estado\n╰ ${BRAND}` })
                }
            }catch(e){ console.log('Error mensaje:', e.message) }
        })

        status = "SISTEMA LISTO - ESPERANDO NUMERO"
    }catch(e){
        console.log('Error startBot:', e)
        status = "ERROR: " + e.message
        setTimeout(()=>startBot(), 5000)
    }
}

app.use(express.json())

// ESTE ES EL /pair QUE SI MANDA CODIGO REAL DEL V5
app.get('/pair', async(req,res)=>{
    try{
        let raw = (req.query.number||"").toString()
        let num = raw.replace(/[^0-9]/g,'')
        if(!num || num.length < 8) return res.json({error:"Pon número con código país Ej: 53512345678"})
        if(!sock){
            return res.json({error:"Bot iniciando, espera 5 segundos y reintenta"})
        }
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
        console.log('Generando codigo REAL para:', num)
        const codeRaw = await sock.requestPairingCode(num)
        const code = codeRaw?.match(/.{1,4}/g)?.join("-") || codeRaw
        lastCode = code
        status = "CODIGO: "+code
        console.log('CODIGO REAL GENERADO:', code)
        return res.json({code})
    }catch(e){
        console.log('Error pair:', e)
        return res.json({error: e.message + " - Espera 20s, no des spam"})
    }
})

app.get('/status', (req,res)=> res.json({status, code:lastCode}))

app.get('/', (req,res)=>{
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>${BRAND}</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Orbitron:wght@800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;font-family:'JetBrains Mono',monospace}body{margin:0;background:#000;color:#00ff41;overflow:hidden}canvas{position:fixed;top:0;left:0;z-index:0}
#loader{position:fixed;top:0;left:0;width:100%;height:100%;background:#000;z-index:10;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:20px;transition:0.8s}.load-box{width:100%;max-width:520px;border:1.5px solid #00ff41;padding:22px;border-radius:16px;background:rgba(0,15,0,0.9);box-shadow:0 0 40px #00ff41}.bar{height:6px;background:#001100;border-radius:10px;overflow:hidden;margin:15px 0;border:1px solid #00ff41}.fill{height:100%;width:0%;background:linear-gradient(90deg,#00ff41,#fff);box-shadow:0 0 15px #00ff41;transition:0.2s}.log{height:210px;overflow:hidden;font-size:11px;line-height:16px;color:#00ff41}
.wrap{position:relative;z-index:1;min-height:100vh;display:none;align-items:center;justify-content:center;padding:15px}.term{width:100%;max-width:450px;background:rgba(0,0,0,0.96);border:1.5px solid #00ff41;border-radius:16px;overflow:hidden;box-shadow:0 0 35px #00ff41}.top{padding:10px 14px;background:#111;border-bottom:1px solid #00ff41;display:flex;gap:6px;align-items:center;font-size:11px}.dot{width:11px;height:11px;border-radius:50%}.r{background:#ff5f56}.y{background:#ffbd2e}.g{background:#27c93f}.screen{padding:16px;height:330px;overflow:auto;font-size:11px;line-height:16px}.input{display:flex;gap:8px;padding:12px;background:#0a0a0a;border-top:1px solid #00ff41;align-items:center}input{flex:1;background:transparent;border:none;color:#fff;outline:none;font-size:14px;text-align:center}.btn{width:100%;background:#00ff41;color:#000;border:none;padding:14px;font-weight:900;letter-spacing:3px;cursor:pointer;font-family:'Orbitron',monospace}.codebox{display:none;margin:12px;border:1.5px dashed #00ff41;padding:14px;text-align:center;background:radial-gradient(circle,#001100,#000);border-radius:12px}.code{font-size:38px;letter-spacing:12px;color:#fff;text-shadow:0 0 20px #00ff41;font-family:'Orbitron',monospace;font-weight:800}
</style></head><body><canvas id="c"></canvas>
<div id="loader"><div class="load-box"><div style="font-family:'Orbitron',monospace;text-align:center;font-size:24px;letter-spacing:4px;color:#fff;text-shadow:0 0 20px #00ff41">${BRAND}</div><div style="text-align:center;font-size:10px;letter-spacing:5px;margin:8px 0 14px;color:#8f8">ɪɴɪᴄɪᴀɴᴅᴏ sɪsᴛᴇᴍᴀ ᴇxᴏᴛɪᴄᴏ...</div><div class="bar"><div class="fill" id="fill"></div></div><div class="log" id="log"></div><div style="text-align:center;font-size:9px;margin-top:10px;color:#555" id="perc">0%</div></div></div>
<div class="wrap" id="main"><div class="term"><div class="top"><div class="dot r"></div><div class="dot y"></div><div class="dot g"></div><span style="margin-left:10px">${BRAND} - REAL CODE</span></div><div class="screen" id="screen"></div><div class="input"><span style="color:#00ff41">${BRAND}:~#</span><input id="num" value="+53" placeholder="+53 5XXXXXXX"><button onclick="getCode()" style="padding:6px 12px;background:#00ff41;border:none;font-weight:bold;cursor:pointer;border-radius:4px">OK</button></div><button class="btn" onclick="getCode()">[ ɢᴇɴᴇʀᴀʀ ᴄᴏᴅɪɢᴏ ʀᴇᴀʟ ]</button><div class="codebox" id="box"><div style="font-size:10px;letter-spacing:4px;color:#00ff41">${BRAND} - ᴄᴏᴅɪɢᴏ ʀᴇᴀʟ</div><div class="code" id="code">---- ----</div><div id="st" style="font-size:10px;color:#8f8;margin-top:6px">WhatsApp > Dispositivos > Vincular con numero</div></div></div></div>
<script>
const BRAND="${BRAND}";
const logs=["${BRAND} ~# ʙᴏᴏᴛɪɴɢ ᴋᴇʀɴᴇʟ ᴇxᴏᴛɪᴄᴏ...","${BRAND} ~# ʟᴏᴀᴅɪɴɢ ["+BRAND+"]","[▓▓▓▓▓▓▓░░░] 72% - ɪɴʏᴇᴄᴛᴀɴᴅᴏ ғʟᴏᴡ...","${BRAND} ~# ᴅᴇᴠɪᴄᴇ = JK Bot [OK]","${BRAND} ~# ᴄᴏᴜɴᴛʀʏ = +53 CUBA [OK]","[√] sɪsᴛᴇᴍᴀ ᴄᴀʀɢᴀᴅᴏ 100%","${BRAND} ~# ᴇsᴘᴇʀᴀɴᴅᴏ ɴᴜᴍᴇʀᴏ +53..."];
const logEl=document.getElementById('log');const fill=document.getElementById('fill');const perc=document.getElementById('perc');let i=0;function typeLoader(){ if(i<logs.length){ logEl.innerHTML+=logs[i]+"<br>"; logEl.scrollTop=9999; let p=Math.floor((i+1)/logs.length*100); fill.style.width=p+"%"; perc.innerText=p+"% - "+logs[i]; i++; setTimeout(typeLoader,280); }else{ fill.style.width="100%"; perc.innerText="100% - ʟɪsᴛᴏ"; setTimeout(()=>{ document.getElementById('loader').style.opacity="0"; setTimeout(()=>{ document.getElementById('loader').style.display="none"; document.getElementById('main').style.display="flex"; document.getElementById('screen').innerHTML=BRAND+" ~# sʏsᴛᴇᴍ ʀᴇᴀᴅʏ<br>"+BRAND+" ~# Pon tu numero +53 y dale a GENERAR<br>"; },800) },600); } }typeLoader();
const c=document.getElementById('c'),x=c.getContext('2d');c.width=innerWidth;c.height=innerHeight;const chars="ᴊᴋʙᴏᴛꫂꤪꤨᴼᶠᶜ01+53";const font=13;const cols=Math.floor(c.width/font);const drops=Array(cols).fill(1);setInterval(()=>{x.fillStyle="rgba(0,0,0,0.06)";x.fillRect(0,0,c.width,c.height);x.fillStyle="#00ff41";x.font=font+"px monospace";drops.forEach((y,i)=>{x.fillText(chars[Math.floor(Math.random()*chars.length)],i*font,y*font);if(y*font>c.height&&Math.random()>0.975)drops[i]=0;drops[i]++})},35);
async function getCode(){
 const raw=document.getElementById('num').value;
 const screen=document.getElementById('screen');
 if(!raw) return alert('Pon numero');
 screen.innerHTML+=BRAND+" ~#./pair "+raw+"<br><span style='color:#888'>[~] Generando CODIGO REAL...</span><br>"; screen.scrollTop=9999;
 document.getElementById('st').innerText='Generando...';
 try{
  const r=await fetch('/pair?number='+encodeURIComponent(raw)).then(r=>r.json());
  if(r.error){ screen.innerHTML+="<span style='color:#f55'>[x] "+r.error+"</span><br>"; document.getElementById('st').innerText=r.error; return }
  document.getElementById('box').style.display='block'; document.getElementById('code').innerText=r.code; document.getElementById('st').innerText='Codigo: '+r.code+' - PEGA YA EN WHATSAPP';
  screen.innerHTML+="<span style='color:#0f0'>[√] CODIGO REAL: <b style='color:#fff'>"+r.code+"</b> - PEGA YA!</span><br>"; screen.scrollTop=9999;
 }catch(e){ screen.innerHTML+="[x] Error red<br>"; }
}
</script></body></html>`)
})

process.on('uncaughtException', (e)=>{ console.log('uncaught', e.message) })
process.on('unhandledRejection', (e)=>{ console.log('unhandled', e?.message) })

app.listen(PORT, ()=>{ console.log('Servidor en '+PORT); startBot() })