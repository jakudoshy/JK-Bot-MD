const express = require('express')
const app = express()
app.get('/', (req,res)=> res.send('JK-BOT Activo 💀 by jakudoshy'))
app.listen(process.env.PORT || 3000)

const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const P = require('pino')

async function start(){
  const { state, saveCreds } = await useMultiFileAuthState('./session')
  const sock = makeWASocket({ auth: state, logger: P({level:'silent'}), printQRInTerminal: true })
  sock.ev.on('creds.update', saveCreds)
  
  sock.ev.on('group-participants.update', async a=>{
    if(a.action=='add'){
      let txt = `✦ ᴊᴋ_ᴄᴏᴍᴍᴜɴɪᴛʏꫂꤪꤨᴼᶠᶜ ᴘʀᴇѕᴇɴᴛѕ ✦\n━━━━━━━━━━━━\n🔥 ᴜɴ ᴅᴇᴍᴏɴɪᴏ ᴍᴀѕ ᴀ ʟᴀ ꜰᴀᴍɪʟɪᴀ 🔥\n\n👑 @${a.participants[0].split('@')[0]}\n━━━━━━━━━━━━\nᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ 💀`
      await sock.sendMessage(a.id,{text:txt, mentions:a.participants})
    }
  })
}
start()