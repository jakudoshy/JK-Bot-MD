const reminders = new Map();

module.exports = async function(sock, chatId, msg, q) {
    if (!q) return await sock.sendMessage(chatId, { text: '⏰ Uso: /remind <minutos> <mensaje>\nEjemplo: /remind 30 revisar la tarea' }, { quoted: msg });

    const parts = q.trim().split(/\s+/);
    const minutes = Number(parts[0]);
    const reminderText = parts.slice(1).join(' ');

    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 10080 || !reminderText) {
        return await sock.sendMessage(chatId, { text: '⚠️ Usa entre 1 y 10080 minutos.\nEjemplo: /remind 30 revisar la tarea' }, { quoted: msg });
    }
    
    const ms = minutes * 60 * 1000;
    const id = Date.now();
    
    await sock.sendMessage(chatId, { text: `⏰ Recordatorio programado para ${minutes} minuto(s).\n\n📝 ${reminderText}` }, { quoted: msg });
    
    const timeout = setTimeout(async () => {
        try {
            await sock.sendMessage(chatId, { 
                text: `⏰ *¡RECORDATORIO!*\n\n${reminderText}\n\n_Programado hace ${minutes} min._`
            });
            reminders.delete(id);
        } catch (e) {}
    }, ms);
    
    reminders.set(id, { timeout, text: reminderText });
};
