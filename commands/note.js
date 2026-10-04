function ownerOf(msg, chatId) {
    return msg?.key?.participant || (msg?.key?.fromMe ? msg?.key?.remoteJid : chatId) || chatId;
}

function usage() {
    return '📝 *NOTAS PERSONALES*\n\n' +
        '• /note add comprar leche\n' +
        '• /note list\n' +
        '• /note done 1\n' +
        '• /note del 1\n' +
        '• /note clear';
}

module.exports = async function noteCommand(sock, chatId, msg, q = '', botData, saveBotData) {
    botData.notes ||= {};
    const owner = ownerOf(msg, chatId);
    botData.notes[owner] ||= [];
    const notes = botData.notes[owner];
    const parts = String(q).trim().split(/\s+/).filter(Boolean);
    const action = (parts.shift() || 'list').toLowerCase();

    if (['help', 'ayuda'].includes(action)) return sock.sendMessage(chatId, { text: usage() }, { quoted: msg });
    if (['list', 'lista', 'ver'].includes(action)) {
        if (!notes.length) return sock.sendMessage(chatId, { text: '📝 No tienes notas guardadas.\n\nUsa /note add texto para crear una.' }, { quoted: msg });
        const text = notes.map((note, i) => `${i + 1}. ${note.done ? '✅' : '⬜'} ${note.text}`).join('\n');
        return sock.sendMessage(chatId, { text: `📝 *TUS NOTAS*\n\n${text}\n\nUsa /note done número para completarla.` }, { quoted: msg });
    }
    if (['add', 'new', 'añadir', 'agregar'].includes(action)) {
        const text = parts.join(' ').trim();
        if (!text) return sock.sendMessage(chatId, { text: '✍️ Escribe la nota. Ejemplo: /note add llamar al cliente' }, { quoted: msg });
        if (text.length > 180) return sock.sendMessage(chatId, { text: '❌ La nota no puede superar 180 caracteres.' }, { quoted: msg });
        if (notes.length >= 50) return sock.sendMessage(chatId, { text: '❌ Llegaste al límite de 50 notas. Borra alguna con /note del número.' }, { quoted: msg });
        notes.push({ text, done: false, createdAt: new Date().toISOString() });
        saveBotData();
        return sock.sendMessage(chatId, { text: `✅ Nota guardada (#${notes.length}).\n\n${text}` }, { quoted: msg });
    }
    if (['clear', 'limpiar', 'all'].includes(action)) {
        botData.notes[owner] = [];
        saveBotData();
        return sock.sendMessage(chatId, { text: '🗑️ Todas tus notas fueron eliminadas.' }, { quoted: msg });
    }
    const index = Number(parts[0]) - 1;
    if (!Number.isInteger(index) || index < 0 || index >= notes.length) {
        return sock.sendMessage(chatId, { text: usage() }, { quoted: msg });
    }
    if (['done', 'hecha', 'complete', 'completar'].includes(action)) {
        notes[index].done = true;
        saveBotData();
        return sock.sendMessage(chatId, { text: `✅ Nota #${index + 1} completada.` }, { quoted: msg });
    }
    if (['del', 'delete', 'borrar', 'eliminar'].includes(action)) {
        const [removed] = notes.splice(index, 1);
        saveBotData();
        return sock.sendMessage(chatId, { text: `🗑️ Nota eliminada: ${removed.text}` }, { quoted: msg });
    }
    return sock.sendMessage(chatId, { text: usage() }, { quoted: msg });
};
