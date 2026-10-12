'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { renderJkBotPage } = require('../lib/jkbotPage');

const original = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('el portal JK Bot conserva cuenta, notificaciones y recuperación, sin Auto Reacción ni fullscreen', () => {
  const page = renderJkBotPage(original, 'https://example.test/banner.jpeg');
  assert.match(page, /<title>JK Bot · tu panel<\/title>/);
  assert.match(page, /href="\/jkbot\.webmanifest"/);
  assert.match(page, /class="jkbot-app"/);
  assert.match(page, /id="menuPlayWow"/);
  assert.match(page, /id="menuToggle"/);
  assert.match(page, /id="wcExitGameMode"/);
  assert.match(page, /class="mark" src="\/Gemini_Generated_Image_dcxxqzdcxxqzdcxx\.jpeg" alt="JK Bot"/);
  assert.doesNotMatch(page, /menuAutoReaction|autoReaction|channelReactionForm|reactionTokenAdmin|reaction-ui\.(?:js|css)/i);
  assert.doesNotMatch(page, /wcRotateGame|wcContinuePortrait|wcOrientationHint/);
  assert.doesNotMatch(page, /fa-ellipsis-vertical/);
  assert.match(page, /id="jkNotificationBell"/);
  assert.match(page, /id="wcForgotPassword"/);
  assert.match(page, /id="wcRecoveryPanel"/);
  assert.match(page, /Restauración de cuenta/);
  assert.match(page, /id="wcProfileAbilities"/);
  const portalCss = fs.readFileSync(path.join(__dirname, '..', 'public/jkbot/jkbot.css'), 'utf8');
  assert.match(portalCss, /\.nav-actions\{position:fixed;top:16px;right:18px/);
  assert.match(portalCss, /#jkNotificationBell\{position:relative;inset:auto/);
  assert.match(portalCss, /#menuToggle\{position:relative;inset:auto;z-index:1;display:grid;align-content:center/);
  assert.match(portalCss, /#wcAccountButton \.wc-avatar/);
  assert.match(portalCss, /wc-recovery-panel/);
  assert.match(portalCss, /warcraft\/generated\/ui\/guild\.png/);
  assert.match(portalCss, /#wcLobbyCard\{background:/);
  const dom = new JSDOM(page);
  assert.equal(dom.window.document.querySelector('#wcLoginForm #wcRecoveryPanel'), null, 'la restauración no debe anidar formularios HTML');
  const menu = dom.window.document.getElementById('menuToggle');
  assert.equal(menu.querySelectorAll('span').length, 3, 'el botón conserva sus tres rayitas');
  const visibleControls = [...menu.parentElement.children].filter(node => ['jkNotificationBell', 'menuToggle', 'wc-account-wrap'].includes(node.id || node.className)).map(node => node.id || node.className);
  assert.deepEqual(visibleControls, ['jkNotificationBell', 'menuToggle', 'wc-account-wrap'], 'el orden es campana, menú y cuenta');
  dom.window.close();
  assert.match(page, /id="jkNotificationPanel"/);
  assert.match(page, /id="jkNotificationToast"/);
  assert.match(page, /src="\/public\/jkbot\/notifications\.js"/);
  assert.match(page, /src="\/public\/jkbot\/account-recovery\.js"/);
  assert.match(page, /https:\/\/example\.test\/banner\.jpeg/);
});

test('renderizar JK Bot no modifica la plantilla raíz ni pierde secciones compartidas', () => {
  const before = original;
  const page = renderJkBotPage(original);
  assert.equal(original, before);
  assert.match(page, /id="features"/);
  assert.match(page, /id="connect"/);
  assert.match(page, /id="links"/);
  assert.match(page, /id="admin"/);
});

test('la PWA JK Bot admite orientación vertical u horizontal', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'jkbot.webmanifest'), 'utf8'));
  assert.equal(manifest.start_url, '/jkbot');
  assert.equal(manifest.orientation, 'any');
});
