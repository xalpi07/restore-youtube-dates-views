// Content script: un único MutationObserver (sin polling) que procesa solo los
// nodos nuevos o modificados y reacciona a la navegación SPA de YouTube.

(() => {
  'use strict';

  const api = globalThis.browser ?? globalThis.chrome;

  let settings = { ...DEFAULT_SETTINGS };
  // Opciones "efectivas": como `settings` pero con el idioma ya resuelto
  // (la preferencia 'auto' se traduce al idioma real de la interfaz).
  let effective = { ...DEFAULT_SETTINGS, locale: DEFAULT_LOCALE };

  // Guarda la última salida escrita por nodo para no reprocesar y para romper
  // el bucle que provocaría el observer al detectar nuestra propia escritura.
  // WeakMap => los nodos eliminados se liberan (sin memory leaks).
  const lastOutputs = new WeakMap();

  let observer = null;

  function log(...args) {
    if (settings.debug) console.log(LOG_PREFIX, ...args);
  }

  function recomputeEffective() {
    const uiLang = document.documentElement.lang || navigator.language;
    effective = { ...settings, locale: resolveLocaleCode(settings.locale, uiLang) };
  }

  // Para valores ambiguos (2K/4K/8K) mira el texto de hasta 4 ancestros cortos:
  // si contienen una fecha, la palabra "vistas/views" o el separador "·", es la
  // línea de metadatos de un vídeo, así que el valor son vistas (no resolución).
  function inMetadataContext(node) {
    let el = node.parentElement;
    for (let i = 0; i < 4 && el; i++, el = el.parentElement) {
      const text = el.textContent;
      if (text && text.length < 60 && hasMetadataSignal(text)) return true;
    }
    return false;
  }

  function processTextNode(node) {
    const value = node.nodeValue;
    if (!value || !isCandidateText(value)) return;
    if (lastOutputs.get(node) === value) return;

    // Marca el texto como metadato confirmado cuando el propio nodo ya contiene
    // una fecha o la palabra de vistas, o cuando el contexto lo confirma. Solo
    // entonces se convierten valores ambiguos (2K/4K/8K) y números planos.
    const ambiguous = isAmbiguousResolutionText(value) || isPlainCountText(value);
    const metadata =
      hasStrongMetadataSignal(value) || (ambiguous && inMetadataContext(node));

    const output = transformMetadataText(value, effective, metadata);
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
      document.addEventListener(eventName, () => {
        recomputeEffective(); // el idioma de la UI podría haber cambiado
        queueMicrotask(fullScan);
      }, { passive: true });
    }
  }

  async function loadSettings() {
    try {
      const stored = await api.storage.sync.get(DEFAULT_SETTINGS);
      settings = { ...DEFAULT_SETTINGS, ...stored };
    } catch (err) {
      console.warn(LOG_PREFIX, 'No se pudieron leer las opciones:', err);
    }
    recomputeEffective();
    fullScan();
  }

  function watchSettings() {
    if (!api.storage?.onChanged) return;
    api.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'sync') return;
      for (const [key, { newValue }] of Object.entries(changes)) {
        if (key in settings) settings[key] = newValue;
      }
      recomputeEffective();
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
