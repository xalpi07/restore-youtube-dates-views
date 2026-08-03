// Declarative data: default options and i18n.
// Files in the same content_script share scope, so these constants are
// available in utils.js and content.js without imports.

const DEFAULT_SETTINGS = Object.freeze({
  restoreDates: true,
  restoreViews: true,
  restoreSubscribers: true,
  debug: false,
  locale: 'auto', // 'auto' detects the language of YouTube's interface
});

const DEFAULT_LOCALE = 'es';

// Each language defines:
//   dateAdverb      → relative-date adverb ("hace", "ago"...).
//   adverbPosition  → 'before' ("hace 3 meses") or 'after' ("3 months ago").
//   units           → abbreviated token → { one, other } (singular / plural).
//   views           → K/M/B suffix → { one, other } where {n} is the number.
//   count           → { one, other } for plain counts below 1000 ("632 views").
//
// utils.js sorts the `units` tokens by length, so "min"/"sem" take priority
// over "m"/"s". The non-Spanish mappings are best-effort and only apply when
// the text matches EXACTLY, so they are harmless.
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
    count: { one: '{n} vista', other: '{n} vistas' },
    subscribers: {
      K: { one: '{n} mil suscriptores',             other: '{n} mil suscriptores' },
      M: { one: '{n} millón de suscriptores',       other: '{n} millones de suscriptores' },
      B: { one: '{n} mil millones de suscriptores', other: '{n} mil millones de suscriptores' },
    },
    subscribersCount: { one: '{n} suscriptor', other: '{n} suscriptores' },
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
    count: { one: '{n} view', other: '{n} views' },
    subscribers: {
      K: { one: '{n} thousand subscribers', other: '{n} thousand subscribers' },
      M: { one: '{n} million subscribers',  other: '{n} million subscribers' },
      B: { one: '{n} billion subscribers',  other: '{n} billion subscribers' },
    },
    subscribersCount: { one: '{n} subscriber', other: '{n} subscribers' },
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
    count: { one: '{n} visualização', other: '{n} visualizações' },
    subscribers: {
      K: { one: '{n} mil inscritos',      other: '{n} mil inscritos' },
      M: { one: '{n} milhão de inscritos',other: '{n} milhões de inscritos' },
      B: { one: '{n} bilhão de inscritos',other: '{n} bilhões de inscritos' },
    },
    subscribersCount: { one: '{n} inscrito', other: '{n} inscritos' },
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
    count: { one: '{n} vue', other: '{n} vues' },
    subscribers: {
      K: { one: '{n} mille abonnés',     other: '{n} mille abonnés' },
      M: { one: "{n} million d'abonnés", other: "{n} millions d'abonnés" },
      B: { one: "{n} milliard d'abonnés",other: "{n} milliards d'abonnés" },
    },
    subscribersCount: { one: '{n} abonné', other: '{n} abonnés' },
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
    count: { one: '{n} visualizzazione', other: '{n} visualizzazioni' },
    subscribers: {
      K: { one: '{n} mila iscritti',       other: '{n} mila iscritti' },
      M: { one: '{n} milione di iscritti', other: '{n} milioni di iscritti' },
      B: { one: '{n} miliardo di iscritti',other: '{n} miliardi di iscritti' },
    },
    subscribersCount: { one: '{n} iscritto', other: '{n} iscritti' },
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
    count: { one: '{n} Aufruf', other: '{n} Aufrufe' },
    subscribers: {
      K: { one: '{n} Tsd. Abonnenten', other: '{n} Tsd. Abonnenten' },
      M: { one: '{n} Mio. Abonnenten', other: '{n} Mio. Abonnenten' },
      B: { one: '{n} Mrd. Abonnenten', other: '{n} Mrd. Abonnenten' },
    },
    subscribersCount: { one: '{n} Abonnent', other: '{n} Abonnenten' },
  },
});

// YouTube SPA navigation events.
const YT_NAVIGATION_EVENTS = Object.freeze([
  'yt-navigate-finish',
  'yt-page-data-updated',
]);

const LOG_PREFIX = '[YT-Restore]';
