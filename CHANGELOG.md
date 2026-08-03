# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project uses [Semantic Versioning](https://semver.org/).

## [1.1.9]

### Added

- Video counts are now expanded: `1.8 K videos` → `1.8 mil videos` (and the
  equivalents in the other languages). Works on channels, playlists and any
  section where a video count appears.
- New independent "Restore video counts" toggle on the options page.

## [1.1.8]

### Added

- New "Restore subscriber counts" toggle on the options page, independent from
  the view-count toggle.

## [1.1.7]

### Added

- Subscriber counts are now expanded with their own wording:
  `35.5 K suscriptores` → `35.5 mil suscriptores`,
  `82.2 M de suscriptores` → `82.2 millones de suscriptores`
  (and the equivalents in English, Portuguese, French and Italian). Detected by
  context, so the same number never becomes "views".

## [1.1.6]

### Fixed

- Subscriber counts were no longer converted to view counts (superseded by
  1.1.7, which expands them with the correct "subscribers" wording).

## [1.1.5]

### Fixed

- Compatibility with other extensions (e.g. Return YouTube Dislike). Text
  inside interactive widgets (buttons, `[role="button"]`, the like/dislike
  view-models, `contenteditable`) is now skipped. Rewriting a dislike counter
  caused an infinite update loop between extensions that froze the page and
  prevented videos from loading. View counts and dates are never inside these
  widgets, so nothing is lost.

## [1.1.4]

### Added

- Plain counts below one thousand views (e.g. `632` → `632 views`,
  `1` → `1 view`). They are only converted when the context confirms they are
  video metadata (a date or the word "views" is next to them), so years,
  resolutions and stray numbers are left untouched.

## [1.1.3]

### Fixed

- Combined metadata in a single text node (e.g. search "watch cards":
  `FromSoftware, Inc. • 683K • 8mo ago`). The text is now split by the
  separator (• or ·) and each piece is transformed independently.
- The • (bullet) separator is now recognized as well, not only · (middot).

## [1.1.2]

### Fixed

- Ambiguous values `2K`/`4K`/`8K` that are actually view counts are now
  restored when they appear in a video's metadata line (next to a date, the
  word "views" or the · separator). In the player quality menu they are still
  left untouched as a resolution.

## [1.1.1]

### Fixed

- Space-less formats (English UI and others): `1mo ago` → `1 month ago` and
  `128K` → `128 thousand views`. The space between number and unit/suffix is
  now optional.
- Still protects `2K`/`4K`/`8K` (video resolutions) and non-view text
  (e.g. `5M subscribers`).

## [1.1.0]

### Added

- Weeks support: `3 sem` → `3 semanas` (also accepts the dot: `3 sem.`).
- Real multi-language engine: Spanish, English, Portuguese, French, Italian and
  German, with the adverb before or after the date depending on the language.
- Automatic detection of YouTube's UI language and a language selector on the
  options page ("Automatic").

## [1.0.0]

### Added

- Restores abbreviated relative dates: `3 m` → `3 meses`, `1 a` → `1 año`,
  `8 d` → `8 días`.
- Restores view counts: `13K` → `13 thousand views`, `1M` → `1 million views`,
  `1B` → `1 billion views`.
- Options page to toggle dates, views and logs.
- A single, no-polling `MutationObserver` that only processes new nodes.
- YouTube SPA navigation support.
- Compatible with Chrome, Brave, Edge and Firefox (Manifest V3).
- i18n architecture ready for more languages.
