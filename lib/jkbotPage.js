'use strict';

const REACTION_PANEL = `
<section id="autoReaction" aria-labelledby="reactionTitle" hidden>
  <div class="reaction-shell">
    <header class="reaction-topbar">
      <div class="reaction-wordmark"><strong>JK BOT</strong><span>Auto Reacción</span></div>
      <button id="reactionExit" class="reaction-exit" type="button" aria-label="Cerrar Auto Reacción">Volver</button>
    </header>
    <article class="reaction-card">
      <p class="reaction-kicker">Canales de WhatsApp</p>
      <h1 id="reactionTitle">Reacciona a una publicación</h1>
      <p class="reaction-intro">Pega el enlace de un post concreto, elige un emoji y confirma. La reacción se envía desde la sesión vinculada al teléfono de tu cuenta WoW.</p>
      <form id="channelReactionForm">
        <label for="channelPostUrl">Enlace de la publicación</label>
        <input id="channelPostUrl" type="url" inputmode="url" autocomplete="url" placeholder="https://whatsapp.com/channel/…/123" required>
        <p class="reaction-hint">Debe ser un enlace de publicación, no solo la dirección del canal.</p>
        <label for="channelReactionEmoji">Emoji de reacción</label>
        <input id="channelReactionEmoji" type="text" inputmode="text" maxlength="16" value="🔥" aria-label="Un solo emoji" required>
        <label class="reaction-consent"><input id="reactionConfirm" type="checkbox" required><span>Confirmo que quiero enviar una reacción a esta publicación desde mi cuenta vinculada.</span></label>
        <button id="channelReactionSubmit" type="submit">Enviar reacción</button>
        <p id="channelReactionStatus" role="status" aria-live="polite">Inicia sesión con la cuenta asociada al número de WhatsApp que enviará la reacción.</p>
        <button id="reactionLogin" type="button" hidden>Ir a mi cuenta WoW</button>
      </form>
      <p class="reaction-safety"><i class="fas fa-shield-halved" aria-hidden="true"></i><span>Se envía una única reacción por solicitud. Revisa el enlace y el emoji antes de confirmar.</span></p>
    </article>
  </div>
</section>`;

function renderJkBotPage(template, imageUrl = '') {
  if (typeof template !== 'string' || !template.includes('</main>') || !template.includes('id="menuPlayWow"')) {
    throw new Error('La plantilla actual de JK Bot no contiene los anclajes requeridos.');
  }
  let html = template.replaceAll('__JK_OG_IMAGE__', String(imageUrl || ''));
  html = html.replace(/<title>[\s\S]*?<\/title>/i, '<title>JK Bot · tu panel</title>');
  html = html.replace(/(<meta\s+name="description"\s+content=")[^"]*("\s*\/?>)/i, '$1JK Bot: herramientas, cuenta Warcraft y Auto Reacción en un solo panel.$2');
  html = html.replace('href="/manifest.webmanifest"', 'href="/jkbot.webmanifest"');
  html = html.replace(/<body\b([^>]*)>/i, (match, attrs) => {
    const classMatch = attrs.match(/\bclass=(['"])(.*?)\1/i);
    if (classMatch) return match.replace(classMatch[0], `class=${classMatch[1]}${classMatch[2]} jkbot-app${classMatch[1]}`);
    return `<body${attrs} class="jkbot-app">`;
  });
  html = html.replace('</head>', '  <link rel="stylesheet" href="/public/reactions/reaction-ui.css">\n  <link rel="stylesheet" href="/public/jkbot/jkbot.css">\n</head>');
  html = html.replace(/<button\b(?=[^>]*\bid=(['"])menuToggle\1)[^>]*>[\s\S]*?<\/button>/i, button => {
    const openingEnd = button.indexOf('>') + 1;
    const opening = button.slice(0, openingEnd);
    return `${opening}<i class="fas fa-ellipsis-vertical" aria-hidden="true"></i><span class="jkbot-sr-only">Abrir menú</span></button>`;
  });
  html = html.replace(/<a\b(?=[^>]*\bid=(['"])menuPlayWow\1)[^>]*>[\s\S]*?<\/a>/i, match => `${match}<a id="menuAutoReaction" href="#autoReaction"><i class="fas fa-face-smile" aria-hidden="true"></i> Auto Reacción</a>`);
  html = html.replace('<div id="wcProfileStats" class="wc-profile-stats"></div>', '<div id="wcProfileStats" class="wc-profile-stats"></div><div id="wcProfileAbilities" class="wc-profile-abilities"></div>');
  html = html.replace('<button id="wcExitGameMode"', '<button id="wcRotateGame" type="button" aria-label="Girar pantalla a horizontal"><i class="fas fa-rotate"></i> Girar pantalla</button><button id="wcExitGameMode"');
  html = html.replace(/(<button\s+id="wcContinuePortrait"[^>]*>)[\s\S]*?(<\/button>)/i, '$1Girar pantalla$2');
  html = html.replace('</main>', `${REACTION_PANEL}\n</main>`);
  html = html.replace('</body>', '  <script src="/public/reactions/reaction-ui.js" defer></script>\n</body>');
  return html;
}

module.exports = { renderJkBotPage, REACTION_PANEL };
