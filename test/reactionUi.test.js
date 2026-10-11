'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { renderJkBotPage } = require('../lib/jkbotPage');

const template = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const page = renderJkBotPage(template);
const server = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');

test('Auto Reacción queda retirada del portal, sus estilos y sus scripts', () => {
  assert.doesNotMatch(page, /menuAutoReaction|autoReaction|channelReactionForm|channelReactionTokenForm|reaction-ui\.(?:js|css)/i);
  const portalCss = fs.readFileSync(path.join(__dirname, '..', 'public/jkbot/jkbot.css'), 'utf8');
  assert.doesNotMatch(portalCss, /menuAutoReaction|#autoReaction/);
});

test('Auto Reacción ya no tiene rutas HTTP ni controles Socket.IO en la web', () => {
  assert.doesNotMatch(server, /\/api\/reactions\//);
  assert.doesNotMatch(server, /admin-reaction-token/);
  assert.doesNotMatch(server, /require\(['"]\.\/lib\/(?:channelReactions|reactionLimits)['"]\)/);
  assert.ok(page.includes('id="menuPlayWow"'), 'la navegación de Warcraft se conserva');
  assert.ok(page.includes('id="wcExitGameMode"'), 'se conserva la opción de volver del juego');
});
