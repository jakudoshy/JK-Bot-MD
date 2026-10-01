const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const axios = require('axios')

function c(t){
 const m={'a':'ᴀ','b':'ʙ','c':'ᴄ','d':'ᴅ','e':'ᴇ','f':'ғ','g':'ɢ','h':'ʜ','i':'ɪ','j':'ᴊ','k':'ᴋ','l':'ʟ','m':'ᴍ','n':'ɴ','o':'ᴏ','p':'ᴘ','q':'ǫ','r':'ʀ','s':'s','t':'ᴛ','u':'ᴜ','v':'ᴠ','w':'ᴡ','x':'x','y':'ʏ','z':'ᴢ'}
 return t.split('').map(x=>m[x]||x).join('')
}

const app = express()
const PORT = process.env.PORT || 3000
let sock=null, pendingWelcome=false

const APIS = {
  gpt: "https://api.davidcyriltech.my.id/ai/chatbot?query=",
  premium: "https://api.davidcyriltech.my.id/ai/gemini?query=",
  gpt2: "https://api.azz.biz.id/api/ai/gpt?query=",
  gpt3: "https://text.pollinations.ai/"
}

async function IA_PREMIUM(txt){
 const q=encodeURIComponent(txt)
 try{ const m2=txt.match(/(\d+)\s*([\+\-\*\/x])\s*(\d+)/i); if(m2){ let a=+m2[1],b=+m2[3],op=m2[2]; let r=op==='+'?a+b:op==='-'?a-b:op==='/'?(a/b).toFixed(2):a*b; return `${a} ${op} ${b} = ${r}` } }catch{}
 try{ const r=await axios.get(APIS.gpt+q,{timeout:12000}); if(r.data?.result) return r.data.result }catch{}
 try{ const r=await axios.get(APIS.premium+q,{timeout:12000}); if(r.data?.result) return r.data.result }catch{}
 try{ const r=await axios.get(APIS.gpt2+q,{timeout:12000}); if(r.data?.result) return r.data.result }catch{}
 try{ const r=await axios.get(APIS.gpt3+q,{timeout:10000}); if(typeof r.data==='string'&&r.data.length>4) return r.data }catch{}
 return txt
}

async function welcome(){
 if(!sock?.user?.id) return
 try{ await new Promise(r=>setTimeout(r,1500)); await sock.sendMessage(sock.user.id,{text:`╭─ • ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ • ─\n│ ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ\n│.menu.toolsmenu.ia\n╰─ • ${c('online')} • ─`}) }catch{}
}

async function startBot(){
 const { state, saveCreds } = await useMultiFileAuthState('./auth_info')
 const { version } = await fetchLatestBaileysVersion()
 sock = makeWASocket({ version, logger:P({level:'silent'}), printQRInTerminal:false, auth:{creds:state.creds, keys:makeCacheableSignalKeyStore(state.keys,P({level:'silent'}))}, browser:["Debian","Chrome","11.0"], syncFullHistory:false, markOnlineOnConnect:true, getMessage:async()=>undefined })
 sock.ev.on('creds.update', saveCreds)
 sock.ev.on('connection.update', async(u)=>{
   if(u.connection==='close' && u.lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut) setTimeout(()=>startBot(),2500)
   if(u.connection==='open' && pendingWelcome){ pendingWelcome=false; await welcome() }
 })
 sock.ev.on('messages.upsert', async({type,messages})=>{
   if(type!=='notify') return
   const m=messages[0]; if(!m?.message) return
   const from=m.key.remoteJid; if(!from||from==='status@broadcast') return
   // FIX UNIVERSAL PRIVADO - ESTA ES LA CLAVE
   if(m.key.fromMe && from!==sock.user?.id) return
   const txt=m.message.conversation||m.message.extendedTextMessage?.text||m.message.imageMessage?.caption||""; if(!txt) return
   const cmd=txt.trim().split(/ +/)[0].toLowerCase(); const q=txt.trim().split(/ +/).slice(1).join(' ')
   const send=t=>sock.sendMessage(from,{text:t})

   if(cmd==='.menu'||cmd==='.allmenu'){ return await send(`╭─ • ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ • ─\n│.toolsmenu - 24 tools\n│.aimenu\n│.menu\n│.ia pregunta\n╰─ • ᴊᴀᴋᴜᴅᴏѕʜʏ • ─`) }
   if(cmd==='.toolsmenu'){ return await send("```🛠️ TOOLS JAKUDOSHY\n.ping\n.qr texto\n.base64 texto\n.calc 2+2\n.shorturl url\n.weather habana\n.github usuario\n.ipinfo 1.1.1.1\n.tempmail\n.fakeinfo\n.binlookup 123456\n.define hola\n.wiki cuba\n.google tema\n.translate texto\n.screenshot url\n.yts bad bunny\n.playstore whatsapp\n.npm baileys\n.trt en es hello```") }
   if(cmd==='.aimenu'){ return await send("```🤖 IA\n.ia pregunta\n.ai pregunta\n.gali pregunta```") }

   if(cmd==='.ping'){ const s=Date.now(); await send('Pong!'); return await send(`${Date.now()-s}ms`) }
   if(cmd==='.qr'){ if(!q) return await send('Uso:.qr texto'); return await sock.sendMessage(from,{image:{url:`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(q)}`},caption:q}) }
   if(cmd==='.base64'){ return await send(Buffer.from(q).toString('base64')) }
   if(cmd==='.calc'){ try{ return await send(`${q} = ${eval(q.replace(/[^0-9+\-*/().]/g,''))}`)}catch{ return await send('Error')} }
   if(cmd==='.shorturl'){ try{ let r=await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(q)}`); return await send(r.data)}catch{} }
   if(cmd==='.weather'){ try{ let r=await axios.get(`https://wttr.in/${encodeURIComponent(q)}?format=3`); return await send(r.data)}catch{} }
   if(cmd==='.github'){ try{ let r=await axios.get(`https://api.github.com/users/${q}`); return await send(`${r.data.login} - ${r.data.public_repos} repos`)}catch{} }
   if(cmd==='.ipinfo'){ try{ let r=await axios.get(`http://ip-api.com/json/${q}`); return await send(`${r.data.query} ${r.data.country} ${r.data.city}`)}catch{} }
   if(cmd==='.tempmail'){ try{ let r=await axios.get('https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1'); return await send(r.data[0])}catch{} }
   if(cmd==='.fakeinfo'){ try{ let r=await axios.get('https://randomuser.me/api/'); let u=r.data.results[0]; return await send(`${u.name.first} ${u.email}`)}catch{} }
   if(cmd==='.binlookup'){ try{ let r=await axios.get(`https://lookup.binlist.net/${q}`,{headers:{'Accept-Version':'3'}}); return await send(`${q} ${r.data.scheme} ${r.data.country?.name}`)}catch{ return await send('BIN malo')} }
   if(cmd==='.define'){ try{ let r=await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${q}`); return await send(r.data[0].meanings[0].definitions[0].definition)}catch{} }
   if(cmd==='.wiki'){ try{ let r=await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`); return await send(r.data.extract)}catch{} }
   if(cmd==='.google'){ return await send(`https://www.google.com/search?q=${encodeURIComponent(q)}`) }
   if(cmd==='.screenshot'){ try{ return await sock.sendMessage(from,{image:{url:`https://api.davidcyriltech.my.id/screenshot?url=${encodeURIComponent(q)}`}})}catch{} }

   if(['.ia','.ai','.gali','.chatbot','.bot','.gpt'].includes(cmd)||txt.toLowerCase().startsWith('ia ')){
     let prompt=txt.replace(/^\.(ia|ai|gali|chatbot|bot|gpt)/i,'').replace(/^ia /i,'').trim()||"Hola"
     await sock.sendPresenceUpdate('composing', from)
     const res=await IA_PREMIUM(prompt)
     await sock.sendMessage(from,{text:res})
     await sock.sendPresenceUpdate('paused', from)
   }
 })
}

app.get('/pair', async(req,res)=>{
 try{
   let num=req.query.number?.replace(/[^0-9]/g,''); if(!num) return res.json({error:"no number"})
   if(!sock){ await startBot(); await new Promise(r=>setTimeout(r,3000)) }
   pendingWelcome=true; const code=await sock.requestPairingCode(num); return res.json({code})
 }catch(e){ return res.json({error:"espera 10s"}) }
})

app.get('/', (req,res)=>{ res.send(`<h1>JK BOT JAKUDOSHY - PRIVADO FIX</h1><input id=n placeholder=numero><button onclick="fetch('/pair?number='+n.value).then(r=>r.json()).then(d=>document.body.innerHTML+=d.code)">GEN</button>`) })
app.listen(PORT, ()=>{ console.log('online'); startBot() })