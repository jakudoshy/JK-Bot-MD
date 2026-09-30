// ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ - BOT TODO EN UNO
const fs = require('fs')
if(!fs.existsSync('./package.json')){
  fs.writeFileSync('./package.json', JSON.stringify({name:"jk-bot",main:"index.js",scripts:{start:"node index.js"},dependencies:{"@whiskeysockets/baileys":"^6.7.8","pino":"^8.17.0"}}))
  console.log('package.json creado, reiniciando...')
  require('child_process').execSync('npm install',{stdio:'inherit'})
}

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')

async function startJK(){
  const { state, saveCreds } = await useMultiFileAuthState('./jk_session')
  const sock = makeWASocket({ logger: P({level:'silent'}), auth: state, browser: ["JK Community","Chrome","1.0"] })
  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('group-participants.update', async (anu) => {
    if(anu.action == 'add'){
      let num = anu.participants[0]
      let txt = `✦ ᴊᴋ_ᴄᴏᴍᴍᴜɴɪᴛʏꫂꤪꤨᴼᶠᶜ ᴘʀᴇѕᴇɴᴛѕ ✦\n━━━━━━━━━━━━\n🔥 ᴜɴ ᴅᴇᴍᴏɴɪᴏ ᴍᴀѕ ᴀ ʟᴀ ꜰᴀᴍɪʟɪᴀ 🔥\n\n👑 ᴇʟᴇɢɪᴅᴏ: @${num.split('@')[0]}\n👤 ɴᴏᴍʙʀᴇ: Nuevo demonio\n━━━━━━━━━━━━\nᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ 💀`
      await sock.sendMessage(anu.id, {text: txt, mentions:[num]})
    }
  })

  sock.ev.on('messages.upsert', async ({messages}) => {
    const m = messages[0]
    if(!m.message || m.key.fromMe) return
    const text = m.message.conversation || m.message.extendedTextMessage?.text || ""
    const from = m.key.remoteJid
    if(text == '.ping') sock.sendMessage(from, {text: 'Activo 💀 ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ'})
    if(text == '.menu') sock.sendMessage(from, {text: '✦ MENU JK ✦\n.ping\n.menu'})
  })
}
startJK()