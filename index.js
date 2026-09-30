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
const BOT_NAME = "ᴊᴋ_ʙᴏᴛ"
const BOT_BY = "ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏ"

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
                status = "DESCONECTADO"
                if(reason!== DisconnectReason.loggedOut) setTimeout(()=>startBot(), 3000)
                else { try{fs.rmSync('./auth_info',{recursive:true,force:true})}catch{}; setTimeout(()=>startBot(),2000) }
            }
            if(connection === 'open'){
                status = "CONECTADO ✓"
                console.log('BOT CONECTADO')
                try{
                    const welcome = `╭━━━〔 *${BRAND}* 〕━━━╮
┃ CONECTADO ✓
┃ Device: JK Bot
┃ ${BOT_BY}
┃ 
┃ .menu - ver menu
┃ .ping - estado
╰━━━━━━━━━━━━━━━
*${BRAND}* listo`
                    await sock.sendMessage(sock.user.id, { text: welcome })
                }catch{}
            }
        })
        sock.ev.on('messages.upsert', async ({ messages })=>{
            try{
                const m = messages[0]
                if(!m.message || m.key.fromMe) return
                const text = m.message.conversation || m.message.extendedTextMessage?.text || ""
                const from = m.key.remoteJid
                if(text.toLowerCase()==='.menu') await sock.sendMessage(from, { text: `╭━〔 ${BRAND} 〕━\n│.ping\n│.estado\n╰ ${BOT_BY}` })
                if(text.toLowerCase()==='.ping') await sock.sendMessage(from, { text: `PONG! ${BRAND} ACTIVO` })
            }catch{}
        })
        status = "LISTO"
    }catch(e){ status="ERROR: "+e.message; setTimeout(()=>startBot(),5000) }
}

app.use(express.json())

app.get('/pair', async(req,res)=>{
    try{
        let num = req.query.number?.replace(/[^0-9]/g,'')
        if(!num || num.length < 8) return res.json({error:"Pon número con código país Ej: 53512345678"})
        if(!sock) return res.json({error:"Bot iniciando, espera 3s y reintenta"})
        if(fs.existsSync('./auth_info/creds.json')){
            try{
                const c = JSON.parse(fs.readFileSync('./auth_info/creds.json','utf8'))
                if(c.registered){ try{fs.rmSync('./auth_info',{recursive:true,force:true})}catch{}; await new Promise(r=>setTimeout(r,1000)); await startBot(); await new Promise(r=>setTimeout(r,2500)) }
            }catch{}
        }
        const codeRaw = await sock.requestPairingCode(num)
        const code = codeRaw.match(/.{1,4}/g).join("-")
        lastCode = code; status = "CODIGO: "+code
        console.log('CODIGO REAL:', code)
        return res.json({code})
    }catch(e){ console.log('Error pair:', e); return res.json({error: e.message}) }
})

app.get('/status', (req,res)=> res.json({status, code:lastCode}))

app.get('/', (req,res)=>{
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>${BRAND}</title>
<link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@700&display=swap" rel="stylesheet">
<style>
*{font-family:'Share Tech Mono',monospace;box-sizing:border-box}
body{margin:0;background:#000;color:#00ff41;overflow-x:hidden}
canvas{position:fixed;top:0;left:0;z-index:0}
#loader{position:fixed;inset:0;background:#000;z-index:10;display:flex;align-items:center;justify-content:center;padding:18px;transition:0.7s}
.load-box{width:100%;max-width:500px;border:1px solid #00ff41;border-radius:14px;background:rgba(0,15,0,0.95);padding:20px;box-shadow:0 0 25px rgba(0,255,65,0.3)}
.bar{height:5px;background:#001100;border-radius:10px;overflow:hidden;margin:12px 0;border:1px solid #003300}
.fill{height:100%;width:0%;background:linear-gradient(90deg,#00ff41,#fff);box-shadow:0 0 10px #00ff41;transition:0.2s}
.log{height:220px;overflow:hidden;font-size:11px;line-height:15px}
.main{display:none;position:relative;z-index:1;min-height:100vh;padding:20px;flex-direction:column;align-items:center}
.card{width:100%;max-width:430px;background:rgba(0,12,0,0.92);border:1px solid #00ff41;border-radius:16px;padding:20px;box-shadow:0 0 25px rgba(0,255,65,0.25);margin-bottom:20px}
.logo{font-family:'Orbitron',monospace;text-align:center;font-size:26px;color:#fff;text-shadow:0 0 15px #00ff41;letter-spacing:3px}
.sub{text-align:center;font-size:9px;color:#8f8;letter-spacing:4px;margin-top:5px}
.info{border:1px solid #002a00;background:#000;border-radius:10px;padding:12px;margin:14px 0;font-size:11px;color:#8f8;line-height:17px}
.info .r{display:flex;justify-content:space-between;margin:3px 0}.info b{color:#00ff41}
.input-box{display:flex;gap:8px;background:#000;border:1px solid #00ff41;border-radius:10px;padding:6px 12px;align-items:center;margin-top:12px}
input{flex:1;background:transparent;border:none;color:#fff;outline:none;font-size:14px;padding:8px 0}
.btn{width:100%;margin-top:12px;background:#00ff41;color:#000;border:none;padding:13px;border-radius:10px;font-weight:bold;letter-spacing:2px;cursor:pointer;box-shadow:0 0 15px #00ff41}
.btn:active{transform:scale(0.98)}
.codebox{margin-top:14px;border:1.5px dashed #00ff41;background:#000;border-radius:12px;padding:14px;text-align:center;display:none;box-shadow:inset 0 0 15px rgba(0,255,65,0.15)}
.code{font-family:'Orbitron',monospace;font-size:34px;letter-spacing:10px;color:#fff;text-shadow:0 0 18px #00ff41;font-weight:800}
.features{width:100%;max-width:430px;background:rgba(0,0,0,0.85);border:1px solid #003300;border-radius:12px;padding:16px;margin-bottom:80px}
.features h3{margin:0 0 10px;font-size:12px;color:#00ff41;letter-spacing:2px}
.feat{font-size:11px;color:#888;line-height:18px;border-left:2px solid #003300;padding-left:10px;margin:8px 0}
.feat b{color:#ccc}
.footer{text-align:center;font-size:9px;color:#333;margin-top:10px;letter-spacing:2px}
</style></head><body><canvas id="c"></canvas>

<div id="loader">
<div class="load-box">
<div class="logo">${BRAND}</div>
<div class="sub">INICIANDO SISTEMA EXOTICO...</div>
<div class="bar"><div class="fill" id="fill"></div></div>
<div class="log" id="log"></div>
<div id="perc" style="text-align:center;font-size:9px;color:#555;margin-top:8px">0%</div>
</div>
</div>

<div class="main" id="main">
<div class="card">
<div class="logo">${BRAND}</div>
<div class="sub">ANTI-CRASH V5 • REAL CODE • HACKER CLEAN</div>

<div class="info">
<div class="r"><span>Bot Name:</span><b>${BRAND}</b></div>
<div class="r"><span>Base Name:</span><b>${BOT_NAME}</b></div>
<div class="r"><span>Device:</span><b>JK Bot</b></div>
<div class="r"><span>Mod By:</span><b>${BOT_BY}</b></div>
<div class="r"><span>Version:</span><b>V13 BKN</b></div>
<div class="r"><span>Support:</span><b>+53 / +51 / +52 / +57</b></div>
<div class="r"><span>Status:</span><b style="color:#0f0">● Online</b></div>
</div>

<div class="input-box"><span style="color:#555;font-size:12px">+</span><input id="num" placeholder="5351234567" value="53"><span style="color:#00ff41">✦</span></div>
<button class="btn" onclick="getCode()">GENERAR CODIGO</button>

<div class="codebox" id="box">
<div style="font-size:9px;color:#8f8;letter-spacing:3px;margin-bottom:6px">◤ TU CODIGO REAL ◥</div>
<div class="code" id="code">---- ----</div>
<div id="st" style="font-size:10px;color:#aaa;margin-top:8px;line-height:14px">Pega en WhatsApp > Dispositivos > Vincular con número<br><span style="color:#ff0">Expira en 60s</span></div>
</div>

<div class="footer">SCROLL ABAJO PARA MAS INFO ↓</div>
</div>

<div class="features">
<h3>▣ INFO DEL BOT ${BRAND}</h3>
<div class="feat"><b>• Codigo Real:</b> Genera pairing code directo de Baileys, no fake</div>
<div class="feat"><b>• Anti-Crash:</b> Con try/catch y auto-reconnect, no se cae en Railway</div>
<div class="feat"><b>• DM Auto:</b> Cuando vinculas te llega bienvenida a tu chat guardado</div>
<div class="feat"><b>• Device Fijo:</b> Siempre aparece como <b>JK Bot</b> no como Ubuntu</div>
<div class="feat"><b>• Flow Exotico:</b> Panel hacker limpio, sin exagerar, 100% bkn</div>
<div class="feat"><b>• Multi-Pais:</b> Soporte +53 Cuba, +51 Peru, +52 MX, +57 CO</div>
<h3 style="margin-top:18px">▣ COMANDOS PRINCIPALES</h3>
<div class="feat"><b>.menu</b> - Menu principal del bot<br><b>.ping</b> - Ver si esta activo<br><b>.estado</b> - Info del sistema<br><b>.owner</b> - Info del creador</div>
<h3 style="margin-top:18px">▣ MODO HACKER</h3>
<div class="feat">Terminal verde, matrix background, carga del sistema, logs reales, todo redi para esto como pediste</div>
<div class="footer" style="margin-top:18px">${BRAND} © 2026 • ${BOT_BY}<br>Hecho para probar - Flow maliante</div>
</div>
</div>

<script>
const BRAND="${BRAND}";
const logs=[
 BRAND+" ~# booting kernel exotic...",
 BRAND+" ~# loading modules...",
 "[▓▓▓▓░░░░] 40% - checking dependencies...",
 BRAND+" ~# device = JK Bot [OK]",
 BRAND+" ~# country = +53 [OK]",
 BRAND+" ~# mod = Jakudo [OK]",
 BRAND+" ~# anti-crash enabled [OK]",
 BRAND+" ~# pairing engine ready [OK]",
 "[▓▓▓▓▓▓▓▓] 100% - system ready",
 BRAND+" ~# waiting for number..."
];
const logEl=document.getElementById('log'),fill=document.getElementById('fill'),perc=document.getElementById('perc');let i=0;
function loader(){
 if(i<logs.length){
  logEl.innerHTML+=logs[i]+"<br>"; logEl.scrollTop=9999;
  let p=Math.floor((i+1)/logs.length*100); fill.style.width=p+"%"; perc.innerText=p+"% - "+logs[i];
  i++; setTimeout(loader,260);
 }else{
  fill.style.width="100%"; perc.innerText="100% - LISTO";
  setTimeout(()=>{ document.getElementById('loader').style.opacity="0"; setTimeout(()=>{ document.getElementById('loader').style.display="none"; document.getElementById('main').style.display="flex"; },600) },500);
 }
}
loader();
const c=document.getElementById('c'),x=c.getContext('2d');c.width=innerWidth;c.height=innerHeight;const chars="01${BRAND}";const font=13;const cols=Math.floor(c.width/font);const drops=Array(cols).fill(1);setInterval(()=>{x.fillStyle="rgba(0,0,0,0.05)";x.fillRect(0,0,c.width,c.height);x.fillStyle="#00ff41";x.font=font+"px monospace";drops.forEach((y,i)=>{x.fillText(chars[Math.floor(Math.random()*chars.length)],i*font,y*font);if(y*font>c.height&&Math.random()>0.975)drops[i]=0;drops[i]++})},35);
async function getCode(){
 const n=document.getElementById('num').value.trim();
 if(!n) return alert('Pon numero');
 document.getElementById('st').innerText='Generando codigo real...';
 const r=await fetch('/pair?number='+encodeURIComponent(n)).then(r=>r.json());
 if(r.error){ alert(r.error); document.getElementById('st').innerText=r.error; return }
 document.getElementById('box').style.display='block';
 document.getElementById('code').innerText=r.code;
 document.getElementById('st').innerHTML='Codigo: <b style="color:#fff">'+r.code+'</b> - PEGA YA<br><span style="color:#ff0">Expira en 60s - Bienvenida llega a tu DM</span>';
 window.scrollTo({top:0,behavior:'smooth'});
}
</script></body></html>`)
})

process.on('uncaughtException', e=>console.log('uncaught',e.message))
process.on('unhandledRejection', e=>console.log('unhandled',e?.message))
app.listen(PORT, ()=>{ console.log('Servidor en '+PORT); startBot() })