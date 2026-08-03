// Funciones puras de transformación. El reconocimiento se basa en el texto
// (regex), nunca en clases CSS. Cada función devuelve la cadena transformada
// o null si el texto no coincide con el patrón.

function getLocale(code = DEFAULT_LOCALE) {
  return LOCALES[code] ?? LOCALES[DEFAULT_LOCALE];
}

const _dateRegexCache = new Map();
let _viewsRegex = null;

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Ej. español: /^\s*hace\s+(\d+)\s+(min|sem|d|m|a|h|s)\s*$/i
// Anclado para que el nodo sea EXACTAMENTE una fecha relativa.
function getDateRegex(locale, code) {
  const cached = _dateRegexCache.get(code);
  if (cached) return cached;

  const tokens = Object.keys(locale.units)
    .sort((a, b) => b.length - a.length)
    .join('|');
  const regex = new RegExp(
    `^\\s*${escapeRegExp(locale.dateAdverb)}\\s+(\\d+)\\s+(${tokens})\\s*$`,
    'i',
  );
  _dateRegexCache.set(code, regex);
  return regex;
}

// Exige un espacio entre número y sufijo ("13 K"), de modo que "4K"
// (resolución de vídeo) no coincide. El decimal admite coma o punto.
function getViewsRegex() {
  if (_viewsRegex) return _viewsRegex;
  _viewsRegex = new RegExp(
    '^\\s*(\\d+(?:[.,]\\d+)?)\\s+([KMB])\\s*(?:de\\s+)?(?:vistas?|reproducciones?)?\\s*$',
    'i',
  );
  return _viewsRegex;
}

function transformDate(text, locale, code) {
  const match = getDateRegex(locale, code).exec(text);
  if (!match) return null;

  const amount = Number.parseInt(match[1], 10);
  const unit = locale.units[match[2].toLowerCase()];
  if (!unit) return null;

  return `${locale.dateAdverb} ${amount} ${amount === 1 ? unit.one : unit.other}`;
}

function transformViews(text, locale) {
  const match = getViewsRegex().exec(text);
  if (!match) return null;

  const number = match[1];
  const cfg = locale.views[match[2].toUpperCase()];
  if (!cfg) return null;

  const template = number === '1' ? cfg.one : cfg.other;
  return template.replace('{n}', number);
}

function transformText(text, settings) {
  const code = settings.locale ?? DEFAULT_LOCALE;
  const locale = getLocale(code);

  if (settings.restoreDates) {
    const date = transformDate(text, locale, code);
    if (date !== null) return date;
  }
  if (settings.restoreViews) {
    const views = transformViews(text, locale);
    if (views !== null) return views;
  }
  return null;
}

// Pre-filtro barato: sin dígitos no hay nada que transformar.
function isCandidateText(text) {
  return text.length > 0 && text.length < 40 && /\d/.test(text);
}
