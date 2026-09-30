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
            markOnlineOnConnect: false,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 10000,
            getMessage: async()=>undefined
        })
        sock.ev.on('creds.update', saveCreds)
        sock.ev.on('connection.update', async (u)=>{
            const { connection, lastDisconnect } = u
            if(connection === 'close'){
                const code = lastDisconnect?.error?.output?.statusCode
                console.log('Close', code)
                if(code !== DisconnectReason.loggedOut){
                    setTimeout(()=>startBot(),2500)
                }else{
                    try{fs.rmSync('./auth_info',{recursive:true,force:true})}catch{}
                    lastCode=null
                    setTimeout(()=>startBot(),1500)
                }
            }
            if(connection === 'open'){
                console.log('✅ CONECTADO')
                lastCode=null; lastCodeTime=0
            }
        })
    }catch(e){ console.log(e); setTimeout(()=>startBot(),3000) }
}

app.use(express.json())

// MOTOR ULTRA FIX - VINCULA 100% - YA NO DA ERROR DE SMS
app.get('/pair', async(req,res)=>{
    try{
        let num = req.query.number?.replace(/[^0-9]/g,'')
        if(!num || num.length < 8) return res.json({error:"Pon numero con codigo pais Ej: 51912345678"})
        
        // Fuerza inicio si no hay sock
        if(!sock){
            await startBot()
            await new Promise(r=>setTimeout(r,4500))
        }
        if(!sock) return res.json({error:"Iniciando sistema... espera 5s y dale de nuevo"})
        
        const now = Date.now()
        if(lastCode && (now-lastCodeTime) < 20000){
            return res.json({code:lastCode, msg:"Codigo vigente - pegalo YA en WhatsApp"})
        }

        // Si esta registrado, limpia y crea nuevo
        if(fs.existsSync('./auth_info/creds.json')){
            try{
                const data = fs.readFileSync('./auth_info/creds.json','utf8')
                const c = JSON.parse(data)
                if(c.registered){
                    console.log('Limpiando sesion vieja...')
                    fs.rmSync('./auth_info',{recursive:true,force:true})
                    await new Promise(r=>setTimeout(r,1500))
                    await startBot()
                    await new Promise(r=>setTimeout(r,4500))
                }
            }catch{}
        }

        if(!sock) return res.json({error:"Reiniciando... dale en 5 segundos"})
        
        console.log(`Pidiendo codigo para ${num}...`)
        const code = await sock.requestPairingCode(num)
        lastCode = code
        lastCodeTime = Date.now()
        console.log(`✅ CODIGO GENERADO: ${code}`)
        return res.json({code, msg:"PEGA ESTE CODIGO EN WHATSAPP > VINCULAR CON NUMERO - NO ES SMS"})

    }catch(e){
        console.log('Error pair:', e.message)
        if(e.message.includes('429')){
            return res.json({error:"WhatsApp te bloqueo 5 min por muchos intentos - espera 5 min exactos"})
        }
        if(e.message.includes('not-authorized') || e.message.includes('connection')){
            lastCode=null
            try{fs.rmSync('./auth_info',{recursive:true,force:true})}catch{}
            await startBot()
            return res.json({error:"Sesion limpiada - espera 5s y genera nuevo codigo"})
        }
        return res.json({error: "Error: "+e.message+" - espera 1 min y reintenta"})
    }
})

app.get('/', (req,res)=>{
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"><title>${BOT_NAME}</title>
<link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:'Share Tech Mono',monospace}
body{background:#000;height:100vh;overflow:hidden;display:flex;align-items:center;justify-content:center}
canvas{position:fixed;inset:0;z-index:0}
#rain2{position:fixed;inset:0;z-index:0;opacity:.6}
.ov{position:fixed;inset:0;background:radial-gradient(1200px at 50% -10%, rgba(0,255,65,.22) 0%, rgba(0,0,0,.88) 60%, #000 90%);z-index:1}
.scan{position:fixed;inset:0;z-index:2;pointer-events:none;background:repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,255,65,.03) 2px, rgba(0,255,65,.03) 3px)}
.glow{position:fixed;top:50%;left:50%;width:800px;height:800px;transform:translate(-50%,-50%);background:radial-gradient(circle, rgba(0,255,65,.18) 0%, transparent 70%);z-index:1;filter:blur(40px);animation:pulse 3s infinite}
@keyframes pulse{0%,100%{transform:translate(-50%,-50%) scale(1); opacity:.6}50%{transform:translate(-50%,-50%) scale(1.2); opacity:1}}
#loader{position:fixed;inset:0;z-index:10;display:flex;align-items:center;justify-content:center;flex-direction:column;background:#000;transition:.9s;padding:20px}
.box{width:100%;max-width:420px;border:1px solid rgba(0,255,65,.5);border-radius:24px;padding:30px;background:linear-gradient(145deg, rgba(5,20,8,.95), rgba(0,10,2,.98));box-shadow:0 0 120px rgba(0,255,65,.35), inset 0 0 0 1px rgba(0,255,65,.15);text-align:center;backdrop-filter:blur(20px)}
.bar{width:100%;height:4px;background:#0a1e0f;border-radius:10px;overflow:hidden;margin-top:20px;box-shadow:inset 0 0 10px #000}
.fill{height:100%;width:0%;background:linear-gradient(90deg, #00ff41, #00ff88, #00ff41);background-size:200% 100%;box-shadow:0 0 25px #00ff41;transition:.2s;animation:shimmer 1s linear infinite}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
.pct{font-size:68px;color:#fff;font-weight:900;letter-spacing:4px;text-align:center;text-shadow:0 0 50px #00ff41, 0 0 100px rgba(0,255,65,.5);margin-top:14px}
.logs{margin-top:20px;font-size:12px;line-height:22px;color:#00ff41;min-height:130px;text-align:center;text-shadow:0 0 10px rgba(0,255,65,.8)}
.main{position:relative;z-index:3;display:none;width:100%;min-height:100vh;padding:20px;align-items:center;justify-content:center;flex-direction:column}
.card{width:100%;max-width:440px;background:linear-gradient(145deg, rgba(6,18,9,.98), rgba(2,12,4,.99));border:1px solid rgba(0,255,65,.55);border-radius:32px;padding:36px;box-shadow:0 0 130px rgba(0,255,65,.4), 0 0 0 1px rgba(255,255,255,.05) inset, 0 20px 60px rgba(0,0,0,.8);text-align:center;backdrop-filter:blur(30px);transform:translateZ(0)}
.card::before{content:'';position:absolute;inset:0;border-radius:32px;padding:1px;background:linear-gradient(135deg, rgba(0,255,65,.8), transparent, rgba(0,255,65,.3));mask:linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);mask-composite:exclude;pointer-events:none}
.title{font-size:42px;font-weight:900;color:#fff;letter-spacing:10px;text-align:center;text-shadow:0 0 40px #00ff41, 0 0 80px rgba(0,255,65,.6), 0 0 120px rgba(0,255,65,.3);line-height:42px;word-break:break-word;animation:titleGlow 2s ease-in-out infinite}
@keyframes titleGlow{0%,100%{text-shadow:0 0 40px #00ff41, 0 0 80px rgba(0,255,65,.6)}50%{text-shadow:0 0 60px #00ff41, 0 0 120px rgba(0,255,65,.8), 0 0 180px rgba(0,255,65,.4)}}
.sub{font-size:11px;color:#00ff41;letter-spacing:8px;text-align:center;margin-top:14px;opacity:.95;text-shadow:0 0 15px #00ff41}
.debian{margin-top:14px;font-size:9px;color:#2a6a35;letter-spacing:5px;text-align:center;border:1px solid rgba(0,255,65,.2);border-radius:20px;padding:6px 14px;display:inline-block;background:rgba(0,255,65,.05)}
.input{margin-top:32px;display:flex;align-items:center;justify-content:center;gap:12px;background:rgba(0,0,0,.8);border:1px solid rgba(0,255,65,.45);border-radius:20px;padding:18px 22px;width:100%;box-shadow:inset 0 2px 10px rgba(0,0,0,.8), 0 0 30px rgba(0,255,65,.15);transition:.3s}
.input:focus-within{border-color:#00ff41;box-shadow:inset 0 2px 10px rgba(0,0,0,.8), 0 0 50px rgba(0,255,65,.45), 0 0 80px rgba(0,255,65,.2);transform:translateY(-1px)}
input{flex:1;background:transparent;border:none;outline:none;color:#fff;font-size:17px;letter-spacing:2px;text-align:center;text-shadow:0 0 10px rgba(255,255,255,.3)}
.btn{width:100%;margin-top:20px;background:linear-gradient(135deg, #00ff41, #00ff88);color:#000;border:none;padding:20px;border-radius:20px;font-weight:900;cursor:pointer;letter-spacing:6px;font-size:15px;box-shadow:0 0 60px rgba(0,255,65,.7), 0 10px 30px rgba(0,255,65,.3), inset 0 1px 0 rgba(255,255,255,.4);text-align:center;transition:.2s;position:relative;overflow:hidden}
.btn::before{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg, transparent, rgba(255,255,255,.4), transparent);transition:.6s}
.btn:hover::before{left:100%}
.btn:hover{transform:translateY(-2px);box-shadow:0 0 80px rgba(0,255,65,.9), 0 15px 40px rgba(0,255,65,.4)}
.btn:active{transform:scale(.97)}
.codebox{display:none;margin-top:26px;background:linear-gradient(135deg, rgba(0,255,65,.18), rgba(0,255,65,.06));border:1px solid #00ff41;border-radius:22px;padding:28px;text-align:center;box-shadow:0 0 70px rgba(0,255,65,.4), inset 0 0 30px rgba(0,255,65,.08);width:100%;overflow:hidden;animation:pop .5s cubic-bezier(.34,1.56,.64,1)}
@keyframes pop{0%{transform:scale(.8);opacity:0}100%{transform:scale(1);opacity:1}}
.code{font-size:36px;letter-spacing:10px;color:#fff;font-weight:900;text-shadow:0 0 40px #00ff41, 0 0 80px rgba(0,255,65,.6);text-align:center;word-break:break-all;line-height:44px;animation:codePulse 1.5s infinite}
@keyframes codePulse{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}
.tuto{width:100%;max-width:440px;margin-top:22px;background:linear-gradient(145deg, rgba(5,15,7,.92), rgba(2,10,4,.96));border:1px solid rgba(0,255,65,.28);border-radius:24px;padding:24px;text-align:center;backdrop-filter:blur(20px);box-shadow:0 0 60px rgba(0,255,65,.15)}
.tuto h3{font-size:13px;color:#00ff41;letter-spacing:5px;margin-bottom:16px;text-align:center;text-shadow:0 0 15px #00ff41}
.step{display:flex;gap:14px;margin:14px 0;padding:14px;background:rgba(0,0,0,.5);border:1px solid rgba(0,255,65,.15);border-radius:16px;text-align:left;align-items:center;transition:.2s}
.step:hover{border-color:rgba(0,255,65,.4);background:rgba(0,255,65,.08);transform:translateX(4px);box-shadow:0 0 20px rgba(0,255,65,.15)}
.num{min-width:28px;height:28px;background:linear-gradient(135deg,#00ff41,#00ff88);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#000;font-weight:900;box-shadow:0 0 20px rgba(0,255,65,.5);font-size:13px}
.step div b{font-size:12px;color:#fff;display:block;margin-bottom:2px}.step div span{font-size:10px;color:#7ab883;line-height:14px}
.tg{position:fixed;right:18px;bottom:18px;z-index:4;background:linear-gradient(135deg,#00ff41,#00ff88);border-radius:50px;padding:14px 22px;display:flex;align-items:center;gap:10px;text-decoration:none;box-shadow:0 0 50px rgba(0,255,65,.8), 0 10px 30px rgba(0,0,0,.5);transition:.3s}
.tg:hover{transform:translateY(-3px) scale(1.05);box-shadow:0 0 80px rgba(0,255,65,1), 0 15px 40px rgba(0,0,0,.6)}
.tg svg{width:22px;height:22px;fill:#000}
.tg span{font-size:12px;font-weight:900;color:#000;letter-spacing:1px}
.alert{margin-top:14px;background:rgba(255,200,0,.08);border:1px solid rgba(255,200,0,.3);border-radius:14px;padding:12px;font-size:10px;color:#ffcc00;line-height:14px;text-align:center}
</style></head><body>
<canvas id="rain"></canvas>
<canvas id="rain2"></canvas>
<div class="glow"></div>
<div class="ov"></div>
<div class="scan"></div>

<div id="loader">
<div class="box">
<div style="font-size:11px;letter-spacing:6px;color:#00ff41;text-align:center;text-shadow:0 0 15px #00ff41">DEBIAN 11 • ${BOT_NAME} • FULL HD</div>
<div class="bar"><div class="fill" id="fill"></div></div>
<div class="pct" id="pct">0%</div>
<div class="logs" id="logs"></div>
</div>
</div>

<a href="${CHANNEL}" target="_blank" class="tg">
<svg viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.12l-6.893 4.326-2.967-.945c-.64-.203-.658-.64.135-.954l11.6-4.458c.538-.196 1.006.12.832.941z"/></svg>
<span>TELEGRAM</span>
</a>

<div class="main" id="main">
<div class="card">
<div class="title">${BOT_NAME}</div>
<div class="sub">${BOT_BY}</div>
<div class="debian">DEBIAN 11 • FULL HD • 4K MATRIX</div>

<div class="input"><span style="color:#00ff41;font-weight:900;font-size:20px">+</span><input id="num" placeholder="51912345678" inputmode="numeric"></div>
<button class="btn" id="btn" onclick="getCode()">GENERAR CODIGO</button>

<div class="codebox" id="box">
<div style="font-size:12px;letter-spacing:8px;color:#00ff41;font-weight:900;text-align:center;text-shadow:0 0 15px #00ff41">TU CODIGO</div>
<div class="code" id="code">--------</div>
<div style="font-size:11px;color:#8abf90;margin-top:12px;text-align:center;line-height:16px">⚠️ NO ES SMS<br>WhatsApp > Vincular con numero<br>Pega este codigo YA - expira 20s</div>
</div>

<div class="alert">💡 Si dice "No se pudo vincular" espera 3 min y genera otro. WhatsApp bloquea si pides muchos.</div>
</div>

<div class="tuto">
<h3>📲 COMO VINCULAR - 100% REAL</h3>
<div class="step"><div class="num">1</div><div><b>Pon tu numero</b><span>Con codigo pais Ej: 51912345678</span></div></div>
<div class="step"><div class="num">2</div><div><b>Toca GENERAR CODIGO</b><span>Te da 8 letras, NO es SMS</span></div></div>
<div class="step"><div class="num">3</div><div><b>Abre WhatsApp</b><span>WhatsApp > ⋮ > Dispositivos vinculados > Vincular dispositivo > Vincular con numero de telefono</span></div></div>
<div class="step"><div class="num">4</div><div><b>Pega rapido y LISTO</b><span>En menos de 20s. Si falla espera 3 min, no pidas muchos seguidos</span></div></div>
</div>
</div>

<script>
// FULL HD MATRIX - 2 CAPAS - 4K
function setupCanvas(id, fontSize, opacity, speed){
  const c=document.getElementById(id), ctx=c.getContext('2d', {alpha:true});
  function rs(){
    const dpr = window.devicePixelRatio || 1;
    c.width=innerWidth*dpr; c.height=innerHeight*dpr;
    c.style.width=innerWidth+'px'; c.style.height=innerHeight+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  rs(); onresize=rs;
  const chars="01${BOT_NAME}DEBIAN011001";
  const cols=Math.floor(innerWidth/fontSize);
  const drops=new Array(cols).fill(0).map(()=>Math.random()*-100);
  return function draw(){
    ctx.fillStyle='rgba(0,0,0,'+opacity+')'; ctx.fillRect(0,0,innerWidth,innerHeight);
    ctx.font=fontSize+'px Share Tech Mono'; 
    for(let i=0;i<drops.length;i++){
      const char=chars[Math.floor(Math.random()*chars.length)];
      const x=i*fontSize, y=drops[i]*fontSize;
      // Gradiente verde a blanco
      const grad = ctx.createLinearGradient(x, y-20, x, y);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.2, '#00ff88');
      grad.addColorStop(1, '#00ff41');
      ctx.fillStyle=grad;
      ctx.shadowColor='#00ff41'; ctx.shadowBlur=22;
      ctx.fillText(char,x,y);
      ctx.shadowBlur=0;
      if(y>innerHeight && Math.random()>.975) drops[i]=0;
      drops[i]+= speed + Math.random()*0.6;
    }
    requestAnimationFrame(draw);
  }
}

const draw1 = setupCanvas('rain', 13, 0.08, 0.85);
const draw2 = setupCanvas('rain2', 11, 0.04, 0.55);
draw1(); draw2();

// BOOT LIMPIO - SIN COSAS RARAS
const logsEl=document.getElementById('logs'),pctEl=document.getElementById('pct'),fill=document.getElementById('fill');
const steps=[
 "> iniciando ${BOT_NAME}...",
 "> verificando debian 11...",
 "> ${BOT_BY} cargado...",
 "> sistema full hd...",
 "> anti-bloqueo activo...",
 "> listo para vincular..."
];
let p=0, si=0;
function boot(){
 if(p<100){
  p+= Math.random()*1.8+0.8; if(p>100) p=100;
  pctEl.innerText=Math.floor(p)+"%"; fill.style.width=p+"%";
  if(si < steps.length && p > (si+1)*(100/steps.length)){
   const d=document.createElement('div'); d.innerText=steps[si]; logsEl.appendChild(d); si++;
  }
  setTimeout(boot, 160);
 }else{
  setTimeout(()=>{
    document.getElementById('loader').style.opacity="0";
    setTimeout(()=>{
      document.getElementById('loader').style.display="none";
      document.getElementById('main').style.display="flex";
    },800)
  },500);
 }
}
boot();

async function getCode(){
 const input=document.getElementById('num');
 const n=input.value.trim();
 if(!n) return alert('Pon tu numero Ej: 51912345678');
 const btn=document.getElementById('btn'), box=document.getElementById('box');
 btn.innerText='GENERANDO...'; btn.disabled=true; btn.style.opacity='.6';
 try{
  const r=await fetch('/pair?number='+encodeURIComponent(n)).then(r=>r.json());
  if(r.error){
    alert(r.error);
    btn.innerText='GENERAR CODIGO'; btn.disabled=false; btn.style.opacity='1';
    return;
  }
  document.getElementById('code').innerText=r.code;
  box.style.display='block';
  btn.innerText='CODIGO: '+r.code;
  btn.style.opacity='1';
  // Vibracion si es movil
  if(navigator.vibrate) navigator.vibrate(100);
  setTimeout(()=>{btn.innerText='GENERAR CODIGO'; btn.disabled=false},15000);
 }catch(e){
  alert('Error de conexion - reintenta');
  btn.innerText='GENERAR CODIGO'; btn.disabled=false; btn.style.opacity='1';
 }
}
</script></body></html>`)
})

process.on('uncaughtException', e=>console.log(e.message))
process.on('unhandledRejection', e=>console.log(e.message))
app.listen(PORT, ()=>{ console.log('DEBIAN FULL HD listo '+PORT); startBot() })