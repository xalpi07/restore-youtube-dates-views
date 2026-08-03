/**
 * utils.js
 * -----------------------------------------------------------------------------
 * Funciones puras de transformación de texto.
 *
 * Filosofía:
 *   - Cada función recibe una cadena y devuelve la cadena transformada, o
 *     `null` si el texto NO corresponde al patrón (así el llamador sabe que no
 *     debe tocar el nodo).
 *   - Son funciones puras: sin efectos secundarios, fáciles de testear.
 *   - El reconocimiento se basa 100% en el TEXTO (expresiones regulares),
 *     nunca en clases CSS ni en la estructura del DOM de YouTube.
 *
 * Depende de las constantes definidas en constants.js (LOCALES, DEFAULT_LOCALE).
 * -----------------------------------------------------------------------------
 */

/* -------------------------------------------------------------------------- */
/* Resolución de idioma                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Devuelve el diccionario del idioma pedido, con fallback al idioma por defecto.
 * @param {string} [code] Código de idioma (p. ej. "es").
 * @returns {object} Diccionario del locale.
 */
function getLocale(code = DEFAULT_LOCALE) {
  return LOCALES[code] ?? LOCALES[DEFAULT_LOCALE];
}

/* -------------------------------------------------------------------------- */
/* Cachés de expresiones regulares (se compilan una sola vez por idioma)      */
/* -------------------------------------------------------------------------- */

/** @type {Map<string, RegExp>} código de locale -> regex de fechas */
const _dateRegexCache = new Map();

/** @type {RegExp|null} regex de vistas (independiente del idioma de entrada) */
let _viewsRegex = null;

/**
 * Construye (y cachea) la expresión regular de fechas para un idioma.
 *
 * Patrón resultante (ejemplo español):
 *   ^\s*hace\s+(\d+)\s+(min|sem|d|m|a|h|s)\s*$
 *
 * - `^ ... $` obliga a que el nodo de texto sea EXACTAMENTE una fecha relativa,
 *   evitando falsos positivos dentro de frases largas.
 * - Los tokens se ordenan por longitud descendente para que "min" tenga
 *   prioridad sobre "m", y "sem" sobre "s".
 *
 * @param {object} locale Diccionario de idioma.
 * @param {string} code   Código del idioma (para la caché).
 * @returns {RegExp}
 */
function getDateRegex(locale, code) {
  const cached = _dateRegexCache.get(code);
  if (cached) return cached;

  const tokens = Object.keys(locale.units)
    .sort((a, b) => b.length - a.length) // más largos primero
    .join('|');

  // El adverbio ("hace") se escapa por si algún idioma trae caracteres especiales.
  const adverb = escapeRegExp(locale.dateAdverb);

  const regex = new RegExp(
    `^\\s*${adverb}\\s+(\\d+)\\s+(${tokens})\\s*$`,
    'i',
  );

  _dateRegexCache.set(code, regex);
  return regex;
}

/**
 * Construye (y cachea) la expresión regular de vistas.
 *
 * Patrón:
 *   ^\s*(\d+(?:[.,]\d+)?)\s+([KMB])\s*(?:de\s+)?(?:vistas?|reproducciones?)?\s*$
 *
 * Puntos clave:
 * - Exigimos AL MENOS un espacio entre el número y el sufijo (`\s+`). Así
 *   "13 K" (vistas) coincide, pero "4K" (una resolución de vídeo) NO, evitando
 *   corromper textos del reproductor.
 * - El decimal admite coma o punto ("2,4 K" / "2.4 K").
 * - El sufijo "vistas"/"reproducciones" es opcional, porque la nueva UI a
 *   veces muestra solo "13 K".
 *
 * @returns {RegExp}
 */
function getViewsRegex() {
  if (_viewsRegex) return _viewsRegex;
  _viewsRegex = new RegExp(
    '^\\s*(\\d+(?:[.,]\\d+)?)\\s+([KMB])\\s*(?:de\\s+)?(?:vistas?|reproducciones?)?\\s*$',
    'i',
  );
  return _viewsRegex;
}

/**
 * Escapa los metacaracteres de una cadena para usarla dentro de una RegExp.
 * @param {string} str
 * @returns {string}
 */
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* -------------------------------------------------------------------------- */
/* Transformaciones                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Restaura una fecha relativa abreviada a su forma larga.
 *   "hace 3 m" -> "hace 3 meses"
 *   "hace 1 a" -> "hace 1 año"
 *
 * @param {string} text  Texto del nodo.
 * @param {object} locale Diccionario de idioma.
 * @param {string} code   Código del idioma.
 * @returns {string|null} Texto restaurado o `null` si no aplica.
 */
function transformDate(text, locale, code) {
  const match = getDateRegex(locale, code).exec(text);
  if (!match) return null;

  const amount = Number.parseInt(match[1], 10);
  const token = match[2].toLowerCase();
  const unit = locale.units[token];
  if (!unit) return null; // seguridad extra

  const word = amount === 1 ? unit.one : unit.other;
  return `${locale.dateAdverb} ${amount} ${word}`;
}

/**
 * Restaura un contador de vistas abreviado a su forma larga.
 *   "13 K"   -> "13 mil vistas"
 *   "1 M"    -> "1 millón de vistas"
 *   "3,5 M"  -> "3,5 millones de vistas"
 *   "1 B"    -> "1 mil millones de vistas"
 *
 * Se considera singular únicamente cuando el número es exactamente "1"
 * (sin decimales), tal y como lo trata el español.
 *
 * @param {string} text   Texto del nodo.
 * @param {object} locale Diccionario de idioma.
 * @returns {string|null} Texto restaurado o `null` si no aplica.
 */
function transformViews(text, locale) {
  const match = getViewsRegex().exec(text);
  if (!match) return null;

  const number = match[1];              // conserva el formato original ("2,4")
  const suffix = match[2].toUpperCase(); // K | M | B
  const cfg = locale.views[suffix];
  if (!cfg) return null;

  const isSingular = number === '1';
  const template = isSingular ? cfg.one : cfg.other;
  return template.replace('{n}', number);
}

/**
 * Aplica, en orden y según las opciones activas, las transformaciones
 * disponibles a un texto. Devuelve la primera coincidencia o `null`.
 *
 * @param {string} text     Texto original del nodo.
 * @param {object} settings Opciones del usuario.
 * @returns {string|null}
 */
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

/**
 * Pre-filtro barato: descarta de inmediato los nodos de texto que no pueden
 * contener una fecha ni un contador (sin dígitos no hay nada que hacer).
 * Evita ejecutar las expresiones regulares completas sobre la mayoría del DOM.
 *
 * @param {string} text
 * @returns {boolean} true si el texto MERECE análisis completo.
 */
function isCandidateText(text) {
  // Debe tener al menos un dígito y una longitud razonable.
  // (Las fechas/vistas más largas rondan los ~30 caracteres.)
  return text.length > 0 && text.length < 40 && /\d/.test(text);
}
