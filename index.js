const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const fs = require('fs')

const app = express()
const PORT = process.env.PORT || 3000
let sock
const BOT_NAME = "ᴊᴋ_ʙᴏᴛꫂꤪꤨᴼᶠᶜ"
const BOT_BY = "ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ"

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info')
    const { version } = await fetchLatestBaileysVersion()
    sock = makeWASocket({
        version,
        logger: P({ level: 'silent' }),
        printQRInTerminal: false,
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({level:'silent'})) },
        browser: [BOT_NAME, "Chrome", "1.0"]
    })
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', async (u) => {
        if (u.connection === 'open') {
            await sock.sendMessage(sock.user.id, { text: `*${BOT_NAME} CONECTADO* ✅\n${BOT_BY}\n\nEscribe *.menú*` })
        }
        if (u.connection === 'close' && u.lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut) startBot()
    })
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if (!m.message || m.key.fromMe) return
        const text = m.message.conversation || m.message.extendedTextMessage?.text || ""
        const from = m.key.remoteJid
        if (text.toLowerCase() === '.menu' || text.toLowerCase() === '.menú') {
            await sock.sendMessage(from, { text: `╭━〔 ☠️ ${BOT_NAME} 〕━┈\n│ ➤.ping\n│ ➤.estado\n╰ ${BOT_BY}` })
        }
    })
}

app.use(express.json())
app.get('/pair', async (req, res) => {
    try {
        let number = req.query.number.replace(/[^0-9]/g,'')
        if(fs.existsSync('./auth_info/creds.json')){
            const c = JSON.parse(fs.readFileSync('./auth_info/creds.json'))
            if(c.registered){ fs.rmSync('./auth_info',{recursive:true, force:true}); await new Promise(r=>setTimeout(r,1000)); startBot(); await new Promise(r=>setTimeout(r,2000)) }
        }
        const code = await sock.requestPairingCode(number)
        res.json({ code })
    } catch(e){ res.json({ error: e.message }) }
})

app.get('/', (req,res)=>{
    res.send(`<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${BOT_NAME}</title>
<style>
body{margin:0;background:#0b141a;color:#e9edef;font-family:Roboto, sans-serif}
.header{background:#202c33;padding:16px 15px;display:flex;align-items:center;gap:15px;position:sticky;top:0}
.header span{font-size:19px;font-weight:500}
.content{padding:20px 25px}
.content p{color:#8696a0;font-size:15px;line-height:20px}
.content b{color:#e9edef}
.link{color:#53bdeb;text-decoration:none}
.boxes{display:flex;gap:8px;justify-content:center;margin-top:25px;flex-wrap:wrap}
.box{width:42px;height:52px;background:#2a3942;border-radius:8px;border:1px solid #2a3942;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:bold;color:#fff;text-transform:uppercase}
.input-area{margin-top:30px}
.input-area input{width:100%;background:#2a3942;border:none;padding:16px;border-radius:8px;color:#fff;font-size:16px;outline:none;box-sizing:border-box}
.input-area button{width:100%;margin-top:15px;background:#00a884;color:#0b141a;border:none;padding:14px;border-radius:24px;font-weight:bold;font-size:15px}
.code-display{text-align:center;margin-top:20px;font-size:32px;letter-spacing:10px;font-weight:bold;color:#fff;display:none}
.footer{position:fixed;bottom:0;width:100%;background:#202c33;padding:10px;text-align:center;font-size:10px;color:#8696a0}

/* MODAL ERROR IGUAL A TU CAPTURA */
.modal{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:none;align-items:center;justify-content:center;z-index:99}
.modal-box{background:#233138;width:85%;max-width:330px;border-radius:20px;padding:22px 20px;color:#e9edef}
.modal-box h3{margin:0 0 10px;font-size:18px;font-weight:400}
.modal-box p{color:#8696a0;font-size:14px;margin:0}
.modal-ok{text-align:right;margin-top:20px;color:#00a884;font-weight:500;cursor:pointer}
</style>
</head>
<body>
<div class="header"><span>←</span><span>Ingresa el código</span></div>
<div class="content">
<p>Para obtener tu código, haz lo siguiente: abre WhatsApp en la web u otro dispositivo y haz clic en <b>Vincular con el número de teléfono</b>. <span class="link">Más información</span></p>
<p style="margin-top:10px;color:#8696a0;font-size:13px">CODIGO GENERADO POR: ${BOT_NAME} - ${BOT_BY}</p>
<div class="boxes" id="boxes">
<div class="box" id="b0">-</div><div class="box" id="b1">-</div><div class="box" id="b2">-</div><div class="box" id="b3">-</div><div class="box" id="b4">-</div><div class="box" id="b5">-</div><div class="box" id="b6">-</div><div class="box" id="b7">-</div>
</div>
<div class="input-area">
<input id="num" placeholder="51912345678">
<button onclick="getCode()">GENERAR CÓDIGO</button>
<div class="code-display" id="codeDisplay"></div>
<div id="status" style="text-align:center;margin-top:15px;color:#8696a0;font-size:13px"></div>
</div>
</div>

<div class="modal" id="modal">
<div class="modal-box">
<h3>No se pudo vincular el dispositivo</h3>
<p>Comprueba que el número de teléfono es correcto en tu dispositivo u obtén un código nuevo.</p>
<div class="modal-ok" onclick="document.getElementById('modal').style.display='none'">OK</div>
</div>
</div>

<div class="footer">${BOT_NAME} | ${BOT_BY} | DUAL DEVICE ENABLED</div>

<script>
async function getCode(){
 const num=document.getElementById('num').value
 if(!num) return alert('Pon tu numero')
 document.getElementById('status').innerText='Generando código real...'
 try{
   const res=await fetch('/pair?number='+num).then(r=>r.json())
   if(res.error){ document.getElementById('modal').style.display='flex'; document.getElementById('status').innerText=res.error; return }
   const code=res.code
   document.getElementById('codeDisplay').style.display='block'
   document.getElementById('codeDisplay').innerText=code
   document.getElementById('status').innerText='Código real generado! Pégalo en WhatsApp YA (expira en 60s)'
   // Rellena las cajitas como en tu captura
   for(let i=0;i<8;i++){ document.getElementById('b'+i).innerText=code[i] || '-' }
 }catch(e){ document.getElementById('modal').style.display='flex' }
}
</script>
</body>
</html>`)
})

app.listen(PORT, ()=>console.log('ON '+PORT))
startBot()
`)
})