'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');

const html = `<!doctype html><html><body>
<button id="menuToggle" aria-expanded="true"></button><div id="menuDrawer" class="open" aria-hidden="false"></div>
<a id="menuAutoReaction" href="#autoReaction">Auto reacción</a>
<a id="menuPlayWow" href="#warcraft">Jugar WoW</a>
<section id="autoReaction" hidden><button id="reactionExit">Volver</button><button id="reactionLogin" hidden>Iniciar sesión</button>
<form id="channelReactionForm"><input id="channelPostUrl"><input id="channelReactionEmoji"><input id="reactionConfirm" type="checkbox"><button id="channelReactionSubmit">Enviar reacción</button><p id="reactionQuota"></p><p id="channelReactionStatus" role="status"></p></form>
<form id="channelReactionTokenForm"><input id="channelReactionToken"><button id="channelReactionTokenSubmit">Activar</button><p id="channelReactionTokenStatus"></p></form></section>
</body></html>`;
const script = fs.readFileSync(path.join(__dirname, '..', 'public/reactions/reaction-ui.js'), 'utf8');

test('el modo Reacciones se separa del sitio y cierra el menú principal', () => {
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.test/', virtualConsole: new VirtualConsole() });
  const { window } = dom;
  try {
    window.localStorage.setItem('jk_warcraft_token', 'session-token');
    window.document.getElementById('menuToggle').addEventListener('click', () => {
      window.document.getElementById('menuDrawer').classList.remove('open');
      window.document.getElementById('menuToggle').setAttribute('aria-expanded', 'false');
    });
    window.eval(script);
    window.document.getElementById('menuAutoReaction').click();
    assert.equal(window.document.body.classList.contains('auto-reaction-mode'), true);
    assert.equal(window.document.getElementById('autoReaction').hidden, false);
    assert.equal(window.document.getElementById('menuDrawer').classList.contains('open'), false);
    assert.match(window.document.getElementById('channelReactionStatus').textContent, /Sesión detectada/);
  } finally { window.close(); }
});

test('exige confirmación antes de mandar la solicitud de reacción', async () => {
  let requests = 0;
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.test/', virtualConsole: new VirtualConsole(), beforeParse(window) {
    window.localStorage.setItem('jk_warcraft_token', 'session-token');
    window.fetch = async () => { requests++; return { ok: true, status: 200, json: async () => ({ ok: true, message: 'Reacción enviada.' }) }; };
  }});
  const { window } = dom;
  try {
    window.eval(script);
    const form = window.document.getElementById('channelReactionForm');
    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(requests, 0);
    assert.match(window.document.getElementById('channelReactionStatus').textContent, /Confirma/);
  } finally { window.close(); }
});

test('al confirmar usa el token de la cuenta y muestra respuesta del servidor', async () => {
  let request;
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.test/', virtualConsole: new VirtualConsole(), beforeParse(window) {
    window.localStorage.setItem('jk_warcraft_token', 'session-token');
    window.fetch = async (url, options) => {
      request = { url, options };
      return { ok: true, status: 200, json: async () => ({ ok: true, message: 'Reacción enviada.', quota: { used: 1, limit: 10, remaining: 9, hasToken: true } }) };
    };
  }});
  const { window } = dom;
  try {
    window.eval(script);
    window.document.getElementById('channelPostUrl').value = 'https://whatsapp.com/channel/0029VbBVupfKbYMFuKLsIg2M/436';
    window.document.getElementById('channelReactionEmoji').value = '🔥';
    window.document.getElementById('reactionConfirm').checked = true;
    window.document.getElementById('channelReactionForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(request.url, '/api/reactions/channel');
    assert.equal(request.options.headers.Authorization, 'Bearer session-token');
    assert.deepEqual(JSON.parse(request.options.body), {
      url: 'https://whatsapp.com/channel/0029VbBVupfKbYMFuKLsIg2M/436', emoji: '🔥', confirmed: true
    });
    assert.equal(window.document.getElementById('channelReactionStatus').textContent, 'Reacción enviada.');
    assert.match(window.document.getElementById('reactionQuota').textContent, /1\/10/);
  } finally { window.close(); }
});

test('el formulario de reacciones canjea token con la sesión y muestra el nuevo cupo', async () => {
  let request;
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.test/', virtualConsole: new VirtualConsole(), beforeParse(window) {
    window.localStorage.setItem('jk_warcraft_token', 'session-token');
    window.fetch = async (url, options) => {
      request = { url, options };
      return { ok: true, status: 200, json: async () => ({ ok: true, message: 'Token activado: 10 al día.', quota: { used: 0, limit: 10, remaining: 10, hasToken: true } }) };
    };
  }});
  const { window } = dom;
  try {
    window.eval(script);
    window.document.getElementById('channelReactionToken').value = 'JKREACTION-1234567890ABCDEF';
    window.document.getElementById('channelReactionTokenForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(request.url, '/api/reactions/token');
    assert.equal(request.options.headers.Authorization, 'Bearer session-token');
    assert.deepEqual(JSON.parse(request.options.body), { token: 'JKREACTION-1234567890ABCDEF' });
    assert.equal(window.document.getElementById('channelReactionToken').value, '');
    assert.match(window.document.getElementById('reactionQuota').textContent, /0\/10/);
  } finally { window.close(); }
});
