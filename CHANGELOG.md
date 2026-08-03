# Changelog

Todas las novedades relevantes de este proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

## [1.1.3]

### Corregido

- Metadatos combinados en un solo nodo de texto (p. ej. las *watch cards* de
  búsqueda: `FromSoftware, Inc. • 683K • 8mo ago`). Ahora el texto se divide por
  el separador (• o ·) y se transforma cada pieza por separado.
- Se reconoce también el separador • (bullet), no solo · (middot).

## [1.1.2]

### Corregido

- Valores ambiguos `2K`/`4K`/`8K` que en realidad son vistas ahora se
  restauran cuando aparecen en la línea de metadatos de un vídeo (junto a una
  fecha, la palabra "vistas/views" o el separador ·). En el menú de calidad del
  reproductor se siguen dejando intactos como resolución.

## [1.1.1]

### Corregido

- Formatos sin espacios (interfaz en inglés y otras): `1mo ago` → `1 month ago`
  y `128K` → `128 thousand views`. El espacio entre número y unidad/sufijo
  ahora es opcional.
- Se sigue protegiendo `2K`/`4K`/`8K` (resoluciones de vídeo) y textos que no
  son vistas (p. ej. `5M subscribers`).

## [1.1.0]

### Añadido

- Soporte de semanas en español: `hace 3 sem` → `hace 3 semanas` (también
  admite el punto: `hace 3 sem.`).
- Motor multi-idioma real: español, inglés, portugués, francés, italiano y
  alemán, con adverbio antes o después de la fecha según el idioma.
- Detección automática del idioma de la interfaz de YouTube y selector de
  idioma en la página de opciones (opción "Automático").

## [1.0.0]

### Añadido

- Restauración de fechas relativas abreviadas: `hace 3 m` → `hace 3 meses`,
  `hace 1 a` → `hace 1 año`, `hace 8 d` → `hace 8 días` (también `s`, `min`,
  `h`, `sem`).
- Restauración de contadores de vistas: `13 K` → `13 mil vistas`,
  `1 M` → `1 millón de vistas`, `1 B` → `1 mil millones de vistas`.
- Página de opciones para activar/desactivar fechas, vistas y logs.
- `MutationObserver` único, sin polling, con procesamiento solo de nodos nuevos.
- Soporte de navegación SPA de YouTube.
- Compatibilidad con Chrome, Brave, Edge y Firefox (Manifest V3).
- Arquitectura i18n preparada para más idiomas.
