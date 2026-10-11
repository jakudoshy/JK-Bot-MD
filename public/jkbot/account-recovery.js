'use strict';

(() => {
  const byId = id => document.getElementById(id);
  const login = byId('wcLoginForm');
  if (!login) return;

  const panel = byId('wcRecoveryPanel');
  const requestForm = byId('wcRecoveryRequestForm');
  const verifyForm = byId('wcRecoveryVerifyForm');
  const resetForm = byId('wcRecoveryResetForm');
  const status = byId('wcRecoveryStatus');
  let identifier = '';
  let recoveryToken = '';

  const authObserver = new MutationObserver(() => {
    if (document.body.classList.contains('wc-account-authenticated')) panel.hidden = true;
  });
  authObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  function showStep(step) {
    requestForm.hidden = step !== 'request';
    verifyForm.hidden = step !== 'verify';
    resetForm.hidden = step !== 'reset';
    const focus = step === 'request' ? byId('wcRecoveryIdentifier') : step === 'verify' ? byId('wcRecoveryCode') : byId('wcRecoveryPassword');
    focus?.focus({ preventScroll: true });
  }

  async function send(path, payload) {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    let data = {};
    try { data = await response.json(); } catch {}
    if (!response.ok || !data.ok) throw new Error(data.message || 'No se pudo completar el paso. Inténtalo de nuevo.');
    return data;
  }

  byId('wcForgotPassword')?.addEventListener('click', () => {
    panel.hidden = false;
    status.textContent = '';
    status.classList.remove('error');
    showStep('request');
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  byId('wcRecoveryClose')?.addEventListener('click', () => {
    panel.hidden = true;
    recoveryToken = '';
  });

  byId('wcRecoveryRestart')?.addEventListener('click', () => {
    recoveryToken = '';
    byId('wcRecoveryCode').value = '';
    status.classList.remove('error');
    status.textContent = '';
    showStep('request');
  });

  requestForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const button = requestForm.querySelector('button[type="submit"]');
    identifier = byId('wcRecoveryIdentifier').value.trim();
    button.disabled = true;
    status.classList.remove('error');
    status.textContent = 'Solicitando el código…';
    try {
      const data = await send('/api/warcraft/recovery/request-code', { identifier });
      status.textContent = data.message || 'Si los datos coinciden con una cuenta, revisa el WhatsApp vinculado.';
      showStep('verify');
    } catch (error) {
      status.classList.add('error');
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });

  verifyForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const button = verifyForm.querySelector('button[type="submit"]');
    button.disabled = true;
    status.classList.remove('error');
    status.textContent = 'Verificando el código…';
    try {
      const data = await send('/api/warcraft/recovery/verify-code', { identifier, code: byId('wcRecoveryCode').value.trim() });
      recoveryToken = data.recoveryToken;
      status.textContent = data.message || 'Código verificado.';
      showStep('reset');
    } catch (error) {
      status.classList.add('error');
      status.textContent = error.message;
      byId('wcRecoveryCode').select();
    } finally {
      button.disabled = false;
    }
  });

  resetForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const password = byId('wcRecoveryPassword').value;
    const repeated = byId('wcRecoveryPasswordRepeat').value;
    if (password !== repeated) {
      status.classList.add('error');
      status.textContent = 'Las contraseñas no coinciden. Vuelve a escribirlas.';
      byId('wcRecoveryPasswordRepeat').focus();
      return;
    }
    const button = resetForm.querySelector('button[type="submit"]');
    button.disabled = true;
    status.classList.remove('error');
    status.textContent = 'Actualizando contraseña…';
    try {
      const data = await send('/api/warcraft/recovery/reset-password', { recoveryToken, password });
      recoveryToken = '';
      byId('wcLoginUser').value = identifier;
      byId('wcLoginPass').value = '';
      status.textContent = data.message || 'Contraseña actualizada. Inicia sesión de nuevo.';
      resetForm.reset();
      showStep('request');
      requestForm.hidden = true;
      verifyForm.hidden = true;
      resetForm.hidden = true;
    } catch (error) {
      status.classList.add('error');
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
})();
