const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const fs = require('fs')

const app = express()
const PORT = process.env.PORT || 3000
let sock = null

const BOT_NAME = "ᴊᴋ_ʙᴏᴛ"
const BOT_BY = "ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏ"
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
            browser: ["Ubuntu", "Chrome", "20.0.04"],
            syncFullHistory: false,
            markOnlineOnConnect: true,
            getMessage: async()=>undefined
        })
        sock.ev.on('creds.update', saveCreds)
        sock.ev.on('connection.update', async (u)=>{
            const { connection, lastDisconnect } = u
            if(connection === 'close'){
                const r = lastDisconnect?.error?.output?.statusCode
                if(r!==DisconnectReason.loggedOut) setTimeout(()=>startBot(),3000)
                else { try{fs.rmSync('./auth_info',{recursive:true,force:true})}catch{}; setTimeout(()=>startBot(),2000) }
            }
            if(connection === 'open'){
                try{
                    await sock.sendMessage(sock.user.id, { text: `${BOT_NAME}\n${BOT_BY}\n\nconectado\ncanal: ${CHANNEL}\n.menu` })
                }catch{}
            }
        })
        sock.ev.on('messages.upsert', async ({ messages, type })=>{
            if(type!=='notify') return
            const m = messages[0]
            if(!m || !m.message || m.key.fromMe) return
            if(m.key.remoteJid==='status@broadcast') return
            const text = (m.message.conversation || m.message.extendedTextMessage?.text || "").toLowerCase().trim()
            if(!text) return
            const from = m.key.remoteJid
            await sock.readMessages([m.key])
            if(text==='.menu') await sock.sendMessage(from,{text:`${BOT_NAME}\n${BOT_BY}\n\n.menu\n.ping\n.estado\n.creador`},{quoted:m})
            if(text==='.ping') await sock.sendMessage(from,{text:`pong ${BOT_NAME} activo`},{quoted:m})
        })
    }catch(e){ setTimeout(()=>startBot(),4000) }
}

app.use(express.json())

// ESTO AHORA SI MANDA CODIGO 100% - ARREGLADO
app.get('/pair', async(req,res)=>{
    try{
        let num = req.query.number?.replace(/[^0-9]/g,'')
        if(!num || num.length < 8) return res.json({error:"Pon numero con codigo pais Ej: 51912345678"})
        if(!sock) return res.json({error:"Bot iniciando espera 3s y reintenta"})

        // si ya esta vinculado lo resetea limpio
        if(fs.existsSync('./auth_info/creds.json')){
            try{
                const c = JSON.parse(fs.readFileSync('./auth_info/creds.json','utf8'))
                if(c.registered){
                    fs.rmSync('./auth_info',{recursive:true,force:true})
                    await new Promise(r=>setTimeout(r,1500))
                    await startBot()
                    await new Promise(r=>setTimeout(r,3500))
                }
            }catch{}
        }

        if(!sock) return res.json({error:"Reiniciando, intenta en 4s"})
        const code = await sock.requestPairingCode(num)
        console.log('CODIGO GENERADO:', code, 'para', num)
        return res.json({code})
    }catch(e){
        console.log('Error pair:', e)
        return res.json({error: e.message || "Error genera codigo"})
    }
})

app.get('/', (req,res)=>{
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>${BOT_NAME}</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:'JetBrains Mono',monospace}
body{background:#020403;overflow:hidden;height:100vh;color:#8a9aa8}
canvas{position:fixed;inset:0;z-index:0}
.overlay{position:fixed;inset:0;background:radial-gradient(800px at 50% 0%, rgba(0,255,100,.08) 0%, rgba(0,0,0,.9) 70%);z-index:1}
#loader{position:fixed;inset:0;z-index:10;display:flex;align-items:center;justify-content:center;flex-direction:column;background:#020403;transition:.6s}
.load-text{font-size:11px;letter-spacing:4px;color:#00ff88;margin-top:16px}
.bar{width:220px;height:2px;background:#0a1a10;margin-top:12px;border-radius:10px;overflow:hidden}
.fill{height:100%;width:0%;background:#00ff88;box-shadow:0 0 10px #00ff88;transition:.1s}
.pct{font-size:22px;color:#fff;font-weight:700;margin-top:10px;letter-spacing:2px}
.main{position:relative;z-index:2;display:none;min-height:100vh;padding:20px;align-items:center;justify-content:center;flex-direction:column}
.card{width:100%;max-width:380px;background:rgba(10,14,12,.85);backdrop-filter:blur(12px);border:1px solid rgba(0,255,136,.18);border-radius:18px;padding:22px;box-shadow:0 0 40px rgba(0,255,136,.12), inset 0 1px 0 rgba(255,255,255,.04)}
.title{text-align:center;font-size:22px;font-weight:700;color:#fff;letter-spacing:3px}
.sub{text-align:center;font-size:9px;letter-spacing:5px;color:#2a4a3a;margin-top:6px}
.input{margin-top:18px;display:flex;align-items:center;gap:10px;background:rgba(0,0,0,.6);border:1px solid rgba(0,255,136,.15);border-radius:10px;padding:10px 14px;transition:.2s}
.input:focus-within{border-color:#00ff88;box-shadow:0 0 15px rgba(0,255,136,.15)}
input{flex:1;background:transparent;border:none;outline:none;color:#fff;font-size:14px;letter-spacing:1px}
.btn{width:100%;margin-top:14px;background:#00ff88;color:#000;border:none;padding:13px;border-radius:10px;font-weight:700;cursor:pointer;letter-spacing:1px;transition:.2s;box-shadow:0 0 20px rgba(0,255,136,.3)}
.btn:hover{transform:translateY(-1px);box-shadow:0 0 30px rgba(0,255,136,.5)}
.btn:active{transform:scale(.97)}
.codebox{display:none;margin-top:16px;background:rgba(0,255,136,.08);border:1px solid #00ff88;border-radius:12px;padding:16px;text-align:center;animation:pop .3s}
@keyframes pop{0%{transform:scale(.9);opacity:0}100%{transform:scale(1);opacity:1}}
.code{font-size:32px;letter-spacing:12px;color:#fff;font-weight:700;text-shadow:0 0 15px #00ff88}
.hint{font-size:10px;color:#4a6a5a;margin-top:8px}
.foot{margin-top:16px;text-align:center;font-size:9px;color:#1e3a2a;letter-spacing:3px}
.chan{position:fixed;right:12px;bottom:12px;z-index:3;background:rgba(10,14,12,.9);border:1px solid rgba(0,255,136,.2);border-radius:20px;padding:6px 12px;display:flex;align-items:center;gap:8px;text-decoration:none;font-size:10px;color:#5a7a6a;backdrop-filter:blur(8px)}
.chan:hover{border-color:#00ff88;color:#00ff88}
</style></head><body>
<canvas id="rain"></canvas>
<div class="overlay"></div>

<div id="loader">
<div style="width:48px;height:48px;border:1px solid #00ff88;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#00ff88;font-weight:700;box-shadow:0 0 20px rgba(0,255,136,.3)">JK</div>
<div class="pct" id="pct">0%</div>
<div class="load-text" id="loadText">iniciando sistema</div>
<div class="bar"><div class="fill" id="fill"></div></div>
</div>

<a href="${CHANNEL}" target="_blank" class="chan">${BOT_BY} <span style="color:#00ff88">></span></a>

<div class="main" id="main">
<div class="card">
<div class="title">${BOT_NAME}</div>
<div class="sub">${BOT_BY}</div>

<div class="input"><span style="color:#00ff88">+</span><input id="num" placeholder="51912345678"><span style="color:#00ff88;font-size:8px">●</span></div>
<button class="btn" id="btn" onclick="getCode()">generar codigo</button>

<div class="codebox" id="box">
<div style="font-size:8px;letter-spacing:4px;color:#00ff88">codigo</div>
<div class="code" id="code">--------</div>
<div class="hint" id="st">copia y pega en whatsapp > dispositivos > vincular con numero</div>
</div>

<div class="foot">t.me/gg_no_root • ${BOT_BY} • 2026</div>
</div>
</div>

<script>
// LLUVIA DE LETRAS VERDE MATRIX
const c=document.getElementById('rain'),ctx=c.getContext('2d');
function resize(){c.width=innerWidth;c.height=innerHeight} resize(); window.onresize=resize;
const chars="01${BOT_NAME}XYZ${BOT_BY}0101";
const cols=Math.floor(innerWidth/14); const drops=new Array(cols).fill(1);
function draw(){
 ctx.fillStyle='rgba(2,4,3,0.08)'; ctx.fillRect(0,0,c.width,c.height);
 ctx.fillStyle='#00ff88'; ctx.font='12px JetBrains Mono';
 for(let i=0;i<drops.length;i++){
  const t=chars[Math.floor(Math.random()*chars.length)];
  ctx.fillText(t,i*14,drops[i]*14);
  if(drops[i]*14>c.height && Math.random()>.975) drops[i]=0;
  drops[i]++;
 }
 requestAnimationFrame(draw);
} draw();

// CARGA 1-100
const pctEl=document.getElementById('pct'),fill=document.getElementById('fill'),txt=document.getElementById('loadText');
const frases=["iniciando kernel","cargando modulos jk","verificando sistema","conectando canal","anti crash ok","sistema listo"];
let p=0, fi=0;
function load(){
 if(p<100){
  p+= Math.random()*7+2; if(p>100) p=100;
  pctEl.innerText=Math.floor(p)+"%"; fill.style.width=p+"%";
  if(fi<frases.length && p> (fi+1)*(100/frases.length)){ txt.innerText=frases[fi]; fi++; }
  setTimeout(load, 60);
 }else{
  document.getElementById('loader').style.opacity="0";
  setTimeout(()=>{document.getElementById('loader').style.display="none"; document.getElementById('main').style.display="flex"},500);
 }
} load();

async function getCode(){
 const n=document.getElementById('num').value.trim();
 if(!n) return alert('pon numero');
 const btn=document.getElementById('btn'); const box=document.getElementById('box');
 btn.innerText='generando...'; btn.disabled=true;
 document.getElementById('st').innerText='generando codigo...';
 try{
  const r=await fetch('/pair?number='+encodeURIComponent(n)).then(r=>r.json());
  if(r.error){ alert(r.error); btn.innerText='generar codigo'; btn.disabled=false; document.getElementById('st').innerText=r.error; return; }
  document.getElementById('code').innerText=r.code;
  box.style.display='block';
  document.getElementById('st').innerText='codigo: '+r.code+' - pega YA en whatsapp';
  btn.innerText='codigo '+r.code;
  setTimeout(()=>{btn.innerText='generar codigo'; btn.disabled=false},5000);
 }catch(e){ alert('error conexion'); btn.innerText='generar codigo'; btn.disabled=false; }
}
</script></body></html>`)
})

process.on('uncaughtException', e=>console.log(e.message))
process.on('unhandledRejection', e=>console.log(e.message))
app.listen(PORT, ()=>{ console.log('listo '+PORT); startBot() })