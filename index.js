const express = require('express');
const app = express();
const P = require('pino');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');

app.get('/', (req, res) => res.send('ᴊᴋ-ʙᴏᴛ-ᴍᴅ ᴀᴄᴛɪᴠᴏ 💀 ʙʏ ᴊᴀᴋᴜᴅᴏsʜʏ'));
app.listen(process.env.PORT || 3000, () => console.log('ᴡᴇʙ ᴏᴋ'));

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./session');
  const sock = makeWASocket({
    auth: state,
    logger: P({ level: 'silent' }),
    browser: ["Ubuntu", "Chrome", "20.0.04"],
    printQRInTerminal: false
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect } = u;
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('✅ ᴊᴋ-ʙᴏᴛ-ᴍᴅ ᴄᴏɴᴇᴄᴛᴀᴅᴏ');
    }
  });

  if (!sock.authState.creds.registered) {
    const num = (process.env.PHONE_NUMBER || '').replace(/[^0-9]/g, '');
    if (!num) return console.log('❌ Pon en Variables: PHONE_NUMBER = 535xxxxxxx');
    await new Promise(r => setTimeout(r, 3000));
    try {
      const code = await sock.requestPairingCode(num);
      console.log(`\n🔥 ᴛᴜ ᴄᴏᴅɪɢᴏ ᴇs: ${code} 🔥\nPonlo en WhatsApp > Dispositivos vinculados > Vincular con numero`);
    } catch (e) { console.log('Error pidiendo codigo:', e.message) }
  }
}
startBot();