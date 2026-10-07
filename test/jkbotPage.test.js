'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { renderJkBotPage } = require('../lib/jkbotPage');

const original = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('la página JK Bot conserva el sitio actual y añade los módulos independientes al menú', () => {
  const page = renderJkBotPage(original, 'https://example.test/banner.jpeg');
  assert.match(page, /<title>JK Bot · tu panel<\/title>/);
  assert.match(page, /href="\/jkbot\.webmanifest"/);
  assert.match(page, /class="jkbot-app"/);
  assert.match(page, /id="menuPlayWow"/);
  assert.match(page, /id="menuAutoReaction"/);
  assert.match(page, /id="menuToggle"/);
  assert.doesNotMatch(page, /fa-ellipsis-vertical/);
  assert.match(page, /id="jkNotificationBell"/);
  const portalCss = fs.readFileSync(path.join(__dirname, '..', 'public/jkbot/jkbot.css'), 'utf8');
  assert.match(portalCss, /#jkNotificationBell\{position:fixed;top:16px;right:72px/);
  assert.match(portalCss, /#menuToggle\{position:fixed;top:16px;right:18px;z-index:700;display:grid;align-content:center/);
  assert.doesNotMatch(portalCss, /#menuToggle\{[^}]*place-items:center/);
  const dom = new JSDOM(page);
  const menu = dom.window.document.getElementById('menuToggle');
  assert.equal(menu.querySelectorAll('span').length, 3, 'el botón conserva exactamente sus tres rayitas');
  assert.equal(menu.nextElementSibling.id, 'jkNotificationBell', 'la campana queda inmediatamente al lado');
  dom.window.close();
  assert.match(page, /id="jkNotificationPanel"/);
  assert.match(page, /id="jkNotificationToast"/);
  assert.match(page, /src="\/public\/jkbot\/notifications\.js"/);
  assert.match(page, /id="wcRotateGame"/);
  assert.match(page, /id="autoReaction"/);
  assert.match(page, /id="channelReactionForm"/);
  assert.match(page, /id="channelReactionTokenForm"/);
  assert.match(page, /id="reactionQuota"/);
  assert.match(page, /id="wcProfileAbilities"/);
  assert.match(page, /id="wcGameMount"/);
  assert.match(page, /id="admin"/);
  assert.match(page, /src="\/public\/reactions\/reaction-ui\.js"/);
  assert.match(page, /href="\/public\/reactions\/reaction-ui\.css"/);
  assert.match(page, /https:\/\/example\.test\/banner\.jpeg/);
});

test('renderizar JK Bot no modifica la plantilla raíz ni pierde el contenido compartido', () => {
  const before = original;
  const page = renderJkBotPage(original);
  assert.equal(original, before);
  assert.match(page, /id="features"/);
  assert.match(page, /id="connect"/);
  assert.match(page, /id="links"/);
  assert.match(page, /id="admin"/);
});

test('la PWA JK Bot admite orientación horizontal para el modo de juego', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'jkbot.webmanifest'), 'utf8'));
  assert.equal(manifest.start_url, '/jkbot');
  assert.equal(manifest.orientation, 'any');
});
