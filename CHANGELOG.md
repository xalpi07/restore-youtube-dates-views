# Changelog

Todas las novedades relevantes de este proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

## [1.0.0] - 2025-01-01

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
