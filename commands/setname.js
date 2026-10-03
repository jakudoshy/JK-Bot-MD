async function setnameCommand(sock, from, msg, isOwner, botData, saveBotData, userId, q) {
    if (!isOwner) return await sock.sendMessage(from, { text: "❌ Solo el número Owner autorizado puede usar este comando." }, { quoted: msg });
    if (!q) return await sock.sendMessage(from, { text: "❌ Please provide a name." }, { quoted: msg });
    
    botData.userNames[userId] = q;
    saveBotData();
    await sock.sendMessage(from, { text: `✅ Name set to: ${q}` }, { quoted: msg });
}

module.exports = setnameCommand;
