/**
 * options.js
 * -----------------------------------------------------------------------------
 * Lógica de la página de opciones.
 *   - Carga las opciones guardadas y refleja su estado en los checkboxes.
 *   - Guarda cada cambio inmediatamente en storage.sync.
 *
 * Reutiliza DEFAULT_SETTINGS desde constants.js (incluido antes en el HTML).
 * -----------------------------------------------------------------------------
 */

(() => {
  'use strict';

  // API multi-navegador (Firefox: `browser`; Chrome/Edge/Brave: `chrome`).
  const api = globalThis.browser ?? globalThis.chrome;

  // IDs de checkbox que coinciden 1:1 con las claves booleanas de DEFAULT_SETTINGS.
  const FIELDS = ['restoreDates', 'restoreViews', 'debug'];

  /** @type {HTMLElement} */
  const statusEl = document.getElementById('status');

  /** Temporizador para ocultar el mensaje de estado. */
  let statusTimer = null;

  /**
   * Muestra un mensaje breve de confirmación.
   * @param {string} text
   */
  function showStatus(text) {
    statusEl.textContent = text;
    if (statusTimer) clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { statusEl.textContent = ''; }, 1500);
  }

  /**
   * Carga las opciones y sincroniza los checkboxes.
   * @returns {Promise<void>}
   */
  async function restoreOptions() {
    const stored = await api.storage.sync.get(DEFAULT_SETTINGS);
    for (const field of FIELDS) {
      const input = /** @type {HTMLInputElement} */ (document.getElementById(field));
      if (input) input.checked = Boolean(stored[field]);
    }
  }

  /**
   * Guarda una única opción en storage.sync.
   * @param {string} key
   * @param {boolean} value
   * @returns {Promise<void>}
   */
  async function saveOption(key, value) {
    await api.storage.sync.set({ [key]: value });
    showStatus('Guardado ✓');
  }

  /**
   * Enlaza los eventos `change` de cada checkbox.
   */
  function bindEvents() {
    for (const field of FIELDS) {
      const input = /** @type {HTMLInputElement} */ (document.getElementById(field));
      if (!input) continue;
      input.addEventListener('change', () => saveOption(field, input.checked));
    }
  }

  // Inicialización.
  document.addEventListener('DOMContentLoaded', () => {
    bindEvents();
    restoreOptions();
  });
})();
