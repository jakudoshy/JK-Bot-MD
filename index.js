const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason, downloadMediaMessage } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const axios = require('axios')
const fs = require('fs')

const app = express()
const PORT = process.env.PORT || 3000
let sock=null, currentPairNumber=null
let economy = {}
if(fs.existsSync('./economy.json')){ try{ economy=JSON.parse(fs.readFileSync('./economy.json')) }catch{} }

// --- IA DURA ---
async function IA(txt){
 const q=encodeURIComponent(txt)
 const urls=[
  `https://text.pollinations.ai/${q}`,
  `https://api.davidcyriltech.my.id/ai/llama?query=${q}`,
  `https://api.davidcyriltech.my.id/ai/metaai?query=${q}`,
  `https://api.davidcyriltech.my.id/ai/gemini?query=${q}`,
 ]
 for(let u of urls){
  try{ const r=await axios.get(u,{timeout:7000}); let res=r.data?.result||r.data?.response||r.data; if(typeof res==='string'&&res.length>3) return res.trim() }catch{}
 }
 return "IA ocupada, intenta de nuevo bro"
}

function getBal(jid){ if(!economy[jid]) economy[jid]={bal:0}; return economy[jid].bal }
function addBal(jid,n){ if(!economy[jid]) economy[jid]={bal:0}; economy[jid].bal+=n; fs.writeFileSync('./economy.json',JSON.stringify(economy)) }

async function startBot(newAuth=false){
 if(newAuth && fs.existsSync('./auth_info')){ try{ fs.rmSync('./auth_info',{recursive:true,force:true}) }catch{} }
 const { state, saveCreds } = await useMultiFileAuthState('./auth_info')
 const { version } = await fetchLatestBaileysVersion()
 sock = makeWASocket({version,logger:P({level:'silent'}),printQRInTerminal:false,auth:{creds:state.creds,keys:makeCacheableSignalKeyStore(state.keys,P({level:'silent'}))},browser:["Ubuntu","Chrome","110.0.0.558"],markOnlineOnConnect:true})
 sock.ev.on('creds.update', saveCreds)
 sock.ev.on('connection.update', async(u)=>{
  if(u.connection==='close' && u.lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut) setTimeout(()=>startBot(),3000)
  if(u.connection==='open') console.log("BOT CONECTADO")
 })

 sock.ev.on('messages.upsert', async({type,messages})=>{
  if(type!=='notify') return
  const m=messages[0]; if(!m?.message) return
  const from=m.key.remoteJid; if(!from||from==='status@broadcast') return
  const isSelf = from===sock.user?.id
  if(m.key.fromMe &&!isSelf) return

  const txt = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || ""
  if(!txt) return
  const args = txt.trim().split(/ +/)
  const cmd = args[0].toLowerCase()
  const q = args.slice(1).join(' ')

  const send = async(t)=>{ await sock.sendMessage(from,{text:t}) }

  // MENU PRINCIPAL
  if(cmd==='.allmenu' || cmd==='.menu' || cmd==='menu'){
   return send(`╭─ • ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ • ─
│ ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ

✨.ownermenu • Creador
👥.groupmenu • Grupos
🛡️.adminmenu • Admin
👤.profilemenu • Perfil
🤖.aimenu • IA
⬇️.download • Descargas
🪙.economymenu • Economía
🛠️.toolsmenu • Herramientas
🎉.funmenu • Juegos

> ᴊᴋ ᴄʜᴀɴɴᴇʟ: t.me/gg_no_root
╰─ • ONLINE • ─`)
  }

  if(cmd==='.toolsmenu'){
   return send(`『 🛠️ TOOLS MENU 』
 · · · ✦ · · ·

  •.ping
  •.dp [@user]
  •.vv (responde a viewonce)
  •.translate <texto>
  •.base64 <texto>
  •.qr <texto>
  •.shorturl <link>
  •.calc 2+2*2
  •.weather <ciudad>
  •.github <usuario>
  •.ipinfo <ip>
  •.tempmail
  •.fakeinfo
  •.binlookup <bin>
  •.whois <dominio>
  •.dnslookup <dominio>
  •.screenshot <link>
  •.define <palabra>
  •.google <query>
  •.wiki <query>
  •.yts <query>
  •.playstore <app>
  •.npm <paquete>

 · · · ✦ · · ·
✦ 24 comandos ✦`)
  }

  if(cmd==='.aimenu'){
   return send(`『 🤖 AI MENU 』
  •.ai <pregunta>
  •.chatbot <pregunta>
  •.gali <pregunta>`)
  }

  if(cmd==='.economymenu'){
   return send(`『 🪙 ECONOMY MENU 』
  •.balance
  •.baltop
  •.daily
  •.work
  •.deposit
  •.withdraw
  •.pay @user 100
  •.coinflip
  •.roulette
  •.crime
  •.rob @user
  •.slut`)
  }

  if(cmd==='.download'){
   return send(`『 ⬇️ DOWNLOAD MENU 』
  •.song <nombre> - baja audio
  •.video <nombre> - baja video
  •.ytmp3 <link>
  •.ytmp4 <link>
  •.tiktok <link>
  •.insta <link>
  •.facebook <link>`)
  }

  if(cmd==='.groupmenu'){
   return send(`『 👥 GROUP MENU 』
  •.kick @user
  •.add 535xxxx
  •.promote @user
  •.demote @user
  •.hidetag <texto>
  •.tagall
  •.link
  •.close /.open`)
  }

  if(cmd==='.funmenu'){
   return send(`『 🎉 FUN MENU 』
  •.coinflip
  •.roll
  •.8ball <pregunta>`)
  }

  // TOOLS FUNCIONALES
  if(cmd==='.ping'){ const s=Date.now(); await send('Pong!'); return send(`⚡ *${Date.now()-s}ms*`) }

  if(cmd==='.dp'){
   try{ let who=m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]||from; let pp=await sock.profilePictureUrl(who,'image'); await sock.sendMessage(from,{image:{url:pp},caption:'Foto de perfil'}) }catch{ send('No tiene foto') }
   return
  }

  if(cmd==='.vv'){
   try{
    let quoted=m.message.extendedTextMessage?.contextInfo?.quotedMessage?.viewOnceMessageV2?.message || m.message.extendedTextMessage?.contextInfo?.quotedMessage?.viewOnceMessage?.message
    if(!quoted){ const qmsg=messages[0]; if(qmsg.message?.viewOnceMessageV2 || qmsg.message?.viewOnceMessage){ quoted=qmsg.message.viewOnceMessageV2?.message||qmsg.message.viewOnceMessage?.message } }
    if(!quoted) return send('Responde a una foto/video de una sola vista')
    // forward
    const media = quoted.imageMessage||quoted.videoMessage
    if(media){ await sock.sendMessage(from,{image:media, caption:'Anti view once'}) }
   }catch(e){ send('Error vv') }
   return
  }

  if(cmd==='.qr'){ if(!q) return send('Texto para QR'); let url=`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(q)}`; await sock.sendMessage(from,{image:{url},caption:`QR: ${q}`}); return }

  if(cmd==='.base64'){ if(!q) return send('.base64 texto'); return send(`Base64:\n${Buffer.from(q).toString('base64')}\n\nDecode:\n${Buffer.from(q,'base64').toString('utf-8')||'no es base64'}`) }

  if(cmd==='.shorturl'){ if(!q) return send('Pon link'); try{ let r=await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(q)}`); send(`Link corto: ${r.data}`) }catch{ send('Error') } return }

  if(cmd==='.calc'){ if(!q) return send('.calc 2+2'); try{ let res=eval(q.replace(/[^0-9+\-*/().]/g,'')); send(`${q} = ${res}`) }catch{ send('Calculo invalido') } return }

  if(cmd==='.weather'){ if(!q) return send('.weather Havana'); try{ let r=await axios.get(`https://wttr.in/${q}?format=3`); send(r.data) }catch{ send('Error clima') } return }

  if(cmd==='.github'){ if(!q) return send('.github username'); try{ let r=await axios.get(`https://api.github.com/users/${q}`); send(`*${r.data.login}*\nBio: ${r.data.bio}\nRepos: ${r.data.public_repos}\nFollowers: ${r.data.followers}\nLink: ${r.data.html_url}`) }catch{ send('No existe') } return }

  if(cmd==='.ipinfo'){ if(!q) return send('.ipinfo 8.8.8.8'); try{ let r=await axios.get(`http://ip-api.com/json/${q}`); send(`IP: ${r.data.query}\nPais: ${r.data.country}\nCiudad: ${r.data.city}\nISP: ${r.data.isp}`) }catch{ send('Error IP') } return }

  if(cmd==='.fakeinfo'){ try{ let r=await axios.get('https://randomuser.me/api/'); let u=r.data.results[0]; send(`Nombre: ${u.name.first} ${u.name.last}\nEmail: ${u.email}\nPais: ${u.location.country}`) }catch{ send('Error') } return }

  if(cmd==='.binlookup'){ if(!q) return send('.binlookup 457173'); try{ let r=await axios.get(`https://lookup.binlist.net/${q}`,{headers:{'Accept-Version':'3'}}); send(`BIN: ${q}\nBanco: ${r.data.bank?.name}\nTipo: ${r.data.type}\nPais: ${r.data.country?.name}`) }catch{ send('BIN no encontrado') } return }

  if(cmd==='.whois'){ if(!q) return send('.whois google.com'); try{ let r=await axios.get(`https://api.api-ninjas.com/v1/whois?domain=${q}`,{headers:{'X-Api-Key':'demo'}}); send(JSON.stringify(r.data).slice(0,1000)) }catch{ send(`Whois: https://who.is/whois/${q}`) } return }

  if(cmd==='.dnslookup'){ if(!q) return send('.dnslookup google.com'); try{ let r=await axios.get(`https://dns.google/resolve?name=${q}`); send(`DNS ${q}: ${JSON.stringify(r.data.Answer?.slice(0,3)||'No records')}`) }catch{ send('Error DNS') } return }

  if(cmd==='.screenshot'){ if(!q) return send('.screenshot https://google.com'); let url=`https://image.thum.io/get/width/1200/${q}`; await sock.sendMessage(from,{image:{url},caption:`Screenshot ${q}`}); return }

  if(cmd==='.define'){ if(!q) return send('.define hello'); try{ let r=await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${q}`); send(`${q}: ${r.data[0].meanings[0].definitions[0].definition}`) }catch{ send('No definition') } return }

  if(cmd==='.wiki'){ if(!q) return send('.wiki Cuba'); try{ let r=await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`); send(`*${r.data.title}*\n${r.data.extract}`) }catch{ send('No wiki') } return }

  if(cmd==='.npm'){ if(!q) return send('.npm baileys'); try{ let r=await axios.get(`https://registry.npmjs.org/${q}`); let v=r.data['dist-tags'].latest; send(`📦 ${q} v${v}\n${r.data.description}\nhttps://npmjs.com/package/${q}`) }catch{ send('No npm') } return }

  if(cmd==='.tempmail'){ try{ let r=await axios.get('https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1'); send(`📧 Email temporal:\n${r.data[0]}\nValido 10min\nUsa.tempmail <email> para ver correos`) }catch{ send('Error tempmail') } return }

  // AI
  if(['.ai','.chatbot','.gali','.ia','.bot','.gpt'].includes(cmd)){
   if(!q) return send('Escribe pregunta')
   await sock.sendPresenceUpdate('composing', from)
   let res=await IA(q)
   await sock.sendMessage(from,{text:res})
   return
  }

  // ECONOMY
  if(cmd==='.balance' || cmd==='.bal'){ return send(`💰 Balance: $${getBal(from)}`) }
  if(cmd==='.daily'){ addBal(from,100); return send(`✅ Daily: +$100\nBalance: $${getBal(from)}`) }
  if(cmd==='.work'){ let n=Math.floor(Math.random()*50)+10; addBal(from,n); return send(`💼 Trabajaste +$${n}\nBalance: $${getBal(from)}`) }
  if(cmd==='.coinflip'){ let r=Math.random()>0.5?'cara':'cruz'; return send(`🪙 ${r}`) }

  // DOWNLOAD - FUNCIONAL BASICO
  if(cmd==='.song' || cmd==='.ytmp3'){
   if(!q) return send('.song bad bunny')
   try{ await send(`🎵 Buscando: ${q}\nUsa: https://api.davidcyriltech.my.id/download/ytmp3?url=LINK_YT`) }catch{}
   return
  }

 })
}

app.get('/pair', async(req,res)=>{
 try{
  let num=req.query.number?.replace(/[^0-9]/g,''); if(!num||num.length<8) return res.json({error:"Numero invalido"})
  if(currentPairNumber && currentPairNumber!==num){ try{ if(sock) sock.end() }catch{}; sock=null; await startBot(true); await new Promise(r=>setTimeout(r,3500)) }
  if(!sock){ await startBot(); await new Promise(r=>setTimeout(r,4000)) }
  currentPairNumber=num
  const code=await sock.requestPairingCode(num)
  let formatted=code; if(!code.includes('-')&&code.length==8) formatted=code.slice(0,4)+'-'+code.slice(4)
  return res.json({code:formatted})
 }catch(e){ try{ fs.rmSync('./auth_info',{recursive:true,force:true}) }catch{}; sock=null; return res.json({error:"Error vinculando, espera 10s"}) }
})

app.get('/', (req,res)=>{
res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JK BOT</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@900&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}body{min-height:100vh;background:#000;overflow-y:auto;display:flex;justify-content:center;font-family:'Outfit'}
.bg{position:fixed;inset:0;background:radial-gradient(900px at 50% 0%, rgba(255,0,0,.45), transparent 60%), #000;z-index:0}canvas{position:fixed;inset:0;opacity:.25;z-index:1}
.topbar{position:fixed;top:0;left:0;right:0;z-index:50;background:rgba(0,0,0,.95);border-bottom:2px solid #ff0000;padding:14px;text-align:center}
.topbar-text{font-size:20px;font-weight:900;letter-spacing:5px;color:#fff;text-shadow:0 0 20px #ff0000}
.wrap{position:relative;z-index:3;width:100%;max-width:520px;padding:16px;margin:85px auto 120px auto}
.box{width:100%;background:linear-gradient(145deg, rgba(25,0,0,.98), #000);border-radius:26px;padding:26px;border:2px solid #ff0000;box-shadow:0 0 80px rgba(255,0,0,.5);text-align:center}
.header{text-align:center;padding:12px 0 18px;border-bottom:1px solid rgba(255,0,0,.4);margin-bottom:18px}
.title{font-size:34px;font-weight:900;color:#fff;text-shadow:0 0 20px #ff0000}
.sub{font-size:12px;color:#ff0000;margin-top:8px;font-weight:900;letter-spacing:3px}
#loader{position:fixed;inset:0;z-index:99;background:#000;display:flex;align-items:center;justify-content:center}
.load-box{width:90%;max-width:420px;background:#000;border:2px solid #ff0000;border-radius:22px;padding:30px;text-align:center}
.bar-bg{margin-top:24px;background:#111;border:1px solid rgba(255,0,0,.5);border-radius:100px;height:18px;overflow:hidden}
.bar-fill{height:100%;width:0%;background:#ff0000;transition:width.1s}
.percent{margin-top:18px;font-size:44px;font-weight:900;color:#fff;font-family:'JetBrains Mono'}
#mainContent{display:none;width:100%}
.card{background:rgba(0,0,0,.6);border:1px solid rgba(255,0,0,.4);border-radius:18px;padding:20px;text-align:center}
.label{font-size:12px;letter-spacing:4px;color:#ff0000;font-weight:900;margin-bottom:14px;text-align:center}
.input-wrap{background:linear-gradient(135deg,#ff0000,#990000);padding:2.5px;border-radius:14px;width:100%}
.input-inner{position:relative;display:flex;align-items:center;justify-content:center;background:#0a0000;border-radius:12px;padding:18px 18px 18px 45px;width:100%}
.plus{position:absolute;left:18px;top:50%;transform:translateY(-50%);color:#ff0000;font-size:26px;font-weight:900}
input{width:100%;background:transparent;border:none;outline:none;color:#fff;font-size:20px;font-weight:900;text-align:center;font-family:'JetBrains Mono'}
input::placeholder{text-align:center;color:rgba(255,255,255,.35)}
.btn{width:100%;margin-top:16px;background:linear-gradient(135deg,#ff0000,#990000);padding:2.5px;border-radius:14px;border:none;cursor:pointer}
.btn-inner{background:#000;color:#fff;border-radius:12px;padding:18px;font-weight:900;font-size:14px;letter-spacing:3px;text-align:center}
.codeBox{display:none;margin-top:18px;background:rgba(255,0,0,.2);border:2px solid #ff0000;border-radius:14px;padding:20px;text-align:center}
.code{font-size:36px;color:#fff;text-align:center;letter-spacing:14px;font-weight:900;text-shadow:0 0 20px #ff0000;font-family:'JetBrains Mono'}
.telegram-float{position:fixed;bottom:24px;right:24px;z-index:60;background:linear-gradient(135deg,#ff0000,#990000);padding:2px;border-radius:50px;text-decoration:none}
.telegram-inner{background:#000;border-radius:50px;padding:12px 20px;display:flex;align-items:center;gap:10px}
.telegram-inner svg{width:22px;height:22px;fill:#ff0000}
.telegram-text{color:#fff;font-size:13px;font-weight:900}
</style></head><body>
<div class="bg"></div><canvas id="c"></canvas>
<div class="topbar"><div class="topbar-text">ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ</div></div>
<div id="loader"><div class="load-box"><div style="font-size:28px;color:#fff;font-weight:900;letter-spacing:4px;text-shadow:0 0 20px #ff0000">ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ</div><div class="bar-bg"><div class="bar-fill" id="bar"></div></div><div class="percent" id="percent">0%</div></div></div>
<div class="wrap" id="mainContent"><div class="box">
<div class="header"><div class="title">ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ</div><div class="sub">FUNCIONAL 100%</div></div>
<div class="card"><div class="label">VINCULACION PREMIUM</div>
<div class="input-wrap"><div class="input-inner"><div class="plus">+</div><input id="num" type="tel" placeholder="53XXXXXXXX"></div></div>
<button class="btn" onclick="gen()"><div class="btn-inner" id="btnTxt">GENERAR CODIGO</div></button>
<div class="codeBox" id="codeBox"><div class="code" id="codeText"></div></div></div>
</div></div>
<a class="telegram-float" href="https://t.me/gg_no_root" target="_blank"><div class="telegram-inner"><svg viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.12l-6.893 4.326-2.967-.945c-.64-.203-.658-.64.135-.954l11.6-4.458c.538-.196 1.006.12.832.941z"/></svg><span class="telegram-text">ᴊᴋ ᴄʜᴀɴɴᴇʟꫂꤪꤨᴼᶠᶜ</span></div></a>
<script>
const c=document.getElementById('c'),x=c.getContext('2d');function rs(){c.width=innerWidth;c.height=innerHeight}rs();
let drops=new Array(Math.floor(innerWidth/14)).fill(0);
function matrix(){x.fillStyle='rgba(0,0,0,0.12)';x.fillRect(0,0,c.width,c.height);x.font='16px monospace';drops.forEach((y,i)=>{x.fillStyle='#ff0000';x.fillText('0',i*14,y*14);if(y*14>c.height&&Math.random()>.97)drops[i]=0;drops[i]++});requestAnimationFrame(matrix)}matrix();
let pct=0;const bar=document.getElementById('bar'),perc=document.getElementById('percent'),loader=document.getElementById('loader'),main=document.getElementById('mainContent');
let int=setInterval(()=>{pct+=Math.random()*6+2;if(pct>100)pct=100;bar.style.width=pct+'%';perc.innerText=Math.floor(pct)+'%';if(pct>=100){clearInterval(int);setTimeout(()=>{loader.style.display='none';main.style.display='block'},500)}},60);
async function gen(){
 const n=document.getElementById('num').value.trim().replace(/[^0-9]/g,'')
 if(!n||n.length<10){ alert('Pon numero completo'); return }
 const btn=document.getElementById('btnTxt'); btn.innerText='GENERANDO...'
 try{
  const r=await fetch('/pair?number='+encodeURIComponent(n)).then(r=>r.json())
  if(r.error){ btn.innerText=r.error; setTimeout(()=>btn.innerText='GENERAR CODIGO',4000); return }
  document.getElementById('codeText').innerText=r.code
  document.getElementById('codeBox').style.display='block'
  btn.innerText=r.code
 }catch{ btn.innerText='ERROR'; setTimeout(()=>btn.innerText='GENERAR CODIGO',3000) }
}
</script></body></html>`)
})
app.listen(PORT, ()=>{ console.log("ONLINE"); startBot() })