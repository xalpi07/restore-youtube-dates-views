/**
 * constants.js
 * -----------------------------------------------------------------------------
 * Datos declarativos (constantes) de la extensión.
 *
 * IMPORTANTE sobre el diseño:
 *   - Aquí NO hay lógica: solo datos.
 *   - La internacionalización (i18n) se resuelve con un diccionario por idioma.
 *     Añadir un idioma nuevo = añadir una entrada más en `LOCALES`.
 *   - No dependemos de NINGUNA clase CSS de YouTube. Todo el reconocimiento se
 *     hace por el CONTENIDO del texto (ver utils.js).
 *
 * Los archivos de un mismo `content_scripts` comparten el mismo ámbito
 * (isolated world), por lo que estas constantes quedan disponibles en utils.js
 * y content.js sin necesidad de `import`.
 * -----------------------------------------------------------------------------
 */

/**
 * Configuración por defecto de las opciones del usuario.
 * Se sincroniza mediante `storage.sync`.
 * @type {{restoreDates: boolean, restoreViews: boolean, debug: boolean, locale: string}}
 */
const DEFAULT_SETTINGS = Object.freeze({
  restoreDates: true, // Restaurar "hace 3 m" -> "hace 3 meses"
  restoreViews: true, // Restaurar "13 K" -> "13 mil vistas"
  debug: false,       // Mostrar logs en consola
  locale: 'es',       // Idioma de los textos restaurados
});

/**
 * Idioma por defecto cuando el solicitado no existe.
 * @type {string}
 */
const DEFAULT_LOCALE = 'es';

/**
 * Diccionarios de idioma.
 *
 * Estructura de cada locale:
 *   dateAdverb: adverbio inicial de las fechas relativas ("hace", "há", ...).
 *   units:      mapa de token abreviado -> { one, other } (singular / plural).
 *               El ORDEN no importa aquí; utils.js ordena los tokens por
 *               longitud descendente para construir la expresión regular
 *               (así "min"/"sem" tienen prioridad sobre "m"/"s").
 *   views:      mapa de sufijo (K/M/B) -> { one, other } con la plantilla de
 *               salida. `{n}` se sustituye por el número original.
 *
 * Para agregar un idioma nuevo (English, Português, Français, Italiano,
 * Deutsch) basta con replicar esta estructura. Se dejan ejemplos comentados
 * al final como guía.
 */
const LOCALES = Object.freeze({
  /* ----------------------------- Español (es-419) ------------------------- */
  es: {
    dateAdverb: 'hace',
    units: {
      s:   { one: 'segundo', other: 'segundos' },
      min: { one: 'minuto',  other: 'minutos'  },
      h:   { one: 'hora',    other: 'horas'    },
      d:   { one: 'día',     other: 'días'     },
      sem: { one: 'semana',  other: 'semanas'  },
      m:   { one: 'mes',     other: 'meses'    },
      a:   { one: 'año',     other: 'años'     },
    },
    views: {
      K: { one: '{n} mil vistas',             other: '{n} mil vistas' },
      M: { one: '{n} millón de vistas',       other: '{n} millones de vistas' },
      B: { one: '{n} mil millones de vistas', other: '{n} mil millones de vistas' },
    },
  },

  /* ----------------------------------------------------------------------- */
  /* Plantillas para futuros idiomas. Descomentar y completar cuando se       */
  /* quieran habilitar. La lógica de utils.js/content.js NO necesita cambios. */
  /* ----------------------------------------------------------------------- */
  //
  // en: {
  //   dateAdverb: '', // El inglés usa "3 months ago" (adverbio pospuesto);
  //                   // requeriría una pequeña variante en utils.js.
  //   units: {
  //     s:   { one: 'second', other: 'seconds' },
  //     min: { one: 'minute', other: 'minutes' },
  //     h:   { one: 'hour',   other: 'hours'   },
  //     d:   { one: 'day',    other: 'days'    },
  //     w:   { one: 'week',   other: 'weeks'   },
  //     m:   { one: 'month',  other: 'months'  },
  //     y:   { one: 'year',   other: 'years'   },
  //   },
  //   views: {
  //     K: { one: '{n}K views', other: '{n}K views' },
  //     M: { one: '{n}M views', other: '{n}M views' },
  //     B: { one: '{n}B views', other: '{n}B views' },
  //   },
  // },
  //
  // pt: { dateAdverb: 'há', units: { /* segundo, minuto, hora, dia, semana, mês, ano */ }, views: { /* ... */ } },
  // fr: { dateAdverb: 'il y a', units: { /* ... */ }, views: { /* ... */ } },
  // it: { dateAdverb: '', units: { /* ... */ }, views: { /* ... */ } },
  // de: { dateAdverb: 'vor', units: { /* ... */ }, views: { /* ... */ } },
});

/**
 * Eventos internos que YouTube dispara al navegar como SPA.
 * Los usamos para volver a escanear tras cada navegación sin recarga.
 * @type {ReadonlyArray<string>}
 */
const YT_NAVIGATION_EVENTS = Object.freeze([
  'yt-navigate-finish',
  'yt-page-data-updated',
]);

/**
 * Prefijo para los mensajes de consola (facilita filtrar en DevTools).
 * @type {string}
 */
const LOG_PREFIX = '[YT-Restaurar]';
