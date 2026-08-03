// Funciones puras de transformación. El reconocimiento se basa en el texto
// (regex), nunca en clases CSS. Cada función devuelve la cadena transformada
// o null si el texto no coincide con el patrón.

function getLocale(code = DEFAULT_LOCALE) {
  return LOCALES[code] ?? LOCALES[DEFAULT_LOCALE];
}

const _dateRegexCache = new Map();
let _viewsRegex = null;

// Valores que en realidad son resoluciones de vídeo, no contadores de vistas.
// Solo se bloquean cuando aparecen "desnudos" (sin espacio ni la palabra
// "vistas/views"), p. ej. el menú de calidad muestra "4K".
const RESOLUTION_BLOCKLIST = new Set(['2K', '4K', '8K']);

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Fecha relativa, anclada para que el nodo sea EXACTAMENTE una fecha.
// Admite punto tras la abreviatura ("sem." → semanas) y el adverbio antes
// ("hace 3 sem") o después ("3 weeks ago"), según el idioma.
function getDateRegex(locale, code) {
  const cached = _dateRegexCache.get(code);
  if (cached) return cached;

  const tokens = Object.keys(locale.units)
    .sort((a, b) => b.length - a.length)
    .join('|');
  const adverb = escapeRegExp(locale.dateAdverb).replace(/\s+/g, '\\s+');
  // El espacio entre número y unidad es opcional: "hace 3 m" y "1mo ago".
  const unit = `(\\d+)\\s*(${tokens})\\.?`;
  const body = locale.adverbPosition === 'after'
    ? `${unit}\\s+${adverb}`
    : `${adverb}\\s+${unit}`;

  const regex = new RegExp(`^\\s*${body}\\s*$`, 'i');
  _dateRegexCache.set(code, regex);
  return regex;
}

// Grupos: 1) número  2) espacio (opcional)  3) sufijo K/M/B  4) palabra de
// vistas (opcional, multi-idioma). El decimal admite coma o punto. Si detrás
// del sufijo hay una palabra desconocida (p. ej. "subscribers"), no coincide.
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

// Los tokens pueden venir en distinta capitalización; resolvemos contra las
// claves reales de `units` (p. ej. "SEK" → "Sek").
function normalizeToken(raw, locale) {
  const lower = raw.toLowerCase();
  for (const key of Object.keys(locale.units)) {
    if (key.toLowerCase() === lower) return key;
  }
  return lower;
}

function transformViews(text, locale) {
  const match = getViewsRegex().exec(text);
  if (!match) return null;

  const number = match[1];
  const suffix = match[3].toUpperCase();
  const bare = match[2] === '' && !match[4]; // sin espacio ni palabra
  if (bare && RESOLUTION_BLOCKLIST.has(`${number}${suffix}`)) return null;

  const cfg = locale.views[suffix];
  if (!cfg) return null;

  const template = number === '1' ? cfg.one : cfg.other;
  return template.replace('{n}', number);
}

function transformText(text, settings) {
  const locale = getLocale(settings.locale ?? DEFAULT_LOCALE);
  const code = settings.locale ?? DEFAULT_LOCALE;

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

// Resuelve el código de idioma efectivo: 'auto' usa el idioma de la UI de
// YouTube (atributo lang del <html>), con respaldo al idioma por defecto.
function resolveLocaleCode(preference, uiLang) {
  if (preference && preference !== 'auto') {
    return LOCALES[preference] ? preference : DEFAULT_LOCALE;
  }
  const base = String(uiLang || '').toLowerCase().split('-')[0];
  return LOCALES[base] ? base : DEFAULT_LOCALE;
}
