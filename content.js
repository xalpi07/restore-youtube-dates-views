/**
 * content.js
 * -----------------------------------------------------------------------------
 * Punto de entrada del content script. Responsabilidades:
 *
 *   1. Leer/observar las opciones del usuario (storage.sync).
 *   2. Observar el DOM con un ÚNICO MutationObserver (sin polling).
 *   3. Procesar SOLO los nodos nuevos o modificados, nunca todo el DOM.
 *   4. Reaccionar a la navegación SPA de YouTube.
 *
 * Toda la detección se basa en el TEXTO (utils.js), jamás en clases CSS, por lo
 * que la extensión sobrevive a los cambios de HTML de YouTube.
 * -----------------------------------------------------------------------------
 */

(() => {
  'use strict';

  /* --------------------------------------------------------------------- */
  /* API multi-navegador                                                    */
  /* --------------------------------------------------------------------- */
  // Firefox expone `browser`; Chrome/Edge/Brave exponen `chrome`. En MV3 ambos
  // soportan `chrome.*`, pero preferimos `browser` cuando existe (promesas).
  const api = globalThis.browser ?? globalThis.chrome;

  /* --------------------------------------------------------------------- */
  /* Estado                                                                 */
  /* --------------------------------------------------------------------- */

  /** Opciones activas (se rellena desde storage; arranca con los defaults). */
  let settings = { ...DEFAULT_SETTINGS };

  /**
   * Memoria de la última salida escrita por nodo de texto.
   *
   * ¿Por qué WeakMap y no WeakSet?
   *   - Necesitamos comparar el valor actual del nodo con lo que NOSOTROS
   *     escribimos para: (a) no reprocesar y (b) romper el bucle infinito que
   *     provocaría el propio MutationObserver al detectar nuestra escritura.
   *   - Al ser Weak*, no impide que el recolector de basura libere nodos
   *     eliminados del DOM => sin memory leaks aunque YouTube corra horas.
   * @type {WeakMap<Text, string>}
   */
  const lastOutputs = new WeakMap();

  /** Instancia única del observer (para poder desconectarlo si hiciera falta). */
  let observer = null;

  /* --------------------------------------------------------------------- */
  /* Utilidades internas                                                    */
  /* --------------------------------------------------------------------- */

  /**
   * Log condicionado a la opción `debug`.
   * @param {...unknown} args
   */
  function log(...args) {
    if (settings.debug) console.log(LOG_PREFIX, ...args);
  }

  /* --------------------------------------------------------------------- */
  /* Procesamiento de nodos de texto                                        */
  /* --------------------------------------------------------------------- */

  /**
   * Procesa un único nodo de texto: si su contenido coincide con un patrón,
   * reescribe SOLO su `nodeValue` (nunca el HTML).
   *
   * @param {Text} node Nodo de texto.
   */
  function processTextNode(node) {
    const value = node.nodeValue;

    // Filtro barato: descarta la inmensa mayoría de nodos sin coste de regex.
    if (!value || !isCandidateText(value)) return;

    // Si el valor actual es EXACTAMENTE lo que nosotros escribimos, ya está
    // procesado. Esto evita reprocesar y evita el bucle con el observer.
    if (lastOutputs.get(node) === value) return;

    const output = transformText(value, settings);
    if (output === null || output === value) return;

    node.nodeValue = output;      // solo tocamos el texto visible
    lastOutputs.set(node, output); // recordamos nuestra escritura
    log('Restaurado:', JSON.stringify(value), '->', JSON.stringify(output));
  }

  /**
   * Recorre un subárbol nuevo y procesa sus nodos de texto.
   * Usa TreeWalker (rápido y nativo) filtrando SOLO nodos de texto, de modo que
   * jamás recorremos elementos innecesarios ni el documento completo.
   *
   * @param {Node} root Raíz del subárbol añadido.
   */
  function scanSubtree(root) {
    // Caso 1: el propio nodo añadido es texto.
    if (root.nodeType === Node.TEXT_NODE) {
      processTextNode(/** @type {Text} */ (root));
      return;
    }

    // Caso 2: solo tiene sentido recorrer elementos.
    if (root.nodeType !== Node.ELEMENT_NODE) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let current = walker.nextNode();
    while (current) {
      processTextNode(/** @type {Text} */ (current));
      current = walker.nextNode();
    }
  }

  /* --------------------------------------------------------------------- */
  /* MutationObserver                                                       */
  /* --------------------------------------------------------------------- */

  /**
   * Callback del observer. Se mantiene lo más ligero posible:
   *   - characterData: YouTube reutilizó un nodo y cambió su texto -> reprocesar.
   *   - childList: se insertaron nodos (scroll infinito, navegación) -> escanear
   *     únicamente los subárboles añadidos.
   *
   * @param {MutationRecord[]} mutations
   */
  function onMutations(mutations) {
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') {
        const target = mutation.target;
        if (target.nodeType === Node.TEXT_NODE) {
          processTextNode(/** @type {Text} */ (target));
        }
      } else if (mutation.type === 'childList') {
        for (const added of mutation.addedNodes) {
          scanSubtree(added);
        }
      }
    }
  }

  /**
   * Arranca el observer sobre todo el documento. Un solo observer basta para
   * toda la página; no creamos observers por elemento (evita fugas y coste).
   */
  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(onMutations);
    observer.observe(document.documentElement, {
      childList: true,      // inserciones/eliminaciones de nodos
      subtree: true,        // en todo el árbol
      characterData: true,  // cambios de texto in situ
    });
    log('Observer iniciado');
  }

  /* --------------------------------------------------------------------- */
  /* Escaneo completo puntual                                               */
  /* --------------------------------------------------------------------- */

  /**
   * Escaneo completo del <body>. Se usa en momentos concretos (carga inicial,
   * navegación SPA, cambio de opciones). NO es polling: se dispara por eventos.
   */
  function fullScan() {
    if (document.body) scanSubtree(document.body);
  }

  /* --------------------------------------------------------------------- */
  /* Navegación SPA de YouTube                                              */
  /* --------------------------------------------------------------------- */

  /**
   * YouTube no recarga la página al navegar; emite eventos propios. Los
   * escuchamos para reescanear el contenido recién montado. El observer ya
   * captura la mayoría de inserciones, pero este reescaneo cubre los casos en
   * que el contenido se reutiliza/hidrata sin mutaciones observables.
   */
  function registerSpaNavigation() {
    for (const eventName of YT_NAVIGATION_EVENTS) {
      document.addEventListener(eventName, () => {
        log('Navegación SPA:', eventName);
        // El contenido puede montarse un tick después del evento.
        queueMicrotask(fullScan);
      }, { passive: true });
    }
  }

  /* --------------------------------------------------------------------- */
  /* Opciones (storage)                                                     */
  /* --------------------------------------------------------------------- */

  /**
   * Carga las opciones guardadas y, cuando terminan de cargarse, hace un
   * escaneo completo por si el body ya tenía contenido.
   * @returns {Promise<void>}
   */
  async function loadSettings() {
    try {
      const stored = await api.storage.sync.get(DEFAULT_SETTINGS);
      settings = { ...DEFAULT_SETTINGS, ...stored };
      log('Opciones cargadas:', settings);
    } catch (err) {
      // Si storage fallara, seguimos con los valores por defecto.
      console.warn(LOG_PREFIX, 'No se pudieron leer las opciones:', err);
    }
    fullScan();
  }

  /**
   * Reacciona a cambios de opciones en caliente (desde la página de opciones),
   * sin necesidad de recargar YouTube.
   */
  function watchSettings() {
    if (!api.storage?.onChanged) return;
    api.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'sync') return;
      for (const [key, { newValue }] of Object.entries(changes)) {
        if (key in settings) settings[key] = newValue;
      }
      log('Opciones actualizadas:', settings);
      // Reescaneamos para aplicar (activar) las conversiones recién habilitadas.
      fullScan();
    });
  }

  /* --------------------------------------------------------------------- */
  /* Inicialización                                                         */
  /* --------------------------------------------------------------------- */

  function init() {
    // 1) Observer cuanto antes (document_start): capta todo desde el inicio.
    startObserver();

    // 2) Navegación SPA.
    registerSpaNavigation();

    // 3) Reaccionar a cambios de opciones.
    watchSettings();

    // 4) Cargar opciones + primer escaneo.
    loadSettings();

    // 5) Reescaneo cuando el DOM inicial termina de parsearse.
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fullScan, { once: true });
    } else {
      fullScan();
    }
  }

  init();
})();
