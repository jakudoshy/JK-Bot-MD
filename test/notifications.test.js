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
      mail: [{ id: 'mail-1', senderName: 'Cami', claimed: false, gold: 53, itemName: 'Espada de roble' }],
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
    assert.match(list.textContent, /Correo recibido/);
    assert.match(list.textContent, /Cami te envió 53 de oro y Espada de roble/);
    assert.match(list.textContent, /Solicitud de comercio/);
    assert.match(list.textContent, /Solicitud de reembolso/);
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
    assert.equal(list.querySelectorAll('.jkbot-notification-item').length, 4, 'el historial persiste después de resolver la acción');
    assert.equal(badge.hidden, true, 'los avisos leídos no vuelven a alertar');
    list.querySelector('[data-jkbot-notification-dismiss]')?.click();
    assert.equal(list.querySelectorAll('.jkbot-notification-item').length, 3, 'se pueden quitar manualmente del historial');
    window.dispatchEvent(new window.CustomEvent('jkbot:state', { detail: state }));
    assert.equal(list.querySelectorAll('.jkbot-notification-item').length, 3, 'un aviso quitado no reaparece al siguiente estado real-time');
  } finally {
    window.close();
  }
});

test('la campana avisa también cuando el duelo pasa de solicitud a combate activo', () => {
  const dom = new JSDOM(markup, { url: 'https://jkbot.test/jkbot', runScripts: 'outside-only', pretendToBeVisual: true });
  try {
    dom.window.eval(source);
    dom.window.dispatchEvent(new dom.window.CustomEvent('jkbot:state', { detail: { account: { username: 'ana' }, duel: { id: 'duel-live', status: 'active', players: [{ name: 'Ana', isMe: true }, { name: 'Bran', isMe: false }] } } }));
    assert.equal(dom.window.document.getElementById('jkNotificationBadge').textContent, '1');
    assert.match(dom.window.document.getElementById('jkNotificationList').textContent, /Duelo aceptado/);
    assert.match(dom.window.document.getElementById('jkNotificationList').textContent, /Bran/);
  } finally { dom.window.close(); }
});

test('la campana enlaza un aviso social al apartado indicado y evita duplicarlo', async () => {
  const dom = new JSDOM(markup, { url: 'https://jkbot.test/jkbot', runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  try {
    window.document.body.classList.add('wc-game-mode');
    let opened = false;
    const tab = window.document.createElement('button');
    tab.dataset.tab = 'mas';
    tab.addEventListener('click', () => { opened = true; });
    window.document.body.append(tab);
    const inbox = window.document.createElement('div');
    inbox.id = 'wcMailInbox';
    inbox.scrollIntoView = () => {};
    window.document.body.append(inbox);
    window.eval(source);
    const state = { account: { username: 'ana' }, activityNotifications: [{ id: 'gift-1', kind: 'gift', title: 'Regalo recibido', message: 'Bran te envió 75 de oro.', target: 'mas' }] };
    window.dispatchEvent(new window.CustomEvent('jkbot:state', { detail: state }));
    const list = window.document.getElementById('jkNotificationList');
    assert.match(list.textContent, /Bran te envió 75 de oro/);
    list.querySelector('[data-jkbot-notification-target="mas"]').click();
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(opened, true, 'Ver abre la sección relacionada');
    window.dispatchEvent(new window.CustomEvent('jkbot:state', { detail: state }));
    assert.equal(list.querySelectorAll('.jkbot-notification-item').length, 1, 'el estado real-time no duplica la alerta');
  } finally { window.close(); }
});
