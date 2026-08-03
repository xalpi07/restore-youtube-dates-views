// Datos declarativos: opciones por defecto e i18n.
// Los archivos del content_script comparten ámbito, así que estas constantes
// quedan disponibles en utils.js y content.js sin imports.

const DEFAULT_SETTINGS = Object.freeze({
  restoreDates: true,
  restoreViews: true,
  debug: false,
  locale: 'es',
});

const DEFAULT_LOCALE = 'es';

// Para añadir un idioma: replicar esta estructura con su código (en, pt, fr...).
// utils.js ordena los tokens de `units` por longitud, por lo que "min"/"sem"
// tienen prioridad sobre "m"/"s".
const LOCALES = Object.freeze({
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
});

// Eventos de navegación SPA de YouTube.
const YT_NAVIGATION_EVENTS = Object.freeze([
  'yt-navigate-finish',
  'yt-page-data-updated',
]);

const LOG_PREFIX = '[YT-Restaurar]';
