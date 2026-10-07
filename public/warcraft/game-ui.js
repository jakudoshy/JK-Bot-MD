(() => {
  'use strict';
  const TOKEN_KEY = 'jk_warcraft_token';
  const mount = document.getElementById('wcGameMount');
  const setup = document.getElementById('wcCharacterSetup');
  if (!mount || !setup) return;

  const state = { catalog: null, me: null, shop: [], tab: 'resumen', shopFilter: 'all', classKey: '', notice: '', noticeError: false, pendingPurchase: null, players: [], playersLoadedAt: 0, awaitingCharacterSelection: false };
  const token = () => localStorage.getItem(TOKEN_KEY);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const el = id => document.getElementById(id);
  const rarityLabels = { common: 'Común', uncommon: 'Poco común', rare: 'Rara', epic: 'Épica', legendary: 'Legendaria', mythic: 'Mítica' };
  const classLabel = id => state.catalog?.classes?.find(c => c.id === id)?.label || id || 'Aventurero';
  const itemInfo = id => state.catalog?.items?.[id] || { id, name: id };
  const img = (src, alt, cls = '') => src ? `<img class="${cls}" src="${esc(src)}" alt="${esc(alt)}" loading="lazy">` : '';
  const rarityClass = item => `rarity-${Object.hasOwn(rarityLabels, String(item?.rarity || '').toLowerCase()) ? String(item.rarity).toLowerCase() : 'common'}`;
  const num = value => Number(value || 0).toLocaleString('es-ES');
  const pct = (value, max) => Math.max(0, Math.min(100, max ? Math.round((Number(value || 0) / Number(max)) * 100) : 0));
  const labelForZone = id => state.catalog?.zones?.find(z => z.id === id)?.name || id || 'Aldea del Alba';
  const enemyLabel = id => state.catalog?.enemies?.[id]?.name || state.me?.player?.generatedMissionEnemies?.[id]?.name || id || 'criaturas';
  const statRows = item => {
    const keys = [['attack', 'Ataque'], ['armor', 'Armadura'], ['defense', 'Defensa'], ['strength', 'Fuerza'], ['agility', 'Agilidad'], ['intellect', 'Intelecto'], ['stamina', 'Aguante'], ['heal', 'Curación']];
    return keys.filter(([key]) => Number(item?.[key] || 0) > 0).map(([key, label]) => `<span class="wc-item-stat">${label} +${esc(item[key])}</span>`).join('');
  };
  const rarityLabel = item => item?.rarityLabel || rarityLabels[item?.rarity] || 'Común';
  const itemCard = (item, { action = '', buttonLabel = '', dataAttr = 'itemId', quantity = null } = {}) => {
    if (!item) return '';
    const attrName = dataAttr.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
    const data = action ? `data-wc-action="${esc(action)}" data-${attrName}="${esc(item.id)}"` : '';
    return `<article class="wc-game-item ${rarityClass(item)}"><div class="wc-item-art">${img(item.image, item.name || item.id)}</div><div><h4 class="wc-item-name">${esc(item.name || item.id)}</h4><div class="wc-rarity-label">${esc(rarityLabel(item))}${item.level ? ` · Nivel ${esc(item.level)}` : ''}${quantity != null ? ` · ×${esc(quantity)}` : ''}</div><div class="wc-item-stats">${statRows(item)}${item.price ? `<span class="wc-item-stat">Precio ${num(item.price)} oro</span>` : ''}</div></div>${buttonLabel ? `<div class="wc-item-card-actions"><button class="wc-game-btn" type="button" ${data}><i class="fas fa-${action === 'equip_item' ? 'shield-halved' : action === 'use_item' ? 'flask' : 'cart-shopping'}"></i>${esc(buttonLabel)}</button></div>` : ''}</article>`;
  };
  async function api(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}), ...(options.headers || {}) };
    const response = await fetch(url, { ...options, headers });
    let data = {};
    try { data = await response.json(); } catch {}
    return { response, data };
  }
  function setNotice(message, error = false) { state.notice = String(message || ''); state.noticeError = Boolean(error); }
  async function loadCatalog() {
    if (state.catalog) return state.catalog;
    const { response, data } = await api('/api/warcraft/catalog');
    if (response.ok && data.ok) state.catalog = data;
    else throw new Error(data.message || 'No se pudo cargar el catálogo Warcraft.');
    return state.catalog;
  }
  async function refresh({ keepNotice = true } = {}) {
    if (!token()) { mount.innerHTML = ''; setup.style.display = 'none'; return; }
    try {
      await loadCatalog();
      const { response, data } = await api('/api/warcraft/me');
      if (!response.ok || !data.ok) {
        if (response.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          window.setWcAuth?.('');
          state.me = null;
          setNotice('La sesión caducó. Inicia sesión otra vez.', true);
          mount.innerHTML = '';
          if (document.body.classList.contains('wc-game-mode')) leaveGameMode();
          document.getElementById('wcLoginStatus')?.replaceChildren(document.createTextNode(state.notice));
        } else {
          setNotice(data.message || 'No se pudo cargar el personaje.', true);
          if (state.me?.player) render();
        }
        return;
      }
      state.me = data;
      if (!keepNotice) setNotice('');
      if (state.awaitingCharacterSelection) {
        const portraitAccountView = window.matchMedia?.('(max-width: 720px) and (orientation: portrait)').matches === true;
        if (document.body.classList.contains('wc-game-mode') || !portraitAccountView) renderCharacterPicker();
        else renderAccountLanding();
        return;
      }
      if (!data.player) { renderClassSetup(); mount.innerHTML = ''; return; }
      setup.style.display = 'none';
      if (!state.shop.length || state.tab === 'tienda') {
        const shopData = await api('/api/warcraft/shop');
        if (shopData.response.ok && shopData.data.ok) state.shop = shopData.data.items || [];
      }
      renderLegacyProfile();
      render();
    } catch (error) {
      setNotice(error.message || 'No se pudo conectar con Warcraft.', true);
      if (state.me?.player) render();
    }
  }
  function renderLegacyProfile() {
    const p = state.me?.player;
    if (!p) return;
    const setText = (id, value) => { if (el(id)) el(id).textContent = String(value); };
    setText('wcProfileTitle', p.name || 'Personaje');
    setText('wcProfileSubtitle', `${state.me.account?.username || ''} · ${classLabel(p.classKey)} · ${labelForZone(p.zone)}`);
    if (el('wcProfileStats')) {
      const rows = [['Puesto', state.me.rank ? `#${state.me.rank}` : '—'], ['Nivel', `${p.level}/80`], ['Clase', classLabel(p.classKey)], ['GS', p.gs], ['Vida', `${p.hp}/${p.maxHp}`], ['Experiencia', p.xp], ['Oro', num(p.gold)], ['Ataque', p.attack], ['Defensa', p.defense]];
      el('wcProfileStats').innerHTML = rows.map(([label, value]) => `<div class="wc-profile-stat"><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`).join('');
    }
    if (el('wcProfileEquipment')) el('wcProfileEquipment').innerHTML = (state.me.equipmentDetails || []).length ? state.me.equipmentDetails.map(item => `<div><strong>${esc(item.slot === 'weapon' ? 'Arma' : 'Armadura')}:</strong> ${esc(item.name)}</div>`).join('') : 'Todavía no hay equipo.';
    if (el('wcProfileInventory')) el('wcProfileInventory').innerHTML = (state.me.inventoryDetails || []).length ? state.me.inventoryDetails.map(item => `<li>${esc(item.name)} <strong>× ${Number(item.quantity || 1)}</strong></li>`).join('') : '<li>Inventario vacío</li>';
  }
  function renderClassSetup() {
    const classes = state.catalog?.classes || [];
    setup.style.display = 'block';
    if (el('wcClassGrid')) el('wcClassGrid').innerHTML = classes.map(c => `<button class="wc-class-choice ${state.classKey === c.id ? 'selected' : ''}" type="button" data-class-choice="${esc(c.id)}">${img(c.image, c.label)}<strong>${esc(c.label)}</strong><small>${esc(c.role || 'Aventurero')}</small></button>`).join('');
    if (el('wcCreateClass')) el('wcCreateClass').value = state.classKey;
    if (el('wcCreateCharacterButton')) el('wcCreateCharacterButton').disabled = !state.classKey;
  }
  function renderAccountLanding() {
    const username = state.me?.account?.username || 'tu cuenta';
    mount.innerHTML = `<section class="wc-account-ready"><span class="wc-game-kicker">CUENTA WOW</span><h3>Cuenta autenticada</h3><p>${esc(username)}. Pulsa <strong>Jugar WoW</strong> para elegir personaje y entrar al juego.</p></section>`;
  }
  function renderCharacterPicker() {
    setup.style.display = 'none';
    const characters = state.me?.characters || [];
    const cards = characters.map(character => `<article class="wc-character-card"><div class="wc-character-portrait">${img(character.classImage, `${character.className} · ${character.name}`)}</div><div class="wc-character-info"><h3>${esc(character.name)}${character.selected ? ' <span class="wc-character-active">Activo</span>' : ''}</h3><p>${esc(character.className)} · Nivel ${num(character.level)} · ${esc(character.zoneName || labelForZone(character.zone))}</p><p class="wc-character-health">${num(character.hp)} / ${num(character.maxHp)} vida <span>GS ${num(character.gs)}</span></p><button class="wc-game-btn gold" type="button" data-select-character="${esc(character.id)}"><i class="fas fa-play"></i> Jugar con este personaje</button></div></article>`).join('');
    mount.innerHTML = `<section class="wc-character-picker"><div class="wc-character-picker-heading"><div><span class="wc-game-kicker">Cuenta ${esc(state.me?.account?.username || '')}</span><h3>Elige tu personaje</h3><p>Selecciona con cuál continuar. Cada uno conserva su propio nivel, equipo, misiones y progreso.</p></div><button class="wc-game-btn" type="button" data-wc-local="create-character"><i class="fas fa-user-plus"></i> Crear otro personaje</button></div>${state.notice ? `<div class="wc-game-notice ${state.noticeError ? 'error' : ''}" role="status">${esc(state.notice)}</div>` : ''}${cards ? `<div class="wc-character-list">${cards}</div>` : '<div class="wc-game-empty">Todavía no tienes personajes. Crea uno para comenzar.</div>'}</section>`;
  }
  function render() {
    const p = state.me?.player;
    if (!p || !token()) return;
    const tabs = [['resumen', 'Resumen', 'compass'], ['misiones', 'Misiones', 'scroll'], ['combate', 'Combate', 'dragon'], ['tienda', 'Tienda', 'store'], ['inventario', 'Inventario', 'bag-shopping'], ['mapa', 'Mapa', 'map'], ['oficios', 'Oficios', 'hammer'], ['mazmorras', 'Mazmorras', 'dungeon'], ['jugadores', 'Jugadores', 'users'], ['mas', 'Más funciones', 'ellipsis']];
    const bar = (current, max, kind = '') => `<div class="wc-game-bar ${kind}"><span style="width:${pct(current, max)}%"></span></div>`;
    const hero = `<header class="wc-game-hero">${img(p.classImage, classLabel(p.classKey), 'wc-game-portrait')}<div><h3 class="wc-game-title">${esc(p.name)} · Nivel ${esc(p.level)}</h3><p class="wc-game-subtitle">${esc(classLabel(p.classKey))} · ${esc(labelForZone(p.zone))} · GS ${esc(p.gs)}</p>${bar(p.hp, p.maxHp, 'hp')}<div class="wc-game-statline"><span>Vida</span><strong>${num(p.hp)} / ${num(p.maxHp)}</strong></div>${bar(p.xp, p.xpForNext || 100, 'xp')}<div class="wc-game-statline"><span>Experiencia</span><strong>${num(p.xp)} / ${num(p.xpForNext || 100)}</strong></div></div><div class="wc-game-vitals"><span class="wc-game-chip">${img('/assets/warcraft/generated/ui/gold.png', 'Oro')}<strong>${num(p.gold)}</strong> oro</span><span class="wc-game-chip"><i class="fas fa-khanda"></i> Ataque <strong>${num(p.attack)}</strong></span><span class="wc-game-chip"><i class="fas fa-shield-halved"></i> Defensa <strong>${num(p.defense)}</strong></span><button class="wc-game-btn wc-manage-characters" type="button" data-wc-local="characters"><i class="fas fa-users"></i> Personajes</button></div></header>`;
    mount.innerHTML = `<section class="wc-game-shell">${hero}<nav class="wc-game-tabs" aria-label="Secciones del juego">${tabs.map(([id, label, icon]) => `<button type="button" class="${state.tab === id ? 'active' : ''}" data-tab="${id}"><i class="fas fa-${icon}"></i> ${label}</button>`).join('')}</nav><div class="wc-game-body"><div class="wc-game-notice ${state.noticeError ? 'error' : ''}" role="status">${esc(state.notice)}</div>${renderTab()}</div></section>${state.pendingPurchase ? renderPurchaseOverlay() : ''}`;
  }
  function renderTab() {
    switch (state.tab) {
      case 'misiones': return renderQuests();
      case 'combate': return renderCombat();
      case 'tienda': return renderShop();
      case 'inventario': return renderInventory();
      case 'mapa': return renderWorld();
      case 'oficios': return renderProfessions();
      case 'mazmorras': return renderDungeons();
      case 'jugadores': return renderPlayers();
      case 'mas': return renderMore();
      default: return renderOverview();
    }
  }
  function renderOverview() {
    const p = state.me.player;
    const zone = state.catalog.zones.find(z => z.id === p.zone) || state.catalog.zones[0];
    const active = p.activeQuest;
    const classConfig = state.catalog.classes.find(c => c.id === p.classKey) || {};
    return `<div class="wc-game-grid"><article class="wc-game-card"><h4>Tu héroe</h4><p>${esc(classConfig.description || classConfig.role || 'Aventurero')} · ${esc(classConfig.role || '')}</p><div class="wc-game-statline"><span>Fuerza</span><strong>${num(p.attributes?.strength)}</strong></div><div class="wc-game-statline"><span>Agilidad</span><strong>${num(p.attributes?.agility)}</strong></div><div class="wc-game-statline"><span>Intelecto</span><strong>${num(p.attributes?.intellect)}</strong></div><div class="wc-game-statline"><span>Talentos disponibles</span><strong>${num(p.talentPoints)}</strong></div><div class="wc-game-actions"><button class="wc-game-btn" data-tab="misiones"><i class="fas fa-scroll"></i> Ver misiones</button><button class="wc-game-btn" data-tab="inventario"><i class="fas fa-bag-shopping"></i> Abrir inventario</button></div></article><article class="wc-game-card"><h4>Ubicación actual</h4>${img(zone?.image, zone?.name || 'Mapa', 'wc-game-map-thumb')}<p><strong>${esc(zone?.name || labelForZone(p.zone))}</strong> · Requisito nivel ${num(zone?.level || 1)}</p><p class="muted">${esc(zone?.gathering?.join(' · ') || 'Explora, reúne materiales y busca enemigos.')}</p><div class="wc-game-actions"><button class="wc-game-btn" data-tab="mapa"><i class="fas fa-map"></i> Abrir mapa</button></div></article><article class="wc-game-card wide"><h4>Actividad del personaje</h4>${active ? `<p><strong>Misión activa:</strong> ${esc(active.name || active.id)} · ${num(active.progress || 0)}/${num(active.goal || 1)}</p>` : `<p>No tienes una misión activa. Acepta la misión principal del nivel ${num(p.level)}. Las secundarias son opcionales.</p>`}<p>${state.me.combat?.enemy ? `Combate activo contra ${esc(state.me.combat.enemy.name)}.` : 'No tienes combate activo.'} ${state.me.party ? `Grupo ${esc(state.me.party.id)} · ${state.me.party.members.length} integrantes.` : ''}</p><div class="wc-game-actions"><button class="wc-game-btn gold" data-tab="combate"><i class="fas fa-dragon"></i> Ir al combate</button><button class="wc-game-btn" data-tab="tienda"><i class="fas fa-store"></i> Visitar tienda</button><button class="wc-game-btn" data-wc-action="daily"><i class="fas fa-calendar-day"></i> Reclamar recompensa diaria</button></div><p class="muted">La experiencia de combate permite subir de nivel sin completar misiones secundarias. El progreso se comparte con WhatsApp.</p></article></div>`;
  }
  function renderQuests() {
    const quests = state.me.quests || [];
    const active = state.me.player.activeQuest;
    const activeBox = active ? `<article class="wc-game-card wide"><h4>Misión en progreso</h4><p><strong>${esc(active.name || active.id)}</strong> · ${esc(active.description || 'Completa el objetivo para cobrar la recompensa.')}</p><div class="wc-game-statline"><span>Progreso</span><strong>${num(active.progress || 0)} / ${num(active.goal || 1)}</strong></div><div class="wc-game-actions"><button class="wc-game-btn danger" data-wc-action="quest_cancel"><i class="fas fa-ban"></i> Cancelar misión</button></div></article>` : '';
    const board = quests.length ? quests.map(q => {
      const main = q.mainQuest || q.questType === 'main' || q.campaign === 'main';
      const rewardItems = (q.rewardItems || []).map(id => itemInfo(id)).filter(Boolean);
      return `<article class="wc-game-card"><h4>${main ? '<i class="fas fa-crown"></i> Misión principal' : '<i class="fas fa-feather-pointed"></i> Misión secundaria'}</h4><p><strong>${esc(q.name)}</strong></p><p>${esc(q.description)}</p><div class="wc-game-statline"><span>Objetivo</span><strong>${num(q.goal || 1)} · ${esc(q.enemyName || enemyLabel(q.enemyId))}</strong></div><div class="wc-game-statline"><span>Recompensas</span><strong>${num(q.xp)} XP · ${num(q.gold)} oro</strong></div>${rewardItems.length ? `<div class="wc-item-stats">${rewardItems.map(i => `<span class="wc-game-chip">${img(i.image, i.name)}${esc(i.name)}</span>`).join('')}</div>` : ''}<div class="wc-game-actions"><button class="wc-game-btn gold" type="button" data-wc-action="quest_accept" data-id="${esc(q.id)}" ${active ? 'disabled' : ''}><i class="fas fa-check"></i> Aceptar misión</button></div></article>`;
    }).join('') : '<div class="wc-game-empty">La misión principal de este nivel ya está completada. Sigue ganando experiencia: las misiones no bloquean el siguiente nivel.</div>';
    return `<div class="wc-game-grid">${activeBox}<article class="wc-game-card wide"><h4>Misión principal</h4><p>La misión principal está disponible sin completar secundarias. Gana experiencia en combate para subir de nivel; las misiones secundarias son opcionales.</p></article>${board}</div>`;
  }
  function renderCombat() {
    const combat = state.me.combat;
    const p = state.me.player;
    const skills = Object.entries(state.me.skills || {});
    if (combat?.enemy) {
      const enemy = combat.enemy;
      const log = (combat.log || []).slice(-7).map(line => `<div>${esc(typeof line === 'string' ? line : line.text || JSON.stringify(line))}</div>`).join('') || '<div>El combate acaba de empezar.</div>';
      return `<div class="wc-game-grid"><article class="wc-game-card wide"><h4>Combate activo · Ronda ${num(combat.round || 1)}</h4><div class="wc-game-statline"><span>${esc(enemy.name)}</span><strong>${num(enemy.hp)} / ${num(enemy.maxHp)} vida</strong></div><div class="wc-game-bar hp"><span style="width:${pct(enemy.hp, enemy.maxHp)}%"></span></div><div class="wc-game-statline"><span>${esc(p.name)}</span><strong>${num(p.hp)} / ${num(p.maxHp)} vida</strong></div><div class="wc-game-bar hp"><span style="width:${pct(p.hp, p.maxHp)}%"></span></div><div class="wc-game-actions"><button class="wc-game-btn gold" data-wc-action="combat_attack" data-skill-id="auto"><i class="fas fa-sword"></i> Ataque básico</button>${skills.map(([id, skill]) => `<button class="wc-game-btn" data-wc-action="combat_attack" data-skill-id="${esc(id)}"><i class="fas fa-wand-sparkles"></i> ${esc(skill.name || id)}</button>`).join('')}<button class="wc-game-btn secondary" data-wc-action="use_item" data-id="health_potion"><i class="fas fa-flask"></i> Usar poción</button><button class="wc-game-btn danger" data-wc-action="combat_flee"><i class="fas fa-person-running"></i> Retirarse</button></div></article><article class="wc-game-card wide"><h4>Registro de combate</h4><div class="wc-game-log">${log}</div><p class="muted">Los enemigos actúan por turno y pueden usar habilidades. La vida se mantiene sincronizada con WhatsApp.</p></article></div>`;
    }
    const enemies = state.me.enemies || [];
    return `<div class="wc-game-grid"><article class="wc-game-card wide"><h4>Elige un enemigo</h4><p>Estos objetivos corresponden a tu nivel y zona. Si tienes una misión activa, su objetivo se mantiene disponible en la lista.</p><div class="wc-game-item-grid">${enemies.map(enemy => `<article class="wc-game-item"><div class="wc-item-art"><i class="fas fa-dragon"></i></div><div><h4 class="wc-item-name">${esc(enemy.name)}</h4><div class="wc-rarity-label">Nivel ${num(enemy.level)} · ${num(enemy.hp)} vida</div><div class="wc-item-stats"><span class="wc-item-stat">Ataque ${num(enemy.attack)}</span><span class="wc-item-stat">Defensa ${num(enemy.defense)}</span></div></div><div class="wc-item-card-actions"><button class="wc-game-btn gold" data-wc-action="combat_start" data-id="${esc(enemy.id)}"><i class="fas fa-crosshairs"></i> Enfrentar</button></div></article>`).join('') || '<div class="wc-game-empty">No hay enemigos en esta zona.</div>'}</div></article></div>`;
  }
  function renderShop() {
    const filters = [['all', 'Todo', 'layer-group'], ['weapon', 'Armas', 'sword'], ['armor', 'Armaduras', 'shield-halved'], ['consumable', 'Consumibles', 'flask']];
    const items = state.shop.filter(item => state.shopFilter === 'all' || item.slot === state.shopFilter);
    return `<div class="wc-game-grid wc-shop-layout"><article class="wc-game-card wide wc-shop-toolbar"><div><h4>Tienda de equipo</h4><p>Artículos de tu tramo de nivel. Revisa rareza y estadísticas; toca Comprar para ver la confirmación.</p></div><div class="wc-game-actions wc-shop-filters">${filters.map(([id, label, icon]) => `<button class="wc-game-btn ${state.shopFilter === id ? 'gold' : 'secondary'}" type="button" aria-pressed="${state.shopFilter === id}" data-shop-filter="${id}"><i class="fas fa-${icon}"></i>${label}</button>`).join('')}</div></article><div class="wc-game-item-grid wide wc-shop-grid">${items.map(item => itemCard(item, { action: 'shop_prepare', buttonLabel: 'Comprar' })).join('') || '<div class="wc-game-empty">No hay objetos disponibles en esta categoría para tu nivel.</div>'}</div></div>`;
  }
  function renderInventory() {
    const inventory = state.me.inventoryDetails || [];
    const equipped = new Set((state.me.equipmentDetails || []).map(item => item.id));
    const gear = inventory.map(item => itemCard(item, { action: item.slot === 'weapon' || item.slot === 'armor' ? 'equip_item' : 'use_item', buttonLabel: item.slot === 'weapon' || item.slot === 'armor' ? (equipped.has(item.id) ? 'Equipado · Cambiar' : 'Equipar') : 'Usar', quantity: item.quantity })).join('');
    const equippedCards = (state.me.equipmentDetails || []).map(item => `<span class="wc-game-chip">${img(item.image, item.name)}${esc(item.slot === 'weapon' ? 'Arma' : 'Armadura')}: <strong>${esc(item.name)}</strong></span>`).join('');
    return `<div class="wc-game-grid"><article class="wc-game-card wide"><h4>Equipo equipado</h4><div class="wc-game-actions">${equippedCards || '<span class="muted">Sin equipo</span>'}</div></article><article class="wc-game-card wide"><h4>${img('/assets/warcraft/generated/ui/inventory.png', 'Inventario')} Mochila · ${num(inventory.reduce((n, item) => n + Number(item.quantity || 0), 0))} objetos</h4><div class="wc-game-item-grid">${gear || '<div class="wc-game-empty">La mochila está vacía.</div>'}</div></article></div>`;
  }
  function renderWorld() {
    const current = state.me.player.zone;
    const zones = state.catalog.zones || [];
    const nodes = Object.entries(state.catalog.materialSources || {});
    return `<div class="wc-game-grid"><article class="wc-game-card wide"><h4>Mapa del mundo</h4><p>Viaja entre zonas, reúne hierbas y minerales, y encuentra criaturas y objetivos de misión.</p><div class="wc-game-map-grid">${zones.map(zone => `<article class="wc-game-card wc-map-card ${current === zone.id ? 'current' : ''}">${img(zone.image, zone.name)}<div class="wc-map-card-content"><h4>${esc(zone.name)} ${current === zone.id ? '· Estás aquí' : ''}</h4><p>Nivel ${num(zone.level)}+ · ${esc((zone.gathering || []).join(', ') || 'Exploración')}</p><button class="wc-game-btn ${current === zone.id ? 'secondary' : ''}" data-wc-action="travel" data-zone-id="${esc(zone.id)}" ${current === zone.id ? 'disabled' : ''}><i class="fas fa-route"></i> ${current === zone.id ? 'Ubicación actual' : 'Viajar'}</button></div></article>`).join('')}</div></article><article class="wc-game-card wide"><h4>Recursos del mundo</h4><div class="wc-game-item-grid">${nodes.map(([id, source]) => { const item = itemInfo(id); return `<article class="wc-game-item"><div class="wc-item-art">${img(item.image, item.name || id)}</div><div><h4 class="wc-item-name">${esc(item.name || id.replaceAll('_', ' '))}</h4><p>${esc(source)}</p><button class="wc-game-btn" data-wc-action="gather" data-node="${esc(id)}"><i class="fas fa-hand"></i> Recolectar</button></div></article>`; }).join('')}</div></article></div>`;
  }
  function renderProfessions() {
    const p = state.me.player;
    const recipes = Object.entries(state.catalog.recipes || {});
    const professions = state.catalog.professions || [];
    return `<div class="wc-game-grid"><article class="wc-game-card wide"><h4>Aprender un oficio</h4><p>Minería, herbalismo, alquimia y herrería comparten materiales y recetas con el mundo de Warcraft.</p><div class="wc-game-item-grid">${professions.map(id => `<article class="wc-game-item"><div class="wc-item-art"><i class="fas fa-${id === 'mineria' ? 'pickaxe' : id === 'herbalismo' ? 'leaf' : id === 'alquimia' ? 'flask' : 'hammer'}"></i></div><div><h4 class="wc-item-name">${esc(id[0].toUpperCase() + id.slice(1))}</h4><p>Nivel de oficio: ${num(p.professions?.[id] || 0)}</p><button class="wc-game-btn" data-wc-action="profession_learn" data-profession="${esc(id)}">${p.professions?.[id] ? 'Ya aprendido' : 'Aprender oficio'}</button></div></article>`).join('')}</div></article><article class="wc-game-card wide"><h4>Recetas</h4><div class="wc-game-item-grid">${recipes.map(([id, recipe]) => `<article class="wc-game-item"><div class="wc-item-art">${img(itemInfo(recipe.output).image, recipe.name)}</div><div><h4 class="wc-item-name">${esc(recipe.name)}</h4><p>Oficio ${esc(recipe.profession)} · Nivel ${num(recipe.level)}</p><p class="muted">Ingredientes: ${Object.entries(recipe.materials || {}).map(([material, quantity]) => `${num(quantity)} × ${esc(itemInfo(material).name || material)}`).join(', ')}</p><button class="wc-game-btn" data-wc-action="craft" data-recipe-id="${esc(id)}">Fabricar</button></div></article>`).join('')}</div></article></div>`;
  }
  function renderDungeons() {
    const dungeons = state.catalog.dungeons || [];
    const run = state.me.dungeon;
    const p = state.me.player;
    const group = state.me.party;
    const members = group?.members || [];
    const dungeonInfo = run ? `<article class="wc-game-card wide"><h4>Mazmorra en curso</h4><p>${esc(run.dungeon?.name || run.name || 'Incursión')} · Ronda ${num(run.run?.round || run.round || 1)}</p><pre class="wc-game-log">${esc(JSON.stringify(run, null, 2).slice(0, 1400))}</pre><div class="wc-game-actions"><button class="wc-game-btn gold" data-wc-action="dungeon_attack" data-skill-id="auto">Atacar</button><button class="wc-game-btn" data-wc-action="dungeon_aggro">Tomar agro</button><button class="wc-game-btn" data-wc-action="dungeon_heal" data-target="banda">Curar banda</button>${Object.entries(state.me.skills || {}).map(([id, skill]) => `<button class="wc-game-btn" data-wc-action="dungeon_attack" data-skill-id="${esc(id)}">${esc(skill.name || id)}</button>`).join('')}</div></article>` : '';
    return `<div class="wc-game-grid"><article class="wc-game-card wide"><h4>Grupo</h4>${group ? `<p>ID de grupo <strong>${esc(group.id)}</strong> · líder ${esc(group.leader)} · ${members.length}/5 integrantes</p><p>${members.map(m => `${esc(m.name)} · ${esc(classLabel(m.classKey))} · Nv ${num(m.level)} · ${num(m.hp)}/${num(m.maxHp)} vida`).join('<br>')}</p><button class="wc-game-btn danger" data-wc-action="party_leave">Salir del grupo</button>` : `<p>No tienes grupo. Crea uno y comparte el código para invitar a otros jugadores.</p><div class="wc-game-actions"><button class="wc-game-btn gold" data-wc-action="party_create">Crear grupo</button></div><form class="wc-game-form" data-wc-form="party_join"><div><label for="wcPartyId">Código del grupo</label><input id="wcPartyId" class="wc-game-input" name="partyId" required></div><button class="wc-game-btn" type="submit">Unirme</button></form>`}</article>${dungeonInfo}<article class="wc-game-card wide"><h4>Mazmorras disponibles</h4><p>Los turnos, el agro del tanque, las curaciones y el orden de NPC se comparten con el grupo.</p><div class="wc-game-map-grid">${dungeons.map(d => `<article class="wc-game-card"><h4>${esc(d.name)}</h4><p>Nivel ${num(d.level)} · Jefe: ${esc(state.catalog.enemies[d.boss]?.name || d.boss)}</p><p>${(d.rooms || []).map(room => esc(room.name)).join(' → ')}</p><button class="wc-game-btn gold" data-wc-action="dungeon_start" data-dungeon-id="${esc(d.id)}" ${p.level < d.level || !group ? 'disabled' : ''}>${group ? 'Entrar con el grupo' : 'Primero crea un grupo'}</button></article>`).join('')}</div></article></div>`;
  }
  async function loadPlayers() {
    if (Date.now() - state.playersLoadedAt < 30000 && state.players.length) return;
    const { response, data } = await api('/api/warcraft/active-users');
    if (response.ok && data.ok) { state.players = data.users || []; state.playersLoadedAt = Date.now(); }
  }
  function renderPlayers() {
    const p = state.me.player;
    const duel = state.me.duel;
    const pending = state.me.pendingDuel;
    const transactions = state.me.transactions || [];
    const auctions = state.me.auctions || [];
    const players = state.players.filter(x => x.username !== state.me.account?.username);
    return `<div class="wc-game-grid"><article class="wc-game-card wide"><h4>Duelos</h4>${pending ? `<p>${esc(pending.challenger)} te desafió.</p><button class="wc-game-btn gold" data-wc-action="duel_accept">Aceptar duelo</button>` : ''}${duel?.status === 'active' ? `<p>Duelo activo · ${duel.players.map(x => `${esc(x.name)} ${num(x.hp)}/${num(x.maxHp)} vida`).join(' · ')}</p><div class="wc-game-actions"><button class="wc-game-btn gold" data-wc-action="duel_attack" data-skill-id="auto">Ataque básico</button>${Object.entries(state.me.skills || {}).map(([id, skill]) => `<button class="wc-game-btn" data-wc-action="duel_attack" data-skill-id="${esc(id)}">${esc(skill.name || id)}</button>`).join('')}<button class="wc-game-btn danger" data-wc-action="duel_surrender">Rendirse</button></div>` : `<form class="wc-game-form" data-wc-form="duel_challenge"><div><label for="wcDuelTarget">Jugador (usuario, nombre o teléfono)</label><input id="wcDuelTarget" class="wc-game-input" name="target" required></div><button class="wc-game-btn gold" type="submit">Enviar desafío</button></form>`}</article><article class="wc-game-card wide"><h4>Jugadores</h4><div class="wc-game-item-grid">${players.slice(0, 12).map(row => `<article class="wc-game-item"><div class="wc-item-art">${img(state.catalog.classes.find(c => c.id === row.classKey)?.image, row.className)}</div><div><h4 class="wc-item-name">${esc(row.character)}</h4><p>@${esc(row.username)} · ${esc(row.className)} · Nivel ${num(row.level)} · GS ${num(row.gs)}</p><button class="wc-game-btn" data-target-player="${esc(row.username)}">Desafiar</button></div></article>`).join('') || '<div class="wc-game-empty">Todavía no hay otros personajes en el ranking.</div>'}</div></article><article class="wc-game-card wide"><h4>Regalos y reembolsos</h4><form class="wc-game-form" data-wc-form="gift"><div><label>Jugador destino</label><input class="wc-game-input" name="target" required></div><div><label>Tipo de regalo</label><select class="wc-game-select" name="assetType"><option value="gold">Oro</option><option value="item">Objeto</option></select></div><div><label>ID del objeto (si aplica)</label><select class="wc-game-select" name="itemId"><option value="">Selecciona objeto</option>${(state.me.inventoryDetails || []).map(i => `<option value="${esc(i.id)}">${esc(i.name)} × ${num(i.quantity)}</option>`).join('')}</select></div><div><label>Cantidad de oro/objetos</label><input class="wc-game-input" name="amount" type="number" min="1" value="1"></div><button class="wc-game-btn" type="submit">Enviar regalo inmediato</button></form><form class="wc-game-form" data-wc-form="refund_create" style="margin-top:14px"><div><label>Jugador destino</label><input class="wc-game-input" name="target" required></div><div><label>Qué ofreces</label><select class="wc-game-select" name="offerType"><option value="gold">Oro</option><option value="item">Objeto</option></select></div><div><label>Objeto ofrecido</label><select class="wc-game-select" name="offerItemId"><option value="">Selecciona objeto</option>${(state.me.inventoryDetails || []).map(i => `<option value="${esc(i.id)}">${esc(i.name)}</option>`).join('')}</select></div><div><label>Cantidad ofrecida</label><input class="wc-game-input" name="offerAmount" type="number" min="1" value="1"></div><div><label>Qué solicitas</label><select class="wc-game-select" name="requestType"><option value="none">Nada</option><option value="gold">Oro</option><option value="item">Objeto</option></select></div><div><label>Objeto solicitado (si aplica)</label><select class="wc-game-select" name="requestItemId"><option value="">Selecciona objeto</option>${Object.entries(state.catalog.items).slice(0,180).map(([id,i]) => `<option value="${esc(id)}">${esc(i.name)}</option>`).join('')}</select></div><div><label>Cantidad solicitada</label><input class="wc-game-input" name="requestAmount" type="number" min="1" value="1"></div><button class="wc-game-btn gold" type="submit">Enviar solicitud segura</button></form>${transactions.length ? `<h4 style="margin-top:18px">Solicitudes pendientes</h4>${transactions.map(tx => `<article class="wc-game-card"><p>${tx.incoming ? `De ${esc(tx.fromName)}` : `Para ${esc(tx.toName)}`} · ofrece ${esc(assetText(tx.offer))} y solicita ${esc(assetText(tx.request))}</p><div class="wc-game-actions">${tx.incoming ? `<button class="wc-game-btn gold" data-wc-action="refund_accept" data-transaction-id="${esc(tx.id)}">Aceptar intercambio</button>` : ''}<button class="wc-game-btn danger" data-wc-action="refund_cancel" data-transaction-id="${esc(tx.id)}">Cancelar</button></div></article>`).join('')}` : ''}</article><article class="wc-game-card wide"><h4>Casa de subastas</h4><div class="wc-game-item-grid">${auctions.map(a => `<article class="wc-game-item"><div class="wc-item-art">${img(a.itemInfo?.image, a.itemInfo?.name || 'Objeto')}</div><div><h4 class="wc-item-name">${esc(a.itemInfo?.name || a.item)}</h4><p>${num(a.price)} oro · vendedor ${esc(a.sellerName)}</p><button class="wc-game-btn" data-wc-action="auction_buy" data-id="${esc(a.id)}">Comprar</button></div></article>`).join('') || '<div class="wc-game-empty">No hay artículos publicados.</div>'}</div><form class="wc-game-form" data-wc-form="auction_list"><div><label>Objeto para publicar</label><select class="wc-game-select" name="itemId">${(state.me.inventoryDetails || []).map(i => `<option value="${esc(i.id)}">${esc(i.name)}</option>`).join('')}</select></div><div><label>Precio de salida</label><input class="wc-game-input" name="price" type="number" min="1" value="100"></div><button class="wc-game-btn" type="submit">Publicar artículo</button></form></article></div>`;
  }
  function assetText(asset) {
    if (!asset || asset.type === 'none') return 'nada';
    if (asset.type === 'gold') return `${num(asset.amount)} oro`;
    return `${itemInfo(asset.itemId).name || asset.itemId} × ${num(asset.quantity)}`;
  }
  function renderMore() {
    const p = state.me.player;
    const guildId = p.guildId;
    const mounts = Object.entries(state.catalog.mounts || {});
    const enchants = Object.entries(state.catalog.enchantments || {});
    const achievements = Object.entries(state.catalog.achievements || {});
    const unlocked = state.me.achievements || {};
    const mail = state.me.mail || [];
    return `<div class="wc-game-grid"><article class="wc-game-card"><h4>Talentos</h4><p>Puntos disponibles: ${num(p.talentPoints)}</p><div class="wc-game-actions">${[['attack','Ataque'],['defense','Defensa'],['vitality','Vitalidad']].map(([id,label]) => `<button class="wc-game-btn" data-wc-action="talent" data-talent="${id}" ${!p.talentPoints ? 'disabled' : ''}>Mejorar ${label}</button>`).join('')}</div>${p.classKey === 'druida' ? `<h4 style="margin-top:16px">Especialización de druida</h4><div class="wc-game-actions">${[['feral','Feral'],['guardian','Guardián'],['restoration','Restauración']].map(([id,label]) => `<button class="wc-game-btn" data-wc-action="specialization" data-specialization="${id}">${label}</button>`).join('')}</div>` : ''}</article><article class="wc-game-card"><h4>Recompensa diaria</h4><p>Reclama oro y experiencia una vez al día.</p><button class="wc-game-btn gold" data-wc-action="daily">Reclamar</button></article><article class="wc-game-card wide"><h4>Monturas</h4><div class="wc-game-item-grid">${mounts.map(([id,m]) => `<article class="wc-game-item"><div class="wc-item-art"><i class="fas fa-horse"></i></div><div><h4 class="wc-item-name">${esc(m.name)}</h4><p>Nivel ${num(m.level)} · ${num(m.price)} oro</p><button class="wc-game-btn" data-wc-action="mount_buy" data-id="${esc(id)}">Comprar montura</button></div></article>`).join('')}</div></article><article class="wc-game-card wide"><h4>Hermandad</h4>${guildId ? `<p>Formas parte de <strong>${esc(state.me.guild?.name || 'la hermandad')}</strong> · ID ${esc(guildId)}.</p><button class="wc-game-btn danger" data-wc-action="guild_leave">Salir</button>` : `<form class="wc-game-form" data-wc-form="guild_create"><div><label>Crear hermandad</label><input class="wc-game-input" name="name" maxlength="30" required placeholder="Nombre de la hermandad"></div><button class="wc-game-btn gold" type="submit">Crear</button></form><form class="wc-game-form" data-wc-form="guild_join" style="margin-top:10px"><div><label>ID de hermandad</label><input class="wc-game-input" name="guildId" required></div><button class="wc-game-btn" type="submit">Unirme</button></form>`}</article><article class="wc-game-card wide"><h4>Encantamientos</h4><div class="wc-game-item-grid">${enchants.map(([id,e]) => `<article class="wc-game-item"><div class="wc-item-art"><i class="fas fa-wand-sparkles"></i></div><div><h4 class="wc-item-name">${esc(e.name)}</h4><p>${e.attack ? `Ataque +${num(e.attack)}` : ''} ${e.defense ? `Defensa +${num(e.defense)}` : ''} ${e.hp ? `Vida +${num(e.hp)}` : ''}</p><button class="wc-game-btn" data-wc-action="enchant" data-id="${esc(id)}" data-slot="${esc(e.slot)}">Aplicar</button></div></article>`).join('')}</div></article><article class="wc-game-card wide"><h4>Correo y logros</h4><p>Mensajes pendientes: ${num(mail.filter(m => !m.claimed).length)} · Logros desbloqueados: ${num(Object.keys(unlocked).length)}</p><div class="wc-game-actions"><button class="wc-game-btn" data-wc-action="mail_claim">Reclamar correo</button></div><div class="wc-game-item-grid" style="margin-top:12px">${achievements.map(([id,a]) => `<article class="wc-game-item"><div class="wc-item-art"><i class="fas fa-award"></i></div><div><h4 class="wc-item-name">${esc(a[0])}</h4><p>${esc(a[1])} · Recompensa ${num(a[2])} oro</p><span class="wc-rarity-label">${unlocked[id] ? 'Desbloqueado' : 'Pendiente'}</span></div></article>`).join('')}</div></article><article class="wc-game-card wide"><h4>Enviar correo</h4><form class="wc-game-form" data-wc-form="mail_send"><div><label>Usuario/nombre/teléfono del destinatario</label><input class="wc-game-input" name="target" required></div><div><label>Objeto</label><select class="wc-game-select" name="itemId">${(state.me.inventoryDetails || []).map(i => `<option value="${esc(i.id)}">${esc(i.name)}</option>`).join('')}</select></div><div><label>Oro adjunto</label><input class="wc-game-input" name="gold" type="number" min="0" value="0"></div><button class="wc-game-btn" type="submit">Enviar correo</button></form></article></div>`;
  }
  function renderPurchaseOverlay() {
    const item = state.shop.find(i => i.id === state.pendingPurchase) || itemInfo(state.pendingPurchase);
    return `<div class="wc-game-overlay" role="dialog" aria-modal="true" aria-labelledby="wcBuyTitle"><div class="wc-game-dialog"><h3 id="wcBuyTitle">Confirmar compra</h3><p>Vas a comprar este objeto por ${num(item.price)} de oro. La compra solo se completa al confirmar.</p>${itemCard(item)}<p class="wc-game-footnote">Después de comprar, el objeto aparecerá en tu mochila compartida con WhatsApp.</p><div class="wc-game-actions"><button class="wc-game-btn gold" data-wc-action="shop_confirm">Confirmar compra</button><button class="wc-game-btn secondary" data-wc-action="shop_cancel">Cancelar</button></div></div></div>`;
  }
  async function action(name, params = {}) {
    const { response, data } = await api('/api/warcraft/action', { method: 'POST', body: JSON.stringify({ action: name, ...params }) });
    setNotice(data.message || (data.ok ? 'Acción completada.' : 'No se pudo completar la acción.'), !response.ok || !data.ok);
    if (data.ok) {
      if (name === 'shop_prepare') state.pendingPurchase = params.itemId;
      if (name === 'shop_confirm' || name === 'shop_cancel') state.pendingPurchase = null;
      if (name === 'shop_cancel') { render(); return; }
      await refresh();
    } else render();
    return data;
  }
  function values(form) { return Object.fromEntries(new FormData(form).entries()); }
  mount.addEventListener('click', async event => {
    const localAction = event.target.closest('[data-wc-local]');
    if (localAction) {
      if (localAction.dataset.wcLocal === 'characters') { state.awaitingCharacterSelection = true; await refresh(); return; }
      if (localAction.dataset.wcLocal === 'retry-game') { await enterGameMode(); return; }
      if (localAction.dataset.wcLocal === 'create-character') {
        state.awaitingCharacterSelection = false;
        mount.innerHTML = '';
        setup.style.display = 'block';
        setup.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    const characterChoice = event.target.closest('[data-select-character]');
    if (characterChoice) {
      const { response, data } = await api('/api/warcraft/action', { method: 'POST', body: JSON.stringify({ action: 'select_character', characterId: characterChoice.dataset.selectCharacter }) });
      setNotice(data.message || 'No se pudo seleccionar el personaje.', !response.ok || !data.ok);
      if (response.ok && data.ok) {
        state.awaitingCharacterSelection = false;
        state.tab = 'resumen';
        await refresh();
      } else renderCharacterPicker();
      return;
    }
    const tab = event.target.closest('[data-tab]');
    if (tab) { state.tab = tab.dataset.tab; if (state.tab === 'jugadores') await loadPlayers(); render(); return; }
    const filter = event.target.closest('[data-shop-filter]');
    if (filter) { state.shopFilter = filter.dataset.shopFilter; render(); return; }
    const classChoice = event.target.closest('[data-class-choice]');
    if (classChoice) { state.classKey = classChoice.dataset.classChoice; renderClassSetup(); return; }
    const targetPlayer = event.target.closest('[data-target-player]');
    if (targetPlayer) { await action('duel_challenge', { target: targetPlayer.dataset.targetPlayer }); return; }
    const button = event.target.closest('[data-wc-action]');
    if (!button) return;
    const { wcAction, id, skillId, itemId, enemyId, zoneId, profession, node, recipeId, dungeonId, target, talent, specialization, transactionId, slot } = button.dataset;
    if (wcAction === 'shop_prepare') { await action('shop_prepare', { itemId: itemId || id }); return; }
    if (wcAction === 'shop_confirm') { await action('shop_confirm'); return; }
    if (wcAction === 'shop_cancel') { await action('shop_cancel'); return; }
    const params = { id, itemId: itemId || id, skillId, enemyId: enemyId || id, zoneId, profession, node, recipeId, dungeonId, target, talent, specialization, transactionId, slot };
    Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);
    await action(wcAction, params);
  });
  mount.addEventListener('submit', async event => {
    const form = event.target.closest('[data-wc-form]');
    if (!form) return;
    event.preventDefault();
    const data = values(form);
    const kind = form.dataset.wcForm;
    if (kind === 'party_join') await action('party_join', data);
    else if (kind === 'duel_challenge') await action('duel_challenge', data);
    else if (kind === 'gift') await action('gift', { ...data, amount: Number(data.amount || 1) });
    else if (kind === 'refund_create') await action('refund_create', { ...data, offerAmount: Number(data.offerAmount || 1), requestAmount: Number(data.requestAmount || 1) });
    else if (kind === 'auction_list') await action('auction_list', { ...data, price: Number(data.price || 0) });
    else if (kind === 'guild_create') await action('guild_create', data);
    else if (kind === 'guild_join') await action('guild_join', data);
    else if (kind === 'mail_send') await action('mail_send', { ...data, gold: Number(data.gold || 0) });
  });
  setup.addEventListener('click', event => {
    const choice = event.target.closest('[data-class-choice]');
    if (!choice) return;
    state.classKey = choice.dataset.classChoice;
    renderClassSetup();
  });
  el('wcCreateCharacterForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const name = el('wcCreateName')?.value?.trim();
    if (!state.classKey) { if (el('wcCreateStatus')) el('wcCreateStatus').textContent = 'Elige una clase para continuar.'; return; }
    const button = el('wcCreateCharacterButton'); if (button) button.disabled = true;
    const status = el('wcCreateStatus'); if (status) status.textContent = 'Creando personaje…';
    const { response, data } = await api('/api/warcraft/action', { method: 'POST', body: JSON.stringify({ action: 'create_character', name, classKey: state.classKey }) });
    if (status) status.textContent = data.message || (data.ok ? 'Personaje creado.' : 'No se pudo crear el personaje.');
    if (button) button.disabled = false;
    if (data.ok && response.ok) { state.tab = 'resumen'; state.classKey = ''; state.awaitingCharacterSelection = true; await refresh({ keepNotice: false }); }
  });
  el('wcLoginForm')?.addEventListener('submit', () => { state.awaitingCharacterSelection = true; }, true);
  el('wcVerifyBtn')?.addEventListener('click', () => { state.awaitingCharacterSelection = true; }, true);
  const lockLandscape = () => {
    try {
      const orientation = window.screen?.orientation;
      const result = orientation?.lock?.('landscape');
      if (result?.catch) result.catch(() => {});
    } catch {}
  };
  const enterGameMode = async () => {
    if (!token()) {
      const status = el('wcLoginStatus');
      if (status) status.textContent = 'Inicia sesión o crea tu cuenta de WoW antes de jugar.';
      const login = el('wcLoginForm');
      login?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      login?.classList.add('wc-auth-attention');
      window.setTimeout(() => login?.classList.remove('wc-auth-attention'), 1800);
      return;
    }
    document.documentElement.classList.add('wc-game-mode');
    document.body.classList.add('wc-game-mode');
    document.body.classList.remove('wc-portrait-override');
    const profile = el('wcProfilePanel');
    if (profile) profile.style.display = 'block';
    mount.innerHTML = '<div class="wc-game-loading" role="status"><span class="wc-game-spinner"></span><h3>Entrando a Warcraft</h3><p>Cargando tu cuenta, personaje y mundo…</p></div>';
    try {
      const fullscreen = document.documentElement.requestFullscreen?.();
      if (fullscreen?.then) fullscreen.then(lockLandscape).catch(lockLandscape);
      else lockLandscape();
    } catch { lockLandscape(); }
    await refresh({ keepNotice: false });
    if (!state.me && token()) {
      mount.innerHTML = `<div class="wc-game-load-error" role="alert"><h3>No se pudo cargar el juego</h3><p>${esc(state.notice || 'Revisa tu conexión e inténtalo de nuevo.')}</p><button class="wc-game-btn" type="button" data-wc-local="retry-game">Reintentar</button></div>`;
    }
  };
  const leaveGameMode = () => {
    document.documentElement.classList.remove('wc-game-mode');
    document.body.classList.remove('wc-game-mode', 'wc-portrait-override');
    try { window.screen?.orientation?.unlock?.(); } catch {}
    try {
      const result = document.fullscreenElement ? document.exitFullscreen?.() : null;
      if (result?.catch) result.catch(() => {});
    } catch {}
  };
  el('menuPlayWow')?.addEventListener('click', enterGameMode);
  el('wcExitGameMode')?.addEventListener('click', leaveGameMode);
  el('wcContinuePortrait')?.addEventListener('click', () => document.body.classList.add('wc-portrait-override'));
  document.addEventListener('fullscreenchange', () => {
    if (document.body.classList.contains('wc-game-mode') && !document.fullscreenElement) leaveGameMode();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.body.classList.contains('wc-game-mode')) leaveGameMode();
  });
  window.addEventListener('wc-profile-refresh', () => refresh());
  window.addEventListener('orientationchange', () => refresh());
  window.wcGameRefresh = refresh;
  refresh();
})();
