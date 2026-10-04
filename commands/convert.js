const UNITS = {
    m: { group: 'length', factor: 1 }, km: { group: 'length', factor: 1000 }, cm: { group: 'length', factor: 0.01 }, mi: { group: 'length', factor: 1609.344 }, ft: { group: 'length', factor: 0.3048 },
    kg: { group: 'weight', factor: 1 }, g: { group: 'weight', factor: 0.001 }, lb: { group: 'weight', factor: 0.45359237 }, oz: { group: 'weight', factor: 0.0283495231 },
    s: { group: 'time', factor: 1 }, min: { group: 'time', factor: 60 }, h: { group: 'time', factor: 3600 }, d: { group: 'time', factor: 86400 }
};
const TEMP = new Set(['c', 'f', 'k']);
function temperature(value, from, to) {
    let celsius = from === 'c' ? value : from === 'f' ? (value - 32) * 5 / 9 : value - 273.15;
    return to === 'c' ? celsius : to === 'f' ? celsius * 9 / 5 + 32 : celsius + 273.15;
}

module.exports = async function convertCommand(sock, chatId, msg, q = '') {
    const parts = String(q).trim().toLowerCase().split(/\s+/);
    const value = Number(parts[0]); const from = parts[1]; const to = parts[2];
    if (!Number.isFinite(value) || !from || !to) return sock.sendMessage(chatId, { text: '🔄 Uso: /convert cantidad unidad_origen unidad_destino\nEjemplos: /convert 10 km mi\n/convert 25 c f\n/convert 2 h min' }, { quoted: msg });
    let result;
    if (TEMP.has(from) && TEMP.has(to)) result = temperature(value, from, to);
    else if (UNITS[from] && UNITS[to] && UNITS[from].group === UNITS[to].group) result = value * UNITS[from].factor / UNITS[to].factor;
    else return sock.sendMessage(chatId, { text: '❌ Unidades incompatibles. Usa km/m/mi, kg/g/lb, c/f/k o s/min/h/d.' }, { quoted: msg });
    return sock.sendMessage(chatId, { text: `🔄 *CONVERSIÓN*\n\n${value} ${from} = *${Number(result.toFixed(8))} ${to}*` }, { quoted: msg });
};
