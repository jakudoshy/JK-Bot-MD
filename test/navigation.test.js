const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('la navegación alterna entre acceso público y cuenta sin solapar menús', async () => {
  const virtualConsole = new VirtualConsole();
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'http://localhost/',
    virtualConsole,
    beforeParse(window) {
      window.fetch = async () => ({ ok: false, json: async () => ({ ok: false }) });
      window.io = () => ({ on() {}, emit() {} });
      window.confirm = () => true;
      window.IntersectionObserver = class { observe() {} disconnect() {} };
      window.HTMLElement.prototype.scrollIntoView = function () {};
      window.HTMLCanvasElement.prototype.getContext = () => null;
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
    assert.equal(button.style.display, 'inline-flex');
    assert.equal(authLinks.style.display, 'none');
    assert.equal(profileLink.style.display, 'block');
    assert.equal(get('wcAccountAvatar').textContent, 'N');

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
