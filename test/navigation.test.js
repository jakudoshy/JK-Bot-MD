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
  assert.equal(document.querySelector('a[href="#wcRegisterForm"]')?.textContent.replace('✨','').trim(), 'Crear cuenta WoW');
  assert.equal(document.querySelector('a[href="#wcLoginForm"]')?.textContent.replace('🔐','').trim(), 'Iniciar sesión WoW');
  assert.ok(document.getElementById('wcTutorials'));
  assert.equal(document.querySelectorAll('#wcTutorials .wc-help').length, 10);
  assert.ok(document.querySelector('#wcCharacterSetup .wc-help'));
  assert.ok(document.getElementById('wcGameMount'));
  assert.equal(document.querySelector('#menuPlayWow')?.getAttribute('href'), '#warcraft');
  const drawer = document.getElementById('menuDrawer');
  const drawerLabels = [...drawer.querySelectorAll('a')].map(link => link.textContent.replace(/\s+/g, ' ').trim());
  assert.ok(!drawerLabels.join(' ').match(/reacci[oó]n|reaction/i), 'el menú no debe mostrar una opción de reacciones');
  assert.ok(drawerLabels.some(label => label.includes('👑') && label.includes('Zona del creador')));
  assert.ok(drawerLabels.some(label => label.includes('🔗') && label.includes('Vincular WhatsApp')));
  assert.ok(drawerLabels.some(label => label.includes('📡') && label.includes('Canal de Telegram')));
  assert.equal(document.querySelector('#menuDrawer').getAttribute('aria-label'), 'Menú principal');
  assert.equal(document.querySelector('.banner-nav a[href="#connect"]')?.textContent.replace('🔗','').trim(), 'Conectar WhatsApp');
  assert.match(html, /jk-friendly-navigation/);
  assert.match(html, /font-family:Cinzel/);
  assert.match(html, /#menuDrawer #menuProfileLink\{white-space:nowrap;flex-wrap:nowrap;word-break:keep-all\}/);
  assert.ok(document.getElementById('wcExitGameMode'));
  assert.equal(document.getElementById('wcOrientationHint'), null);
  assert.equal(document.getElementById('wcRotateGame'), null);
  const gameCss = fs.readFileSync(path.join(__dirname, '..', 'public/warcraft/game-ui.css'), 'utf8');
  assert.match(gameCss, /body\.wc-game-mode #warcraft\{position:relative/);
  assert.match(gameCss, /#warcraft:fullscreen/);
  assert.match(gameCss, /wc-game-fullscreen-fallback/);
  assert.match(gameCss, /Cinzel/);
  assert.match(gameCss, /DM Sans/);
  assert.match(gameCss, /top:82px/);
  assert.doesNotMatch(gameCss, /body\.wc-game-mode> :not\(#warcraft\)/);
  assert.match(gameCss, /orientation:landscape/);
  assert.doesNotMatch(gameCss, /rotate\(90deg\)/);
  assert.match(gameCss, /body:not\(\.wc-game-mode\):not\(\.wc-account-authenticated\) #warcraft\{display:none!important\}/);
  assert.match(gameCss, /body\.wc-account-authenticated:not\(\.wc-game-mode\) #wcGameMount\{display:none!important\}/);
  const gameScript = fs.readFileSync(path.join(__dirname, '..', 'public/warcraft/game-ui.js'), 'utf8');
  assert.match(gameScript, /requestFullscreen/);
  assert.match(gameScript, /scrollGameIntoView/);
  assert.doesNotMatch(gameScript, /orientation\.lock|wcRotateGame|wcContinuePortrait/);
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

test('la ruta /jkbot se conserva y Auto Reacción ya no se expone en el servidor', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
  assert.match(server, /app\.get\(\['\/jkbot', '\/jkbot\/'\]/);
  assert.match(server, /renderJkBotPage\(INDEX_TEMPLATE/);
  assert.doesNotMatch(server, /\/api\/reactions\//);
  assert.doesNotMatch(server, /admin-reaction-token/);
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

    get('menuToggle').click();
    get('menuDrawer').querySelector('a[href=\"#wcLoginForm\"]').click();
    assert.equal(get('menuDrawer').getAttribute('aria-hidden'), 'true');
    assert.ok(window.document.body.classList.contains('wc-game-mode'));
    assert.equal(get('wcLoginForm').style.display, '', 'el enlace del menú muestra el login en la vista de juego');
  } finally {
    window.close();
  }
});

test('Jugar WoW desplaza el reino a la vista y solicita fullscreen sin pantalla negra', async () => {
  let fullscreenRequests = 0;
  let scrollRequests = 0;
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
    window.HTMLElement.prototype.scrollIntoView = function () { scrollRequests++; };
    window.document.getElementById('menuToggle').click();
    window.document.getElementById('menuPlayWow').click();
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(window.document.documentElement.classList.contains('wc-game-mode'), false);
    assert.ok(window.document.body.classList.contains('wc-game-mode'));
    assert.equal(window.document.getElementById('menuDrawer').getAttribute('aria-hidden'), 'true');
    assert.ok(window.document.querySelector('.wc-game-shell'), 'Jugar no deja la pantalla en negro: muestra el juego');
    assert.equal(fullscreenRequests, 1, 'Jugar con sesión solicita fullscreen desde el clic');
    assert.ok(scrollRequests > 0, 'el panel del reino se desplaza a la vista');
    assert.equal(orientationLocks, 0, 'Jugar no bloquea la orientación');
    window.document.getElementById('wcExitGameMode').click();
    assert.equal(window.document.documentElement.classList.contains('wc-game-mode'), false);
    assert.equal(window.document.body.classList.contains('wc-game-mode'), false);
    assert.equal(orientationUnlocks, 0, 'no hay bloqueo nativo que liberar');
  } finally {
    window.close();
  }
});

test('en /jkbot el juego abre fullscreen, sincroniza y conserva formularios y posición', async () => {
  let orientationLocks = 0;
  let fullscreenRequests = 0;
  let softRefreshTick;
  let refreshDelay;
  let profileRequests = 0;
  let pageScrollY = 0;
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
      Object.defineProperty(window.document, 'hidden', { value: false, configurable: true });
      Object.defineProperty(window, 'scrollY', { get: () => pageScrollY, configurable: true });
      window.scrollTo = (_x, y) => { pageScrollY = y; };
      window.fetch = async url => {
        const target = String(url);
        if (target.endsWith('/catalog')) return { ok: true, status: 200, json: async () => ({ ok: true, ...catalog }) };
        if (target.endsWith('/me')) { profileRequests++; return { ok: true, status: 200, json: async () => ({ ok: true, account: { username: account.username }, ...web.playerState(root, account), rank: 1 }) }; }
        if (target.endsWith('/shop')) return { ok: true, status: 200, json: async () => ({ ok: true, items: shop }) };
        if (target.endsWith('/active-users')) return { ok: true, status: 200, json: async () => ({ ok: true, users: [], totalRegistered: 1, totalCharacters: 1 }) };
        return { ok: true, status: 200, json: async () => ({ ok: true, message: 'ok' }) };
      };
      window.io = () => ({ on() {}, emit() {} });
      window.confirm = () => true;
      window.IntersectionObserver = class { observe() {} disconnect() {} };
      window.HTMLElement.prototype.scrollIntoView = function () {};
      window.HTMLCanvasElement.prototype.getContext = () => null;
      const realSetInterval = window.setInterval.bind(window);
      window.setInterval = (callback, delay, ...args) => {
        if (delay === 5000) { softRefreshTick = callback; refreshDelay = delay; return realSetInterval(() => {}, delay, ...args); }
        return realSetInterval(callback, delay, ...args);
      };
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
    assert.equal(orientationLocks, 0, 'no se solicita el bloqueo de orientación');
    assert.equal(fullscreenRequests, 1, 'Jugar en /jkbot también solicita fullscreen');
    assert.equal(window.document.body.classList.contains('wc-css-landscape'), false, 'el juego no rota fuera del viewport');
    assert.ok(window.document.querySelector('.wc-game-shell'), 'la partida se integra dentro de la página');
    assert.equal(window.document.getElementById('wcRotateGame'), null, 'no existe el botón de giro/fullscreen');
    assert.equal(refreshDelay, 5000, 'el refresco automático se programa cada cinco segundos');
    assert.equal(typeof softRefreshTick, 'function');
    window.document.querySelector('[data-tab="mas"]').click();
    const mailTarget = window.document.querySelector('form[data-wc-form="mail_send"] input[name="target"]');
    mailTarget.focus();
    mailTarget.value = '535000123456';
    mailTarget.setSelectionRange(mailTarget.value.length, mailTarget.value.length);
    mailTarget.dispatchEvent(new window.Event('input', { bubbles: true }));
    const tabRail = window.document.querySelector('.wc-game-tabs');
    tabRail.scrollLeft = 183;
    pageScrollY = 241;
    const pageRoot = window.document.documentElement;
    const requestsBeforeSoftRefresh = profileRequests;
    softRefreshTick();
    await new Promise(resolve => setTimeout(resolve, 80));
    assert.ok(profileRequests > requestsBeforeSoftRefresh, 'el refresco automático vuelve a consultar el estado del perfil');
    assert.equal(window.document.documentElement, pageRoot, 'actualiza datos sin recargar el documento');
    const restoredTarget = window.document.querySelector('form[data-wc-form="mail_send"] input[name="target"]');
    assert.equal(restoredTarget.value, '535000123456', 'el refresco en vivo conserva el número escrito');
    assert.equal(window.document.activeElement, restoredTarget, 'el refresco conserva el foco en el campo');
    assert.equal(window.document.querySelector('.wc-game-tabs').scrollLeft, 183, 'la navegación horizontal no retrocede al inicio');
    assert.equal(pageScrollY, 241, 'la página conserva la posición vertical durante la actualización');
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
