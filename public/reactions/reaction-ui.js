(() => {
  const byId = id => document.getElementById(id);
  const form = byId('channelReactionForm');
  const status = byId('channelReactionStatus');
  const submit = byId('channelReactionSubmit');
  const panel = byId('autoReaction');
  const quotaLabel = byId('reactionQuota');
  const tokenForm = byId('channelReactionTokenForm');
  const tokenInput = byId('channelReactionToken');
  const tokenStatus = byId('channelReactionTokenStatus');
  const tokenSubmit = byId('channelReactionTokenSubmit');
  const token = () => {
    try { return localStorage.getItem('jk_warcraft_token') || ''; } catch { return ''; }
  };

  function closeMainMenu() {
    const toggle = byId('menuToggle');
    if (toggle?.getAttribute('aria-expanded') === 'true') {
      toggle.click();
      return;
    }
    const drawer = byId('menuDrawer');
    drawer?.classList.remove('open');
    drawer?.setAttribute('aria-hidden', 'true');
  }

  function showStatus(message, kind = 'info') {
    if (!status) return;
    status.textContent = message;
    status.dataset.kind = kind;
  }

  function showQuota(quota) {
    if (!quotaLabel || !quota) return;
    const used = Math.max(0, Number(quota.used) || 0);
    const limit = Math.max(1, Number(quota.limit) || 1);
    const remaining = Math.max(0, Number(quota.remaining) || 0);
    quotaLabel.textContent = `Reacciones de hoy: ${used}/${limit} · disponibles: ${remaining}${quota.hasToken ? ' · token activo' : ''}`;
  }

  async function refreshQuota() {
    const authToken = token();
    if (!authToken || typeof window.fetch !== 'function') return;
    try {
      const response = await fetch('/api/reactions/status', { headers: { Authorization: `Bearer ${authToken}` } });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.ok) showQuota(data.quota);
      else if (response.status === 401) {
        if (quotaLabel) quotaLabel.textContent = 'Inicia sesión para consultar tu cupo diario.';
        byId('reactionLogin')?.removeAttribute('hidden');
      }
    } catch {}
  }

  function openReactionMode(event) {
    event?.preventDefault?.();
    panel?.removeAttribute('hidden');
    document.body.classList.add('auto-reaction-mode');
    closeMainMenu();
    showStatus(token()
      ? 'Sesión detectada. La reacción se enviará desde el número de WhatsApp vinculado a esta cuenta.'
      : 'Inicia sesión en WoW con la cuenta asociada al número de WhatsApp que usará el bot.', token() ? 'ready' : 'warning');
    void refreshQuota();
    window.setTimeout(() => byId('channelPostUrl')?.focus({ preventScroll: true }), 40);
  }

  function closeReactionMode() {
    document.body.classList.remove('auto-reaction-mode');
    panel?.setAttribute('hidden', '');
  }

  byId('menuAutoReaction')?.addEventListener('click', openReactionMode);
  byId('reactionExit')?.addEventListener('click', closeReactionMode);
  byId('reactionLogin')?.addEventListener('click', () => {
    closeReactionMode();
    byId('menuPlayWow')?.click();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.body.classList.contains('auto-reaction-mode')) closeReactionMode();
  });

  tokenForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const authToken = token();
    if (!authToken) {
      if (tokenStatus) tokenStatus.textContent = 'Inicia sesión en WoW antes de activar un token.';
      byId('reactionLogin')?.removeAttribute('hidden');
      return;
    }
    if (tokenSubmit) tokenSubmit.disabled = true;
    if (tokenStatus) tokenStatus.textContent = 'Verificando token…';
    try {
      const response = await fetch('/api/reactions/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ token: tokenInput?.value || '' })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        if (tokenStatus) tokenStatus.textContent = data.message || 'No se pudo activar el token.';
        return;
      }
      if (tokenInput) tokenInput.value = '';
      if (tokenStatus) tokenStatus.textContent = data.message || 'Token activado.';
      showQuota(data.quota);
    } catch {
      if (tokenStatus) tokenStatus.textContent = 'No se pudo conectar con el servidor. Inténtalo de nuevo.';
    } finally {
      if (tokenSubmit) tokenSubmit.disabled = false;
    }
  });

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const authToken = token();
    if (!authToken) {
      showStatus('Inicia sesión antes de enviar una reacción.', 'warning');
      byId('reactionLogin')?.removeAttribute('hidden');
      return;
    }
    if (!byId('reactionConfirm')?.checked) {
      showStatus('Confirma que quieres reaccionar a esta publicación con tu cuenta conectada.', 'warning');
      return;
    }
    if (submit) submit.disabled = true;
    byId('reactionLogin')?.setAttribute('hidden', '');
    showStatus('Validando la publicación y enviando la reacción…', 'info');
    try {
      const response = await fetch('/api/reactions/channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          url: byId('channelPostUrl')?.value || '',
          emoji: byId('channelReactionEmoji')?.value || '',
          confirmed: true
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        if (data.quota) showQuota(data.quota);
        showStatus(data.message || 'No se pudo enviar la reacción. Comprueba el enlace y la conexión de WhatsApp.', 'error');
        if (response.status === 401) byId('reactionLogin')?.removeAttribute('hidden');
        return;
      }
      showQuota(data.quota);
      showStatus(data.message || 'Reacción enviada desde tu número vinculado.', 'success');
    } catch {
      showStatus('No se pudo conectar con el servidor. Inténtalo de nuevo cuando la web esté en línea.', 'error');
    } finally {
      if (submit) submit.disabled = false;
    }
  });
})();
