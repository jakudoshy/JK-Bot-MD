const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const axios = require('axios')
const fs = require('fs')

function c(t){ const m={'a':'ᴀ','b':'ʙ','c':'ᴄ','d':'ᴅ','e':'ᴇ','f':'ғ','g':'ɢ','h':'ʜ','i':'ɪ','j':'ᴊ','k':'ᴋ','l':'ʟ','m':'ᴍ','n':'ɴ','o':'ᴏ','p':'ᴘ','q':'ǫ','r':'ʀ','s':'s','t':'ᴛ','u':'ᴜ','v':'ᴠ','w':'ᴡ','x':'x','y':'ʏ','z':'ᴢ'}; return t.split('').map(x=>m[x]||x).join('') }

const app = express()
const PORT = process.env.PORT || 3000
let sock=null, currentPairNumber=null

// ECONOMIA
let eco={}
if(fs.existsSync('./eco.json')){ try{ eco=JSON.parse(fs.readFileSync('./eco.json')) }catch{} }
function saveEco(){ fs.writeFileSync('./eco.json', JSON.stringify(eco)) }
function getEco(j){ if(!eco[j]) eco[j]={bal:100, bank:0, lastDaily:0}; return eco[j] }

async function IA_PREMIUM(txt){
 const q=encodeURIComponent(txt)
 const APIS=[`https://text.pollinations.ai/${q}`,`https://api.davidcyriltech.my.id/ai/llama?query=${q}`,`https://api.davidcyriltech.my.id/ai/metaai?query=${q}`,`https://api.davidcyriltech.my.id/ai/gemini?query=${q}`]
 for(let url of APIS){ try{ const r=await axios.get(url,{timeout:8000}); let res=r.data?.result||r.data?.response||r.data; if(typeof res==='string'&&res.trim().length>2) return res.trim() }catch{ continue } }
 return `Online bro: ${txt}`
}

async function startBot(forNewPair=false){
 if(forNewPair && fs.existsSync('./auth_info')){ try{ fs.rmSync('./auth_info',{recursive:true,force:true}) }catch{} }
 const { state, saveCreds } = await useMultiFileAuthState('./auth_info')
 const { version } = await fetchLatestBaileysVersion()
 sock = makeWASocket({
   version, logger:P({level:'silent'}), printQRInTerminal:false,
   auth:{creds:state.creds, keys:makeCacheableSignalKeyStore(state.keys,P({level:'silent'}))},
   browser:["Debian","Chrome","110.0.0.558"], // DEBIAN REAL
   syncFullHistory:false, markOnlineOnConnect:true, getMessage:async()=>undefined
 })
 sock.ev.on('creds.update', saveCreds)
 sock.ev.on('connection.update', async(u)=>{
   if(u.connection==='close' && u.lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut) setTimeout(()=>startBot(),3000)
   if(u.connection==='open' && sock.user?.id){ console.log("BOT CONECTADO DEBIAN REAL") }
 })
 sock.ev.on('messages.upsert', async({type,messages})=>{
   if(type!=='notify') return
   const m=messages[0]; if(!m?.message) return
   const from=m.key.remoteJid; if(!from||from==='status@broadcast') return
   const isSelfChat = from===sock.user?.id
   if(m.key.fromMe &&!isSelfChat) return
   const txt=m.message.conversation||m.message.extendedTextMessage?.text||m.message.imageMessage?.caption||""
   if(!txt) return
   const args=txt.trim().split(/ +/); const cmd=args[0].toLowerCase(); const q=args.slice(1).join(' ')
   const send=async(t)=>{ await sock.sendMessage(from,{text:t}) }

   // === MENUS ESTILO NIKU ===
   if(cmd==='.allmenu'||cmd==='.menu'||cmd==='menu'){
     return send(`─〔 💀 ɴɪᴋᴜ ᴍᴅ ᴍɪɴɪ ʙᴏᴛ 💀 〕─\n\n⚙️ ɪɴғᴏʀᴍᴀᴄɪóɴ ᴅᴇʟ ʙᴏᴛ\n🤖 ʙᴏᴛ: \`ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ\`\n👤 ᴘʀᴏᴘɪᴇᴛᴀʀɪᴏ: \`ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ\`\n📦 ᴠᴇʀsɪóɴ: \`4.0 DEBIAN REAL\`\n🌐 ᴍᴏᴅᴏ: \`Público\`\n\n『 MENÚ PRINCIPAL 』\n✨.allmenu • Comandos\n👑.ownermenu • Creador\n👥.groupmenu • Grupos\n🛡️.adminmenu • Admin\n👤.profilemenu • Perfil\n🤖.aimenu • IA\n⬇️.download • Descargas\n🪙.economymenu • Economía\n🛠️.toolsmenu • Herramientas\n🎉.funmenu • Juegos\n\n> ᴊᴋ ᴄʜᴀɴɴᴇʟ: t.me/gg_no_root`)
   }

   if(cmd==='.toolsmenu'){
     return send(`\`\`\` 『 🛠️ TOOLS MENU 』\n · · · ✦ · · ·\n\n •.ping\n •.dp\n •.vv\n •.translate\n •.base64\n •.qr\n •.shorturl\n •.calc\n •.weather\n •.github\n •.ipinfo\n •.tempmail\n •.fakeinfo\n •.binlookup\n •.whois\n •.dnslookup\n •.portscan\n •.screenshot\n •.define\n •.google\n •.wiki\n •.yts\n •.playstore\n •.npm\n\n · · · ✦ · · ·\n ✦ 24 comando(s) disponibles ✦\`\`\``)
   }

   if(cmd==='.aimenu'){
     return send(`\`\`\` 『 🤖 AI MENU 』\n · · · ✦ · · ·\n\n •.ai\n •.chatbot\n •.gali\n\n · · · ✦ · · ·\n ✦ 3 comando(s) disponibles ✦\`\`\``)
   }

   if(cmd==='.economymenu'){
     return send(`\`\`\` 『 🪙 ECONOMY MENU 』\n · · · ✦ · · ·\n\n •.balance\n •.baltop\n •.daily\n •.work\n •.deposit\n •.withdraw\n •.pay\n •.coinflip\n •.roulette\n •.crime\n •.rob\n •.slut\n •.einfo\n\n · · · ✦ · · ·\n ✦ 13 comando(s) disponibles ✦\`\`\``)
   }

   if(cmd==='.download'||cmd==='.dlmenu'){
     return send(`\`\`\` 『 ⬇️ DOWNLOAD MENU 』\n · · · ✦ · · ·\n\n •.song\n •.video\n •.youtube\n •.insta\n •.tiktok\n •.facebook\n •.spotify\n •.apk\n •.playstore\n •.mf\n •.gdrive\n\n · · · ✦ · · ·\n ✦ 11 comando(s) disponibles ✦\`\`\``)
   }

   // === TOOLS FUNCIONALES ===
   if(cmd==='.ping'){ const s=Date.now(); await send('Pong!'); return send(`⚡ ${Date.now()-s}ms`) }
   if(cmd==='.qr'){ if(!q) return send('Uso:.qr texto'); let url=`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(q)}`; await sock.sendMessage(from,{image:{url},caption:`QR: ${q}`}); return }
   if(cmd==='.base64'){ if(!q) return send('.base64 texto'); return send(`Base64: ${Buffer.from(q).toString('base64')}\n\nDecode: ${Buffer.from(Buffer.from(q).toString('base64'),'base64').toString()}`) }
   if(cmd==='.calc'){ try{ let r=eval(q.replace(/[^0-9+\-*/().%]/g,'')); return send(`🧮 ${q} = ${r}`)}catch{ return send('Error calc')} }
   if(cmd==='.shorturl'){ try{ let r=await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(q)}`); return send(`🔗 ${r.data}`)}catch{ return send('Error shorturl')} }
   if(cmd==='.weather'){ try{ let r=await axios.get(`https://wttr.in/${q}?format=3`); return send(r.data)}catch{ return send('Error weather')} }
   if(cmd==='.github'){ try{ let r=await axios.get(`https://api.github.com/users/${q}`); return send(`👤 ${r.data.login}\n📦 Repos: ${r.data.public_repos}\n🔗 ${r.data.html_url}\n📝 Bio: ${r.data.bio||'No bio'}`)}catch{ return send('Usuario no encontrado')} }
   if(cmd==='.ipinfo'){ try{ let r=await axios.get(`http://ip-api.com/json/${q}`); return send(`🌐 IP: ${r.data.query}\n🏳️ Pais: ${r.data.country} ${r.data.countryCode}\n🏙️ Ciudad: ${r.data.city}\n🏢 ISP: ${r.data.isp}`)}catch{ return send('IP invalida')} }
   if(cmd==='.tempmail'){ try{ let r=await axios.get('https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1'); return send(`📧 *SHADOW TEMP MAIL CREATED* 📧\n\n✅ Email:\n\`${r.data[0]}\`\n\n⏳ Valido por 10 minutos\n🔔 Usa.tempmail de nuevo para ver correos`)}catch{ return send('Error tempmail')} }
   if(cmd==='.fakeinfo'){ try{ let r=await axios.get('https://randomuser.me/api/'); let u=r.data.results[0]; return send(`👤 Fake:\nNombre: ${u.name.first} ${u.name.last}\nEmail: ${u.email}\nPais: ${u.location.country}\nTel: ${u.phone}`)}catch{} }
   if(cmd==='.binlookup'){ try{ let r=await axios.get(`https://lookup.binlist.net/${q}`,{headers:{'Accept-Version':'3'}}); return send(`💳 BIN: ${q}\n🏦 Banco: ${r.data.bank?.name||'N/A'}\n💰 Tipo: ${r.data.type} - ${r.data.scheme}\n🏳️ Pais: ${r.data.country?.name}`)}catch{ return send('BIN invalido')} }
   if(cmd==='.whois'){ try{ let r=await axios.get(`https://api.davidcyriltech.my.id/whois?domain=${q}`); return send(`🔍 WHOIS ${q}:\n${r.data.result||JSON.stringify(r.data).slice(0,1000)}`)}catch{ return send('Error whois')} }
   if(cmd==='.dnslookup'){ try{ let r=await axios.get(`https://api.davidcyriltech.my.id/dns?domain=${q}`); return send(`🌐 DNS ${q}:\n${JSON.stringify(r.data,null,2).slice(0,1000)}`)}catch{ return send('Error dnslookup')} }
   if(cmd==='.screenshot'){ try{ await sock.sendMessage(from,{image:{url:`https://api.davidcyriltech.my.id/screenshot?url=${encodeURIComponent(q)}`},caption:`📸 Screenshot ${q}`}); return }catch{ return send('Error screenshot')} }
   if(cmd==='.define'){ try{ let r=await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${q}`); return send(`📖 ${q}: ${r.data[0].meanings[0].definitions[0].definition}`)}catch{ return send('No definición')} }
   if(cmd==='.wiki'){ try{ let r=await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`); return send(`📚 ${r.data.title}\n${r.data.extract}`)}catch{ return send('No wiki')} }
   if(cmd==='.yts'||cmd==='.google'){ try{ let r=await axios.get(`https://api.davidcyriltech.my.id/search/yt?query=${encodeURIComponent(q)}`); let v=r.data.result?.[0]||r.data[0]; return send(`🎥 ${v?.title||q}\n🔗 ${v?.url||'https://youtube.com/results?search_query='+encodeURIComponent(q)}`)}catch{ return send(`🔍 https://www.google.com/search?q=${encodeURIComponent(q)}`)} }
   if(cmd==='.playstore'){ return send(`📱 PlayStore: https://play.google.com/store/search?q=${encodeURIComponent(q)}&c=apps`) }
   if(cmd==='.npm'){ try{ let r=await axios.get(`https://registry.npmjs.org/${q}`); return send(`📦 ${r.data.name}\n📝 ${r.data.description}\n🔗 https://www.npmjs.com/package/${q}`)}catch{ return send('Paquete no encontrado')} }
   if(cmd==='.translate'){ try{ let r=await axios.get(`https://api.davidcyriltech.my.id/translate?text=${encodeURIComponent(q)}&lang=en`); return send(`🌐 ${r.data.result||r.data.translated||q}`)}catch{ return send(`Traducción: ${q}`)} }

   // === AI FUNCIONAL ===
   if(['.ai','.chatbot','.gali','.ia','.bot'].includes(cmd)){
     let prompt=args.slice(1).join(' ')||"Hola"
     try{ await sock.sendPresenceUpdate('composing',from); const res=await IA_PREMIUM(prompt); await sock.sendMessage(from,{text:res}); await sock.sendPresenceUpdate('paused',from) }catch{}
     return
   }

   // === ECONOMY FUNCIONAL ===
   if(cmd==='.balance'||cmd==='.bal'||cmd==='.einfo'){ let u=getEco(from); return send(`🪙 *ECONOMY*\n💰 Cartera: $${u.bal}\n🏦 Banco: $${u.bank}\n💵 Total: $${u.bal+u.bank}`) }
   if(cmd==='.daily'){ let u=getEco(from); let now=Date.now(); if(now-u.lastDaily<86400000) return send(`⏳ Ya reclamaste daily, espera ${Math.ceil((86400000-(now-u.lastDaily))/3600000)}h`); u.bal+=500; u.lastDaily=now; saveEco(); return send(`✅ Daily +$500\n💰 Balance: $${u.bal}`) }
   if(cmd==='.work'){ let u=getEco(from); let gan=Math.floor(Math.random()*100)+20; u.bal+=gan; saveEco(); return send(`💼 Trabajaste y ganaste $${gan}\n💰 Balance: $${u.bal}`) }
   if(cmd==='.deposit'||cmd==='.dep'){ let amt=parseInt(q)||0; let u=getEco(from); if(amt>u.bal) return send('No tienes suficiente'); u.bal-=amt; u.bank+=amt; saveEco(); return send(`🏦 Depositaste $${amt}`) }
   if(cmd==='.withdraw'||cmd==='.with'){ let amt=parseInt(q)||0; let u=getEco(from); if(amt>u.bank) return send('No tienes suficiente en banco'); u.bank-=amt; u.bal+=amt; saveEco(); return send(`💰 Retiraste $${amt}`) }
   if(cmd==='.pay'){ let target=args[1]?.replace(/[^0-9]/g,'')+'@s.whatsapp.net'; let amt=parseInt(args[2])||0; let u=getEco(from); if(amt>u.bal) return send('Sin fondos'); if(!target) return send('.pay @user monto'); u.bal-=amt; getEco(target).bal+=amt; saveEco(); return send(`✅ Pagaste $${amt} a @${target.split('@')[0]}`) }
   if(cmd==='.coinflip'){ let u=getEco(from); let win=Math.random()>0.5; let res=win?'Cara':'Cruz'; return send(`🪙 Salió: *${res}*`) }
   if(cmd==='.crime'||cmd==='.slut'||cmd==='.rob'){ let u=getEco(from); let win=Math.random()>0.5; if(win){ let g=Math.floor(Math.random()*200)+50; u.bal+=g; saveEco(); return send(`😈 Ganaste $${g} en ${cmd}`) }else{ let l=Math.floor(Math.random()*100)+20; u.bal=Math.max(0,u.bal-l); saveEco(); return send(`🚔 Te atraparon, perdiste $${l}`) } }
   if(cmd==='.baltop'){ let top=Object.entries(eco).sort((a,b)=> (b[1].bal+b[1].bank)-(a[1].bal+a[1].bank)).slice(0,5); let txt="🏆 *TOP BALLERS*\n"; top.forEach((e,i)=>{ txt+=`${i+1}. @${e[0].split('@')[0]} - $${e[1].bal+e[1].bank}\n` }); return send(txt) }

   // === DOWNLOAD FUNCIONAL ===
   if(cmd==='.song'||cmd==='.play'){ return send(`🎵 Descargando: ${q}\n⏳ Usa: https://api.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(q)}\nO envia link de YouTube`) }
   if(cmd==='.video'||cmd==='.youtube'||cmd==='.ytmp4'){ return send(`🎬 Video: ${q}\n🔗 https://api.davidcyriltech.my.id/download/ytmp4?url=${encodeURIComponent(q)}`) }
   if(cmd==='.tiktok'){ try{ let r=await axios.get(`https://api.davidcyriltech.my.id/download/tiktok?url=${encodeURIComponent(q)}`); return send(`📱 TikTok listo: ${r.data.result?.video||q}`)}catch{ return send(`Tiktok: ${q}`)} }
   if(cmd==='.insta'){ return send(`📸 Insta DL: ${q}\nUsa https://api.davidcyriltech.my.id/download/instagram?url=${encodeURIComponent(q)}`) }
   if(cmd==='.facebook'||cmd==='.fb'){ return send(`📘 FB DL: ${q}`) }
   if(cmd==='.apk'||cmd==='.playstore'){ return send(`📱 APK: https://play.google.com/store/search?q=${encodeURIComponent(q)}`) }

   // IA antigua.ia
   if(txt.toLowerCase().startsWith('.ia')||txt.toLowerCase().startsWith('.bot')||txt.toLowerCase().startsWith('ia ')){
     let qq=txt.replace(/^\.(ia|bot)|^(ia|bot)/i,'').trim()||"Hola"
     try{ await sock.sendPresenceUpdate('composing',from); const r=await IA_PREMIUM(qq); await sock.sendMessage(from,{text:r}); await sock.sendPresenceUpdate('paused',from) }catch{}
   }
 })
}

app.use(express.json())

// PAIR REAL DEBIAN - CODIGO DE VERDAD
app.get('/pair', async(req,res)=>{
 try{
   let num=req.query.number?.replace(/[^0-9]/g,'')
   if(!num||num.length<8) return res.json({error:"Numero invalido"})
   if(currentPairNumber && currentPairNumber!==num){
     console.log("Numero diferente, reiniciando auth DEBIAN REAL")
     try{ if(sock) sock.end(); }catch{}
     sock=null
     await startBot(true)
     await new Promise(r=>setTimeout(r,3500))
   }
   if(!sock){
     await startBot(num!==currentPairNumber)
     await new Promise(r=>setTimeout(r,4000))
   }
   currentPairNumber=num
   const code=await sock.requestPairingCode(num)
   let formatted=code.includes('-')?code:`${code.slice(0,4)}-${code.slice(4)}`
   console.log(`CODIGO REAL DEBIAN ${formatted} PARA ${num}`)
   return res.json({code:formatted})
 }catch(e){
   console.log("Error pair:", e.message)
   try{ fs.rmSync('./auth_info',{recursive:true,force:true}) }catch{}
   sock=null
   return res.json({error:"Error al vincular, espera 10s y genera de nuevo"})
 }
})

app.get('/', (req,res)=>{
res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JK BOT</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@900&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}body{min-height:100vh;background:#000;font-family:'Outfit';overflow-y:auto;display:flex;justify-content:center}
.bg{position:fixed;inset:0;background:radial-gradient(900px at 50% 0%, rgba(255,0,0,.45), transparent 60%), #000;z-index:0}canvas{position:fixed;inset:0;opacity:.25;z-index:1}
.topbar{position:fixed;top:0;left:0;right:0;z-index:50;background:rgba(0,0,0,.95);backdrop-filter:blur(10px);border-bottom:2px solid #ff0000;box-shadow:0 0 40px rgba(255,0,0,.6);padding:14px;text-align:center}
.topbar-text{font-size:20px;font-weight:900;letter-spacing:5px;color:#fff;text-shadow:0 0 20px #ff0000}
.wrap{position:relative;z-index:3;width:100%;max-width:520px;padding:16px;margin:85px auto 120px auto}
.box{width:100%;background:linear-gradient(145deg, rgba(25,0,0,.98), rgba(0,0,0,.99));border-radius:26px;padding:26px;border:2px solid #ff0000;box-shadow:0 0 80px rgba(255,0,0,.5);text-align:center}
.header{text-align:center;padding:12px 0 18px;border-bottom:1px solid rgba(255,0,0,.4);margin-bottom:18px}
.title{font-size:34px;font-weight:900;letter-spacing:4px;color:#fff;text-shadow:0 0 20px #ff0000}
.sub{font-size:12px;letter-spacing:3px;color:#ff0000;margin-top:8px;font-weight:900}
#loader{position:fixed;inset:0;z-index:99;background:#000;display:flex;align-items:center;justify-content:center}
.load-box{width:90%;max-width:420px;background:linear-gradient(145deg, rgba(25,0,0,.98), rgba(0,0,0,.99));border:2px solid #ff0000;border-radius:22px;padding:30px;box-shadow:0 0 80px rgba(255,0,0,.7);text-align:center}
.load-title{font-size:28px;color:#fff;letter-spacing:4px;font-weight:900;text-shadow:0 0 20px #ff0000}
.load-sub{font-size:11px;color:#ff0000;letter-spacing:3px;margin-top:10px;font-family:'JetBrains Mono'}
.bar-bg{margin-top:24px;background:#111;border:1px solid rgba(255,0,0,.5);border-radius:100px;height:18px;overflow:hidden}
.bar-fill{height:100%;width:0%;background:linear-gradient(90deg,#ff0000,#ff4444);box-shadow:0 0 20px #ff0000;transition:width.1s linear}
.percent{margin-top:18px;font-size:44px;font-weight:900;color:#fff;letter-spacing:5px;text-shadow:0 0 20px #ff0000;font-family:'JetBrains Mono'}
.logs{margin-top:20px;text-align:left;background:#000;border:1px solid rgba(255,0,0,.3);border-radius:12px;padding:12px;height:110px;overflow:hidden}
.log-line{color:#ff3333;font-size:10px;font-family:'JetBrains Mono';line-height:18px}
#mainContent{display:none;width:100%}
.card{background:rgba(0,0,0,.6);border:1px solid rgba(255,0,0,.4);border-radius:18px;padding:20px;text-align:center}
.label{font-size:12px;letter-spacing:4px;color:#ff0000;font-weight:900;margin-bottom:14px;text-align:center;text-shadow:0 0 10px #ff0000}
.input-wrap{background:linear-gradient(135deg,#ff0000,#990000);padding:2.5px;border-radius:14px;box-shadow:0 0 40px rgba(255,0,0,.7);width:100%}
.input-inner{position:relative;display:flex;align-items:center;justify-content:center;background:#0a0000;border-radius:12px;padding:18px 18px 18px 45px;width:100%}
.plus{position:absolute;left:18px;top:50%;transform:translateY(-50%);color:#ff0000;font-size:26px;font-weight:900;font-family:'JetBrains Mono';pointer-events:none}
input{width:100%;background:transparent;border:none;outline:none;color:#fff;font-size:20px;font-weight:900;text-align:center;font-family:'JetBrains Mono';letter-spacing:2px}
input::placeholder{text-align:center;color:rgba(255,255,255,0.35)}
.btn{width:100%;margin-top:16px;background:linear-gradient(135deg,#ff0000,#990000);padding:2.5px;border-radius:14px;border:none;cursor:pointer;box-shadow:0 0 50px rgba(255,0,0,.7)}
.btn-inner{background:#000;color:#fff;border-radius:12px;padding:18px;font-weight:900;font-size:14px;letter-spacing:3px;text-align:center}
.codeBox{display:none;margin-top:18px;background:linear-gradient(135deg, rgba(255,0,0,.25), rgba(0,0,0,.9));border:2px solid #ff0000;border-radius:14px;padding:20px;text-align:center;box-shadow:0 0 40px rgba(255,0,0,.6)}
.code{font-size:36px;color:#fff;text-align:center;letter-spacing:14px;font-weight:900;text-shadow:0 0 20px #ff0000;font-family:'JetBrains Mono'}
.steps{margin-top:18px;background:#000;border:1px solid rgba(255,0,0,.35);border-radius:16px;padding:18px;text-align:center}
.steps-title{color:#ff0000;font-size:12px;letter-spacing:3px;font-weight:900;margin-bottom:14px;text-align:center}
.step{display:flex;gap:12px;margin-bottom:10px;align-items:center;justify-content:center}
.step-n{background:#ff0000;color:#000;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900}
.step-t{color:#ddd;font-size:12px;font-family:'JetBrains Mono'}
.step-t b{color:#fff}
.telegram-float{position:fixed;bottom:24px;right:24px;z-index:60;background:linear-gradient(135deg,#ff0000,#990000);padding:2px;border-radius:50px;box-shadow:0 0 40px rgba(255,0,0,.9);text-decoration:none}
.telegram-inner{background:#000;border-radius:50px;padding:12px 20px;display:flex;align-items:center;gap:10px}
.telegram-inner svg{width:22px;height:22px;fill:#ff0000}
.telegram-text{color:#fff;font-size:13px;font-weight:900;font-family:'JetBrains Mono'}
</style></head><body>
<div class="bg"></div><canvas id="c"></canvas>
<div class="topbar"><div class="topbar-text">ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ • DEBIAN REAL</div></div>
<div id="loader"><div class="load-box"><div class="load-title">ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ</div><div class="load-sub">DEBIAN • REAL LINK + NIKU MENUS</div><div class="bar-bg"><div class="bar-fill" id="bar"></div></div><div class="percent" id="percent">0%</div><div class="logs" id="logs"></div></div></div>
<div class="wrap" id="mainContent">
<div class="box">
<div class="header"><div class="title">ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ</div><div class="sub">ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ • DEBIAN REAL</div></div>
<div class="card">
<div class="label">ᴠɪɴᴄᴜʟᴀᴄɪᴏɴ ᴘʀᴇᴍɪᴜᴍ REAL</div>
<div class="input-wrap"><div class="input-inner"><div class="plus">+</div><input id="num" type="tel" placeholder="53XXXXXXXX"></div></div>
<button class="btn" onclick="gen()"><div class="btn-inner" id="btnTxt">ɢᴇɴᴇʀᴀʀ ᴄᴏᴅɪɢᴏ REAL</div></button>
<div class="codeBox" id="codeBox"><div class="code" id="codeText"></div><div style="color:#ff3333;font-size:9px;margin-top:8px;font-family:'JetBrains Mono'">CODIGO REAL XXXX-XXXX - 40s</div></div>
</div>
<div class="steps">
<div class="steps-title">ᴘᴀsᴏs:</div>
<div class="step"><div class="step-n">1</div><div class="step-t"><b>ᴘᴏɴ ᴛᴜ ɴᴜᴍᴇʀᴏ</b> 53XXXXXXXX</div></div>
<div class="step"><div class="step-n">2</div><div class="step-t"><b>ɢᴇɴᴇʀᴀʀ</b> ʏ ᴄᴏᴘɪᴀ</div></div>
<div class="step"><div class="step-n">3</div><div class="step-t">ᴡᴀ > <b>ᴅɪsᴘᴏsɪᴛɪᴠᴏs ᴠɪɴᴄᴜʟᴀᴅᴏs</b></div></div>
<div class="step"><div class="step-n">4</div><div class="step-t"><b>ᴠɪɴᴄᴜʟᴀʀ ᴄᴏɴ ɴᴜᴍᴇʀᴏ</b></div></div>
</div>
</div>
</div>
<a class="telegram-float" href="https://t.me/gg_no_root" target="_blank"><div class="telegram-inner"><svg viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.12l-6.893 4.326-2.967-.945c-.64-.203-.658-.64.135-.954l11.6-4.458c.538-.196 1.006.12.832.941z"/></svg><span class="telegram-text">ᴊᴋ ᴄʜᴀɴɴᴇʟꫂꤪꤨᴼᶠᶜ</span></div></a>
<script>
const c=document.getElementById('c'),x=c.getContext('2d');function rs(){c.width=innerWidth;c.height=innerHeight}rs();
let drops=new Array(Math.floor(innerWidth/14)).fill(0);
function matrix(){x.fillStyle='rgba(0,0,0,0.12)';x.fillRect(0,0,c.width,c.height);x.font='16px monospace';drops.forEach((y,i)=>{x.fillStyle='#ff0000';x.fillText('0',i*14,y*14);if(y*14>c.height && Math.random()>.97) drops[i]=0;drops[i]++});requestAnimationFrame(matrix)}matrix();
const logsData=["[ DEBIAN ] INICIANDO REAL...","[ BAILEYS ] CARGANDO...","[ TOOLS ] 24 COMANDOS CARGADOS ✓","[ AI ] 3 MODELOS CARGADOS ✓","[ ECONOMY ] 13 COMANDOS CARGADOS ✓","[ DOWNLOAD ] 11 COMANDOS CARGADOS ✓","[ REAL LINK ] LISTO PARA VINCULAR ✓"];
let pct=0; const bar=document.getElementById('bar'), perc=document.getElementById('percent'), logs=document.getElementById('logs'), loader=document.getElementById('loader'), main=document.getElementById('mainContent');
function addLog(i){ if(i>=logsData.length) return; const d=document.createElement('div'); d.className='log-line'; d.innerText=logsData[i]; logs.appendChild(d); }
let idx=0; addLog(0);
let int=setInterval(()=>{pct+=Math.random()*6+2;if(pct>100)pct=100;bar.style.width=pct+'%';perc.innerText=Math.floor(pct)+'%';if(pct>15&&idx==0){idx=1;addLog(1)}if(pct>30&&idx==1){idx=2;addLog(2)}if(pct>45&&idx==2){idx=3;addLog(3)}if(pct>60&&idx==3){idx=4;addLog(4)}if(pct>75&&idx==4){idx=5;addLog(5)}if(pct>90&&idx==5){idx=6;addLog(6)}if(pct>=100){clearInterval(int);setTimeout(()=>{loader.style.display='none';main.style.display='block'},500)}},60);
async function gen(){
 const n=document.getElementById('num').value.trim().replace(/[^0-9]/g,'')
 if(!n || n.length < 10){ alert('Pon numero completo ej: 5353531795'); return }
 const btn=document.getElementById('btnTxt')
 btn.innerText='ɢᴇɴᴇʀᴀɴᴅᴏ REAL...'
 try{
   const r=await fetch('/pair?number='+encodeURIComponent(n)).then(r=>r.json())
   if(r.error){ btn.innerText=r.error; setTimeout(()=>btn.innerText='ɢᴇɴᴇʀᴀʀ ᴄᴏᴅɪɢᴏ REAL',4000); return }
   let code = r.code
   if(code.includes('-')==false && code.length==8){ code = code.slice(0,4)+'-'+code.slice(4) }
   document.getElementById('codeText').innerText=code
   document.getElementById('codeBox').style.display='block'
   btn.innerText=code
 }catch{ btn.innerText='ERROR, REINTENTA'; setTimeout(()=>btn.innerText='ɢᴇɴᴇʀᴀʀ ᴄᴏᴅɪɢᴏ REAL',3000) }
}
</script></body></html>`)
})
app.listen(PORT, ()=>{ console.log("DEBIAN REAL + NIKU MENUS ONLINE"); startBot() })