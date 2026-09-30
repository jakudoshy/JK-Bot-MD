const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')

const app = express()
const PORT = process.env.PORT || 3000
let sock
let lastPairingCode = null
let connectionStatus = "INICIANDO SISTEMA..."

const BOT_NAME = "ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ"
const BOT_BY = "ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ"

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info')
    const { version } = await fetchLatestBaileysVersion()

    sock = makeWASocket({
        version,
        logger: P({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: [BOT_NAME, "Chrome", "1.0"]
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
            connectionStatus = "DESCONECTADO - RECONECTANDO..."
            if (shouldReconnect) startBot()
        } else if (connection === 'open') {
            connectionStatus = "CONECTADO - SISTEMA ACTIVO ✓"
            console.log('BOT CONECTADO')

            const myId = sock.user.id
            const welcome = `╭━〔 🟢 ${BOT_NAME} 〕━╮
┃
┃ 👁️‍🗨️ *ACCESO CONCEDIDO*
┃ 🧠 *Usuario:* ${myId.split('@')[0]}
┃ 💀 *${BOT_BY}*
┃
┃ *SISTEMA INICIADO CORRECTAMENTE*
┃
┃ Escribe los siguientes comandos:
┃
┃ ➤ *.menú* - Menú principal
┃ ➤ *.ping* - Velocidad
┃ ➤ *.estado* - Estado del bot
┃
╰━━━━━━━━━━━━━━━━━━━━━━━╯

[√] Root access: GRANTED
[√] Dual Device: ENABLED`

            await sock.sendMessage(myId, { text: welcome })
        }
    })

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if (!m.message || m.key.fromMe) return
        const text = m.message.conversation || m.message.extendedTextMessage?.text || ""
        const from = m.key.remoteJid

        if (text.toLowerCase() === '.menu' || text.toLowerCase() === '.menú') {
            const menu = `
╭━〔 ☠️ ${BOT_NAME} 〕━┈
│
│  *» SISTEMA PRINCIPAL*
│  ➤ .ping
│  ➤ .estado
│  ➤ .owner
│
│  ╰  ${BOT_BY}
╰━━━━━━━━━━━━━━━━━━━━━
`
            await sock.sendMessage(from, { text: menu })
        }
        if (text.toLowerCase() === '.ping') {
            await sock.sendMessage(from, { text: `*PONG!* 🏴‍☠️\n${BOT_NAME} ACTIVO\n*${BOT_BY}*` })
        }
    })
}

app.use(express.json())

app.get('/pair', async (req, res) => {
    try {
        const number = req.query.number?.replace(/[^0-9]/g, '')
        if (!number || number.length < 8) return res.json({ error: "Pon tu numero con codigo pais. Ej: 51912345678" })
        if (!sock) return res.json({ error: "El bot aun no inicia, espera 10 seg" })
        const code = await sock.requestPairingCode(number)
        lastPairingCode = code
        connectionStatus = `CODIGO GENERADO: ${code}`
        res.json({ code: code })
    } catch (e) {
        res.json({ error: e.message })
    }
})

app.get('/status', (req, res) => {
    res.json({ status: connectionStatus, code: lastPairingCode })
})

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${BOT_NAME} - ${BOT_BY}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');
body{margin:0;background:#000;color:#00ff00;font-family:'Share Tech Mono',monospace;overflow:hidden}
canvas{position:fixed;top:0;left:0;z-index:0}
.box{position:relative;z-index:2;min-height:100vh;display:flex;justify-content:center;align-items:center;padding:20px}
.panel{width:100%;max-width:420px;background:rgba(0,15,0,0.85);border:1px solid #00ff00;box-shadow:0 0 20px #00ff00, inset 0 0 15px rgba(0,255,0,0.2);padding:25px;border-radius:12px;backdrop-filter:blur(5px)}
h1{margin:0;text-align:center;font-size:24px;text-shadow:0 0 10px #00ff00;letter-spacing:2px}
.sub{text-align:center;color:#8f8;font-size:11px;margin:5px 0 20px;letter-spacing:2px}
.term{background:#000;border:1px solid #0f0;padding:12px;font-size:12px;height:85px;overflow:hidden;margin-bottom:15px;color:#0f0}
input{width:100%;background:#000;border:1px solid #0f0;color:#0f0;padding:14px;border-radius:6px;outline:none;font-family:inherit;font-size:16px;box-sizing:border-box}
button{width:100%;margin-top:12px;background:#00ff00;color:#000;border:none;padding:14px;font-weight:bold;font-family:inherit;letter-spacing:2px;cursor:pointer;border-radius:6px}
button:hover{background:#fff;box-shadow:0 0 20px #0f0}
.codebox{margin-top:18px;background:#001100;border:1px dashed #0f0;padding:15px;text-align:center;display:none}
.code{font-size:32px;letter-spacing:8px;font-weight:bold;text-shadow:0 0 15px #0f0}
.status{margin-top:12px;font-size:11px;color:#8f8;text-align:center}
</style>
</head>
<body>
<canvas id="c"></canvas>
<div class="box">
<div class="panel">
<h1>${BOT_NAME}</h1>
<div class="sub">[ ${BOT_BY} ]</div>
<div class="term" id="term">
> Initializing ${BOT_NAME}...<br>
> Bypassing encryption... OK<br>
> Loading modules... OK<br>
> <span style="color:#fff">Esperando numero...</span>
</div>
<input id="num" placeholder="51912345678 (con codigo pais)">
<button onclick="getCode()">[ GENERAR CODIGO DE 8 DIGITOS ]</button>
<div class="codebox" id="codebox">
<div style="font-size:12px">TU CODIGO REAL ES:</div>
<div class="code" id="code">--------</div>
<div style="font-size:11px;margin-top:8px;color:#fff">Ve a WhatsApp > Dispositivos vinculados > Vincular con numero</div>
</div>
<div class="status" id="status">STATUS: INICIANDO...</div>
<div style="margin-top:20px;font-size:10px;text-align:center;opacity:0.6">☠️ ${BOT_BY} | DUAL DEVICE ENABLED</div>
</div>
</div>
<script>
const c=document.getElementById('c'),ctx=c.getContext('2d');
c.width=window.innerWidth;c.height=window.innerHeight;
const letters="010101${BOT_NAME}01";
const font=14,cols=Math.floor(c.width/font),drops=Array(cols).fill(1);
function draw(){
ctx.fillStyle="rgba(0,0,0,0.05)";ctx.fillRect(0,0,c.width,c.height);
ctx.fillStyle="#0f0";ctx.font=font+"px monospace";
drops.forEach((y,i)=>{
const text=letters[Math.floor(Math.random()*letters.length)];
ctx.fillText(text,i*font,y*font);
if(y*font>c.height && Math.random()>0.975) drops[i]=0;
drops[i]++
})
}
setInterval(draw,35);
async function getCode(){
const num=document.getElementById('num').value;
if(!num) return alert('Pon tu numero!');
document.getElementById('term').innerHTML += "<br>> Solicitando codigo para "+num+"...";
const res=await fetch('/pair?number='+num).then(r=>r.json());
if(res.error){alert(res.error); return}
document.getElementById('codebox').style.display='block';
document.getElementById('code').innerText=res.code;
document.getElementById('term').innerHTML += "<br><span style='color:#fff'>> CODIGO: "+res.code+" GENERADO!</span>";
}
setInterval(async()=>{
const s=await fetch('/status').then(r=>r.json());
document.getElementById('status').innerText="STATUS: "+s.status;
},3000);
</script>
</body>
</html>
    `)
})

app.listen(PORT, () => console.log(`Web en puerto ${PORT}`))
startBot()
`)