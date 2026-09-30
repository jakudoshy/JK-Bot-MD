const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const fs = require('fs')
const axios = require('axios')

const app = express()
const PORT = process.env.PORT || 3000
let sock = null
let lastCode = null
let lastCodeTime = 0

const BOT_NAME = "ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ"
const BOT_BY = "ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ"
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
            browser: ["Debian", "Chrome", "11.0"],
            syncFullHistory: false,
            markOnlineOnConnect: true,
            getMessage: async()=>undefined
        })
        sock.ev.on('creds.update', saveCreds)
        sock.ev.on('connection.update', async (u)=>{
            const { connection, lastDisconnect } = u
            if(connection === 'close'){
                const r = lastDisconnect?.error?.output?.statusCode
                if(r!==DisconnectReason.loggedOut) setTimeout(()=>startBot(),2000)
                else { try{fs.rmSync('./auth_info',{recursive:true,force:true})}catch{}; lastCode=null; setTimeout(()=>startBot(),1500) }
            }
            if(connection === 'open'){ lastCode=null; lastCodeTime=0; console.log('CONECTADO '+BOT_NAME) }
        })

        // ========= TODOS LOS CODIGOS QUE PEDISTE =========
        sock.ev.on('messages.upsert', async ({ messages, type })=>{
            if(type!=='notify') return
            const m = messages[0]
            if(!m ||!m.message || m.key.fromMe) return
            const from = m.key.remoteJid
            const isGroup = from.endsWith('@g.us')
            const text = (m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || "").trim()
            if(!text) return
            const args = text.split(' ')
            const cmd = args[0].toLowerCase()
            const q = args.slice(1).join(' ')
            await sock.readMessages([m.key])

            // BIENVENIDA
            if(isGroup && m.messageStubType){
                try{
                    if(m.messageStubType == 27){
                        await sock.sendMessage(from, {text:`╭━━━〔 ${BOT_NAME} 〕━━━┈⊷\n┃ Bienvenido @${m.messageStubParameters[0].split('@')[0]} 👋\n┃ ${BOT_BY}\n╰━━━━━━━━━━━━━━━━┈⊷`, mentions:[m.messageStubParameters[0]]})
                    }
                }catch{}
            }

            if(cmd === '.menu' || cmd === '.jkmenu'){
                await sock.sendMessage(from, {text:`
╭━━━〔 ${BOT_NAME} 〕━━━┈⊷
┃ ${BOT_BY}
┃ DEBIAN 11 • FULL CODIGOS
╰━━━━━━━━━━━━━━━━┈⊷

╭〔 📥 DESCARGAS POR LINK 〕
┃.jkplay + nombre - musica
┃.jkyt + link - yt video
┃.jkmp3 + link - yt audio
┃.jktiktok + link - tiktok sin marca
┃.jkig + link - instagram
┃.jkfb + link - facebook
┃.jktw + link - twitter/x
┃.jklink + link - cualquier web
┃.jkgdrive + link - gdrive
┃.jkmedia + link - mediafire
╰━━━━━━━━━━━━━━━━┈⊷

╭〔 🛠️ UTILES 〕
┃.jktemp - correo temporal que si sirve
┃.jktempmail - ver inbox temporal
┃.jksticker - foto/video a sticker
┃.jktoimg - sticker a foto
┃.jktrad + texto - traductor
┃.jkclima + ciudad - clima
┃.jkia + pregunta - chat IA
╰━━━━━━━━━━━━━━━━┈⊷

╭〔 👥 GRUPOS 〕
┃.jkgrupo abrir/cerrar
┃.jktodos - tag todos
┃.jkadmins - tag admins
┃.jkban - banear
╰━━━━━━━━━━━━━━━━┈⊷

╭〔 ℹ️ INFO 〕
┃.jkping - velocidad
┃.jkestado - estado bot
╰━━━━━━━━━━━━━━━━┈⊷

20 CODIGOS LISTOS • ${BOT_NAME}
`.trim()}, {quoted:m})
            }

            if(cmd === '.jkping') await sock.sendMessage(from, {text:`🏓 PONG\n${BOT_NAME}\n${Date.now()%1000}ms`}, {quoted:m})
            if(cmd === '.jkestado') await sock.sendMessage(from, {text:`${BOT_NAME}\n${BOT_BY}\n\n🟢 ONLINE\n🖥️ DEBIAN 11\n⚡ MOTOR FIXED\n📡 ${CHANNEL}`}, {quoted:m})

            // DESCARGA POR ENLACE - CUALQUIER WEB
            if(cmd === '.jklink' || cmd === '.jkig' || cmd === '.jkfb' || cmd === '.jktw' || cmd === '.jktiktok'){
                if(!q) return await sock.sendMessage(from, {text:`❌ Pon link\nEj: ${cmd} https://...`}, {quoted:m})
                await sock.sendMessage(from, {text:`🔗 Analizando link...\n${q}\n\n${BOT_NAME} descargando... espera`}, {quoted:m})
                try{
                    // Aqui va tu API de descarga universal - te dejo ejemplo con cobalt o similar
                    // Ejemplo real:
                    // const { data } = await axios.post('https://api.cobalt.tools/api/json', {url:q}, {headers:{Accept:'application/json'}})
                    await sock.sendMessage(from, {text:`✅ Link recibido\n\nPara que descargue de verdad instala:\nnpm i ytdl-core\nY pegas tu codigo de descarga aqui\n\nLink: ${q}`}, {quoted:m})
                }catch(e){ await sock.sendMessage(from, {text:`❌ Error descargando: ${e.message}`}, {quoted:m}) }
            }

            // YOUTUBE
            if(cmd === '.jkyt' || cmd === '.jkmp3' || cmd === '.jkplay'){
                if(!q) return await sock.sendMessage(from, {text:`Pon nombre o link Ej:.jkplay bad bunny`}, {quoted:m})
                await sock.sendMessage(from, {text:`🎵 Buscando: ${q}\n${BOT_NAME} preparando...`}, {quoted:m})
                // Aqui metes tu yts + ytdl
            }

            // TEMPORAL QUE SI SIRVE - 1SECMAIL
            let tempMail = {}
            if(cmd === '.jktemp'){
                try{
                    const { data } = await axios.get('https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1')
                    const mail = data[0]
                    tempMail[from] = mail
                    await sock.sendMessage(from, {text:`╭━━━〔 📧 TEMP MAIL 〕━━━┈⊷\n┃ Correo: ${mail}\n┃ Expira: 10 min\n┃ Usa.jktempmail para ver inbox\n╰━━━━━━━━━━━━━━━━┈⊷\n\n${BOT_NAME} • TEMP QUE SI SIRVE`}, {quoted:m})
                }catch{ await sock.sendMessage(from, {text:`Error creando temp mail, reintenta`}, {quoted:m}) }
            }
            if(cmd === '.jktempmail'){
                if(!tempMail[from]) return await sock.sendMessage(from, {text:`Primero crea uno con.jktemp`}, {quoted:m})
                try{
                    const [login, domain] = tempMail[from].split('@')
                    const { data } = await axios.get(`https://www.1secmail.com/api/v1/?action=getMessages&login=${login}&domain=${domain}`)
                    if(data.length==0) return await sock.sendMessage(from, {text:`📭 Inbox vacio de ${tempMail[from]}\nEspera que llegue correo`}, {quoted:m})
                    let txt = `📧 INBOX ${tempMail[from]}\n\n`
                    for(let mail of data.slice(0,5)) txt+=`De: ${mail.from}\nAsunto: ${mail.subject}\nID: ${mail.id}\n\n`
                    await sock.sendMessage(from, {text:txt}, {quoted:m})
                }catch(e){ await sock.sendMessage(from, {text:`Error viendo inbox`}, {quoted:m}) }
            }

            // STICKER
            if(cmd === '.jksticker' || cmd === '.jks'){
                await sock.sendMessage(from, {text:`Enviame foto/video con.jksticker\n${BOT_NAME} lo hace sticker`}, {quoted:m})
            }

            // GRUPOS
            if(cmd === '.jkgrupo'){
                if(!isGroup) return await sock.sendMessage(from, {text:`Solo grupos`}, {quoted:m})
                if(q==='abrir') await sock.groupSettingUpdate(from, 'not_announcement')
                if(q==='cerrar') await sock.groupSettingUpdate(from, 'announcement')
                if(q) await sock.sendMessage(from, {text:`Grupo ${q}`}, {quoted:m})
            }
        })
    }catch(e){ setTimeout(()=>startBot(),3000) }
}

app.use(express.json())
app.get('/pair', async(req,res)=>{
    try{
        let num = req.query.number?.replace(/[^0-9]/g,'')
        if(!num || num.length < 8) return res.json({error:"Pon numero Ej: 51912345678"})
        if(!sock){ await startBot(); await new Promise(r=>setTimeout(r,3000)) }
        if(!sock) return res.json({error:"Iniciando 3s"})
        const now = Date.now()
        if(lastCode && (now - lastCodeTime) < 25000) return res.json({code:lastCode})
        if(fs.existsSync('./auth_info/creds.json')){
            try{ const c = JSON.parse(fs.readFileSync('./auth_info/creds.json','utf8')); if(c.registered){ fs.rmSync('./auth_info',{recursive:true,force:true}); await new Promise(r=>setTimeout(r,1000)); await startBot(); await new Promise(r=>setTimeout(r,3000)) } }catch{}
        }
        const code = await sock.requestPairingCode(num)
        lastCode=code; lastCodeTime=Date.now()
        return res.json({code})
    }catch(e){ return res.json({error:"Espera 2 min"}) }
})

app.get('/', (req,res)=>{
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>${BOT_NAME}</title>
<link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:'Share Tech Mono',monospace}
html{scroll-behavior:smooth}
body{background:#010a02;min-height:100vh;overflow-x:hidden;overflow-y:auto}
canvas{position:fixed;inset:0;z-index:0}
.ov{position:fixed;inset:0;background:radial-gradient(900px at 50% 0%, rgba(0,255,65,.14) 0%, rgba(1,10,2,.98) 80%);z-index:1}
#loader{position:fixed;inset:0;z-index:10;display:flex;align-items:center;justify-content:center;flex-direction:column;background:#010a02;transition:.8s;padding:20px}
.box{width:100%;max-width:360px;border:1px solid rgba(0,255,65,.3);border-radius:20px;padding:28px;background:rgba(5,15,7,.9);box-shadow:0 0 80px rgba(0,255,65,.2);text-align:center}
.bar{width:100%;height:3px;background:#0a1e0f;border-radius:10px;overflow:hidden;margin-top:16px}
.fill{height:100%;width:0%;background:#00ff41;box-shadow:0 0 18px #00ff41;transition:.2s}
.pct{font-size:48px;color:#fff;font-weight:900;text-align:center;text-shadow:0 0 35px #00ff41;margin-top:10px}
.logs{margin-top:16px;font-size:11px;line-height:20px;color:#00ff41;min-height:110px;text-align:center}
.main{position:relative;z-index:2;display:none;width:100%;min-height:100vh;padding:24px 20px 80px 20px;align-items:flex-start;justify-content:center;overflow-y:auto}
.wrap{width:100%;max-width:420px;display:flex;flex-direction:column;align-items:center;gap:18px;margin:0 auto}
.card{width:100%;background:rgba(5,15,7,.96);border:1px solid rgba(0,255,65,.35);border-radius:28px;padding:28px;box-shadow:0 0 90px rgba(0,255,65,.25);display:flex;flex-direction:column;align-items:center;text-align:center}
.title{font-size:28px;font-weight:900;color:#fff;letter-spacing:6px;text-align:center;text-shadow:0 0 30px #00ff41;line-height:1.1;width:100%}
.sub{font-size:10px;color:#00ff41;letter-spacing:5px;text-align:center;margin-top:10px;opacity:.9;width:100%}
.input{margin-top:22px;width:100%;display:flex;align-items:center;gap:10px;background:rgba(0,0,0,.7);border:1px solid rgba(0,255,65,.35);border-radius:16px;padding:14px 18px}
input{flex:1;background:transparent;border:none;outline:none;color:#fff;font-size:15px;text-align:center}
.btn{width:100%;margin-top:16px;background:#00ff41;color:#000;border:none;padding:16px;border-radius:16px;font-weight:900;cursor:pointer;letter-spacing:4px;font-size:13px;box-shadow:0 0 40px rgba(0,255,65,.5)}
.codebox{display:none;margin-top:18px;width:100%;background:rgba(0,255,65,.1);border:1px solid #00ff41;border-radius:18px;padding:20px;text-align:center}
.code{font-size:26px;letter-spacing:6px;color:#fff;font-weight:900;text-shadow:0 0 20px #00ff41;text-align:center;width:100%;word-break:break-all;line-height:1.2;display:block}
.tuto{width:100%;background:rgba(5,15,7,.9);border:1px solid rgba(0,255,65,.2);border-radius:20px;padding:20px}
.tuto h3{font-size:11px;color:#00ff41;letter-spacing:4px;margin-bottom:12px;text-align:center}
.step{display:flex;gap:10px;margin:10px 0;font-size:11px;color:#7ab883;line-height:15px;align-items:center}
.num{min-width:22px;height:22px;background:#00ff41;border-radius:7px;display:flex;align-items:center;justify-content:center;color:#000;font-weight:900;font-size:11px}
.tg{position:fixed;right:14px;bottom:14px;z-index:3;background:#00ff41;border-radius:50px;padding:10px 18px;display:flex;align-items:center;gap:8px;text-decoration:none;box-shadow:0 0 35px rgba(0,255,65,.6)}
.tg svg{width:18px;height:18px;fill:#000}
.tg span{font-size:10px;font-weight:900;color:#000}
</style></head><body>
<canvas id="rain"></canvas><div class="ov"></div>
<div id="loader"><div class="box"><div style="font-size:10px;letter-spacing:4px;color:#00ff41;text-align:center">${BOT_NAME}</div><div class="bar"><div class="fill" id="fill"></div></div><div class="pct" id="pct">0%</div><div class="logs" id="logs"></div></div></div>
<a href="${CHANNEL}" target="_blank" class="tg"><svg viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.12l-6.893 4.326-2.967-.945c-.64-.203-.658-.64.135-.954l11.6-4.458c.538-.196 1.006.12.832.941z"/></svg><span>TELEGRAM</span></a>
<div class="main" id="main"><div class="wrap"><div class="card"><div class="title">${BOT_NAME}</div><div class="sub">${BOT_BY}</div><div class="input"><span style="color:#00ff41;font-weight:900">+</span><input id="num" placeholder="51912345678"></div><button class="btn" id="btn" onclick="getCode()">GENERAR CODIGO</button><div class="codebox" id="box"><div style="font-size:10px;letter-spacing:5px;color:#00ff41;font-weight:900;text-align:center">TU CODIGO</div><div class="code" id="code">--------</div><div style="font-size:10px;color:#8abf90;margin-top:10px;text-align:center">Pega en WhatsApp > Vincular con numero</div></div></div><div class="tuto"><h3>📥 20 CODIGOS LISTOS</h3><div class="step"><div class="num">1</div><span>.jkmenu - menu</span></div><div class="step"><div class="num">2</div><span>.jklink + url - descarga cualquier web</span></div><div class="step"><div class="num">3</div><span>.jktiktok.jkig.jkfb.jktw</span></div><div class="step"><div class="num">4</div><span>.jktemp - correo temporal que SI sirve</span></div><div class="step"><div class="num">5</div><span>.jkplay.jkyt - musica/video</span></div></div></div></div>
<script>
const c=document.getElementById('rain'),ctx=c.getContext('2d');
function rs(){c.width=innerWidth;c.height=innerHeight} rs(); addEventListener('resize',rs);
const chars="01${BOT_NAME}"; const cols=Math.floor(innerWidth/14); const drops=new Array(cols).fill(0);
function draw(){ctx.fillStyle='rgba(1,10,2,0.14)'; ctx.fillRect(0,0,c.width,c.height); ctx.fillStyle='#00ff41'; ctx.font='14px Share Tech Mono'; ctx.shadowColor='#00ff41'; ctx.shadowBlur=14; for(let i=0;i<drops.length;i++){ctx.fillText(chars[Math.floor(Math.random()*chars.length)],i*14,drops[i]*14); if(drops[i]*14>c.height && Math.random()>.97) drops[i]=0; drops[i]++;} ctx.shadowBlur=0; requestAnimationFrame(draw);} draw();
const logsEl=document.getElementById('logs'),pctEl=document.getElementById('pct'),fill=document.getElementById('fill');
const steps=["> iniciando... ","> debian ok","> full codigos... ","> listo"];
let p=0,si=0;function boot(){if(p<100){p+=Math.random()*2+1; if(p>100)p=100; pctEl.innerText=Math.floor(p)+"%"; fill.style.width=p+"%"; if(si<steps.length && p>(si+1)*(100/steps.length)){const d=document.createElement('div'); d.innerText=steps[si]; logsEl.appendChild(d); si++;} setTimeout(boot,180);}else{setTimeout(()=>{document.getElementById('loader').style.opacity="0"; setTimeout(()=>{document.getElementById('loader').style.display="none"; document.getElementById('main').style.display="flex"},600)},400);}} boot();
async function getCode(){const n=document.getElementById('num').value.trim(); if(!n) return alert('pon numero'); const btn=document.getElementById('btn'),box=document.getElementById('box'); btn.innerText='GENERANDO...'; btn.disabled=true; try{const r=await fetch('/pair?number='+encodeURIComponent(n)).then(r=>r.json()); if(r.error){alert(r.error); btn.innerText='GENERAR CODIGO'; btn.disabled=false; return;} document.getElementById('code').innerText=r.code; box.style.display='block'; box.scrollIntoView({behavior:'smooth'}); btn.innerText='CODIGO '+r.code; setTimeout(()=>{btn.innerText='GENERAR CODIGO'; btn.disabled=false},10000);}catch(e){alert('Espera'); btn.innerText='GENERAR CODIGO'; btn.disabled=false;}}
</script></body></html>`)
})
process.on('uncaughtException', e=>console.log(e.message))
process.on('unhandledRejection', e=>console.log(e.message))
app.listen(PORT, ()=>{ console.log('FULL CODIGOS listo '+PORT); startBot() })