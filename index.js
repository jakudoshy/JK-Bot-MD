const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const axios = require('axios')
const app = express()
let sock=null

async function IA(q){
 try{ let m=q.match(/(\d+)\s*([\+\-\*\/x])\s*(\d+)/i); if(m){ let a=+m[1],b=+m[3],op=m[2].toLowerCase(); let r=op=='+'||op=='x'?a+b:op=='-'?a-b:op=='/'?(a/b).toFixed(2):a*b; if(op=='x') r=a*b; return `${a} ${m[2]} ${b} = ${r}` } }catch{}
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

   // FIX PRIVADO UNIVERSAL - PARA TU +39 Y EL DE CUALQUIERA
   const myId = sock.user?.id || ""
   const myLid = myId.split(':')[0]+'@s.whatsapp.net'
   if(m.key.fromMe && from!==myId && from!==myLid) return

   const txt=m.message.conversation||m.message.extendedTextMessage?.text||m.message.imageMessage?.caption||""; if(!txt) return
   const args=txt.trim().split(/ +/); const cmd=args[0].toLowerCase(); const q=args.slice(1).join(' ')
   const send=t=>sock.sendMessage(from,{text:t})

   if(cmd==='.menu'||cmd==='.allmenu') return await send("╭─ JK BOT JAKUDOSHY ─\n│.toolsmenu - 24 tools\n│.aimenu\n│.ia pregunta\n╰─ ONLINE")

   if(cmd==='.toolsmenu') return await send("TOOLS:\n.ping\n.qr texto\n.base64 txt\n.calc 2+2\n.shorturl url\n.weather habana\n.github user\n.ipinfo 1.1.1.1\n.tempmail\n.fakeinfo\n.binlookup 123456\n.define hola\n.wiki cuba\n.google tema\n.screenshot url\n.yts cancion")

   if(cmd==='.ping'){ let s=Date.now(); await send('pong'); return await send(Date.now()-s+'ms') }
   if(cmd==='.qr'&&q) return await sock.sendMessage(from,{image:{url:`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(q)}`},caption:q})
   if(cmd==='.base64'&&q) return await send(Buffer.from(q).toString('base64'))
   if(cmd==='.calc'){ try{ return await send(eval(q.replace(/[^0-9+\-*/().]/g,''))+'')}catch{ return await send('error') } }
   if(cmd==='.shorturl'&&q){ try{ let r=await axios.get('https://tinyurl.com/api-create.php?url='+encodeURIComponent(q)); return await send(r.data)}catch{} }
   if(cmd==='.tempmail'){ try{ let r=await axios.get('https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1'); return await send(r.data[0])}catch{} }
   if(cmd==='.binlookup'&&q){ try{ let r=await axios.get('https://lookup.binlist.net/'+q,{headers:{'Accept-Version':'3'}}); return await send(r.data.scheme+' '+r.data.country.name)}catch{} }

   if(['.ia','.ai','.gali'].includes(cmd)||txt.toLowerCase().startsWith('ia ')){
     let pr=txt.replace(/^\.(ia|ai|gali)/i,'').replace(/^ia /i,'').trim()||'Hola'
     await sock.sendPresenceUpdate('composing', from)
     let res=await IA(pr)
     await sock.sendMessage(from,{text:res})
     await sock.sendPresenceUpdate('paused', from)
   }
 })
}

app.get('/pair', async(req,res)=>{
 let num=req.query.number?.replace(/[^0-9]/g,''); if(!num) return res.json({error:"no number"})
 if(!sock){ await startBot(); await new Promise(r=>setTimeout(r,2000)) }
 try{ let code=await sock.requestPairingCode(num); res.json({code}) }catch{ res.json({error:"espera 20s y reintenta"}) }
})

app.get('/', (req,res)=>{
 res.send(`<body style="background:#000;color:#fff;font-family:monospace;display:flex;justify-content:center;align-items:center;height:100vh;margin:0"><div style="border:2px solid red;padding:24px;border-radius:18px;text-align:center;box-shadow:0 0 30px red;width:90%;max-width:380px"><h2>JK BOT JAKUDOSHY</h2><input id=n placeholder="3933XXXXXXXX" style="width:100%;padding:12px;background:#111;color:#fff;border:1px solid red;border-radius:10px;text-align:center"><button onclick="fetch('/pair?number='+n.value).then(r=>r.json()).then(d=>c.innerText=d.code||d.error)" style="width:100%;margin-top:12px;padding:12px;background:red;border:0;border-radius:10px;font-weight:900;color:#fff">GENERAR CODIGO</button><div id=c style="margin-top:16px;font-size:28px;letter-spacing:6px"></div><p style="font-size:11px">WhatsApp > Dispositivos vinculados > Vincular con numero</p></div></body>`)
})

app.listen(process.env.PORT||3000, ()=>{ startBot(); console.log('JK BOT ONLINE') })