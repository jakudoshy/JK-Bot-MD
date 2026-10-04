import db from "#db"
export default {
  command: ['ping', 'p'],
  category: 'info',
  run: async ({ msg, sock }) => {
    const start = Date.now()
    const botName = db.getSettings(sock.user.id.split(':')[0] + "@s.whatsapp.net").namebot
    const latency = Date.now() - start
    await sock.sendMessage(msg.chat, {
      text: `✿ *Pong!*\n> *${botName}*\n> Tiempo ⴵ ${latency}ms`
    }, { quoted: msg })
  },
};
