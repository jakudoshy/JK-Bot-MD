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
let pendingWelcome = false

const BOT_NAME = "JAKUDOSHY BOT"
const OWNER = "JAKUDOSHY"
const CANAL = "https://t.me/gg_no_root"

async function IA_ULTRA(texto){
    const encoded = encodeURIComponent(texto.trim())
    try{
        const r = await axios.get(`https://text.pollinations.ai/${encoded}`, {
            headers:{'User-Agent':'Mozilla/5.0'},
            params:{model:'openai', system:`Eres ${BOT_NAME} de ${OWNER}. Responde en español, corto, útil, bacano.`},
            timeout: 15000
        })
        if(typeof r.data === 'string' && r.data.length > 5) return r.data
    }catch{}
    try{
        const { data } = await axios.get(`https://text.pollinations.ai/${encoded}?model=mistral`, {timeout:15000})
        if(typeof data === 'string' && data.length > 5) return data
    }catch{}
    try{
        const { data } = await axios.get(`https://api.siputzx.my.id/api/ai/gpt3?content=${encoded}`, {timeout:15000})
        if(data?.data) return data.data
    }catch{}
    return "IA saturada 1 seg, vuelve a escribir.ia bro"
}

// MENSAJE DE BIENVENIDA EXOTICO QUE LE LLEGA A SU PRIVADO
async function mandarBienvenida(){
    if(!sock?.user?.id) return
    const jid = sock.user.id
    // Mensaje bacano con lineas exoticas
    const welcome = `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃ ✨ ʙɪᴇɴᴠᴇɴɪᴅᴏ ᴀ ᴊᴋ ʙᴏᴛ ✨ ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

┏━━━━━━━━━━━━━━━━━━━━┓
┃ 👑 𝗧𝗲 𝗵𝗮𝘀 𝘂𝗻𝗶𝗱𝗼 𝗮𝗹 𝗝𝗞
┃ 🚀 𝗦𝗶𝘀𝘁𝗲𝗺𝗮 𝗝𝗔𝗞𝗨𝗗𝗢𝗦𝗛𝗬
┃ 🔓 𝗧𝗼𝗱𝗼 𝗗𝗲𝘀𝗯𝗹𝗼𝗾𝘂𝗲𝗮𝗱𝗼
┗━━━━━━━━━━━━━━━━━━━━┛

╭─〔 🤖 𝗙𝗨𝗡𝗖𝗜𝗢𝗡𝗘𝗦 〕─
│
│ ➤.𝗶𝗮 + 𝗽𝗿𝗲𝗴𝘂𝗻𝘁𝗮
│ ➤.𝗶𝗶 + 𝗽𝗿𝗲𝗴𝘂𝗻𝘁𝗮
│ ➤.𝗺𝗲𝗻𝘂 - 𝘃𝗲𝗿 𝘁𝗼𝗱𝗼
│
│ 𝗘𝗷𝗲𝗺𝗽𝗹𝗼𝘀:
│ •.𝗶𝗮 𝗾𝘂𝗲 𝗲𝘀 𝗷𝗮𝘃𝗮𝘀𝗰𝗿𝗶𝗽𝘁
│ •.𝗶𝗮 𝗵𝗮𝘇𝗺𝗲 𝘂𝗻 𝗽𝗼𝗲𝗺𝗮
│ •.𝗶𝗮 𝗰𝗼𝗺𝗼 𝗵𝗮𝗰𝗸𝗲𝗮𝗿
│
╰────────────────

┏━━━━━━━━━━━━━━━━━━━━┓
┃ 📡 𝗖𝗮𝗻𝗮𝗹: @𝗴_𝗻𝗼_𝗿𝗼𝗼𝘁
┃ 👑 𝗢𝘄𝗻𝗲𝗿: ${OWNER}
┃ ⚡ 𝗜𝗔 𝗜𝗹𝗶𝗺𝗶𝘁𝗮𝗱𝗮 𝘆 𝗚𝗿𝗮𝘁𝗶𝘀
┗━━━━━━━━━━━━━━━━━━━━┛

> 𝗘𝘀𝗰𝗿𝗶𝗯𝗲.𝗶𝗮 + 𝗹𝗼 𝗾𝘂𝗲 𝗾𝘂𝗶𝗲𝗿𝗮𝘀 𝘆 𝘁𝗲 𝗿𝗲𝘀𝗽𝗼𝗻𝗱𝗼 𝗮𝗹 𝘁𝗼𝗾𝘂𝗲 𝗯𝗿𝗼 🔥
> 𝗙𝘂𝗻𝗰𝗶𝗼𝗻𝗮 𝗲𝗻 𝘁𝘂 𝗺𝗶𝘀𝗺𝗼 𝗰𝗵𝗮𝘁 (𝗧ú)
`
    try{
        await new Promise(r=>setTimeout(r,3000))
        await sock.sendMessage(jid, { text: welcome })
        console.log('✅ Bienvenida enviada a:', jid)
    }catch(e){ console.log('Error bienvenida', e.message) }
}

async function startBot(){
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info')
    const { version } = await fetchLatestBaileysVersion()
    sock = makeWASocket({
        version,
        logger: P({ level: 'silent' }),
        printQRInTerminal: false,
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })) },
        browser: ["Debian", "Chrome", "11.0"],
        getMessage: async()=>undefined,
        markOnlineOnConnect: false
    })
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', async (u)=>{
        const { connection, lastDisconnect } = u
        if(connection === 'close' && lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut){
            setTimeout(()=>startBot(),2500)
        }
        if(connection === 'open'){
            console.log('✅ CONECTADO:', sock.user?.id)
            // SI HAY UN REGISTRO NUEVO PENDIENTE, MANDA BIENVENIDA A SU PRIVADO
            if(pendingWelcome){
                pendingWelcome = false
                await mandarBienvenida()
            }
        }
    })

    sock.ev.on('messages.upsert', async ({ messages })=>{
        const m = messages[0]
        if(!m?.message) return
        const from = m.key.remoteJid
        if(from === 'status@broadcast') return

        const txt = m.message.conversation || m.message.extendedTextMessage?.text || ""
        if(!txt) return
        const lower = txt.toLowerCase().trim()

        if(lower === '.menu' || lower === 'menu'){
            return await sock.sendMessage(from, {text: `╭━━━〔 ${BOT_NAME} 〕━━━\n┃.ia + pregunta - IA infinita\n┃.ii + pregunta\n┃ Canal: ${CANAL}\n╰━━━`})
        }

        if(lower.startsWith('.ia') || lower.startsWith('.ii') || lower.startsWith('.la') || lower.startsWith('.ai')){
            let pregunta = txt.replace(/^\.(ia|ii|la|ai|gpt)/i,'').trim()
            if(!pregunta) return await sock.sendMessage(from, {text:`Usa:.ia hola`})
            await sock.sendMessage(from, {react:{text:"🧠", key:m.key}})
            try{ await sock.sendPresenceUpdate('composing', from) }catch{}
            const resp = await IA_ULTRA(pregunta)
            await sock.sendMessage(from, {text: resp})
        }
    })
}

app.use(express.json())
app.get('/pair', async(req,res)=>{
    try{
        let num = req.query.number?.replace(/[^0-9]/g,'')
        if(!num) return res.json({error:"Número inválido"})
        if(!sock){ await startBot(); await new Promise(r=>setTimeout(r,3500)) }
        const now = Date.now()
        if(lastCode && (now-lastCodeTime) < 18000) return res.json({code:lastCode})
        // MARCA QUE HAY UN NUEVO USUARIO QUE VA A RECIBIR BIENVENIDA
        pendingWelcome = true
        const code = await sock.requestPairingCode(num)
        lastCode=code; lastCodeTime=Date.now()
        return res.json({code})
    }catch{ return res.json({error:"Espera 30 seg"}) }
})

app.get('/', (req,res)=>{
res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>JAKUDOSHY</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box;font-family:'JetBrains Mono',monospace}body{background:#020602;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:18px;overflow:hidden}canvas{position:fixed;inset:0}.overlay{position:fixed;inset:0;background:radial-gradient(600px at 50% 0%, rgba(0,255,100,.14), #020602 75%)}a.tg{position:fixed;top:12px;right:12px;z-index:5;background:rgba(0,255,100,.1);border:1px solid rgba(0,255,100,.3);border-radius:20px;padding:6px 12px;font-size:10px;color:#00ff88;text-decoration:none}.boot{position:relative;z-index:2;width:100%;max-width:440px;background:rgba(10,18,12,.98);border:1px solid rgba(0,255,100,.35);border-radius:22px;padding:22px;box-shadow:0 0 50px rgba(0,255,100,.2)}.line{color:#00ff88;font-size:11px;margin:5px 0}.main{display:none}.card{background:rgba(18,28,20,.95);border:1px solid rgba(0,255,100,.25);border-radius:18px;padding:20px;text-align:center}.input{margin-top:16px;display:flex;gap:8px;background:#080c08;border:1px solid rgba(0,255,100,.3);border-radius:12px;padding:12px 14px}input{flex:1;background:transparent;border:none;outline:none;color:#fff;text-align:center;font-size:15px}.btn{width:100%;margin-top:14px;background:#00ff88;color:#000;border:none;padding:14px;border-radius:12px;font-weight:800;letter-spacing:3px;cursor:pointer}.codeBox{display:none;margin-top:14px;border:1px solid #00ff88;border-radius:14px;padding:14px;background:rgba(0,255,100,.1)}.code{font-size:28px;letter-spacing:8px;color:#fff;font-weight:800}.tuto{margin-top:16px;text-align:left;background:rgba(0,0,0,.45);border-radius:12px;padding:14px;border:1px dashed rgba(0,255,100,.25)}h4{font-size:10px;color:#00ff88;letter-spacing:3px;margin-bottom:8px}p{font-size:11px;color:#8abf95;line-height:18px}b{color:#fff}</style></head><body>
<canvas id="c"></canvas><div class="overlay"></div><a class="tg" href="${CANAL}" target="_blank">📡 t.me/gg_no_root</a>
<div class="boot" id="boot"><div id="lines"></div><div id="welcome" style="display:none;text-align:center"><h1 style="font-size:28px;letter-spacing:8px;color:#fff">JAKUDOSHY</h1><div style="font-size:10px;letter-spacing:5px;color:#00ff88;margin-top:6px">V75 AUTO-WELCOME ONLINE</div><div style="margin-top:12px;border:1px solid #00ff88;color:#00ff88;font-size:9px;letter-spacing:3px;padding:6px 14px;border-radius:20px;display:inline-block">🔓 IA + BIENVENIDA PRIVADA</div></div>
<div class="main" id="main"><div class="card"><div style="font-size:16px;letter-spacing:5px;color:#fff;font-weight:700">VINCULACIÓN</div><div style="font-size:9px;color:#00ff88">SELF-CHAT + AUTO WELCOME</div><div class="input"><span style="color:#00ff88">+</span><input id="num" placeholder="51912345678"></div><button class="btn" id="btn" onclick="gen()">GENERAR CÓDIGO</button><div class="codeBox" id="codeBox"><div style="font-size:9px;color:#00ff88;letter-spacing:3px">TU CÓDIGO BACANO</div><div class="code" id="codeText"></div><div style="font-size:9px;color:#8aaa8f;margin-top:8px">Al vincular te llega bienvenida a tu privado (Tú)</div></div><div class="tuto"><h4>📖 PASO A PASO</h4><p><b>1.</b> Pon tu número con código país</p><p><b>2.</b> Dale GENERAR CÓDIGO</p><p><b>3.</b> WhatsApp > Dispositivos vinculados > Vincular con número</p><p><b>4.</b> Pega el código</p><p><b>5.</b> Te llega bienvenida exótica a tu chat (Tú) automáticamente</p><p><b>6.</b> Escribe <b>.ia lo que quieras</b> y te responde al toque</p></div></div></div></div>
<script>
const c=document.getElementById('c'),x=c.getContext('2d');function rs(){c.width=innerWidth;c.height=innerHeight}rs();let d=new Array(Math.floor(innerWidth/14)).fill(0);function rain(){x.fillStyle='rgba(2,6,2,0.15)';x.fillRect(0,0,c.width,c.height);x.fillStyle='#00ff88';x.font='11px monospace';d.forEach((v,i)=>{x.fillText(Math.random()>.5?'1':'0',i*14,v*14);if(v*14>c.height&&Math.random()>.975)d[i]=0;d[i]++});requestAnimationFrame(rain)}rain();
const msgs=["[BOOT] Iniciando módulos...","[OK] Verificando paquetes...","[OK] Cargando IA ULTRA...","[OK] Activando auto-welcome privado...","[OK] Sistema JAKUDOSHY listo..."];
const linesEl=document.getElementById('lines');let idx=0;function typeNext(){ if(idx<msgs.length){ const div=document.createElement('div');div.className='line';div.textContent=msgs[idx];linesEl.appendChild(div);idx++;setTimeout(typeNext,320);}else{ setTimeout(()=>{linesEl.style.display='none';document.getElementById('welcome').style.display='block';setTimeout(()=>{document.getElementById('welcome').style.display='none';document.getElementById('main').style.display='block';},900)},600)}}typeNext();
async function gen(){ const n=document.getElementById('num').value.trim(); if(!n) return alert('Pon tu número'); const b=document.getElementById('btn'); b.innerText='GENERANDO...'; b.disabled=true; try{ const r=await fetch('/pair?number='+encodeURIComponent(n)).then(r=>r.json()); if(r.error){alert(r.error);b.innerText='GENERAR CÓDIGO';b.disabled=false;return;} document.getElementById('codeText').innerText=r.code; document.getElementById('codeBox').style.display='block'; b.innerText=r.code; }catch{alert('Error'); b.innerText='GENERAR CÓDIGO'; b.disabled=false;}}
</script></body></html>`)
})

app.listen(PORT, ()=>{ console.log('V75 AUTO-WELCOME ONLINE'); startBot() })