// Página de opciones: refleja el estado guardado y persiste cada cambio.

(() => {
  'use strict';

  const api = globalThis.browser ?? globalThis.chrome;
  const FIELDS = ['restoreDates', 'restoreViews', 'debug'];
  const statusEl = document.getElementById('status');
  let statusTimer = null;

  function showStatus(text) {
    statusEl.textContent = text;
    if (statusTimer) clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { statusEl.textContent = ''; }, 1500);
  }

  async function restoreOptions() {
    const stored = await api.storage.sync.get(DEFAULT_SETTINGS);
    for (const field of FIELDS) {
      const input = document.getElementById(field);
      if (input) input.checked = Boolean(stored[field]);
    }
  }

  async function saveOption(key, value) {
    await api.storage.sync.set({ [key]: value });
    showStatus('Guardado ✓');
  }

  function bindEvents() {
    for (const field of FIELDS) {
      const input = document.getElementById(field);
      if (input) input.addEventListener('change', () => saveOption(field, input.checked));
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindEvents();
    restoreOptions();
  });
})();
