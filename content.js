// Content script: a single MutationObserver (no polling) that processes only
// new or modified nodes and reacts to YouTube's SPA navigation.

(() => {
  'use strict';

  const api = globalThis.browser ?? globalThis.chrome;

  let settings = { ...DEFAULT_SETTINGS };
  // "Effective" options: like `settings` but with the language already resolved
  // (the 'auto' preference is translated to the real UI language).
  let effective = { ...DEFAULT_SETTINGS, locale: DEFAULT_LOCALE };

  // Stores the last output written per node, to avoid reprocessing and to break
  // the loop the observer would trigger when detecting our own write.
  // WeakMap => removed nodes are freed (no memory leaks).
  const lastOutputs = new WeakMap();

  let observer = null;

  function log(...args) {
    if (settings.debug) console.log(LOG_PREFIX, ...args);
  }

  function recomputeEffective() {
    const uiLang = document.documentElement.lang || navigator.language;
    effective = { ...settings, locale: resolveLocaleCode(settings.locale, uiLang) };
  }

  // For ambiguous values (2K/4K/8K) or plain numbers, look at the text of up to
  // 4 short ancestors: if they contain a date, the word "views" or the "•"/"·"
  // separator, this is a video's metadata line, so the value is a view count
  // (not a resolution / random number).
  function inMetadataContext(node) {
    let el = node.parentElement;
    for (let i = 0; i < 4 && el; i++, el = el.parentElement) {
      const text = el.textContent;
      if (text && text.length < 60 && hasMetadataSignal(text)) return true;
    }
    return false;
  }

  // Interactive widgets whose text we must never touch. Like/dislike counters
  // (including those injected by other extensions, e.g. Return YouTube Dislike)
  // live inside buttons; rewriting them causes an infinite update loop between
  // extensions that freezes the page. View counts and dates never live here.
  const INTERACTIVE_SELECTOR =
    'button, [role="button"], [contenteditable="true"], ' +
    'like-button-view-model, dislike-button-view-model, ' +
    'segmented-like-dislike-button-view-model, ytd-toggle-button-renderer';

  function isInInteractiveElement(node) {
    const el = node.parentElement;
    return !!(el && el.closest(INTERACTIVE_SELECTOR));
  }

  // Subscriber and video counts ("82.2 M subscribers", "1.8 K videos") use the
  // same K/M/B format as views. If the node or a short ancestor mentions them,
  // return the matching kind so we expand with the right wording.
  function ancestorMatches(node, signalFn) {
    let el = node.parentElement;
    for (let i = 0; i < 4 && el; i++, el = el.parentElement) {
      const text = el.textContent;
      if (text && text.length < 80 && signalFn(text)) return true;
    }
    return false;
  }

  function detectContextKind(node, value) {
    if (hasSubscriberSignal(value) || ancestorMatches(node, hasSubscriberSignal)) {
      return 'subscribers';
    }
    if (hasVideoSignal(value) || ancestorMatches(node, hasVideoSignal)) {
      return 'videos';
    }
    return null;
  }

  function processTextNode(node) {
    const value = node.nodeValue;
    if (!value || !isCandidateText(value)) return;
    if (lastOutputs.get(node) === value) return;
    if (isInInteractiveElement(node)) return;

    // Subscriber/video counts use the same K/M/B format as views but a
    // different word. Detect the kind (from the node text or a short ancestor)
    // so we expand with the right wording.
    const contextKind = detectContextKind(node, value);

    // Mark the text as confirmed metadata when the node itself already contains
    // a date/count word, or when the context confirms it. Only then do we
    // convert ambiguous values (2K/4K/8K) and plain numbers.
    const ambiguous = isAmbiguousResolutionText(value) || isPlainCountText(value);
    const metadata =
      hasStrongMetadataSignal(value) || contextKind !== null || (ambiguous && inMetadataContext(node));

    const output = transformMetadataText(value, effective, metadata, contextKind);
    if (output === null || output === value) return;

    node.nodeValue = output; // only the visible text is changed, never the HTML
    lastOutputs.set(node, output);
    log('Restored:', JSON.stringify(value), '->', JSON.stringify(output));
  }

  // Walk only the given subtree (never the whole document).
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
        recomputeEffective(); // the UI language might have changed
        queueMicrotask(fullScan);
      }, { passive: true });
    }
  }

  async function loadSettings() {
    try {
      const stored = await api.storage.sync.get(DEFAULT_SETTINGS);
      settings = { ...DEFAULT_SETTINGS, ...stored };
    } catch (err) {
      console.warn(LOG_PREFIX, 'Could not read the options:', err);
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
