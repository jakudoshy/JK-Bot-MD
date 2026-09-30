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

const BOT_NAME = "ᴊᴋ ʙᴏᴛ"
const OWNER = "JAKUDOSHY"

async function startBot(){
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info')
    const { version } = await fetchLatestBaileysVersion()
    sock = makeWASocket({
        version,
        logger: P({ level: 'silent' }),
        printQRInTerminal: false,
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })) },
        browser: ["Debian", "Chrome", "11.0"], // SOLO AQUI SE QUEDA, AFUERA NO SE VE
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
        if(connection === 'open'){
            lastCode=null; lastCodeTime=0
            try{
                const id = sock.user.id
                await sock.sendMessage(id, {
                    text: `╭━━━〔 ${BOT_NAME} 〕━━━┈⊷
┃ ✓ Vinculado correctamente
┃ Owner: ${OWNER}
┃ Bot activo
╰━━━━━━━━━━━━━━━━┈⊷

Comando:
.downlink + link

Descarga TikTok, Instagram, FB, YT`
                })
            }catch{}
        }
    })

    sock.ev.on('messages.upsert', async ({ messages })=>{
        const m = messages[0]
        if(!m ||!m.message || m.key.fromMe) return
        const from = m.key.remoteJid
        const txt = m.message.conversation || m.message.extendedTextMessage?.text || ""
        if(!txt) return
        const cmd = txt.trim().split(' ')[0].toLowerCase()
        const q = txt.trim().split(' ').slice(1).join(' ').trim()

        if(cmd === '.downlink'){
            if(!q) return await sock.sendMessage(from, {text:`Usa:\n.downlink https://...`}, {quoted:m})
            await sock.sendMessage(from, {text:`⬇️ Descargando...`}, {quoted:m})
            try{
                if(q.includes('tiktok')){
                    const { data } = await axios.get(`https://tikwm.com/api/?url=${q}`)
                    if(data.data?.play){
                        await sock.sendMessage(from, {video:{url:data.data.play}, caption:`${BOT_NAME}`}, {quoted:m})
                    }else throw 'e'
                }else{
                    const { data } = await axios.post('https://api.cobalt.tools/api/json', {url:q}, {
                        headers:{Accept:'application/json','Content-Type':'application/json'}
                    })
                    if(data.url){
                        await sock.sendMessage(from, {video:{url:data.url}, caption:`${BOT_NAME}`}, {quoted:m})
                    }else throw 'e'
                }
            }catch{
                await sock.sendMessage(from, {text:`❌ No se pudo descargar`}, {quoted:m})
            }
        }

        if(cmd === '.menu'){
            await sock.sendMessage(from, {text:`${BOT_NAME} • ${OWNER}\n\n.downlink + link`}, {quoted:m})
        }
    })
}

app.use(express.json())
app.get('/pair', async(req,res)=>{
    try{
        let num = req.query.number?.replace(/[^0-9]/g,'')
        if(!num || num.length < 8) return res.json({error:"Número inválido"})
        if(!sock){ await startBot(); await new Promise(r=>setTimeout(r,3500)) }
        const now = Date.now()
        if(lastCode && (now-lastCodeTime) < 25000) return res.json({code:lastCode})
        if(fs.existsSync('./auth_info/creds.json')){
            try{ const c = JSON.parse(fs.readFileSync('./auth_info/creds.json','utf8')); if(c.registered){ fs.rmSync('./auth_info',{recursive:true,force:true}); await new Promise(r=>setTimeout(r,1000)); await startBot(); await new Promise(r=>setTimeout(r,3500)) } }catch{}
        }
        const code = await sock.requestPairingCode(num)
        lastCode=code; lastCodeTime=Date.now()
        return res.json({code})
    }catch(e){ return res.json({error:"Espera 2 min"}) }
})

app.get('/', (req,res)=>{
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>${BOT_NAME}</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:'JetBrains Mono',monospace}
body{background:#080c08;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
canvas{position:fixed;inset:0;z-index:0}
.ov{position:fixed;inset:0;background:radial-gradient(700px at 50% 0%, rgba(0,255,80,.10) 0%, #080c08 70%);z-index:1}
.main{position:relative;z-index:2;width:100%;max-width:380px;display:flex;flex-direction:column;gap:16px}
.card{width:100%;background:rgba(16,22,17,.95);border:1px solid rgba(0,255,80,.22);border-radius:20px;padding:26px;text-align:center}
.title{font-size:26px;letter-spacing:6px;color:#fff;font-weight:700}
.sub{font-size:10px;letter-spacing:4px;color:#00ff64;margin-top:6px}
.input{margin-top:20px;display:flex;gap:8px;background:#0a0f0b;border:1px solid rgba(0,255,80,.2);border-radius:12px;padding:12px 14px}
input{flex:1;background:transparent;border:none;outline:none;color:#fff;text-align:center;font-size:14px}
.btn{width:100%;margin-top:14px;background:#00ff64;color:#000;border:none;padding:14px;border-radius:12px;font-weight:700;letter-spacing:3px;cursor:pointer}
.codebox{display:none;margin-top:16px;border:1px solid #00ff64;border-radius:14px;padding:16px;background:rgba(0,255,80,.08)}
.code{font-size:22px;letter-spacing:6px;color:#fff;font-weight:700;word-break:break-all}
.welcome{width:100%;background:rgba(0,255,100,.10);border:1px solid rgba(0,255,100,.25);border-radius:16px;padding:18px;text-align:center;display:none}
</style></head><body>
<canvas id="c"></canvas><div class="ov"></div>
<div class="main">
<div class="card">
<div class="title">${BOT_NAME}</div>
<div class="sub">${OWNER}</div>
<div class="input"><span style="color:#00ff64">+</span><input id="num" placeholder="51912345678"></div>
<button class="btn" id="btn" onclick="gen()">GENERAR</button>
<div class="codebox" id="box"><div style="font-size:9px;color:#00ff64;letter-spacing:3px">CÓDIGO</div><div class="code" id="code">--------</div></div>
</div>
<div class="welcome" id="welcome"><div style="color:#00ff64;font-size:12px;letter-spacing:2px">✓ VINCULADO</div><div style="color:#8aaa8f;font-size:11px;margin-top:6px">Bot activo<br>.downlink + link</div></div>
</div>
<script>
const c=document.getElementById('c'),x=c.getContext('2d');function r(){c.width=innerWidth;c.height=innerHeight}r();onresize=r;
let d=new Array(Math.floor(innerWidth/16)).fill(0);function l(){x.fillStyle='rgba(8,12,8,0.14)';x.fillRect(0,0,c.width,c.height);x.fillStyle='#00ff64';x.font='12px monospace';d.forEach((v,i)=>{x.fillText(Math.random()>.5?'1':'0',i*16,v*16);if(v*16>c.height&&Math.random()>.97)d[i]=0;d[i]++});requestAnimationFrame(l)}l();
async function gen(){
 const n=document.getElementById('num').value.trim(); if(!n) return alert('Pon número');
 const b=document.getElementById('btn'); b.innerText='GENERANDO...'; b.disabled=true;
 try{
  const r=await fetch('/pair?number='+encodeURIComponent(n)).then(r=>r.json());
  if(r.error){alert(r.error); b.innerText='GENERAR'; b.disabled=false; return;}
  document.getElementById('code').innerText=r.code;
  document.getElementById('box').style.display='block';
  document.getElementById('welcome').style.display='block';
  b.innerText=r.code;
  setTimeout(()=>{b.innerText='GENERAR'; b.disabled=false},12000);
 }catch{alert('Error'); b.innerText='GENERAR'; b.disabled=false;}
}
</script></body></html>`)
})

app.listen(PORT, ()=>{ console.log('JK BOT listo '+PORT); startBot() })