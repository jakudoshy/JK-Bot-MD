const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const axios = require('axios')
const app = express()
const PORT = process.env.PORT || 3000
let sock=null, pendingWelcome=false

function c(t){ const m={'a':'ᴀ','b':'ʙ','c':'ᴄ','d':'ᴅ','e':'ᴇ','f':'ғ','g':'ɢ','h':'ʜ','i':'ɪ','j':'ᴊ','k':'ᴋ','l':'ʟ','m':'ᴍ','n':'ɴ','o':'ᴏ','p':'ᴘ','q':'ǫ','r':'ʀ','s':'s','t':'ᴛ','u':'ᴜ','v':'ᴠ','w':'ᴡ','x':'x','y':'ʏ','z':'ᴢ'}; return t.split('').map(x=>m[x]||x).join('') }

async function IA(q){
 try{ const mm=q.match(/(\d+)\s*([\+\-\*\/])\s*(\d+)/); if(mm){ let a=+mm[1],b=+mm[3]; let r=mm[2]==='+'?a+b:mm[2]==='-'?a-b:mm[2]==='*'?a*b:a/b; return `${a} ${mm[2]} ${b} = ${r}` } }catch{}
 try{ let r=await axios.get("https://api.davidcyriltech.my.id/ai/chatbot?query="+encodeURIComponent(q),{timeout:12000}); if(r.data?.result) return r.data.result }catch{}
 try{ let r=await axios.get("https://api.davidcyriltech.my.id/ai/gemini?query="+encodeURIComponent(q),{timeout:12000}); if(r.data?.result) return r.data.result }catch{}
 return q
}

async function startBot(){
 const { state, saveCreds } = await useMultiFileAuthState('./auth_info')
 const { version } = await fetchLatestBaileysVersion()
 sock = makeWASocket({ version, logger:P({level:'silent'}), printQRInTerminal:false, auth:{creds:state.creds, keys:makeCacheableSignalKeyStore(state.keys,P({level:'silent'}))}, browser:["Chrome","Debian","1"], syncFullHistory:false, markOnlineOnConnect:true, getMessage:async()=>undefined })
 sock.ev.on('creds.update', saveCreds)
 sock.ev.on('connection.update', u=>{ if(u.connection==='close'&&u.lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut) setTimeout(startBot,3000) })
 sock.ev.on('messages.upsert', async({type,messages})=>{
   if(type!=='notify') return
   const m=messages[0]; if(!m?.message) return
   const from=m.key.remoteJid; if(!from||from==='status@broadcast') return

   // MECANISMO UNIVERSAL - NO LO TOQUES - ARREGLA TU +39 Y EL DE TODOS
   const myRaw = sock.user?.id || ""
   const myLid = myRaw.split(':')[0] + '@s.whatsapp.net'
   const isSelfChat = from===myRaw || from===myLid
   if(m.key.fromMe &&!isSelfChat) return

   const txt=m.message.conversation||m.message.extendedTextMessage?.text||m.message.imageMessage?.caption||""; if(!txt) return
   const args=txt.trim().split(/ +/); const cmd=args[0].toLowerCase(); const q=args.slice(1).join(' ')
   const send=t=>sock.sendMessage(from,{text:t})

   if(cmd==='.menu'||cmd==='.allmenu') return await send(`╭─ ᴊᴋ ʙᴏᴛ ᴊᴀᴋᴜᴅᴏѕʜʏ ─\n│.toolsmenu\n│.aimenu\n│.ia pregunta\n╰─ online`)

   if(cmd==='.toolsmenu') return await send("TOOLS JAKUDOSHY\n.ping\n.qr texto\n.base64 texto\n.calc 2+2\n.shorturl url\n.weather ciudad\n.github user\n.ipinfo ip\n.tempmail\n.fakeinfo\n.binlookup bin\n.define palabra\n.wiki tema\n.google tema\n.translate texto\n.screenshot url\n.yts cancion\n.playstore app\n.npm pkg\n.trt es en hola")

   if(cmd==='.aimenu') return await send(".ia.ai.gali.chatbot")

   // TOOLS REALES
   if(cmd==='.ping'){ let s=Date.now(); await send('pong'); return await send(`${Date.now()-s}ms`) }
   if(cmd==='.qr'&&q) return await sock.sendMessage(from,{image:{url:`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(q)}`},caption:q})
   if(cmd==='.base64'&&q) return await send(Buffer.from(q).toString('base64'))
   if(cmd==='.calc'){ try{ return await send(`${q}=${eval(q.replace(/[^0-9+\-*/().]/g,''))}`)}catch{} }
   if(cmd==='.shorturl'&&q){ try{ let r=await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(q)}`); return await send(r.data)}catch{} }
   if(cmd==='.weather'&&q){ try{ let r=await axios.get(`https://wttr.in/${encodeURIComponent(q)}?format=3`); return await send(r.data)}catch{} }
   if(cmd==='.github'&&q){ try{ let r=await axios.get(`https://api.github.com/users/${q}`); return await send(`${r.data.login} repos:${r.data.public_repos}`)}catch{} }
   if(cmd==='.ipinfo'&&q){ try{ let r=await axios.get(`http://ip-api.com/json/${q}`); return await send(`${r.data.query} ${r.data.country} ${r.data.city}`)}catch{} }
   if(cmd==='.tempmail'){ try{ let r=await axios.get('https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1'); return await send(r.data[0])}catch{} }
   if(cmd==='.fakeinfo'){ try{ let r=await axios.get('https://randomuser.me/api/'); let u=r.data.results[0]; return await send(`${u.name.first} ${u.email}`)}catch{} }
   if(cmd==='.binlookup'&&q){ try{ let r=await axios.get(`https://lookup.binlist.net/${q}`,{headers:{'Accept-Version':'3'}}); return await send(`${q} ${r.data.scheme} ${r.data.country?.name}`)}catch{ return await send('bin malo')} }
   if(cmd==='.define'&&q){ try{ let r=await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${q}`); return await send(r.data[0].meanings[0].definitions[0].definition)}catch{} }
   if(cmd==='.wiki'&&q){ try{ let r=await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`); return await send(r.data.extract)}catch{} }
   if(cmd==='.google'&&q) return await send(`https://www.google.com/search?q=${encodeURIComponent(q)}`)
   if(cmd==='.screenshot'&&q){ try{ return await sock.sendMessage(from,{image:{url:`https://api.davidcyriltech.my.id/screenshot?url=${encodeURIComponent(q)}`}})}catch{} }

   // IA
   if(['.ia','.ai','.gali','.chatbot','.bot','.gpt'].includes(cmd)||txt.toLowerCase().startsWith('ia ')){
     let prompt=txt.replace(/^\.(ia|ai|gali|chatbot|bot|gpt)/i,'').replace(/^ia /i,'').trim()||'Hola'
     await sock.sendPresenceUpdate('composing', from)
     let res=await IA(prompt)
     await sock.sendMessage(from,{text:res})
     await sock.sendPresenceUpdate('paused', from)
   }
 })
}

app.get('/pair', async(req,res)=>{
 try{
   let num=req.query.number?.replace(/[^0-9]/g,''); if(!num) return res.json({error:"no number"})
   if(!sock){ await startBot(); await new Promise(r=>setTimeout(r,3000)) }
   const code=await sock.requestPairingCode(num); return res.json({code})
 }catch(e){ return res.json({error:"espera 10s"}) }
})

app.get('/', (req,res)=>{ res.send("JK BOT JAKUDOSHY - PRIVADO UNIVERSAL FIX") })
app.listen(PORT, ()=>{ startBot(); console.log('online') })