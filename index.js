const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const fs = require('fs')

const app = express()
const PORT = process.env.PORT || 3000
let sock = null
let lastCode = null
let lastCodeTime = 0

const BOT_NAME = "ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ"
const OWNER = "ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ"
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
            if(connection === 'open'){ lastCode=null; lastCodeTime=0; console.log('✅ JAKUDOSHY CONECTADO') }
        })
    }catch(e){ setTimeout(()=>startBot(),3000) }
}

app.use(express.json())
app.get('/pair', async(req,res)=>{
    try{
        let num = req.query.number?.replace(/[^0-9]/g,'')
        if(!num || num.length < 8) return res.json({error:"Pon tu número con código país Ej: 51912345678"})
        if(!sock){ await startBot(); await new Promise(r=>setTimeout(r,3500)) }
        if(!sock) return res.json({error:"Iniciando sistema... espera 4s"})
        const now = Date.now()
        if(lastCode && (now-lastCodeTime) < 25000) return res.json({code:lastCode})
        if(fs.existsSync('./auth_info/creds.json')){
            try{ const c = JSON.parse(fs.readFileSync('./auth_info/creds.json','utf8')); if(c.registered){ fs.rmSync('./auth_info',{recursive:true,force:true}); await new Promise(r=>setTimeout(r,1200)); await startBot(); await new Promise(r=>setTimeout(r,3500)) } }catch{}
        }
        const code = await sock.requestPairingCode(num)
        lastCode=code; lastCodeTime=Date.now()
        return res.json({code})
    }catch(e){ return res.json({error:"WhatsApp bloqueó 2 min por muchos intentos, espera 2 min exactos"}) }
})

app.get('/', (req,res)=>{
    res.send(`<!DOCTYPE html><html lang="es"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>${BOT_NAME} • ${OWNER}</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:'JetBrains Mono',monospace}
html{scroll-behavior:smooth}
body{background:#060a06;min-height:100vh;overflow-y:auto;overflow-x:hidden;display:flex;align-items:center;justify-content:center}
canvas{position:fixed;inset:0;z-index:0}
.ov{position:fixed;inset:0;background:radial-gradient(800px at 50% 0%, rgba(0,255,80,.12) 0%, rgba(6,10,6,.98) 75%);z-index:1}
.scan{position:fixed;inset:0;z-index:2;background:repeating-linear-gradient(0deg, transparent 0 2px, rgba(0,255,80,.02) 2px 3px);pointer-events:none}

/* LOADER JAKUDOSHY - TERMINAL QUE SE BORRA SOLA */
#loader{position:fixed;inset:0;z-index:20;background:#060a06;display:flex;align-items:center;justify-content:center;padding:20px;transition:.8s}
.box{width:100%;max-width:420px;border:1px solid rgba(0,255,80,.3);border-radius:20px;padding:28px;background:rgba(10,18,11,.95);box-shadow:0 0 80px rgba(0,255,80,.15);text-align:center}
.logo{width:68px;height:68px;margin:0 auto;border:1px solid rgba(0,255,80,.5);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:28px;color:#00ff64;box-shadow:0 0 30px rgba(0,255,80,.2);font-weight:700}
.bar{width:100%;height:3px;background:#0e1a0f;border-radius:10px;overflow:hidden;margin-top:20px}
.fill{height:100%;width:0%;background:#00ff64;box-shadow:0 0 15px #00ff64;transition:.15s}
.pct{margin-top:12px;color:#fff;font-size:22px;font-weight:700;letter-spacing:2px;text-shadow:0 0 15px #00ff64;text-align:center}
.terminal{margin-top:18px;background:#050805;border:1px solid rgba(0,255,80,.15);border-radius:12px;padding:14px;min-height:120px;text-align:left;overflow:hidden;position:relative}
.term-line{font-size:11px;line-height:18px;color:#00ff64;opacity:1;transition:all .4s;transform:translateX(0)}
.term-line.out{opacity:0;transform:translateX(-20px);height:0;margin:0;overflow:hidden}
.term-line.ok{color:#7aff9a}
.term-line.warn{color:#ffcc00}

/* WEB */
.main{position:relative;z-index:3;display:none;width:100%;min-height:100vh;padding:28px 20px 100px;justify-content:center;align-items:flex-start}
.wrap{width:100%;max-width:420px;margin:0 auto;display:flex;flex-direction:column;gap:18px;align-items:center}
.header{width:100%;text-align:center}
.badge{font-size:9px;letter-spacing:4px;color:#00ff64;border:1px solid rgba(0,255,80,.3);background:rgba(0,255,80,.07);padding:6px 14px;border-radius:20px;display:inline-block}
.title{margin-top:12px;font-size:32px;letter-spacing:8px;color:#fff;font-weight:700;text-align:center;line-height:1;text-shadow:0 0 30px rgba(0,255,80,.6)}
.sub{font-size:10px;letter-spacing:5px;color:#00ff64;opacity:.9;margin-top:8px;text-align:center}

.card{width:100%;background:rgba(12,18,13,.94);border:1px solid rgba(0,255,80,.2);border-radius:20px;padding:22px;display:flex;flex-direction:column;align-items:center;box-shadow:0 0 50px rgba(0,0,0,.5)}
.card h3{font-size:11px;letter-spacing:4px;color:#00ff64;text-align:center;width:100%;margin-bottom:14px}
.input-row{width:100%;display:flex;align-items:center;background:#070c08;border:1px solid rgba(0,255,80,.22);border-radius:14px;padding:14px 16px;gap:10px;transition:.2s}
.input-row:focus-within{border-color:#00ff64;box-shadow:0 0 25px rgba(0,255,80,.25)}
input{flex:1;background:transparent;border:none;outline:none;color:#fff;font-size:15px;text-align:center;letter-spacing:1px}
.btn{width:100%;margin-top:14px;background:linear-gradient(135deg,#00ff64,#00ff9a);color:#000;border:none;padding:15px;border-radius:14px;font-weight:700;letter-spacing:3px;font-size:12px;cursor:pointer;box-shadow:0 0 35px rgba(0,255,80,.5);transition:.2s}
.btn:hover{transform:translateY(-1px);box-shadow:0 0 50px rgba(0,255,80,.7)}
.btn:active{transform:scale(.97)}
.codebox{display:none;width:100%;margin-top:16px;background:rgba(0,255,80,.09);border:1px solid #00ff64;border-radius:16px;padding:18px;text-align:center;animation:pop .4s cubic-bezier(.34,1.56,.64,1)}
@keyframes pop{from{transform:scale(.85);opacity:0}to{transform:scale(1);opacity:1}}
.code{font-size:24px;letter-spacing:7px;color:#fff;font-weight:700;text-align:center;word-break:break-all;line-height:1.2;width:100%;display:block;text-shadow:0 0 20px #00ff64}

.grid{width:100%;display:grid;grid-template-columns:1fr 1fr;gap:10px}
.stat{background:rgba(12,18,13,.8);border:1px solid rgba(0,255,80,.15);border-radius:14px;padding:14px;text-align:center}
.stat b{font-size:18px;color:#fff;display:block}
.stat span{font-size:9px;color:#5a7a62;letter-spacing:2px}

.info{width:100%;background:rgba(12,18,13,.85);border:1px solid rgba(0,255,80,.15);border-radius:16px;padding:18px}
.info h4{font-size:10px;letter-spacing:3px;color:#00ff64;text-align:center;margin-bottom:12px}
.step{display:flex;gap:10px;font-size:10px;color:#8aaa8f;margin:10px 0;line-height:14px;align-items:center}
.n{width:20px;height:20px;background:rgba(0,255,80,.15);border:1px solid rgba(0,255,80,.35);color:#00ff64;display:flex;align-items:center;justify-content:center;border-radius:7px;font-size:10px;font-weight:700;flex-shrink:0}

.footer{width:100%;text-align:center;font-size:8px;letter-spacing:3px;color:#1e3a22;padding:10px}

.tg{position:fixed;right:14px;bottom:14px;z-index:4;background:#00ff64;border-radius:50px;padding:11px 18px;display:flex;align-items:center;gap:8px;text-decoration:none;box-shadow:0 0 30px rgba(0,255,80,.6);transition:.2s}
.tg:hover{transform:translateY(-2px)}
.tg svg{width:16px;height:16px;fill:#000}
.tg span{font-size:10px;font-weight:700;color:#000}
</style></head><body>
<canvas id="rain"></canvas><div class="ov"></div><div class="scan"></div>

<div id="loader">
<div class="box">
<div class="logo">JK</div>
<div style="margin-top:12px;font-size:11px;letter-spacing:5px;color:#00ff64;text-align:center">JAKUDOSHY SYSTEM</div>
<div class="bar"><div class="fill" id="fill"></div></div>
<div class="pct" id="pct">0%</div>
<div class="terminal" id="terminal"></div>
</div>
</div>

<a href="${CHANNEL}" class="tg" target="_blank"><svg viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.12l-6.893 4.326-2.967-.945c-.64-.203-.658-.64.135-.954l11.6-4.458c.538-.196 1.006.12.832.941z"/></svg><span>TELEGRAM</span></a>

<div class="main" id="main">
<div class="wrap">

<div class="header">
<div class="badge">DEBIAN 11 • ${OWNER}</div>
<div class="title">${BOT_NAME}</div>
<div class="sub">MOD BY ${OWNER} • SISTEMA OFICIAL</div>
</div>

<div class="card">
<h3>🔗 VINCULAR WHATSAPP</h3>
<div style="font-size:9px;color:#5a7a62;text-align:center;margin-bottom:10px;width:100%">INGRESA TU NÚMERO CON CÓDIGO PAÍS</div>
<div class="input-row"><span style="color:#00ff64;font-weight:700">+</span><input id="num" placeholder="51912345678" inputmode="numeric"></div>
<button class="btn" id="btn" onclick="getCode()">GENERAR CÓDIGO</button>

<div class="codebox" id="box">
<div style="font-size:9px;letter-spacing:4px;color:#00ff64">TU CÓDIGO DE VINCULACIÓN</div>
<div class="code" id="code">--------</div>
<div style="font-size:9px;color:#7aaa82;margin-top:8px;line-height:13px">⚠️ NO ES SMS<br>Copia y pega en:<br>WhatsApp > Ajustes > Dispositivos vinculados > Vincular con número</div>
</div>
</div>

<div class="grid">
<div class="stat"><b>100%</b><span>VINCULA SIEMPRE</span></div>
<div class="stat"><b>DEBIAN</b><span>SERVIDOR</span></div>
<div class="stat"><b>24/7</b><span>ONLINE</span></div>
<div class="stat"><b>JK</b><span>${OWNER}</span></div>
</div>

<div class="info">
<h4>📲 ¿CÓMO VINCULAR?</h4>
<div class="step"><div class="n">1</div><span>Escribe tu número con código país (Ej: 51912345678)</span></div>
<div class="step"><div class="n">2</div><span>Toca GENERAR CÓDIGO y cópialo</span></div>
<div class="step"><div class="n">3</div><span>Abre WhatsApp > ⋮ > Dispositivos vinculados</span></div>
<div class="step"><div class="n">4</div><span>Toca Vincular con número de teléfono y pega el código</span></div>
</div>

<div class="info">
<h4>✨ CARACTERÍSTICAS</h4>
<div class="step"><div class="n">✓</div><span>Sistema 100% en español</span></div>
<div class="step"><div class="n">✓</div><span>Vincula siempre, sin errores</span></div>
<div class="step"><div class="n">✓</div><span>Interfaz Full HD, scrolleable</span></div>
<div class="step"><div class="n">✓</div><span>Anti-bloqueo Debian 11</span></div>
<div class="step"><div class="n">✓</div><span>Código centrado, no se sale</span></div>
</div>

<div class="footer">${BOT_NAME} • MOD BY ${OWNER}<br>t.me/gg_no_root • DEBIAN 11</div>

</div>
</div>

<script>
const c=document.getElementById('rain'),ctx=c.getContext('2d');
function rs(){c.width=innerWidth;c.height=innerHeight} rs(); addEventListener('resize',rs);
const cols=Math.floor(innerWidth/16); const drops=new Array(cols).fill(0);
function draw(){ctx.fillStyle='rgba(6,10,6,0.14)'; ctx.fillRect(0,0,c.width,c.height); ctx.fillStyle='#00ff64'; ctx.font='12px JetBrains Mono'; ctx.shadowColor='#00ff64'; ctx.shadowBlur=6; for(let i=0;i<drops.length;i++){ctx.fillText(Math.random()>.5?'1':'0',i*16,drops[i]*16); if(drops[i]*16>c.height && Math.random()>.97) drops[i]=0; drops[i]++;} ctx.shadowBlur=0; requestAnimationFrame(draw);} draw();

// TERMINAL QUE SE VA BORRANDO - COMO PEDISTE
const terminal = document.getElementById('terminal');
const fill = document.getElementById('fill');
const pctEl = document.getElementById('pct');

const bootSteps = [
  {t: "> iniciando sistema...", cls:""},
  {t: "> verificando debian 11...", cls:""},
  {t: "> sistema iniciado ✓", cls:"ok"},
  {t: "> cargando módulos...", cls:""},
  {t: "> módulo whatsapp cargado", cls:"ok"},
  {t: "> módulo ${OWNER} cargado", cls:"ok"},
  {t: "> módulos cargados ✓", cls:"ok"},
  {t: "> iniciando interfaz...", cls:""},
  {t: "> interfaz lista ✓", cls:"ok"},
  {t: "> esperando número...", cls:"warn"}
];

let idx = 0;
let progress = 0;

function addLine(){
  if(idx >= bootSteps.length) return;
  const div = document.createElement('div');
  div.className = 'term-line ' + bootSteps[idx].cls;
  div.innerText = bootSteps[idx].t;
  terminal.appendChild(div);
  idx++;
  // Si hay más de 4 líneas, borra la más vieja como pediste
  if(terminal.children.length > 4){
    const old = terminal.children[0];
    old.classList.add('out');
    setTimeout(()=>{ if(old.parentNode) old.remove(); }, 400);
  }
}

function boot(){
  if(progress < 100){
    progress += Math.random()*3 + 1.2;
    if(progress>100) progress=100;
    pctEl.innerText = Math.floor(progress) + "% • ${OWNER}";
    fill.style.width = progress + "%";
    // Cada 18% agrega una línea
    if(Math.floor(progress/10) >= idx){
      addLine();
    }
    setTimeout(boot, 120);
  }else{
    addLine();
    setTimeout(()=>{
      document.getElementById('loader').style.opacity="0";
      setTimeout(()=>{
        document.getElementById('loader').style.display="none";
        document.getElementById('main').style.display="flex";
      },600);
    },600);
  }
}
boot();

async function getCode(){
 const n=document.getElementById('num').value.trim();
 if(!n) return alert('Pon tu número Ej: 51912345678');
 const btn=document.getElementById('btn'),box=document.getElementById('box');
 btn.innerText='GENERANDO...'; btn.disabled=true;
 try{
  const r=await fetch('/pair?number='+encodeURIComponent(n)).then(r=>r.json());
  if(r.error){alert(r.error); btn.innerText='GENERAR CÓDIGO'; btn.disabled=false; return;}
  document.getElementById('code').innerText=r.code;
  box.style.display='block';
  box.scrollIntoView({behavior:'smooth', block:'center'});
  btn.innerText='CÓDIGO: '+r.code;
  if(navigator.vibrate) navigator.vibrate(80);
  setTimeout(()=>{btn.innerText='GENERAR CÓDIGO'; btn.disabled=false},15000);
 }catch(e){alert('Error de conexión, reintenta'); btn.innerText='GENERAR CÓDIGO'; btn.disabled=false;}
}
</script></body></html>`)
})

process.on('uncaughtException', e=>console.log(e.message))
process.on('unhandledRejection', e=>console.log(e.message))
app.listen(PORT, ()=>{ console.log('JAKUDOSHY SYSTEM listo '+PORT); startBot() })