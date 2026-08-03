// Options page: reflects the saved state and persists every change.

(() => {
  'use strict';

  const api = globalThis.browser ?? globalThis.chrome;
  const CHECKBOXES = ['restoreDates', 'restoreViews', 'restoreSubscribers', 'restoreVideos', 'debug'];
  const statusEl = document.getElementById('status');
  let statusTimer = null;

  function showStatus(text) {
    statusEl.textContent = text;
    if (statusTimer) clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { statusEl.textContent = ''; }, 1500);
  }

  async function restoreOptions() {
    const stored = await api.storage.sync.get(DEFAULT_SETTINGS);
    for (const field of CHECKBOXES) {
      const input = document.getElementById(field);
      if (input) input.checked = Boolean(stored[field]);
    }
    const localeEl = document.getElementById('locale');
    if (localeEl) localeEl.value = stored.locale ?? 'auto';
  }

  async function saveOption(key, value) {
    await api.storage.sync.set({ [key]: value });
    showStatus('Saved ✓');
  }

  function bindEvents() {
    for (const field of CHECKBOXES) {
      const input = document.getElementById(field);
      if (input) input.addEventListener('change', () => saveOption(field, input.checked));
    }
    const localeEl = document.getElementById('locale');
    if (localeEl) localeEl.addEventListener('change', () => saveOption('locale', localeEl.value));
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindEvents();
    restoreOptions();
  });
})();
