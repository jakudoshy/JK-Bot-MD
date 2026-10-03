module.exports = async function aiClear(sock, from, msg, session) {
    if (session && typeof session.clearAIHistory === 'function') session.clearAIHistory(from);
    await sock.sendMessage(from, { text: '🧠 Contexto de IA borrado. Empezamos una conversación nueva.' }, { quoted: msg });
};
