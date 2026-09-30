const express = require('express')
const app = express()
app.get('/', (req,res)=> res.send('JK-BOT Activo 💀'))
app.listen(process.env.PORT || 3000, ()=> console.log('Web OK'))

const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const P = require('pino')
const readline = require('readline')

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (t) => new Promise(res => rl.question(t, res))

async function start(){
  const { state, saveCreds } = await useMultiFileAuthState('./jk_session')
  const sock = makeWASocket({ auth: state, logger: P({level:'silent'}), printQRInTerminal: false, browser: ["Ubuntu","Chrome","20.0"] })

  if(!sock.authState.creds.registered){
    console.log('--- JK BOT PAIRING CODE ---')
    let num = await question('Pon tu numero con codigo pais sin + Ej: 5355xxxxxxx: ')
    let code = await sock.requestPairingCode(num.trim())
    console.log(`Tu codigo es: ${code} - Ponlo en WhatsApp > Dispositivos vinculados > Vincular con numero`)
  }

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', ({connection})=>{
    if(connection === 'open') console.log('✅ CONECTADO COMO JK-BOT')
  })

  sock.ev.on('messages.upsert', async ({messages})=>{
    const m = messages[0]
    if(!m.message) return
    const text = m.message.conversation || m.message.extendedTextMessage?.text || ""
    if(text == '.ping') await sock.sendMessage(m.key.remoteJid, {text:'Pong! JK-BOT activo 💀'})
  })
}
start()