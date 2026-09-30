const express = require('express')
const app = express()
app.get('/', (r,s)=> s.send('JK-BOT Activo 💀 by jakudoshy'))
app.listen(process.env.PORT || 3000, ()=> console.log('WEB OK'))

const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const P = require('pino')

async function start(){
  const { state, saveCreds } = await useMultiFileAuthState('./jk_session')
  const sock = makeWASocket({ auth: state, logger: P({level:'silent'}), browser: ["Ubuntu","Chrome","20.0"], printQRInTerminal: false })

  if(!sock.authState.creds.registered){
    let num = process.env.PHONE_NUMBER
    if(!num){ console.log('❌ PON TU NUMERO EN VARIABLES: PHONE_NUMBER=5355xxxxxxx'); return }
    let code = await sock.requestPairingCode(num)
    console.log(`🔥 TU CODIGO PARA ${num} ES: ${code} 🔥`)
  }
  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('connection.update', u=>{ if(u.connection=='open') console.log('✅ BOT CONECTADO') })
}
start()