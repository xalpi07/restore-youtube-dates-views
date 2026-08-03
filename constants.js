// Datos declarativos: opciones por defecto e i18n.
// Los archivos del content_script comparten ámbito, así que estas constantes
// quedan disponibles en utils.js y content.js sin imports.

const DEFAULT_SETTINGS = Object.freeze({
  restoreDates: true,
  restoreViews: true,
  debug: false,
  locale: 'auto', // 'auto' detecta el idioma de la interfaz de YouTube
});

const DEFAULT_LOCALE = 'es';

// Cada idioma define:
//   dateAdverb      → adverbio de la fecha relativa ("hace", "ago"...).
//   adverbPosition  → 'before' ("hace 3 meses") o 'after' ("3 months ago").
//   units           → token abreviado → { one, other } (singular / plural).
//   views           → sufijo K/M/B → { one, other } con {n} = número original.
//
// utils.js ordena los tokens de `units` por longitud, por lo que "min"/"sem"
// tienen prioridad sobre "m"/"s". Los mapeos no españoles son de mejor esfuerzo
// y solo se aplican si el texto coincide EXACTAMENTE, por lo que son inocuos.
const LOCALES = Object.freeze({
  es: {
    dateAdverb: 'hace',
    adverbPosition: 'before',
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

  en: {
    dateAdverb: 'ago',
    adverbPosition: 'after',
    units: {
      s:  { one: 'second', other: 'seconds' },
      min:{ one: 'minute', other: 'minutes' },
      h:  { one: 'hour',   other: 'hours'   },
      d:  { one: 'day',    other: 'days'    },
      w:  { one: 'week',   other: 'weeks'   },
      mo: { one: 'month',  other: 'months'  },
      y:  { one: 'year',   other: 'years'   },
    },
    views: {
      K: { one: '{n} thousand views', other: '{n} thousand views' },
      M: { one: '{n} million views',  other: '{n} million views' },
      B: { one: '{n} billion views',  other: '{n} billion views' },
    },
  },

  pt: {
    dateAdverb: 'há',
    adverbPosition: 'before',
    units: {
      s:   { one: 'segundo', other: 'segundos' },
      min: { one: 'minuto',  other: 'minutos'  },
      h:   { one: 'hora',    other: 'horas'    },
      d:   { one: 'dia',     other: 'dias'     },
      sem: { one: 'semana',  other: 'semanas'  },
      m:   { one: 'mês',     other: 'meses'    },
      a:   { one: 'ano',     other: 'anos'     },
    },
    views: {
      K: { one: '{n} mil visualizações',      other: '{n} mil visualizações' },
      M: { one: '{n} milhão de visualizações',other: '{n} milhões de visualizações' },
      B: { one: '{n} bilhão de visualizações',other: '{n} bilhões de visualizações' },
    },
  },

  fr: {
    dateAdverb: 'il y a',
    adverbPosition: 'before',
    units: {
      s:   { one: 'seconde', other: 'secondes' },
      min: { one: 'minute',  other: 'minutes'  },
      h:   { one: 'heure',   other: 'heures'   },
      j:   { one: 'jour',    other: 'jours'    },
      sem: { one: 'semaine', other: 'semaines' },
      m:   { one: 'mois',    other: 'mois'     },
      a:   { one: 'an',      other: 'ans'      },
    },
    views: {
      K: { one: '{n} mille vues',    other: '{n} mille vues' },
      M: { one: '{n} million de vues', other: '{n} millions de vues' },
      B: { one: '{n} milliard de vues',other: '{n} milliards de vues' },
    },
  },

  it: {
    dateAdverb: 'fa',
    adverbPosition: 'after',
    units: {
      s:    { one: 'secondo',   other: 'secondi'   },
      min:  { one: 'minuto',    other: 'minuti'    },
      h:    { one: 'ora',       other: 'ore'       },
      g:    { one: 'giorno',    other: 'giorni'    },
      sett: { one: 'settimana', other: 'settimane' },
      m:    { one: 'mese',      other: 'mesi'      },
      a:    { one: 'anno',      other: 'anni'      },
    },
    views: {
      K: { one: '{n} mila visualizzazioni',      other: '{n} mila visualizzazioni' },
      M: { one: '{n} milione di visualizzazioni',other: '{n} milioni di visualizzazioni' },
      B: { one: '{n} miliardo di visualizzazioni',other: '{n} miliardi di visualizzazioni' },
    },
  },

  de: {
    dateAdverb: 'vor',
    adverbPosition: 'before',
    units: {
      Sek: { one: 'Sekunde', other: 'Sekunden' },
      Min: { one: 'Minute',  other: 'Minuten'  },
      Std: { one: 'Stunde',  other: 'Stunden'  },
      T:   { one: 'Tag',     other: 'Tagen'    },
      Wo:  { one: 'Woche',   other: 'Wochen'   },
      M:   { one: 'Monat',   other: 'Monaten'  },
      J:   { one: 'Jahr',    other: 'Jahren'   },
    },
    views: {
      K: { one: '{n} Tsd. Aufrufe', other: '{n} Tsd. Aufrufe' },
      M: { one: '{n} Mio. Aufrufe', other: '{n} Mio. Aufrufe' },
      B: { one: '{n} Mrd. Aufrufe', other: '{n} Mrd. Aufrufe' },
    },
  },
});

// Eventos de navegación SPA de YouTube.
const YT_NAVIGATION_EVENTS = Object.freeze([
  'yt-navigate-finish',
  'yt-page-data-updated',
]);

const LOG_PREFIX = '[YT-Restaurar]';
