const settings = require('../settings');

async function allMenu(sock, from, msg, session, commands) {
    const categories = [
        ['🤖 IA Y UTILIDADES', ['help', 'id', 'time', 'note', 'hi', 'meta', 'ia', 'ai', 'chatbot', 'translate', 'qr', 'weather', 'github', 'shorturl', 'calc']],
        ['🛡️ SEGURIDAD', ['antibug', 'antilink', 'antidelete', 'anticall', 'ghostmode', 'private', 'backup', 'restore']],
        ['📥 DESCARGAS Y MEDIA', ['song', 'video', 'tiktok', 'youtube', 'spotify', 'gdrive', 'apk', 'sticker', 'tempmail', 'fakeinfo']],
        ['👥 GRUPOS', ['groupinfo', 'grouplink', 'tagall', 'hidetag', 'welcome', 'promote', 'demote', 'mute', 'unmute', 'poll']],
        ['👤 PERFIL', ['profile', 'getbio', 'getdp', 'logo', 'meme', 'quote', 'status']],
        ['🎮 JUEGOS', ['joke', 'truth', 'dare', 'riddle', 'trivia', 'roll', 'ship', 'emojimix']],
        ['👑 OWNER', ['owner', 'ownermenu', 'mode', 'setname', 'restart', 'shutdown', 'clear']]
    ];
    const descriptions = {
        ai: 'asistencia inteligente', chatbot: 'respuestas automáticas', translate: 'traducción de textos', qr: 'códigos QR',
        weather: 'consulta del clima', github: 'búsqueda de proyectos', shorturl: 'enlaces cortos', calc: 'cálculos rápidos',
        antibug: 'protección frente a errores', antilink: 'control de enlaces', antidelete: 'resguardo de mensajes',
        anticall: 'bloqueo de llamadas', ghostmode: 'modo discreto', private: 'espacio privado', backup: 'copia de seguridad',
        restore: 'restauración de datos', song: 'descarga de audio', video: 'descarga de vídeo', tiktok: 'contenido social',
        youtube: 'vídeos online', spotify: 'música', gdrive: 'archivos compartidos', apk: 'enlaces de aplicaciones', sticker: 'creación de stickers', tempmail: 'correo temporal', fakeinfo: 'datos de prueba',
        groupinfo: 'información del grupo', grouplink: 'enlace del grupo', tagall: 'menciones organizadas', hidetag: 'aviso silencioso',
        welcome: 'mensajes de bienvenida', promote: 'gestión de moderadores', demote: 'retirada de permisos', mute: 'silenciar participantes',
        unmute: 'reactivar participantes', poll: 'encuestas', profile: 'tarjeta de perfil', getbio: 'biografía del usuario',
        getdp: 'foto de perfil', logo: 'diseños de marca', meme: 'contenido visual', quote: 'frases para compartir', status: 'estados',
        joke: 'chistes', truth: 'preguntas sinceras', dare: 'retos', riddle: 'adivinanzas', trivia: 'preguntas de cultura',
        roll: 'números al azar', ship: 'compatibilidad', emojimix: 'mezcla de emojis', owner: 'contacto del creador',
        ownermenu: 'herramientas del creador', mode: 'cambio de modo', setname: 'nombre del bot', restart: 'reinicio controlado',
        shutdown: 'apagado controlado', clear: 'limpieza de sesión', help: 'ayuda rápida', id: 'IDs del chat', time: 'hora mundial', note: 'notas personales', hi: 'pregunta a Meta AI', meta: 'puente experimental con Meta AI', ia: 'pregunta a Meta AI'
    };
    const available = new Set(Object.keys(commands));
    const icons = { help: '❔', id: '🪪', time: '🕒', note: '📝', hi: '🤖', meta: '🤖', ia: '🤖', ai: '🤖', sticker: '🏷️', tempmail: '📩', fakeinfo: '🪪', song: '🎵', video: '🎬', youtube: '▶️', tiktok: '🎵', weather: '🌤️', profile: '👤', joke: '😄', default: '🧰' };
    const active = categories.map(([name, list]) => [name, list.filter(command => available.has(command))]).filter(([, list]) => list.length);
    const total = [...new Set(active.flatMap(([, list]) => list))].length;
    const lines = [
        '╭─⟦ JK // CORE ⟧',
        '│ CENTRO DE FUNCIONES',
        '│ capacidades organizadas',
        '╰──────────────────',
        '',
        `╭─⟦ ${total} FUNCIONES DISPONIBLES ⟧`
    ];
    for (const [category, list] of active) {
        lines.push(`│`, `│ ${category}`);
        for (const command of list) lines.push(`│ ${icons[command] || icons.default} /${command} — ${descriptions[command] || 'herramienta general'}`);
    }
    lines.push('╰──────────────────', '', '> Selecciona una categoría para explorar las herramientas.');
    await sock.sendMessage(from, { text: lines.join('\n') }, { quoted: msg });
}

module.exports = allMenu;
