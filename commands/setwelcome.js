module.exports = async function setwelcome(sock, chatId, msg, isAdmin, botData, saveBotData, args = []) {
    const reply = text => sock.sendMessage(chatId, { text }, { quoted: msg });
    if (!chatId.endsWith('@g.us')) return reply('❌ Este comando solo funciona en grupos.');
    if (!isAdmin) return reply('❌ Solo los administradores pueden cambiar el texto.');
    const text = args.join(' ').trim();
    if (!text) return reply('✍️ Uso: */set_bienvenida Hola @user, bienvenido a @grupo*\nVariables: @user, @grupo, @desc');
    botData.groupWelcomeText ||= {};
    botData.groupWelcome ||= {};
    botData.groupWelcomeText[chatId] = text;
    botData.groupWelcome[chatId] = true;
    saveBotData();
    return reply('✅ Texto guardado y bienvenida activada. Al unirse alguien, recibirá el mensaje y el menú de comandos.');
};
