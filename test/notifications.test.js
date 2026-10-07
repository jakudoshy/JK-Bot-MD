'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync(path.join(__dirname, '..', 'public/jkbot/notifications.js'), 'utf8');
const markup = `<!doctype html><html><body><button id="jkNotificationBell" aria-expanded="false"><span id="jkNotificationBadge" hidden></span></button><aside id="jkNotificationPanel" hidden><button id="jkNotificationMarkRead"></button><ul id="jkNotificationList"></ul></aside><div id="jkNotificationToast" hidden></div></body></html>`;

test('la campana avisa de desafíos, correos, comercios y reembolsos sin duplicar notificaciones', () => {
  const dom = new JSDOM(markup, { url: 'https://jkbot.test/jkbot', runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  try {
    window.eval(source);
    const state = {
      account: { username: 'ana' },
      pendingDuel: { id: 'duel-1', challenger: 'Bran' },
      mail: [{ id: 'mail-1', senderName: 'Cami', claimed: false }],
      trades: [{ id: 'trade-1', fromName: 'Dora', incoming: true, status: 'pending' }],
      transactions: [{ id: 'refund-1', fromName: 'Eli', incoming: true }]
    };
    window.dispatchEvent(new window.CustomEvent('jkbot:state', { detail: state }));
    const bell = window.document.getElementById('jkNotificationBell');
    const badge = window.document.getElementById('jkNotificationBadge');
    const panel = window.document.getElementById('jkNotificationPanel');
    const list = window.document.getElementById('jkNotificationList');
    assert.equal(badge.textContent, '4');
    assert.equal(badge.hidden, false);
    assert.equal(list.querySelectorAll('.jkbot-notification-item').length, 4);
    assert.match(list.textContent, /Nuevo desafío/);
    assert.match(list.textContent, /Correo pendiente/);
    assert.match(list.textContent, /Solicitud de comercio/);
    assert.match(list.textContent, /Reembolso pendiente/);
    assert.equal(bell.classList.contains('has-unread'), true, 'la campana muestra énfasis mientras haya avisos sin leer');

    bell.click();
    assert.equal(panel.hidden, false);
    assert.equal(bell.getAttribute('aria-expanded'), 'true');
    assert.equal(badge.hidden, true, 'abrir la campana marca las alertas como leídas');
    assert.equal(bell.classList.contains('has-unread'), false);

    window.dispatchEvent(new window.CustomEvent('jkbot:state', { detail: state }));
    assert.equal(list.querySelectorAll('.jkbot-notification-item').length, 4, 'el mismo estado no duplica los avisos');
    assert.equal(badge.hidden, true, 'el refresco no vuelve a alertar sobre elementos ya leídos');

    window.dispatchEvent(new window.CustomEvent('jkbot:state', { detail: {
      account: { username: 'ana' }, pendingDuel: null,
      mail: [{ id: 'mail-1', senderName: 'Cami', claimed: true }], transactions: [], trades: []
    } }));
    assert.equal(list.querySelectorAll('.jkbot-notification-item').length, 0, 'los avisos desaparecen cuando la acción ya se resolvió');
    assert.match(list.textContent, /No tienes notificaciones/);
  } finally {
    window.close();
  }
});
