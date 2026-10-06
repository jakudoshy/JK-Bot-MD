const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('la navegación alterna entre acceso público y cuenta sin solapar menús', async () => {
  const socketHandlers = new Map();
  let fetchCount = 0;
  const virtualConsole = new VirtualConsole();
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'http://localhost/',
    virtualConsole,
    beforeParse(window) {
      window.fetch = async () => { fetchCount++; return { ok: false, json: async () => ({ ok: false }) }; };
      window.io = () => ({ on(name, handler) { socketHandlers.set(name, handler); }, emit() {} });
      window.confirm = () => true;
      window.IntersectionObserver = class { observe() {} disconnect() {} };
      window.HTMLElement.prototype.scrollIntoView = function () {};
      window.HTMLCanvasElement.prototype.getContext = () => null;
      Object.defineProperty(window.document, 'hidden', { value: false, configurable: true });
    }
  });
  const window = dom.window;
  try {
    await new Promise(resolve => setTimeout(resolve, 40));
    const get = id => window.document.getElementById(id);
    const button = get('wcAccountButton');
    const authLinks = get('menuAuthLinks');
    const profileLink = get('menuProfileLink');
    const accountPopup = get('wcAccountDropdown');
    const menuButton = get('menuToggle');
    const drawer = get('menuDrawer');

    assert.ok(button && authLinks && profileLink && accountPopup && menuButton && drawer);
    assert.equal(window.document.querySelectorAll('#menuToggle').length, 1);
    assert.equal(window.document.querySelectorAll('#wcAccountButton').length, 1);
    assert.equal(window.document.querySelector('.wc-site-links'), null);

    window.localStorage.setItem('jk_warcraft_token', 'test-session');
    window.eval("setWcAuth('Nara')");
    assert.equal(typeof socketHandlers.get('warcraft:update'), 'function');
    const requestsBeforeRefresh = fetchCount;
    socketHandlers.get('warcraft:update')();
    await new Promise(resolve => setTimeout(resolve, 180));
    assert.ok(fetchCount > requestsBeforeRefresh, 'warcraft:update debe volver a consultar el perfil autenticado');
    assert.equal(button.style.display, 'inline-flex');
    assert.equal(authLinks.style.display, 'none');
    assert.equal(profileLink.style.display, 'block');
    assert.equal(get('wcAccountAvatar').textContent, 'N');
    window.eval("showWcPlayer(null,'Nara')");
    assert.equal(get('wcGamePanel').style.display, 'block');
    assert.equal(get('wcGameMenu').style.display, 'grid');
    assert.equal(window.document.querySelector('[data-wc-scroll="wcCombatSection"]').disabled, true);
    assert.equal(window.document.querySelector('[data-wc-scroll="wcProfilePanel"]').disabled, false);
    assert.equal(get('wcProfileTalents'), null);
    assert.equal(window.document.querySelectorAll('[data-wc-talent]').length, 0);

    const character = { id: '5350000099', name: 'Nara', classKey: 'warrior', level: 7, xp: 25, gold: 500, hp: 80, maxHp: 120, attack: 19, defense: 15, gs: 99, zone: 'aldea', inventory: ['health_potion'], equipment: { weapon: 'rusty_sword' }, talents: { attack: 6 }, talentPoints: 3 };
    const profilePayload = { rank: 2, inventoryDetails: [{ id: 'health_potion', name: 'Poción de salud', quantity: 2 }], equipmentDetails: [{ slot: 'weapon', id: 'rusty_sword', name: 'Espada desgastada' }] };
    window.eval(`showWcPlayer(${JSON.stringify(character)},'Nara',${JSON.stringify(profilePayload)})`);
    assert.match(get('wcProfileTitle').textContent, /Nara/);
    assert.match(get('wcProfileStats').textContent, /Oro\s*500/);
    assert.match(get('wcProfileStats').textContent, /Nivel\s*7/);
    assert.match(get('wcProfileInventory').textContent, /Poción de salud\s*× 2/);
    assert.match(get('wcProfileEquipment').textContent, /Espada desgastada/);
    assert.doesNotMatch(get('wcProfilePanel').textContent, /talento/i);

    button.click();
    assert.equal(accountPopup.style.display, 'block');
    assert.equal(button.getAttribute('aria-expanded'), 'true');

    menuButton.click();
    assert.equal(drawer.classList.contains('open'), true);
    assert.equal(drawer.getAttribute('aria-hidden'), 'false');
    assert.equal(accountPopup.style.display, 'none');
    assert.equal(button.getAttribute('aria-expanded'), 'false');

    window.document.body.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(drawer.classList.contains('open'), false);
    assert.equal(drawer.getAttribute('aria-hidden'), 'true');

    window.localStorage.removeItem('jk_warcraft_token');
    window.eval("setWcAuth('')");
    assert.equal(button.style.display, 'none');
    assert.equal(button.getAttribute('aria-expanded'), 'false');
    assert.equal(authLinks.style.display, '');
    assert.equal(profileLink.style.display, 'none');
    assert.equal(get('wcLoginForm').style.display, '');
    assert.equal(get('wcRegisterForm').style.display, '');
  } finally {
    window.close();
  }
});
