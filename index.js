const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const fs = require('fs')

const app = express()
const PORT = process.env.PORT || 3000
let sock
let lastPairingCode = null
let connectionStatus = "INICIANDO SISTEMA..."

const BOT_NAME = "ᴊᴋ_ʙᴏᴛꫂꤪꤨᴼᶠᶜ"
const BOT_BY = "ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ"

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info')
    const { version } = await fetchLatestBaileysVersion()

    sock = makeWASocket({
        version,
        logger: P({ level: 'silent' }),
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' }))
        },
        browser: [BOT_NAME, "Chrome", "121.0"],
        markOnlineOnConnect: false
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            const status = lastDisconnect?.error?.output?.statusCode
            console.log('Desconectado', status)
            if (status!== DisconnectReason.loggedOut) {
                connectionStatus = "REINICIANDO..."
                startBot()
            } else {
                connectionStatus = "SESION CERRADA - BORRA auth_info"
                // Borra la sesion si esta logueado mal
                if(fs.existsSync('./auth_info')) fs.rmSync('./auth_info', { recursive: true, force: true })
            }
        } else if (connection === 'open') {
            connectionStatus = "✅ CONECTADO"
            console.log('CONECTADO!')
            const myId = sock.user.id
            await sock.sendMessage(myId, { text: `╭━〔 🟢 ${BOT_NAME} 〕━╮\n┃ CONECTADO CON EXITO\n┃ ${BOT_BY}\n╰━━━━━━━━━━━━╯\n\nEscribe *.menú*` })
        }
    })

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if (!m.message || m.key.fromMe) return
        const text = m.message.conversation || m.message.extendedTextMessage?.text || ""
        const from = m.key.remoteJid
        if (text.toLowerCase() === '.menu' || text.toLowerCase() === '.menú') {
            await sock.sendMessage(from, { text: `╭━〔 ☠️ ${BOT_NAME} 〕━┈\n│ ➤.ping\n│ ➤.estado\n╰ ${BOT_BY}` })
        }
        if (text.toLowerCase() === '.ping') {
            await sock.sendMessage(from, { text: `*PONG!* ${BOT_NAME} ACTIVO` })
        }
    })
}

app.use(express.json())

app.get('/pair', async (req, res) => {
    try {
        let number = req.query.number?.replace(/[^0-9]/g, '')
        if (!number) return res.json({ error: "Pon número: Ej 51912345678" })
        if (!sock) return res.json({ error: "Espera 5 segundos, el bot esta iniciando..." })

        // IMPORTANTE: El bot no debe estar registrado para pedir codigo
        if (sock.authState.creds.registered) {
            return res.json({ error: "Ya hay una sesion activa! Borra la carpeta auth_info en tu GitHub y redeploya para pedir nuevo codigo." })
        }

        // Pide el codigo rapido antes de que expire
        await new Promise(r => setTimeout(r, 2000))
        const code = await sock.requestPairingCode(number)
        lastPairingCode = code
        connectionStatus = `CODIGO REAL: ${code} PARA ${number}`
        console.log(`CODIGO REAL GENERADO: ${code}`)
        res.json({ code })
    } catch (e) {
        console.log(e)
        res.json({ error: "Error: " + e.message })
    }
})

app.get('/status', (req, res) => res.json({ status: connectionStatus, code: lastPairingCode }))

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>${BOT_NAME}</title>
<style>@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');body{margin:0;background:#000;color:#0f0;font-family:'Share Tech Mono';overflow:hidden}canvas{position:fixed;top:0;left:0;z-index:0}.box{position:relative;z-index:2;min-height:100vh;display:flex;justify-content:center;align-items:center;padding:20px}.panel{width:100%;max-width:420px;background:rgba(0,15,0,0.9);border:1px solid #0f0;box-shadow:0 0 20px #0f0;padding:25px;border-radius:12px}h1{text-align:center;font-size:22px;text-shadow:0 0 10px #0f0}input{width:100%;background:#000;border:1px solid #0f0;color:#0f0;padding:14px;border-radius:6px;outline:none;box-sizing:border-box}button{width:100%;margin-top:12px;background:#0f0;color:#000;border:none;padding:14px;font-weight:bold;cursor:pointer;border-radius:6px}button:hover{background:#fff}.codebox{margin-top:18px;background:#001100;border:1px dashed #0f0;padding:15px;text-align:center;display:none}.code{font-size:32px;letter-spacing:8px;font-weight:bold}</style></head><body><canvas id="c"></canvas><div class="box"><div class="panel"><h1>${BOT_NAME}</h1><div style="text-align:center;font-size:11px;color:#8f8;margin-bottom:15px">${BOT_BY} - FIXED V3</div><input id="num" placeholder="51912345678"><button onclick="getCode()">[ GENERAR CODIGO REAL ]</button><div class="codebox" id="codebox"><div style="font-size:12px">TU CODIGO:</div><div class="code" id="code">--------</div><div style="font-size:10px;margin-top:8px;color:#fff">WhatsApp > Vincular dispositivo > Vincular con numero<br><b style="color:red">¡TIENES SOLO 60 SEGUNDOS!</b></div></div><div id="status" style="margin-top:12px;font-size:11px;text-align:center">STATUS: INICIANDO...</div></div></div><script>const c=document.getElementById('c'),ctx=c.getContext('2d');c.width=innerWidth;c.height=innerHeight;const letters="01";const font=14,cols=Math.floor(c.width/font),drops=Array(cols).fill(1);setInterval(()=>{ctx.fillStyle="rgba(0,0,0,0.05)";ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle="#0f0";ctx.font=font+"px monospace";drops.forEach((y,i)=>{ctx.fillText(letters[Math.floor(Math.random()*letters.length)],i*font,y*font);if(y*font>c.height&&Math.random()>0.975)drops[i]=0;drops[i]++})},35);async function getCode(){const num=document.getElementById('num').value;if(!num)return alert('Pon tu numero!');const res=await fetch('/pair?number='+num).then(r=>r.json());if(res.error){alert(res.error);return}document.getElementById('codebox').style.display='block';document.getElementById('code').innerText=res.code;}setInterval(async()=>{const s=await fetch('/status').then(r=>r.json());document.getElementById('status').innerText="STATUS: "+s.status;},3000);</script></body></html>`)
})

app.listen(PORT, () => console.log('Panel en ' + PORT))
startBot()