(() => {
  'use strict';
  const bell = document.getElementById('jkNotificationBell');
  const panel = document.getElementById('jkNotificationPanel');
  const badge = document.getElementById('jkNotificationBadge');
  const list = document.getElementById('jkNotificationList');
  const toast = document.getElementById('jkNotificationToast');
  if (!bell || !panel || !badge || !list || !toast) return;

  const storagePrefix = 'jkbot_notifications_v1:';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  let username = '';
  let notifications = [];
  let toastTimer = null;

  function readSaved(account) {
    try {
      const parsed = JSON.parse(localStorage.getItem(storagePrefix + account) || '[]');
      return Array.isArray(parsed) ? parsed.filter(item => item && typeof item.id === 'string') : [];
    } catch { return []; }
  }
  function save() {
    if (!username) return;
    try { localStorage.setItem(storagePrefix + username, JSON.stringify(notifications.slice(-30))); } catch {}
  }
  function collect(state) {
    const current = new Map();
    const duel = state.pendingDuel;
    if (duel?.id) current.set(`duel:${duel.id}`, { id: `duel:${duel.id}`, kind: 'duel', title: 'Nuevo desafío', message: `${duel.challenger || 'Un jugador'} te retó a un duelo.`, target: 'jugadores' });
    if (state.duel?.id && state.duel.status === 'active') {
      const rival = (state.duel.players || []).find(player => !player.isMe);
      current.set(`duel-active:${state.duel.id}`, { id: `duel-active:${state.duel.id}`, kind: 'duel', title: 'Duelo aceptado', message: `El duelo con ${rival?.name || 'el rival'} está activo.`, target: 'jugadores' });
    }
    for (const [index, mail] of (state.mail || []).entries()) {
      if (mail.claimed) continue;
      const id = String(mail.id || mail.sentAt || `${mail.senderName || 'correo'}:${index}`);
      const key = `mail:${id}`;
      current.set(key, { id: key, kind: 'mail', title: 'Correo pendiente', message: `Tienes un mensaje de ${mail.senderName || 'otro jugador'}.`, target: 'mas' });
    }
    for (const [index, trade] of (state.trades || []).entries()) {
      if (!trade.incoming || (trade.status && trade.status !== 'pending')) continue;
      const id = String(trade.id || `${trade.fromName || 'jugador'}:${index}`);
      const key = `trade:${id}`;
      current.set(key, { id: key, kind: 'trade', title: 'Solicitud de comercio', message: `${trade.fromName || 'Un jugador'} quiere comerciar contigo.`, target: 'jugadores' });
    }
    for (const [index, transaction] of (state.transactions || []).entries()) {
      if (!transaction.incoming) continue;
      const id = String(transaction.id || `${transaction.fromName || 'jugador'}:${index}`);
      const key = `refund:${id}`;
      current.set(key, { id: key, kind: 'refund', title: 'Reembolso pendiente', message: `${transaction.fromName || 'Un jugador'} te envió una solicitud de reembolso.`, target: 'jugadores' });
    }
    return current;
  }
  function closePanel() {
    panel.hidden = true;
    bell.setAttribute('aria-expanded', 'false');
  }
  function render() {
    const unread = notifications.filter(item => !item.read).length;
    badge.textContent = unread > 9 ? '9+' : String(unread);
    badge.hidden = unread === 0;
    bell.classList.toggle('has-unread', unread > 0);
    bell.setAttribute('aria-label', unread ? `Notificaciones (${unread} sin leer)` : 'Notificaciones');
    list.innerHTML = notifications.length ? notifications.slice().reverse().map(item => `<li class="jkbot-notification-item ${item.read ? '' : 'unread'}"><div><strong>${esc(item.title)}</strong><p>${esc(item.message)}</p><small>${new Date(item.createdAt || Date.now()).toLocaleString('es-ES')}</small></div><div class="jkbot-notification-actions"><button type="button" data-jkbot-notification-target="${esc(item.target)}">Ver</button><button type="button" data-jkbot-notification-dismiss="${esc(item.id)}" aria-label="Quitar notificación">×</button></div></li>`).join('') : '<li class="jkbot-notification-empty">No tienes notificaciones nuevas.</li>';
  }
  function showToast(item) {
    toast.textContent = `${item.title}: ${item.message}`;
    toast.hidden = false;
    toast.classList.remove('show');
    void toast.offsetWidth;
    toast.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => { toast.hidden = true; toast.classList.remove('show'); }, 7000);
    if (document.visibilityState === 'hidden' && 'Notification' in window && Notification.permission === 'granted') {
      try { new Notification(item.title, { body: item.message, tag: item.id }); } catch {}
    }
  }
  function update(state) {
    const account = String(state?.account?.username || '');
    if (!account) return;
    if (username !== account) { username = account; notifications = readSaved(account); }
    const current = collect(state);
    const fresh = [];
    for (const [id, item] of current) {
      if (notifications.some(existing => existing.id === id)) continue;
      const entry = { ...item, createdAt: Date.now(), read: false };
      notifications.push(entry);
      fresh.push(entry);
    }
    notifications = notifications.slice(-30);
    save();
    render();
    if (fresh.length) showToast(fresh[fresh.length - 1]);
  }

  bell.addEventListener('click', () => {
    const opening = panel.hidden;
    panel.hidden = !opening;
    bell.setAttribute('aria-expanded', String(opening));
    if (opening) {
      notifications = notifications.map(item => ({ ...item, read: true }));
      save();
      render();
    }
  });
  document.getElementById('jkNotificationMarkRead')?.addEventListener('click', () => {
    notifications = notifications.map(item => ({ ...item, read: true }));
    save();
    render();
  });
  document.addEventListener('click', event => {
    const dismiss = event.target.closest?.('[data-jkbot-notification-dismiss]');
    if (dismiss) {
      notifications = notifications.filter(item => item.id !== dismiss.dataset.jkbotNotificationDismiss);
      save(); render(); return;
    }
    const target = event.target.closest?.('[data-jkbot-notification-target]');
    if (target) {
      const tab = target.dataset.jkbotNotificationTarget;
      closePanel();
      const openTab = () => document.querySelector(`[data-tab="${tab}"]`)?.click();
      if (!document.body.classList.contains('wc-game-mode')) {
        document.getElementById('menuPlayWow')?.click();
        window.setTimeout(openTab, 500);
      } else openTab();
      return;
    }
    if (!panel.hidden && !panel.contains(event.target) && !bell.contains(event.target)) closePanel();
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closePanel(); });
  window.addEventListener('jkbot:state', event => update(event.detail));
  if (window.jkbotGameState) update(window.jkbotGameState);
  render();
})();
