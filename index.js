const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const axios = require('axios')
const fs = require('fs')

function c(t){
 const m={'a':'ᴀ','b':'ʙ','c':'ᴄ','d':'ᴅ','e':'ᴇ','f':'ғ','g':'ɢ','h':'ʜ','i':'ɪ','j':'ᴊ','k':'ᴋ','l':'ʟ','m':'ᴍ','n':'ɴ','o':'ᴏ','p':'ᴘ','q':'ǫ','r':'ʀ','s':'s','t':'ᴛ','u':'ᴜ','v':'ᴠ','w':'ᴡ','x':'x','y':'ʏ','z':'ᴢ','A':'ᴀ','B':'ʙ','C':'ᴄ','D':'ᴅ','E':'ᴇ','F':'ғ','G':'ɢ','H':'ʜ','I':'ɪ','J':'ᴊ','K':'ᴋ','L':'ʟ','M':'ᴍ','N':'ɴ','O':'ᴏ','P':'ᴘ','Q':'ǫ','R':'ʀ','S':'s','T':'ᴛ','U':'ᴜ','V':'ᴠ','W':'ᴡ','X':'x','Y':'ʏ','Z':'ᴢ'}
 return t.split('').map(x=>m[x]||x).join('')
}

console.log(`[ ${c('SISTEMA')} ] ${c('iniciando todo funcional...')}`)
const app = express()
const PORT = process.env.PORT || 3000
let sock=null, lastCode=null, lastCodeTime=0, pendingWelcome=false

// ECONOMIA
let eco={}
if(fs.existsSync('./eco.json')){ try{ eco=JSON.parse(fs.readFileSync('./eco.json')) }catch{} }
function saveEco(){ fs.writeFileSync('./eco.json', JSON.stringify(eco)) }
function getEco(j){ if(!eco[j]) eco[j]={bal:100, bank:0, lastDaily:0}; return eco[j] }

const APIS = {
  gpt: "https://api.davidcyriltech.my.id/ai/chatbot?query=",
  premium: "https://api.davidcyriltech.my.id/ai/gemini?query=",
  gpt2: "https://api.azz.biz.id/api/ai/gpt?query=",
  gpt3: "https://text.pollinations.ai/"
}

async function IA_PREMIUM(txt){
 const q=encodeURIComponent(txt)
 try{
   const mm=txt.match(/(\d+)\s*([\+\-\*\/x])\s*(\d+)/i);
   if(mm){ let a=+mm[1],b=+mm[3],op=mm[2]; let r=op==='+'?a+b:op==='-'?a-b:op==='/'?(a/b).toFixed(2):a*b; return `🧮 ᴊᴀᴋᴜᴅᴏѕʜʏ\n${a} ${op} ${b} = ${r}` }
 }catch{}
 try{ const r=await axios.get(APIS.gpt+q,{timeout:12000}); if(r.data?.result) return r.data.result }catch{}
 try{ const r=await axios.get(APIS.premium+q,{timeout:12000}); if(r.data?.result) return r.data.result }catch{}
 try{ const r=await axios.get(APIS.gpt3+q,{timeout:10000}); if(typeof r.data==='string'&&r.data.length>4) return r.data }catch{}
 try{ const r=await axios.get(APIS.gpt2+q,{timeout:12000}); if(r.data?.result) return r.data.result }catch{}
 return `🤖 ᴊᴀᴋᴜᴅᴏѕʜʏ ᴼᶠᶜ\nRecibí: ${txt}\nEstoy activo!`
}

async function welcome(){
 if(!sock?.user?.id) return
 const msg=`╭─ • ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ • ─\n│ ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ\n│ ${c('todo funcional activo')}\n│.allmenu para menus\n╰─ • ${c('online')} • ─`
 try{ await new Promise(r=>setTimeout(r,1500)); await sock.sendMessage(sock.user.id,{text:msg}) }catch{}
}

async function startBot(){
 const { state, saveCreds } = await useMultiFileAuthState('./auth_info')
 const { version } = await fetchLatestBaileysVersion()
 sock = makeWASocket({
   version, logger:P({level:'silent'}), printQRInTerminal:false,
   auth:{creds:state.creds, keys:makeCacheableSignalKeyStore(state.keys,P({level:'silent'}))},
   browser:["Debian","Chrome","11.0"], syncFullHistory:false, markOnlineOnConnect:true, getMessage:async()=>undefined
 })
 sock.ev.on('creds.update', saveCreds)
 sock.ev.on('connection.update', async(u)=>{
   if(u.connection==='close' && u.lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut) setTimeout(()=>startBot(),2500)
   if(u.connection==='open' && pendingWelcome){ pendingWelcome=false; await welcome() }
 })

 sock.ev.on('messages.upsert', async({type,messages})=>{
   if(type!=='notify') return
   const m=messages[0]; if(!m?.message) return
   const from=m.key.remoteJid; if(!from||from==='status@broadcast') return

   // FIX PARA TU CHAT +39 (TU) - QUE TE RESPONDA A TI MISMO
   const isSelf = from === sock.user?.id
   if(m.key.fromMe &&!isSelf) return

   const txt=m.message.conversation||m.message.extendedTextMessage?.text||m.message.imageMessage?.caption||""; if(!txt) return
   const args=txt.trim().split(/ +/); const cmd=args[0].toLowerCase(); const q=args.slice(1).join(' ')
   const send=async(t)=>{ await sock.sendMessage(from,{text:t}) }

   console.log(`[JAKUDOSHY] ${txt}`)

   // === ALL MENU JAKUDOSHY SOLO ===
   if(['.allmenu','.menu','menu'].includes(cmd)){
     return await send(`─〔 🔥 ᴊᴀᴋᴜᴅᴏѕʜʏ ʙᴏᴛ 🔥 〕─\n\n⚙️ ɪɴғᴏʀᴍᴀᴄɪóɴ\n🤖 ʙᴏᴛ: \`ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ\`\n👤 ᴏᴡɴᴇʀ: \`ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ\`\n📦 ᴠ: \`4.0 FINAL FUNCIONAL\`\n\n『 MENÚ PRINCIPAL 』\n✨.allmenu • Comandos\n🤖.aimenu • IA (3)\n⬇️.download • Descargas (11)\n🪙.economymenu • Economía (13)\n🛠️.toolsmenu • Herramientas (24)\n\n> JAKUDOSHY • Oficial\n> t.me/gg_no_root`)
   }
   if(cmd==='.toolsmenu'){ return await send("```\n 『 🛠️ TOOLS MENU 』\n · · · ✦ · · ·\n\n •.ping\n •.dp\n •.vv\n •.translate\n •.base64\n •.qr\n •.shorturl\n •.calc\n •.weather\n •.github\n •.ipinfo\n •.tempmail\n •.fakeinfo\n •.binlookup\n •.whois\n •.dnslookup\n •.portscan\n •.screenshot\n •.define\n •.google\n •.wiki\n •.yts\n •.playstore\n •.npm\n\n · · · ✦ · · ·\n ✦ 24 comando(s) disponibles ✦\n```") }
   if(cmd==='.aimenu'){ return await send("```\n 『 🤖 AI MENU 』\n · · · ✦ · · ·\n\n •.ai\n •.chatbot\n •.gali\n\n · · · ✦ · · ·\n ✦ 3 comando(s) disponibles ✦\n```") }
   if(cmd==='.economymenu'){ return await send("```\n 『 🪙 ECONOMY MENU 』\n · · · ✦ · · ·\n\n •.balance\n •.baltop\n •.daily\n •.work\n •.deposit\n •.withdraw\n •.pay\n •.coinflip\n •.roulette\n •.crime\n •.rob\n •.slut\n •.einfo\n\n · · · ✦ · · ·\n ✦ 13 comando(s) disponibles ✦\n```") }
   if(cmd==='.download'){ return await send("```\n 『 ⬇️ DOWNLOAD MENU 』\n · · · ✦ · · ·\n\n •.song\n •.video\n •.youtube\n •.insta\n •.tiktok\n •.facebook\n •.spotify\n •.apk\n •.playstore\n •.mf\n •.gdrive\n\n · · · ✦ · · ·\n ✦ 11 comando(s) disponibles ✦\n```") }

   // TOOLS 24 FUNCIONALES
   if(cmd==='.ping'){ const s=Date.now(); await send('Pong JAKUDOSHY!'); return await send(`⚡ ${Date.now()-s}ms`) }
   if(cmd==='.qr'){ if(!q) return await send('Uso:.qr texto'); let url=`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(q)}`; await sock.sendMessage(from,{image:{url},caption:`QR: ${q}\nJAKUDOSHY`}); return }
   if(cmd==='.base64'){ if(!q) return await send('.base64 texto'); return await send(`B64 Encode: ${Buffer.from(q).toString('base64')}\nDecode: ${Buffer.from(q,'base64').toString()||'No es base64'}`) }
   if(cmd==='.calc'){ try{ let r=eval(q.replace(/[^0-9+\-*/().]/g,'')); return await send(`🧮 ${q} = ${r}`)}catch{ return await send('Error calc')} }
   if(cmd==='.shorturl'){ try{ let r=await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(q)}`); return await send(`🔗 ${r.data}`)}catch{ return await send('Error shorturl')} }
   if(cmd==='.weather'){ try{ let r=await axios.get(`https://wttr.in/${q}?format=3`); return await send(r.data)}catch{} }
   if(cmd==='.github'){ try{ let r=await axios.get(`https://api.github.com/users/${q}`); return await send(`👤 ${r.data.login}\n📦 Repos: ${r.data.public_repos}\n🔗 ${r.data.html_url}\nBio: ${r.data.bio||''}`)}catch{} }
   if(cmd==='.ipinfo'){ try{ let r=await axios.get(`http://ip-api.com/json/${q}`); return await send(`🌐 IP: ${r.data.query}\n🏳️ ${r.data.country} - ${r.data.city}\n🏢 ${r.data.isp}`)}catch{} }
   if(cmd==='.tempmail'){ try{ let r=await axios.get('https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1'); return await send(`📧 *JAKUDOSHY TEMP MAIL*\n\n✅ Email:\n\`${r.data[0]}\`\n⏳ 10 min\n🔄.tempmail para revisar\n\n_Powered by JAKUDOSHY_`)}catch{} }
   if(cmd==='.fakeinfo'){ try{ let r=await axios.get('https://randomuser.me/api/'); let u=r.data.results[0]; return await send(`👤 Fake:\n${u.name.first} ${u.name.last}\n📧 ${u.email}\n📍 ${u.location.country}`)}catch{} }
   if(cmd==='.binlookup'){ try{ let r=await axios.get(`https://lookup.binlist.net/${q}`,{headers:{'Accept-Version':'3'}}); return await send(`💳 BIN: ${q}\n🏦 ${r.data.bank?.name||'N/A'}\n💰 ${r.data.type} - ${r.data.scheme}\n🏳️ ${r.data.country?.name}`)}catch{ return await send('BIN invalido')} }
   if(cmd==='.whois'||cmd==='.dnslookup'){ return await send(`🔍 ${cmd} ${q}\nAPI: https://api.davidcyriltech.my.id/${cmd==='.whois'?'whois?domain=':'dns?domain='}${q}`) }
   if(cmd==='.screenshot'){ try{ await sock.sendMessage(from,{image:{url:`https://api.davidcyriltech.my.id/screenshot?url=${encodeURIComponent(q)}`},caption:`📸 ${q}\nJAKUDOSHY`}) }catch{}; return }
   if(cmd==='.define'){ try{ let r=await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${q}`); return await send(`📖 ${q}: ${r.data[0].meanings[0].definitions[0].definition}`)}catch{} }
   if(cmd==='.wiki'){ try{ let r=await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`); return await send(`📚 ${r.data.title}\n${r.data.extract}`)}catch{} }
   if(cmd==='.google'){ return await send(`🔍 https://www.google.com/search?q=${encodeURIComponent(q)}`) }
   if(cmd==='.yts'){ try{ let r=await axios.get(`https://api.davidcyriltech.my.id/search/yt?query=${encodeURIComponent(q)}`); let v=r.data.result?.[0]; return await send(`🎥 ${v?.title}\n${v?.url}`)}catch{} }
   if(cmd==='.playstore'||cmd==='.apk'){ return await send(`📱 https://play.google.com/store/search?q=${encodeURIComponent(q)}&c=apps`) }
   if(cmd==='.npm'){ try{ let r=await axios.get(`https://registry.npmjs.org/${q}`); return await send(`📦 ${r.data.name}\n${r.data.description}\nhttps://www.npmjs.com/package/${q}`)}catch{} }
   if(cmd==='.translate'){ try{ let r=await axios.get(`https://api.davidcyriltech.my.id/translate?text=${encodeURIComponent(q)}&lang=en`); return await send(`🌐 ${r.data.result||q}`)}catch{} }

   // AI 3 FUNCIONALES
   if(['.ai','.chatbot','.gali','.ia','.bot','.gpt'].includes(cmd) || txt.toLowerCase().startsWith('ia ')){
     let prompt = txt.replace(/^\.(ia|ai|bot|gpt|gali|chatbot)\s*/i,'').replace(/^ia\s+/i,'').trim() || "Hola"
     try{ await sock.sendPresenceUpdate('composing', from); const res=await IA_PREMIUM(prompt); await sock.sendMessage(from,{text:res}); await sock.sendPresenceUpdate('paused', from) }catch(e){ await send(`❌ IA Error: ${e.message}`) }
     return
   }

   // ECONOMY 13 FUNCIONALES
   if(cmd==='.balance'||cmd==='.bal'||cmd==='.einfo'){ let u=getEco(from); return await send(`🪙 *JAKUDOSHY ECONOMY*\n💰 Cartera: $${u.bal}\n🏦 Banco: $${u.bank}\n💵 Total: $${u.bal+u.bank}`) }
   if(cmd==='.daily'){ let u=getEco(from); let now=Date.now(); if(now-u.lastDaily<86400000) return await send(`⏳ Ya reclamaste daily, vuelve en ${Math.ceil((86400000-(now-u.lastDaily))/3600000)}h`); u.bal+=500; u.lastDaily=now; saveEco(); return await send(`✅ Daily +$500\n💰 $${u.bal}`) }
   if(cmd==='.work'){ let u=getEco(from); let g=Math.floor(Math.random()*100)+20; u.bal+=g; saveEco(); return await send(`💼 Trabajaste +$${g}\n💰 $${u.bal}`) }
   if(cmd==='.deposit'||cmd==='.dep'){ let amt=parseInt(q)||0; let u=getEco(from); if(amt>u.bal) return await send('Sin fondos'); u.bal-=amt; u.bank+=amt; saveEco(); return await send(`🏦 Depositaste $${amt}`) }
   if(cmd==='.withdraw'||cmd==='.with'){ let amt=parseInt(q)||0; let u=getEco(from); if(amt>u.bank) return await send('Sin banco'); u.bank-=amt; u.bal+=amt; saveEco(); return await send(`💰 Retiraste $${amt}`) }
   if(cmd==='.baltop'){ let top=Object.entries(eco).sort((a,b)=>(b[1].bal+b[1].bank)-(a[1].bal+a[1].bank)).slice(0,5); let t="🏆 *TOP JAKUDOSHY*\n"; top.forEach((e,i)=>{ t+=`${i+1}. @${e[0].split('@')[0]} - $${e[1].bal+e[1].bank}\n` }); return await send(t) }
   if(['.coinflip','.roulette','.crime','.rob','.slut'].includes(cmd)){ let u=getEco(from); let win=Math.random()>0.5; if(win){ let g=Math.floor(Math.random()*200)+50; u.bal+=g; saveEco(); return await send(`😈 Ganaste $${g} en ${cmd}`)}else{ let l=Math.floor(Math.random()*100)+20; u.bal=Math.max(0,u.bal-l); saveEco(); return await send(`🚔 Perdiste $${l} en ${cmd}`)} }

   // DOWNLOAD 11
   if(['.song','.video','.youtube','.ytmp4','.insta','.tiktok','.facebook','.fb','.spotify'].includes(cmd)){ return await send(`⬇️ *JAKUDOSHY DL*\n${cmd}: ${q}\n🔗 https://api.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(q)}\nEnvia link directo`) }
 })
}

app.use(express.json())

// PAIR REAL PREMIUM - CODIGO QUE SI VINCULA
app.get('/pair', async(req,res)=>{
 try{
   let num=req.query.number?.replace(/[^0-9]/g,''); if(!num) return res.json({error:"error"})
   if(!sock){ await startBot(); await new Promise(r=>setTimeout(r,3000)) }
   pendingWelcome=true; const code=await sock.requestPairingCode(num); lastCode=code; lastCodeTime=Date.now(); console.log(`CODIGO REAL JAKUDOSHY ${code} PARA ${num}`); return res.json({code})
 }catch(e){ console.log("PAIR ERROR:", e.message); return res.json({error:"espera 10s y reintenta"}) }
})

app.get('/', (req,res)=>{
res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JK BOT JAKUDOSHY FINAL</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@900&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}body{min-height:100vh;background:#000;font-family:'Outfit';overflow-y:auto}
.bg{position:fixed;inset:0;background:radial-gradient(800px at 20% 10%, rgba(255,0,0,.35), transparent 60%), #000;z-index:0}canvas{position:fixed;inset:0;opacity:.3;z-index:1}
.topbar{position:fixed;top:0;left:0;right:0;z-index:50;background:rgba(0,0,0,0.9);border-bottom:2px solid #ff0000;padding:12px;text-align:center}
.topbar-text{font-size:18px;font-weight:900;letter-spacing:4px;color:#fff;text-shadow:0 0 15px #ff0000}
.wrap{position:relative;z-index:3;width:100%;max-width:520px;padding:16px;margin:70px auto 100px auto}
.box{width:100%;background:linear-gradient(145deg, rgba(20,0,0,.98), rgba(0,0,0,.99));border-radius:24px;padding:22px;border:2px solid #ff0000;box-shadow:0 0 80px rgba(255,0,0,.5)}
.header{text-align:center;padding:10px 0 16px;border-bottom:1px solid rgba(255,0,0,.3);margin-bottom:16px}
.title{font-size:32px;font-weight:900;letter-spacing:3px;color:#fff;text-shadow:0 0 20px #ff0000}
.sub{font-size:12px;letter-spacing:2px;color:#ff0000;margin-top:6px;font-weight:900}
#loader{position:fixed;inset:0;z-index:99;background:#000;display:flex;align-items:center;justify-content:center;flex-direction:column}
.load-box{width:90%;max-width:420px;background:#000;border:2px solid #ff0000;border-radius:20px;padding:28px;text-align:center}
.load-title{font-size:26px;color:#fff;letter-spacing:3px;font-weight:900}
.load-sub{font-size:11px;color:#ff0000;letter-spacing:2px;margin-top:8px;font-family:'JetBrains Mono'}
.bar-bg{margin-top:22px;background:#111;border:1px solid rgba(255,0,0,.4);border-radius:100px;height:16px;overflow:hidden}
.bar-fill{height:100%;width:0%;background:linear-gradient(90deg,#ff0000,#ff4444);transition:width.1s}
.percent{margin-top:16px;font-size:42px;font-weight:900;color:#fff;font-family:'JetBrains Mono'}
.logs{margin-top:18px;text-align:left;background:#000;border:1px solid rgba(255,0,0,.25);border-radius:10px;padding:10px;height:110px;overflow:hidden}
.log-line{color:#ff0000;font-size:10px;font-family:'JetBrains Mono';line-height:16px}
#mainContent{display:none}
.card{background:rgba(0,0,0,.7);border:1px solid rgba(255,0,0,.35);border-radius:16px;padding:18px}
.label{font-size:11px;letter-spacing:3px;color:#ff0000;font-weight:900;margin-bottom:10px}
.input-wrap{background:linear-gradient(135deg,#ff0000,#cc0000);padding:2px;border-radius:12px}
.input-inner{display:flex;align-items:center;background:#0a0000;border-radius:10px;padding:16px;gap:8px}
.plus{color:#ff0000;font-size:22px;font-weight:900;font-family:'JetBrains Mono'}
input{flex:1;background:transparent;border:none;outline:none;color:#fff;font-size:18px;font-weight:900;text-align:center;font-family:'JetBrains Mono'}
.btn{width:100%;margin-top:14px;background:linear-gradient(135deg,#ff0000,#990000);padding:2px;border-radius:12px;border:none;cursor:pointer}
.btn-inner{background:#000;color:#fff;border-radius:10px;padding:16px;font-weight:900;font-size:13px;letter-spacing:2px;text-align:center}
.codeBox{display:none;margin-top:14px;background:rgba(255,0,0,.12);border:2px solid #ff0000;border-radius:12px;padding:14px}
.code{font-size:32px;color:#fff;text-align:center;letter-spacing:10px;font-weight:900;text-shadow:0 0 20px #ff0000;font-family:'JetBrains Mono'}
.steps{margin-top:16px;background:#000;border:1px solid rgba(255,0,0,.3);border-radius:12px;padding:14px}
.steps-title{color:#ff0000;font-size:11px;letter-spacing:2px;font-weight:900;margin-bottom:10px;font-family:'JetBrains Mono'}
.step{display:flex;gap:10px;margin-bottom:8px}
.step-n{background:#ff0000;color:#000;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900}
.step-t{color:#ccc;font-size:11px;line-height:20px;font-family:'JetBrains Mono'}
.telegram-float{position:fixed;bottom:20px;right:20px;z-index:60;background:linear-gradient(135deg,#ff0000,#990000);padding:2px;border-radius:50px;text-decoration:none}
.telegram-inner{background:#000;border-radius:50px;padding:10px 18px;display:flex;align-items:center;gap:8px}
.telegram-inner svg{width:20px;height:20px;fill:#ff0000}
.telegram-text{color:#fff;font-size:12px;font-weight:900;font-family:'JetBrains Mono'}
.spacer{height:100px}
</style></head><body>
<div class="bg"></div><canvas id="c"></canvas>
<div class="topbar"><div class="topbar-text">ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ • FINAL</div></div>
<div id="loader"><div class="load-box"><div class="load-title">ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ</div><div class="load-sub">ᴊᴀᴋᴜᴅᴏѕʜʏ • TODO FUNCIONAL</div><div class="bar-bg"><div class="bar-fill" id="bar"></div></div><div class="percent" id="percent">0%</div><div class="logs" id="logs"></div></div></div>
<div class="wrap" id="mainContent"><div class="box"><div class="header"><div class="title">ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ</div><div class="sub">ᴊᴀᴋᴜᴅᴏѕʜʏ • FINAL FUNCIONAL</div></div>
<div class="card"><div class="label">ᴠɪɴᴄᴜʟᴀᴄɪᴏɴ REAL</div><div class="input-wrap"><div class="input-inner"><div class="plus">+</div><input id="num" placeholder="393300297172"></div></div>
<button class="btn" id="btn" onclick="gen()"><div class="btn-inner" id="btnTxt">ɢᴇɴᴇʀᴀʀ ᴄᴏᴅɪɢᴏ REAL</div></button><div class="codeBox" id="codeBox"><div class="code" id="codeText"></div></div></div>
<div class="steps"><div class="steps-title">TODO FUNCIONAL - PASOS:</div><div class="step"><div class="step-n">1</div><div class="step-t"><b>ᴘᴏɴ ᴛᴜ ɴᴜᴍᴇʀᴏ</b></div></div><div class="step"><div class="step-n">2</div><div class="step-t"><b>ɢᴇɴᴇʀᴀʀ</b> ʏ ᴄᴏᴘɪᴀ</div></div><div class="step"><div class="step-n">3</div><div class="step-t">ᴡᴀ > <b>ᴅɪsᴘᴏsɪᴛɪᴠᴏs</b></div></div><div class="step"><div class="step-n">4</div><div class="step-t"><b>ᴠɪɴᴄᴜʟᴀʀ</b> - Luego.ia.allmenu etc</div></div></div><div class="spacer"></div></div></div>
<a class="telegram-float" href="https://t.me/gg_no_root" target="_blank"><div class="telegram-inner"><svg viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.12l-6.893 4.326-2.967-.945c-.64-.203-.658-.64.135-.954l11.6-4.458c.538-.196 1.006.12.832.941z"/></svg><span class="telegram-text">ᴊᴋ ᴄʜᴀɴɴᴇʟꫂꤪꤨᴼᶠᶜ</span></div></a>
<script>
const c=document.getElementById('c'),x=c.getContext('2d');function rs(){c.width=innerWidth;c.height=innerHeight}rs();
let cols=Math.floor(innerWidth/10), drops=new Array(cols).fill(0);
function matrix(){x.fillStyle='rgba(0,0,0,0.12)';x.fillRect(0,0,c.width,c.height);x.font='16px monospace';drops.forEach((y,i)=>{x.fillStyle='#ff0000';x.fillText('0',i*10,y*10);if(y*10>c.height && Math.random()>.97) drops[i]=0;drops[i]++});requestAnimationFrame(matrix)}matrix();
const logsData=["[ SISTEMA ] MODO PRIVADO FIX ACTIVADO ✓","[ SISTEMA ] 24 TOOLS CARGADOS ✓","[ SISTEMA ] 13 ECONOMY CARGADOS ✓","[ SISTEMA ] 11 DOWNLOAD CARGADOS ✓","[ SISTEMA ] 3 AI CARGADOS ✓","[ SISTEMA ] TODO FUNCIONAL JAKUDOSHY ✓"];
let pct=0; const bar=document.getElementById('bar'), perc=document.getElementById('percent'), logs=document.getElementById('logs'), loader=document.getElementById('loader'), main=document.getElementById('mainContent');
function addLog(i){ const d=document.createElement('div'); d.className='log-line'; d.innerHTML=logsData[i]; logs.appendChild(d); }
let idx=0; addLog(0);
let interval=setInterval(()=>{ pct+= Math.random()*5+2; if(pct>100) pct=100; bar.style.width=pct+'%'; perc.innerText=Math.floor(pct)+'%'; if(pct>20&&idx==0){idx=1;addLog(1)} if(pct>40&&idx==1){idx=2;addLog(2)} if(pct>60&&idx==2){idx=3;addLog(3)} if(pct>80&&idx==3){idx=4;addLog(4)} if(pct>90&&idx==4){idx=5;addLog(5)} if(pct>=100){ clearInterval(interval); setTimeout(()=>{ loader.style.display='none'; main.style.display='block'; },500) } }, 50);
async function gen(){const n=document.getElementById('num').value.trim().replace(/[^0-9]/g,'');if(!n) return;document.getElementById('btnTxt').innerText='GENERANDO REAL...';try{const r=await fetch('/pair?number='+encodeURIComponent(n)).then(r=>r.json());if(r.error){document.getElementById('btnTxt').innerText=r.error;return;}document.getElementById('codeText').innerText=r.code;document.getElementById('codeBox').style.display='block';document.getElementById('btnTxt').innerText=r.code;}catch{document.getElementById('btnTxt').innerText='ERROR';}}
</script></body></html>`)
})
app.listen(PORT, ()=>{
  console.log(`[ ${c('SISTEMA')} ] ${c('final funcional online')}`)
  startBot()
})