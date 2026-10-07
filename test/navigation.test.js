const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');
const game = require('../lib/warcraft');
const web = require('../lib/warcraftWeb');
const { renderJkBotPage } = require('../lib/jkbotPage');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const jkbotHtml = renderJkBotPage(html);

test('la página incluye acceso WoW y tutoriales de cada sección', () => {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  assert.equal(document.querySelector('a[href="#wcRegisterForm"]')?.textContent.trim(), 'Crear cuenta WoW');
  assert.equal(document.querySelector('a[href="#wcLoginForm"]')?.textContent.trim(), 'Iniciar sesión WoW');
  assert.ok(document.getElementById('wcTutorials'));
  assert.equal(document.querySelectorAll('#wcTutorials .wc-help').length, 10);
  assert.ok(document.querySelector('#wcCharacterSetup .wc-help'));
  assert.ok(document.getElementById('wcGameMount'));
  assert.equal(document.querySelector('#menuPlayWow')?.getAttribute('href'), '#warcraft');
  assert.ok(document.getElementById('wcExitGameMode'));
  assert.ok(document.getElementById('wcOrientationHint'));
  const gameCss = fs.readFileSync(path.join(__dirname, '..', 'public/warcraft/game-ui.css'), 'utf8');
  assert.match(gameCss, /body\.wc-game-mode #warcraft\{position:relative/);
  assert.doesNotMatch(gameCss, /body\.wc-game-mode> :not\(#warcraft\)/);
  assert.match(gameCss, /orientation:landscape/);
  assert.match(gameCss, /fullscreen vertical/);
  assert.match(gameCss, /body\.wc-game-mode #warcraft:fullscreen/);
  assert.doesNotMatch(gameCss, /rotate\(90deg\)/);
  assert.match(gameCss, /body:not\(\.wc-game-mode\):not\(\.wc-account-authenticated\) #warcraft\{display:none!important\}/);
  assert.match(gameCss, /body\.wc-account-authenticated:not\(\.wc-game-mode\) #wcGameMount\{display:none!important\}/);
  assert.match(html, /jugar con botones en la web o comandos en WhatsApp/i);
  dom.window.close();
});

test('las rutas de juego web usan el adaptador Warcraft autenticado', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
  assert.match(server, /app\.get\('\/',[\s\S]*?sendIndexWithPreview\(req, res, true\)/);
  assert.match(server, /app\.get\(\['\/jkbot', '\/jkbot\/'\],[\s\S]*?sendIndexWithPreview\(req, res, true\)/);
  assert.match(server, /app\.post\('\/api\/warcraft\/duel'.*?handleWarcraftWebAction\(req, res, 'duel_challenge'\)/s);
  assert.match(server, /app\.post\('\/api\/warcraft\/mmo'.*?handleWarcraftWebAction\(req, res\)/s);
  assert.match(server, /app\.post\('\/api\/warcraft\/action'.*?handleWarcraftWebAction\(req, res\)/s);
  assert.doesNotMatch(server, /app\.post\('\/api\/warcraft\/(?:duel|mmo|action)'.*?status\(410\)/s);
});

test('la nueva ruta /jkbot añade módulos sin sustituir la ruta principal y protege Auto Reacción', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
  assert.match(server, /app\.get\(\['\/jkbot', '\/jkbot\/'\]/);
  assert.match(server, /renderJkBotPage\(INDEX_TEMPLATE/);
  assert.match(server, /app\.post\('\/api\/reactions\/channel'/);
  assert.match(server, /warcraftAccountFromToken\(req\.headers\.authorization/);
  assert.match(server, /warcraftSessionForPhone\(account\.phone\)/);
  assert.match(server, /sendChannelReaction\(session\.sock, req\.body\)/);
});

test('WhatsApp ofrece un menú interactivo para aceptar las misiones del nivel', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
  assert.match(server, /function sendWarcraftMissionSelector/);
  assert.match(server, /commandName === 'misionesw' && !q\.trim\(\)/);
  assert.match(server, /id: `cmd_aceptarmision \$\{quest\.id\}`/);
  assert.match(server, /sendWarcraftMissionSelector\(this\.sock, from, msg, player\)/);
});

test('el selector Warcraft de WhatsApp incluye roles de grupo y encabezado sin adornos', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
  assert.match(server, /\['agro', 'Tomar el agro'/);
  assert.match(server, /\['curar banda', 'Curar la banda'/);
  assert.match(server, /\['gruporpg crear', 'Crear grupo'/);
  assert.match(server, /\['especializacion feral', 'Especialización de druida'/);
  assert.match(server, /const body = `Warcraft RPG\\nElige una sección/);
});

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
    assert.ok(get('wcGameMount'));
    assert.equal(get('wcCharacterSetup').style.display, 'block');
    assert.equal(get('wcProfileTalents'), null);
    assert.match(get('wcProfileSubtitle').textContent, /todavía no hay personaje/i);

    const character = { id: '5350000099', name: 'Nara', classKey: 'warrior', level: 7, xp: 25, gold: 500, hp: 80, maxHp: 120, attack: 19, defense: 15, gs: 99, zone: 'aldea', inventory: ['health_potion'], equipment: { weapon: 'rusty_sword' }, talents: { attack: 6 }, talentPoints: 3 };
    const profilePayload = { rank: 2, inventoryDetails: [{ id: 'health_potion', name: 'Poción de salud', quantity: 2 }], equipmentDetails: [{ slot: 'weapon', id: 'rusty_sword', name: 'Espada desgastada' }] };
    window.eval(`showWcPlayer(${JSON.stringify(character)},'Nara',${JSON.stringify(profilePayload)})`);
    assert.ok(get('wcGameMount'));
    assert.match(get('wcProfileTitle').textContent, /Nara/);
    assert.match(get('wcProfileStats').textContent, /Oro\s*500/);
    assert.match(get('wcProfileStats').textContent, /Nivel\s*7/);
    assert.match(get('wcProfileInventory').textContent, /Poción de salud\s*× 2/);
    assert.match(get('wcProfileEquipment').textContent, /Espada desgastada/);

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

test('Jugar WoW carga el juego en fullscreen vertical y no deja una pantalla negra', async () => {
  let fullscreenRequests = 0;
  let orientationLocks = 0;
  let orientationUnlocks = 0;
  const botData = {};
  game.ensureRoot(botData);
  const root = botData.warcraft;
  const account = { username: 'playtest', phone: '5350002099', createdAt: new Date().toISOString() };
  root.accounts[account.username] = account;
  const created = web.execute({ botData, root, account, input: { action: 'create_character', params: { name: 'Alba', classKey: 'warrior' } } });
  assert.equal(created.ok, true, created.message);
  const catalog = web.catalog();
  const player = game.playerForAccount(root, account);
  const shop = game.shopItems(player).map(item => ({ ...item, image: web.itemImage(item) }));
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', () => {});
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'http://localhost/',
    virtualConsole,
    beforeParse(window) {
      window.localStorage.setItem('jk_warcraft_token', 'game-session');
      Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 844, configurable: true });
      window.fetch = async url => {
        const target = String(url);
        if (target.endsWith('/catalog')) return { ok: true, status: 200, json: async () => ({ ok: true, ...catalog }) };
        if (target.endsWith('/me')) {
          await new Promise(resolve => setTimeout(resolve, 12));
          return { ok: true, status: 200, json: async () => ({ ok: true, account: { username: account.username }, ...web.playerState(root, account), rank: 1 }) };
        }
        if (target.endsWith('/shop')) return { ok: true, status: 200, json: async () => ({ ok: true, items: shop }) };
        if (target.endsWith('/active-users')) return { ok: true, status: 200, json: async () => ({ ok: true, users: [], totalRegistered: 1, totalCharacters: 1 }) };
        return { ok: true, status: 200, json: async () => ({ ok: true, message: 'ok' }) };
      };
      window.io = () => ({ on() {}, emit() {} });
      window.confirm = () => true;
      window.IntersectionObserver = class { observe() {} disconnect() {} };
      window.HTMLElement.prototype.scrollIntoView = function () {};
      window.HTMLCanvasElement.prototype.getContext = () => null;
      Object.defineProperty(window.screen, 'orientation', { configurable: true, value: {
        lock: () => { orientationLocks++; return Promise.resolve(); },
        unlock: () => { orientationUnlocks++; }
      } });
    }
  });
  const window = dom.window;
  try {
    window.document.getElementById('warcraft').requestFullscreen = () => { fullscreenRequests++; return Promise.resolve(); };
    const gameScript = fs.readFileSync(path.join(__dirname, '..', 'public/warcraft/game-ui.js'), 'utf8');
    window.eval(gameScript);
    await new Promise(resolve => setTimeout(resolve, 80));
    assert.ok(window.document.querySelector('.wc-game-shell'), 'la partida ya cargó en el panel');
    window.document.getElementById('menuToggle').click();
    window.document.getElementById('menuPlayWow').click();
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(window.document.documentElement.classList.contains('wc-game-mode'), false);
    assert.ok(window.document.body.classList.contains('wc-game-mode'));
    assert.equal(window.document.getElementById('menuDrawer').getAttribute('aria-hidden'), 'true');
    assert.ok(window.document.querySelector('.wc-game-shell'), 'Jugar no deja la pantalla en negro: muestra el juego');
    assert.equal(fullscreenRequests, 1, 'la página raíz solicita fullscreen al tocar Jugar');
    assert.equal(orientationLocks, 1, 'la página raíz solicita orientación vertical');
    window.document.getElementById('wcExitGameMode').click();
    assert.equal(window.document.documentElement.classList.contains('wc-game-mode'), false);
    assert.equal(window.document.body.classList.contains('wc-game-mode'), false);
    assert.equal(orientationUnlocks, 1, 'al salir libera el giro nativo');
  } finally {
    window.close();
  }
});

test('en /jkbot fullscreen vertical conserva talentos, poderes y formularios visibles', async () => {
  let orientationLocks = 0;
  let fullscreenRequests = 0;
  const botData = {};
  game.ensureRoot(botData);
  const root = botData.warcraft;
  const account = { username: 'rotator', phone: '5350002098', createdAt: new Date().toISOString() };
  root.accounts[account.username] = account;
  assert.equal(web.execute({ botData, root, account, input: { action: 'create_character', params: { name: 'Runa', classKey: 'deathknight' } } }).ok, true);
  const player = game.playerForAccount(root, account);
  player.level = 5;
  player.talentPoints = 4;
  player.talents.attack = 2;
  player.talentPointsSpent = 1;
  game.recalc(player);
  const catalog = web.catalog();
  const shop = game.shopItems(player).map(item => ({ ...item, image: web.itemImage(item) }));
  const dom = new JSDOM(jkbotHtml, {
    runScripts: 'dangerously',
    url: 'http://localhost/jkbot',
    beforeParse(window) {
      window.localStorage.setItem('jk_warcraft_token', 'game-session');
      Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 844, configurable: true });
      window.fetch = async url => {
        const target = String(url);
        if (target.endsWith('/catalog')) return { ok: true, status: 200, json: async () => ({ ok: true, ...catalog }) };
        if (target.endsWith('/me')) return { ok: true, status: 200, json: async () => ({ ok: true, account: { username: account.username }, ...web.playerState(root, account), rank: 1 }) };
        if (target.endsWith('/shop')) return { ok: true, status: 200, json: async () => ({ ok: true, items: shop }) };
        if (target.endsWith('/active-users')) return { ok: true, status: 200, json: async () => ({ ok: true, users: [], totalRegistered: 1, totalCharacters: 1 }) };
        return { ok: true, status: 200, json: async () => ({ ok: true, message: 'ok' }) };
      };
      window.io = () => ({ on() {}, emit() {} });
      window.confirm = () => true;
      window.IntersectionObserver = class { observe() {} disconnect() {} };
      window.HTMLElement.prototype.scrollIntoView = function () {};
      window.HTMLCanvasElement.prototype.getContext = () => null;
      Object.defineProperty(window.screen, 'orientation', { configurable: true, value: {
        lock: () => { orientationLocks++; return Promise.reject(new Error('orientation lock unavailable')); },
        unlock() {}
      } });
    }
  });
  const window = dom.window;
  try {
    window.eval(fs.readFileSync(path.join(__dirname, '..', 'public/warcraft/game-ui.js'), 'utf8'));
    await new Promise(resolve => setTimeout(resolve, 80));
    assert.match(window.document.getElementById('wcProfileStats').textContent, /Talentos disponibles\s*4/);
    assert.match(window.document.getElementById('wcProfileStats').textContent, /Talentos usados\s*1/);
    assert.match(window.document.getElementById('wcProfileAbilities').textContent, /Talentos asignados:\s*Ataque 1/);
    assert.match(window.document.getElementById('wcProfileAbilities').textContent, /Golpe de muerte/);
    assert.match(window.document.getElementById('wcProfileAbilities').textContent, /Espiral mortal/);
    window.document.getElementById('warcraft').requestFullscreen = () => { fullscreenRequests++; return Promise.resolve(); };
    window.document.getElementById('menuToggle').click();
    window.document.getElementById('menuPlayWow').click();
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(orientationLocks, 1, 'se solicita orientación vertical después de fullscreen');
    assert.equal(window.document.body.classList.contains('wc-css-landscape'), false, 'el juego no rota fuera del viewport');
    assert.ok(window.document.querySelector('.wc-game-shell'), 'la partida carga aunque el navegador rechace el bloqueo de orientación');
    window.document.getElementById('wcRotateGame').click();
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(orientationLocks, 2, 'el botón vuelve a solicitar orientación vertical');
    assert.equal(fullscreenRequests, 2, 'Jugar y el botón usan fullscreen iniciado por clic');
    window.document.querySelector('[data-tab="mas"]').click();
    const mailTarget = window.document.querySelector('form[data-wc-form="mail_send"] input[name="target"]');
    mailTarget.focus();
    mailTarget.value = '535000123456';
    mailTarget.setSelectionRange(mailTarget.value.length, mailTarget.value.length);
    mailTarget.dispatchEvent(new window.Event('input', { bubbles: true }));
    const tabRail = window.document.querySelector('.wc-game-tabs');
    tabRail.scrollLeft = 183;
    window.dispatchEvent(new window.Event('wc-profile-refresh'));
    await new Promise(resolve => setTimeout(resolve, 80));
    const restoredTarget = window.document.querySelector('form[data-wc-form="mail_send"] input[name="target"]');
    assert.equal(restoredTarget.value, '535000123456', 'el refresco en vivo conserva el número escrito');
    assert.equal(window.document.activeElement, restoredTarget, 'el refresco conserva el foco en el campo');
    assert.equal(window.document.querySelector('.wc-game-tabs').scrollLeft, 183, 'la navegación horizontal no retrocede al inicio');
    window.document.getElementById('wcExitGameMode').click();
    assert.equal(window.document.body.classList.contains('wc-game-mode'), false);
    assert.equal(window.document.body.classList.contains('wc-css-landscape'), false);
  } finally {
    window.close();
  }
});

test('sin sesión, Jugar WoW pide iniciar sesión y no abre un panel negro', async () => {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', () => {});
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'http://localhost/',
    virtualConsole,
    beforeParse(window) {
      window.fetch = async () => ({ ok: false, status: 401, json: async () => ({ ok: false }) });
      window.io = () => ({ on() {}, emit() {} });
      window.confirm = () => true;
      window.IntersectionObserver = class { observe() {} disconnect() {} };
      window.HTMLElement.prototype.scrollIntoView = function () {};
      window.HTMLCanvasElement.prototype.getContext = () => null;
    }
  });
  const window = dom.window;
  try {
    const gameScript = fs.readFileSync(path.join(__dirname, '..', 'public/warcraft/game-ui.js'), 'utf8');
    window.eval(gameScript);
    await new Promise(resolve => setTimeout(resolve, 15));
    window.document.getElementById('menuPlayWow').click();
    assert.equal(window.document.body.classList.contains('wc-game-mode'), true, 'Jugar abre la vista integrada sin sesión');
    assert.ok(window.document.querySelector('.wc-game-load-error'), 'muestra el acceso y nunca queda en negro');
    assert.match(window.document.getElementById('wcLoginStatus').textContent, /Inicia sesión o crea tu cuenta/i);
    assert.equal(window.document.getElementById('wcLoginForm').style.display, '');
  } finally {
    window.close();
  }
});
