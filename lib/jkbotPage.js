'use strict';

function renderJkBotPage(template, imageUrl = '') {
  if (typeof template !== 'string' || !template.includes('</main>') || !template.includes('id="menuPlayWow"')) {
    throw new Error('La plantilla actual de JK Bot no contiene los anclajes requeridos.');
  }
  let html = template.replaceAll('__JK_OG_IMAGE__', String(imageUrl || ''));
  html = html.replace(/<title>[\s\S]*?<\/title>/i, '<title>JK Bot · tu panel</title>');
  html = html.replace(/(<meta\s+name="description"\s+content=")[^"]*("\s*\/?>)/i, '$1JK Bot: herramientas y cuenta Warcraft en un solo panel.$2');
  html = html.replace('href="/manifest.webmanifest"', 'href="/jkbot.webmanifest"');
  html = html.replace(/<body\b([^>]*)>/i, (match, attrs) => {
    const classMatch = attrs.match(/\bclass=(['"])(.*?)\1/i);
    if (classMatch) return match.replace(classMatch[0], `class=${classMatch[1]}${classMatch[2]} jkbot-app${classMatch[1]}`);
    return `<body${attrs} class="jkbot-app">`;
  });
  html = html.replace('</head>', '  <link rel="stylesheet" href="/public/jkbot/jkbot.css">\n</head>');
  html = html.replace(/<button\b(?=[^>]*\bid=(['"])menuToggle\1)[^>]*>[\s\S]*?<\/button>/i, button => {
    const notifications = `<button id="jkNotificationBell" class="jkbot-notification-bell" type="button" aria-label="Notificaciones" aria-expanded="false" aria-controls="jkNotificationPanel"><i class="fas fa-bell" aria-hidden="true"></i><span id="jkNotificationBadge" hidden>0</span></button><aside id="jkNotificationPanel" aria-labelledby="jkNotificationTitle" hidden><div class="jkbot-notification-heading"><h2 id="jkNotificationTitle">Notificaciones</h2><button id="jkNotificationMarkRead" type="button">Marcar leídas</button></div><ul id="jkNotificationList"></ul></aside><div id="jkNotificationToast" role="alert" aria-live="assertive" hidden></div>`;
    return `${notifications}${button}`;
  });
  html = html.replace('<div id="wcProfileStats" class="wc-profile-stats"></div>', '<div id="wcProfileStats" class="wc-profile-stats"></div><div id="wcProfileAbilities" class="wc-profile-abilities"></div>');
  html = html.replace('</body>', '  <script src="/public/jkbot/notifications.js" defer></script>\n  <script src="/public/jkbot/account-recovery.js" defer></script>\n</body>');
  return html;
}

module.exports = { renderJkBotPage };
