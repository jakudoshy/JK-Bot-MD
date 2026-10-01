const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const axios = require('axios')
const app = express()
const PORT = process.env.PORT || 3000
let sock=null

async function IA(q){
 try{ let m=q.match(/(\d+)\s*([\+\-\*\/])\s*(\d+)/); if(m){ let a=+m[1],b=+m[3],o=m[2]; let r=o=='+'?a+b:o=='-'?a-b:o=='*'?a*b:a/b; return `${a} ${o} ${b} = ${r}` } }catch{}
 try{ let r=await axios.get("https://api.davidcyriltech.my.id/ai/chatbot?query="+encodeURIComponent(q),{timeout:12000}); if(r.data?.result) return r.data.result }catch{}
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
   const myRaw=sock.user?.id||""; const myLid=myRaw.split(':')[0]+'@s.whatsapp.net'
   if(m.key.fromMe && from!==myRaw && from!==myLid) return
   const txt=m.message.conversation||m.message.extendedTextMessage?.text||""; if(!txt) return
   const cmd=txt.trim().split(/ +/)[0].toLowerCase(); const q=txt.trim().split(/ +/).slice(1).join(' ')
   const send=t=>sock.sendMessage(from,{text:t})
   if(cmd==='.menu') return await send("JK BOT JAKUDOSHY\n.toolsmenu\n.ia pregunta\n.ping\n.qr")
   if(cmd==='.toolsmenu') return await send(".ping.qr.base64.calc.shorturl.weather.github.ipinfo.tempmail.fakeinfo.binlookup.define.wiki.google.screenshot")
   if(cmd==='.ping'){ let s=Date.now(); await send('pong'); return await send(Date.now()-s+'ms') }
   if(cmd==='.qr'&&q) return await sock.sendMessage(from,{image:{url:`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(q)}`}})
   if(cmd==='.calc'){ try{ return await send(eval(q.replace(/[^0-9+\-*/().]/g,''))+'')}catch{} }
   if(['.ia','.ai','.gali'].includes(cmd)||txt.toLowerCase().startsWith('ia ')){
     let pr=txt.replace(/^\.(ia|ai|gali)/i,'').replace(/^ia /i,'').trim(); let r=await IA(pr); await sock.sendMessage(from,{text:r})
   }
 })
}

app.get('/pair', async(req,res)=>{
 let num=req.query.number?.replace(/[^0-9]/g,''); if(!num) return res.json({error:"pon numero"})
 if(!sock){ await startBot(); await new Promise(r=>setTimeout(r,2000)) }
 try{ let code=await sock.requestPairingCode(num); res.json({code}) }catch(e){ res.json({error:"espera 20s y prueba de nuevo"}) }
})

app.get('/', (req,res)=>{
 res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JK BOT</title>
 <style>body{background:#000;color:#fff;font-family:monospace;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}.box{border:2px solid red;padding:20px;border-radius:16px;width:90%;max-width:400px;text-align:center;box-shadow:0 0 30px red} input{width:100%;padding:14px;background:#111;color:#fff;border:1px solid red;border-radius:10px;text-align:center;font-size:18px;margin-top:12px} button{width:100%;padding:14px;margin-top:12px;background:red;color:#fff;border:none;border-radius:10px;font-weight:900;cursor:pointer} #code{margin-top:14px;font-size:32px;letter-spacing:8px;font-weight:900}</style>
 </head><body><div class="box"><h2>JK BOT JAKUDOSHY</h2><p>vinculacion premium</p><input id="num" placeholder="Ej: 39333XXXXXXX"><button onclick="gen()">GENERAR CODIGO</button><div id="code"></div><p style="font-size:12px;margin-top:12px">Pon numero con pais sin + <br> WhatsApp > Dispositivos vinculados > Vincular con codigo</p></div>
 <script>async function gen(){ let n=document.getElementById('num').value.trim(); if(!n) return; document.getElementById('code').innerText='generando...'; let r=await fetch('/pair?number='+encodeURIComponent(n)).then(r=>r.json()); if(r.code) document.getElementById('code').innerText=r.code; else document.getElementById('code').innerText=r.error }</script>
 </body></html>`)
})

app.listen(PORT, ()=>{ startBot(); console.log('online') })