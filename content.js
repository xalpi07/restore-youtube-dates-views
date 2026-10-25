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

  // Single ancestor scan (at most a few short textContent reads): tells which
  // count kind the surrounding metadata line implies, and whether it looks like
  // metadata at all. Only used for lone numbers that need context.
  function scanAncestors(node) {
    let el = node.parentElement;
    let subscribers = false;
    let videos = false;
    let metadata = false;
    for (let i = 0; i < 3 && el; i++, el = el.parentElement) {
      const text = el.textContent;
      if (!text || text.length >= 80) continue;
      if (!subscribers && hasSubscriberSignal(text)) subscribers = true;
      if (!videos && hasVideoSignal(text)) videos = true;
      if (!metadata && hasMetadataSignal(text)) metadata = true;
      if (subscribers && metadata) break;
    }
    return { subscribers, videos, metadata };
  }

  function processTextNode(node) {
    const value = node.nodeValue;
    if (!value || !isCandidateText(value)) return;
    if (lastOutputs.get(node) === value) return;

    // Kind implied by the node's own text (cheap regex, no DOM walk).
    let contextKind = hasSubscriberSignal(value) ? 'subscribers'
      : hasVideoSignal(value) ? 'videos' : null;
    let metadata = hasStrongMetadataSignal(value) || contextKind !== null;

    // Only walk ancestors for a lone number/count that needs context to be
    // classified. This keeps the common path free of expensive textContent reads.
    if (!metadata && needsContext(value)) {
      const ctx = scanAncestors(node);
      contextKind = ctx.subscribers ? 'subscribers' : ctx.videos ? 'videos' : null;
      metadata = ctx.metadata || contextKind !== null;
    }

    const output = transformMetadataText(value, effective, metadata, contextKind);
    if (output === null || output === value) return;

    // Expensive ancestor check runs only when we actually have a replacement,
    // so the player's constant time/caption updates stay cheap.
    if (isInInteractiveElement(node)) return;

    node.nodeValue = output; // only the visible text is changed, never the HTML
    lastOutputs.set(node, output);
    log('Restored:', JSON.stringify(value), '->', JSON.stringify(output));
  }

  // Runs a callback in idle time with a time budget. The setTimeout fallback
  // emulates a ~8 ms budget so it still yields on browsers without rIC.
  const runWhenIdle = typeof window.requestIdleCallback === 'function'
    ? (cb) => window.requestIdleCallback(cb, { timeout: 500 })
    : (cb) => {
        const start = Date.now();
        setTimeout(() => cb({ timeRemaining: () => Math.max(0, 8 - (Date.now() - start)) }), 16);
      };

  // Non-blocking scan pipeline. The observer only enqueues work; the actual DOM
  // walking happens in idle slices and yields every 64 nodes, so a large
  // insertion (a whole watch page) never blocks the main thread while the video
  // player is initializing. We do NOT observe characterData (it would make the
  // browser track the player's constant time/caption updates).
  const pendingRoots = [];   // subtrees queued to walk
  const pendingWalkers = []; // TreeWalkers paused mid-walk, to resume later
  let flushScheduled = false;

  function enqueueScan(root) {
    if (!root) return;
    pendingRoots.push(root);
    scheduleFlush();
  }

  function scheduleFlush() {
    if (flushScheduled) return;
    flushScheduled = true;
    runWhenIdle(flushWork);
  }

  // Kept name: schedules a full-document pass (used on load and SPA navigation).
  function scheduleFullScan() {
    enqueueScan(document.body);
  }

  // Processes text nodes from a walker until it finishes (true) or the time
  // budget runs out (false, so it can be resumed in a later slice).
  function drainWalker(walker, hasBudget) {
    let node;
    let count = 0;
    while ((node = walker.nextNode())) {
      processTextNode(node);
      if ((++count & 63) === 0 && !hasBudget()) return false;
    }
    return true;
  }

  function flushWork(deadline) {
    flushScheduled = false;
    const hasBudget = () =>
      !deadline || typeof deadline.timeRemaining !== 'function' || deadline.timeRemaining() > 3;

    while (pendingWalkers.length && hasBudget()) {
      if (drainWalker(pendingWalkers[0], hasBudget)) pendingWalkers.shift();
    }
    while (pendingRoots.length && hasBudget()) {
      const root = pendingRoots.shift();
      if (!root || root.isConnected === false) continue;
      if (root.nodeType === Node.TEXT_NODE) { processTextNode(root); continue; }
      if (root.nodeType !== Node.ELEMENT_NODE) continue;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      if (!drainWalker(walker, hasBudget)) pendingWalkers.push(walker);
    }

    if (pendingWalkers.length || pendingRoots.length) scheduleFlush();
  }

  // The observer stays trivial: enqueue inserted subtrees and return immediately.
  function onMutations(mutations) {
    for (const mutation of mutations) {
      for (const added of mutation.addedNodes) enqueueScan(added);
    }
  }

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(onMutations);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function registerSpaNavigation() {
    for (const eventName of YT_NAVIGATION_EVENTS) {
      document.addEventListener(eventName, () => {
        recomputeEffective(); // the UI language might have changed
        scheduleFullScan();
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
    scheduleFullScan();
  }

  function watchSettings() {
    if (!api.storage?.onChanged) return;
    api.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'sync') return;
      for (const [key, { newValue }] of Object.entries(changes)) {
        if (key in settings) settings[key] = newValue;
      }
      recomputeEffective();
      scheduleFullScan();
    });
  }

  function init() {
    startObserver();
    registerSpaNavigation();
    watchSettings();
    loadSettings();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', scheduleFullScan, { once: true });
    } else {
      scheduleFullScan();
    }
  }

  init();
})();
