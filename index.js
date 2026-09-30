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
            getMessage: async () => { return undefined },
            shouldIgnoreJid: () => false
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
                console.log('CONECTADO')
                try{
                    // mensaje limpio hacker sin emojis
                    await sock.sendMessage(sock.user.id, { 
                        text: `${BOT_NAME}\n${BOT_BY}\n\nsistema conectado\ncanal: ${CHANNEL}\n\nescribe .menu` 
                    })
                }catch{}
            }
        })

        // FIX PARA QUE NO APAREZCA ESPERANDO MENSAJE
        sock.ev.on('messages.upsert', async ({ messages, type })=>{
            try{
                if(type !== 'notify') return
                const m = messages[0]
                if(!m) return
                if(!m.message) return
                if(m.key.remoteJid === 'status@broadcast') return
                if(m.key.fromMe) return

                // solo texto plano, ignora todo lo que no tiene texto
                const text = (m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || "").trim().toLowerCase()
                if(!text) return

                const from = m.key.remoteJid
                await sock.readMessages([m.key])

                if(text === '.menu' || text === 'menu'){
                    await sock.sendMessage(from, { text: `${BOT_NAME}\n${BOT_BY}\n\n.comandos disponibles\n.menu\n.ping\n.estado\n.creador\n.ayuda\n\ncanal ${CHANNEL}` }, { quoted: m })
                }
                if(text === '.ping'){
                    await sock.sendMessage(from, { text: `pong\n${BOT_NAME} activo\n${BOT_BY}` }, { quoted: m })
                }
                if(text === '.estado'){
                    await sock.sendMessage(from, { text: `estado online\n${BOT_NAME}\n${BOT_BY}\ncanal ${CHANNEL}` }, { quoted: m })
                }
                if(text === '.creador'){
                    await sock.sendMessage(from, { text: `creador\n${BOT_BY}\nbot ${BOT_NAME}\n${CHANNEL}` }, { quoted: m })
                }
                if(text === '.ayuda'){
                    await sock.sendMessage(from, { text: `ayuda ${BOT_NAME}\n\nescribe .menu para ver comandos\n\n${BOT_BY}` }, { quoted: m })
                }
            }catch(e){ console.log('msg error', e.message) }
        })

    }catch(e){ console.log(e); setTimeout(()=>startBot(),5000) }
}

app.use(express.json())

// PAIR V5 INTACTO
app.get('/pair', async(req,res)=>{
    try{
        let num = req.query.number?.replace(/[^0-9]/g,'')
        if(!num || num.length < 8) return res.json({error:"Pon numero con codigo pais Ej: 51912345678"})
        if(!sock) return res.json({error:"Bot iniciando espera 5s"})
        if(fs.existsSync('./auth_info/creds.json')){
            try{
                const c = JSON.parse(fs.readFileSync('./auth_info/creds.json','utf8'))
                if(c.registered){
                    try{ fs.rmSync('./auth_info',{recursive:true, force:true}) }catch{}
                    await new Promise(r=>setTimeout(r,1000))
                    await startBot()
                    await new Promise(r=>setTimeout(r,3000))
                }
            }catch{}
        }
        const code = await sock.requestPairingCode(num)
        return res.json({code})
    }catch(e){ return res.json({error:e.message}) }
})

app.get('/', (req,res)=>{
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>${BOT_NAME}</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:'JetBrains Mono',monospace}
body{background:#040506;color:#8a9aa8;overflow-x:hidden}
#term{position:fixed;inset:0;background:#030405;z-index:20;display:flex;flex-direction:column;padding:16px}
.head{display:flex;align-items:center;gap:8px;border-bottom:1px solid #0f1419;padding-bottom:10px}
.dot{width:10px;height:10px;border-radius:50%}.r{background:#1a1e22}.y{background:#1a1e22}.g{background:#00ff88;box-shadow:0 0 8px #00ff88}
.body{flex:1;padding:20px 0;font-size:11px;line-height:18px}
.l{margin:4px 0;color:#3a4a5a}.w{color:#c7d1db}.gr{color:#00ff88}.bl{color:#4a5a6a}.dim{color:#1e2a33}
.bar{height:2px;background:#0a0e11;border-radius:10px;overflow:hidden;margin-top:auto}.fill{height:100%;width:0%;background:#00ff88;transition:.1s}
.pct{font-size:10px;color:#2a3a4a;text-align:right;margin-top:8px;letter-spacing:3px}
.main{position:relative;z-index:1;display:none;min-height:100vh;padding:18px;align-items:center;flex-direction:column}
.card{width:100%;max-width:400px;background:#0a0c0e;border:1px solid #141a22;border-radius:16px;padding:22px}
.title{text-align:center;font-size:22px;font-weight:700;color:#fff;letter-spacing:2px}
.sub{text-align:center;font-size:9px;letter-spacing:4px;color:#2a3a4a;margin-top:6px}
.input{margin-top:20px;display:flex;align-items:center;gap:10px;background:#06080a;border:1px solid #151c24;border-radius:10px;padding:10px 14px}
.input:focus-within{border-color:#00ff88}
input{flex:1;background:transparent;border:none;outline:none;color:#fff;font-size:14px}
.btn{width:100%;margin-top:12px;background:#00ff88;color:#000;border:none;padding:12px;border-radius:10px;font-weight:700;cursor:pointer;letter-spacing:1px;transition:.15s}
.btn:hover{background:#00ff88;box-shadow:0 0 20px rgba(0,255,136,.3)}
.btn:active{transform:scale(.97)}
.codebox{display:none;margin-top:14px;background:#060a08;border:1px solid #00ff88;border-radius:10px;padding:14px;text-align:center}
.code{font-size:30px;letter-spacing:10px;color:#fff;font-weight:700}
.list{width:100%;max-width:400px;margin-top:14px;background:#080a0d;border:1px solid #131a22;border-radius:12px;padding:12px}
.list h4{font-size:9px;letter-spacing:3px;color:#2a3a4a;margin-bottom:10px}
.item{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #0e1318;font-size:11px}
.item:last-child{border:none}
.item b{color:#8a9aa8;font-weight:400}
.item span{color:#3a4a5a}
.chan{position:fixed;right:12px;bottom:12px;z-index:10;background:#0a0c0e;border:1px solid #151c24;border-radius:20px;padding:6px 12px;display:flex;align-items:center;gap:8px;text-decoration:none;font-size:10px;color:#5a6a7a}
.chan:hover{border-color:#00ff88;color:#00ff88}
.foot{width:100%;max-width:400px;margin:20px 0 80px;text-align:center;font-size:10px;color:#1e2a33;letter-spacing:2px}
</style></head><body>

<div id="term">
<div class="head"><div class="dot r"></div><div class="dot y"></div><div class="dot g"></div><div style="margin-left:10px;font-size:10px;color:#2a3a4a;letter-spacing:3px">root@jk:~#</div><div style="margin-left:auto;font-size:10px;color:#00ff88" id="ptop">0%</div></div>
<div class="body" id="log"></div>
<div class="bar"><div class="fill" id="fill"></div></div>
<div class="pct" id="pct">0%</div>
</div>

<a href="${CHANNEL}" target="_blank" class="chan"><span>${BOT_BY}</span><span style="color:#00ff88">></span></a>

<div class="main" id="main">
<div class="card">
<div class="title">${BOT_NAME}</div>
<div class="sub">${BOT_BY}</div>
<div class="input"><span style="color:#2a3a4a">+</span><input id="num" placeholder="51912345678"><span style="color:#00ff88;font-size:8px">●</span></div>
<button class="btn" onclick="getCode()">generar codigo</button>
<div class="codebox" id="box"><div style="font-size:8px;letter-spacing:3px;color:#00ff88">codigo</div><div class="code" id="code">--------</div><div id="st" style="font-size:10px;color:#4a5a6a;margin-top:6px">pega en whatsapp > vincular</div></div>
</div>

<div class="list">
<h4>sistema</h4>
<div class="item"><b>engine</b><span>v5 anti crash</span></div>
<div class="item"><b>base</b><span>baileys 6.7.18</span></div>
<div class="item"><b>canal</b><span>t.me/gg_no_root</span></div>
<div class="item"><b>modo</b><span>hacker terminal</span></div>
</div>

<div class="list">
<h4>como usar</h4>
<div class="item"><b>1</b><span>pon numero con codigo pais</span></div>
<div class="item"><b>2</b><span>genera codigo</span></div>
<div class="item"><b>3</b><span>pega en whatsapp rapido</span></div>
<div class="item"><b>4</b><span>.menu en whatsapp</span></div>
</div>

<div class="foot">${BOT_BY}<br>2026</div>
</div>

<script>
const logs=[
 "root@jk:~# ./init",
 "loading kernel modules",
 "mounting ${BOT_BY}",
 "checking baileys engine",
 "connecting channel t.me/gg_no_root",
 "anti-crash loaded",
 "fix esperando mensaje aplicado",
 "system ready"
];
const logEl=document.getElementById('log'),fill=document.getElementById('fill'),pct=document.getElementById('pct'),ptop=document.getElementById('ptop');
let p=0, li=0;
function boot(){
 if(p<100){
  p+= Math.random()*8+2; if(p>100) p=100;
  fill.style.width=p+"%"; pct.innerText=Math.floor(p)+"%"; ptop.innerText=Math.floor(p)+"%";
  if(li < logs.length && p > (li+1)*(100/logs.length)){
   const d=document.createElement('div'); d.className='l'; d.innerHTML="<span class='dim'>$</span> <span class='w'>"+logs[li]+"</span>";
   logEl.appendChild(d); li++;
  }
  setTimeout(boot, 70);
 }else{
  const d=document.createElement('div'); d.className='l'; d.innerHTML="<span class='gr'>[ok] system ready</span>"; logEl.appendChild(d);
  setTimeout(()=>{document.getElementById('term').style.opacity="0";setTimeout(()=>{document.getElementById('term').style.display="none";document.getElementById('main').style.display="flex"},500)},300);
 }
}
boot();
async function getCode(){
 const n=document.getElementById('num').value.trim(); if(!n) return alert('pon numero');
 document.getElementById('st').innerText='generando...';
 const r=await fetch('/pair?number='+encodeURIComponent(n)).then(r=>r.json());
 if(r.error){alert(r.error); return}
 document.getElementById('box').style.display='block';
 document.getElementById('code').innerText=r.code;
 document.getElementById('st').innerText='codigo '+r.code;
}
</script></body></html>`)
})

process.on('uncaughtException', e=>console.log(e.message))
process.on('unhandledRejection', e=>console.log(e.message))
app.listen(PORT, ()=>{ console.log('listo '+PORT); startBot() })