// Content script: un único MutationObserver (sin polling) que procesa solo los
// nodos nuevos o modificados y reacciona a la navegación SPA de YouTube.

(() => {
  'use strict';

  const api = globalThis.browser ?? globalThis.chrome;

  let settings = { ...DEFAULT_SETTINGS };

  // Guarda la última salida escrita por nodo para no reprocesar y para romper
  // el bucle que provocaría el observer al detectar nuestra propia escritura.
  // WeakMap => los nodos eliminados se liberan (sin memory leaks).
  const lastOutputs = new WeakMap();

  let observer = null;

  function log(...args) {
    if (settings.debug) console.log(LOG_PREFIX, ...args);
  }

  function processTextNode(node) {
    const value = node.nodeValue;
    if (!value || !isCandidateText(value)) return;
    if (lastOutputs.get(node) === value) return;

    const output = transformText(value, settings);
    if (output === null || output === value) return;

    node.nodeValue = output; // solo se modifica el texto visible, nunca el HTML
    lastOutputs.set(node, output);
    log('Restaurado:', JSON.stringify(value), '->', JSON.stringify(output));
  }

  // Recorre solo el subárbol indicado (nunca el documento completo).
  function scanSubtree(root) {
    if (root.nodeType === Node.TEXT_NODE) {
      processTextNode(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      processTextNode(n);
    }
  }

  function onMutations(mutations) {
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') {
        if (mutation.target.nodeType === Node.TEXT_NODE) {
          processTextNode(mutation.target);
        }
      } else if (mutation.type === 'childList') {
        for (const added of mutation.addedNodes) scanSubtree(added);
      }
    }
  }

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(onMutations);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  function fullScan() {
    if (document.body) scanSubtree(document.body);
  }

  function registerSpaNavigation() {
    for (const eventName of YT_NAVIGATION_EVENTS) {
      document.addEventListener(eventName, () => queueMicrotask(fullScan), {
        passive: true,
      });
    }
  }

  async function loadSettings() {
    try {
      const stored = await api.storage.sync.get(DEFAULT_SETTINGS);
      settings = { ...DEFAULT_SETTINGS, ...stored };
    } catch (err) {
      console.warn(LOG_PREFIX, 'No se pudieron leer las opciones:', err);
    }
    fullScan();
  }

  function watchSettings() {
    if (!api.storage?.onChanged) return;
    api.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'sync') return;
      for (const [key, { newValue }] of Object.entries(changes)) {
        if (key in settings) settings[key] = newValue;
      }
      fullScan();
    });
  }

  function init() {
    startObserver();
    registerSpaNavigation();
    watchSettings();
    loadSettings();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fullScan, { once: true });
    } else {
      fullScan();
    }
  }

  init();
})();
