const ZONES = {
    madrid: 'Europe/Madrid', barcelona: 'Europe/Madrid', mexico: 'America/Mexico_City',
    cdmx: 'America/Mexico_City', bogota: 'America/Bogota', lima: 'America/Lima',
    caracas: 'America/Caracas', buenosaires: 'America/Argentina/Buenos_Aires',
    argentina: 'America/Argentina/Buenos_Aires', santiago: 'America/Santiago',
    habana: 'America/Havana', cuba: 'America/Havana', miami: 'America/New_York',
    newyork: 'America/New_York', nueva_york: 'America/New_York', losangeles: 'America/Los_Angeles',
    londres: 'Europe/London', london: 'Europe/London', tokio: 'Asia/Tokyo', tokyo: 'Asia/Tokyo',
    brasilia: 'America/Sao_Paulo', sao_paulo: 'America/Sao_Paulo'
};

module.exports = async function timeCommand(sock, chatId, msg, q = '') {
    const input = String(q).trim().toLowerCase();
    const zone = ZONES[input] || (input.includes('/') ? q.trim() : 'UTC');
    let now;
    try {
        now = new Intl.DateTimeFormat('es-ES', { timeZone: zone, dateStyle: 'full', timeStyle: 'long' }).format(new Date());
    } catch {
        return sock.sendMessage(chatId, { text: `❌ Zona no válida: ${q}\n\nEjemplos: /time Madrid, /time México, /time America/New_York` }, { quoted: msg });
    }
    return sock.sendMessage(chatId, { text: `🕒 *HORA MUNDIAL*\n\n📍 Zona: ${zone}\n📅 ${now}\n\nPrueba /time Madrid, /time Cuba o /time Tokyo.` }, { quoted: msg });
};
