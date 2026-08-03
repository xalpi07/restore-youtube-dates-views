// Pure text-transformation helpers. Recognition is based on the text (regex),
// never on CSS classes. Each function returns the transformed string, or null
// when the text does not match the pattern.

function getLocale(code = DEFAULT_LOCALE) {
  return LOCALES[code] ?? LOCALES[DEFAULT_LOCALE];
}

const _dateRegexCache = new Map();
let _viewsRegex = null;

// Values that are actually video resolutions, not view counts. They are only
// blocked when they appear "bare" (no space and no "views" word), e.g. the
// quality menu shows "4K".
const RESOLUTION_BLOCKLIST = new Set(['2K', '4K', '8K']);

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Relative date, anchored so the node is EXACTLY a date. Allows a trailing dot
// after the abbreviation ("sem." → weeks) and the adverb before the value
// ("hace 3 sem") or after it ("3 weeks ago"), depending on the language.
function getDateRegex(locale, code) {
  const cached = _dateRegexCache.get(code);
  if (cached) return cached;

  const tokens = Object.keys(locale.units)
    .sort((a, b) => b.length - a.length)
    .join('|');
  const adverb = escapeRegExp(locale.dateAdverb).replace(/\s+/g, '\\s+');
  // The space between number and unit is optional: "hace 3 m" and "1mo ago".
  const unit = `(\\d+)\\s*(${tokens})\\.?`;
  const body = locale.adverbPosition === 'after'
    ? `${unit}\\s+${adverb}`
    : `${adverb}\\s+${unit}`;

  const regex = new RegExp(`^\\s*${body}\\s*$`, 'i');
  _dateRegexCache.set(code, regex);
  return regex;
}

// Groups: 1) number  2) space (optional)  3) K/M/B suffix  4) views word
// (optional, multilingual). The decimal accepts a comma or a dot. If an unknown
// word follows the suffix (e.g. "subscribers"), it does not match.
function getViewsRegex() {
  if (_viewsRegex) return _viewsRegex;
  const words = 'vistas?|reproducciones?|views?|vues?|aufrufe|visualiza\\p{L}+';
  _viewsRegex = new RegExp(
    `^\\s*(\\d+(?:[.,]\\d+)?)(\\s*)([KMB])\\s*(?:de\\s+)?(${words})?\\s*$`,
    'iu',
  );
  return _viewsRegex;
}

function transformDate(text, locale, code) {
  const match = getDateRegex(locale, code).exec(text);
  if (!match) return null;

  const amount = Number.parseInt(match[1], 10);
  const unit = locale.units[normalizeToken(match[2], locale)];
  if (!unit) return null;

  const word = amount === 1 ? unit.one : unit.other;
  return locale.adverbPosition === 'after'
    ? `${amount} ${word} ${locale.dateAdverb}`
    : `${locale.dateAdverb} ${amount} ${word}`;
}

// Tokens may come in a different case; resolve them against the real keys of
// `units` (e.g. "SEK" → "Sek").
function normalizeToken(raw, locale) {
  const lower = raw.toLowerCase();
  for (const key of Object.keys(locale.units)) {
    if (key.toLowerCase() === lower) return key;
  }
  return lower;
}

// `metadata` means the context confirms this is a video's metadata line; only
// then do we convert ambiguous values (2K/4K/8K) and plain numbers (below
// 1000 views, e.g. "632").
function transformViews(text, locale, metadata = false) {
  const match = getViewsRegex().exec(text);
  if (match) {
    const number = match[1];
    const suffix = match[3].toUpperCase();
    const bare = match[2] === '' && !match[4]; // no space and no word
    if (!metadata && bare && RESOLUTION_BLOCKLIST.has(`${number}${suffix}`)) {
      return null;
    }
    const cfg = locale.views[suffix];
    if (!cfg) return null;
    return (number === '1' ? cfg.one : cfg.other).replace('{n}', number);
  }

  // Plain number (1-3 digits): only when the context confirms it is a count.
  if (metadata && locale.count) {
    const plain = /^\s*(\d{1,3})\s*$/.exec(text);
    if (plain) {
      const n = plain[1];
      return (n === '1' ? locale.count.one : locale.count.other).replace('{n}', n);
    }
  }
  return null;
}

// Is the text exactly an ambiguous value (2K/4K/8K) that could be either a
// resolution or a view count?
function isAmbiguousResolutionText(text) {
  const m = /^\s*(\d+)\s*([KMB])\s*$/i.exec(text);
  return !!m && RESOLUTION_BLOCKLIST.has(`${m[1]}${m[2].toUpperCase()}`);
}

// Is the text a plain 1-3 digit number (possible count below 1000)?
function isPlainCountText(text) {
  return /^\s*\d{1,3}\s*$/.test(text);
}

// Date adverbs and view words in several languages: a "strong" signal that the
// text is a video's metadata line.
const _strongSignalRegex =
  /(\bhace\b|\bago\b|\bh[áa]\b|il y a|\bfa\b|\bvor\b|vistas?|views?|vues?|aufrufe|reproducciones?|visualiza\p{L}+)/iu;

function hasStrongMetadataSignal(text) {
  return _strongSignalRegex.test(text);
}

// Same as above, but also accepting the · and • separators; used to inspect the
// text of a node's ancestors.
function hasMetadataSignal(text) {
  return /[·•]/.test(text) || hasStrongMetadataSignal(text);
}

// A single node may contain several pieces separated by • or ·, e.g.
// "683K • 8mo ago". Split on the separator (keeping it) and transform each
// piece independently. Returns the recomposed text, or null if nothing changed.
const _separatorRegex = /(\s*[·•]\s*)/;

function transformMetadataText(text, settings, allowResolution = false) {
  const parts = text.split(_separatorRegex);
  let changed = false;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part || !/\d/.test(part) || _separatorRegex.test(part)) continue;
    const result = transformSegment(part, settings, allowResolution);
    if (result !== null && result !== part) {
      parts[i] = result;
      changed = true;
    }
  }
  return changed ? parts.join('') : null;
}

// Transform a single piece (date or views). `allowResolution` allows converting
// 2K/4K/8K as views when the context confirms it is metadata.
function transformSegment(text, settings, allowResolution = false) {
  const code = settings.locale ?? DEFAULT_LOCALE;
  const locale = getLocale(code);

  if (settings.restoreDates) {
    const date = transformDate(text, locale, code);
    if (date !== null) return date;
  }
  if (settings.restoreViews) {
    const views = transformViews(text, locale, allowResolution);
    if (views !== null) return views;
  }
  return null;
}

function transformText(text, settings) {
  return transformSegment(text, settings, false);
}

// Cheap pre-filter: no digits, nothing to transform. The length cap discards
// descriptions/paragraphs but still lets combined metadata lines through
// ("Channel • 683K • 8mo ago").
function isCandidateText(text) {
  return text.length > 0 && text.length < 100 && /\d/.test(text);
}

// Resolve the effective language code: 'auto' uses YouTube's UI language (the
// <html> lang attribute), falling back to the default language.
function resolveLocaleCode(preference, uiLang) {
  if (preference && preference !== 'auto') {
    return LOCALES[preference] ? preference : DEFAULT_LOCALE;
  }
  const base = String(uiLang || '').toLowerCase().split('-')[0];
  return LOCALES[base] ? base : DEFAULT_LOCALE;
}
