# Restaurar fechas y vistas de YouTube

Extensión de navegador que **restaura el formato largo** que YouTube abrevió en
su interfaz en español:

| YouTube muestra ahora | La extensión restaura      |
| --------------------- | -------------------------- |
| `hace 3 m`            | `hace 3 meses`             |
| `hace 1 a`            | `hace 1 año`               |
| `hace 8 d`            | `hace 8 días`              |
| `13 K`                | `13 mil vistas`            |
| `1 M`                 | `1 millón de vistas`       |
| `3,5 M`               | `3,5 millones de vistas`   |
| `1 B`                 | `1 mil millones de vistas` |

Compatible con **Google Chrome, Brave, Microsoft Edge y Firefox** usando
**Manifest V3**.

![Manifest V3](https://img.shields.io/badge/manifest-v3-blue)
![Navegadores](https://img.shields.io/badge/navegadores-Chrome%20%7C%20Brave%20%7C%20Edge%20%7C%20Firefox-informational)
![Licencia](https://img.shields.io/badge/licencia-MIT-green)

---

## Índice

- [Principio de diseño](#principio-de-diseño)
- [Arquitectura](#arquitectura)
- [Instalación (modo desarrollador)](#instalación-modo-desarrollador)
- [Empaquetado](#empaquetado)
- [Publicación en Chrome Web Store](#publicación-en-chrome-web-store)
- [Publicación en Firefox Add-ons (AMO)](#publicación-en-firefox-add-ons-amo)
- [Internacionalización](#internacionalización)
- [Rendimiento y robustez](#rendimiento-y-robustez)
- [Limitaciones conocidas](#limitaciones-conocidas)
- [Mantenimiento futuro](#mantenimiento-futuro)

---

## Principio de diseño

> **No dependemos de ninguna clase CSS de YouTube.**

YouTube cambia sus clases (`ytd-video-meta-block`, etc.) constantemente. Por eso
la extensión **reconoce el contenido por el texto** mediante expresiones
regulares y recorre **solo los nodos de texto**.

Mientras el texto siga la forma `hace X m` / `hace X a` / `hace X d` o
`13 K` / `2,5 M`, la extensión **seguirá funcionando aunque cambie el HTML**.

Solo se modifica `Text.nodeValue` (el texto visible). **Nunca** se toca el HTML,
ni se insertan/eliminan nodos, por lo que no se rompe YouTube.

---

## Arquitectura

```
yt-restaurar-fechas/
├── manifest.json     → Manifest V3 + browser_specific_settings (Firefox)
├── constants.js      → Datos declarativos: opciones por defecto + i18n (LOCALES)
├── utils.js          → Funciones PURAS de transformación (regex por texto)
├── content.js        → Content script: MutationObserver + SPA + storage
├── options.html      → Página de opciones (UI)
├── options.js        → Lógica de la página de opciones
├── style.css         → Estilos de la página de opciones
└── README.md         → Este documento
```

### Separación de responsabilidades

- **`constants.js`** — Solo datos. Añadir un idioma = añadir una entrada en
  `LOCALES`. Cero lógica.
- **`utils.js`** — Solo transformaciones puras (`transformDate`,
  `transformViews`, `transformText`). Fácilmente testeable en aislamiento.
- **`content.js`** — Orquestación: observa el DOM, procesa nodos nuevos, escucha
  la navegación SPA y las opciones.
- **`options.*`** — Configuración del usuario, independiente del content script.

### Flujo de datos

```
storage.sync ──▶ content.js (settings)
                     │
YouTube DOM ──▶ MutationObserver ──▶ scanSubtree ──▶ processTextNode
                                                          │
                                            utils.transformText (regex)
                                                          │
                                              Text.nodeValue = "…" (solo texto)
```

### Cómo funciona el observer (sin polling)

- Un **único** `MutationObserver` sobre `document.documentElement` con
  `childList`, `subtree` y `characterData`.
- En cada mutación:
  - `childList` → se escanea **solo el subárbol añadido** (scroll infinito).
  - `characterData` → se reprocesa **solo ese nodo** (YouTube reusa nodos).
- Un `WeakMap<Text, string>` guarda lo último que escribimos por nodo para:
  - no reprocesar,
  - **romper el bucle** que generaría el observer al detectar nuestra escritura,
  - permitir la **recolección de basura** (sin memory leaks).
- La navegación SPA se cubre escuchando `yt-navigate-finish` /
  `yt-page-data-updated`.

---

## Instalación (modo desarrollador)

### Chrome / Brave / Edge

1. Ve a `chrome://extensions` (Edge: `edge://extensions`).
2. Activa **Modo desarrollador**.
3. Pulsa **Cargar descomprimida** y selecciona la carpeta del proyecto.
4. Abre YouTube y recarga.

### Firefox

1. Ve a `about:debugging#/runtime/this-firefox`.
2. Pulsa **Cargar complemento temporal…**.
3. Selecciona el archivo `manifest.json`.
4. Abre YouTube y recarga.

> En Firefox, la carga temporal se elimina al cerrar el navegador (normal en
> desarrollo). Para instalación permanente hay que firmar el paquete en AMO.

---

## Empaquetado

No hay build ni dependencias: es JavaScript plano. Empaquetar = comprimir los
archivos (sin carpeta contenedora, el `manifest.json` debe quedar en la raíz del
ZIP).

```bash
# Desde dentro de la carpeta del proyecto
zip -r ../yt-restaurar-fechas.zip . -x "*.git*" "*.DS_Store"
```

El mismo ZIP sirve para Chrome Web Store y para AMO.

---

## Publicación en Chrome Web Store

1. Crea una cuenta de desarrollador en el
   [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   (pago único de registro).
2. **Subir nuevo elemento** → sube el ZIP.
3. Completa la ficha:
   - Descripción, capturas (1280×800), icono 128×128.
   - **Permisos**: solo `storage` (justifica que no se recopilan datos).
   - Política de privacidad (no se recogen datos personales).
4. Selecciona visibilidad (pública / no listada) y **Enviar a revisión**.
5. La revisión suele tardar de horas a pocos días.

> Sugerencia: añade iconos reales en la carpeta y decláralos en
> `manifest.json → "icons"` antes de publicar (Chrome los exige en la ficha).

---

## Publicación en Firefox Add-ons (AMO)

1. Crea una cuenta en [addons.mozilla.org](https://addons.mozilla.org/developers/).
2. **Enviar un nuevo complemento** → sube el ZIP.
3. Elige distribución **"En AMO"** (listado) o **"Autodistribución"** (self).
4. El `id` de Gecko ya está declarado en
   `manifest.json → browser_specific_settings.gecko.id`.
5. Mozilla valida y **firma** el paquete; sin firma, Firefox estable no instala
   complementos permanentes.

> `strict_min_version: 115.0` garantiza soporte de MV3 en Firefox ESR reciente.

---

## Internacionalización

La primera versión solo incluye **español (es-419)**. El diseño ya está
preparado para más idiomas:

1. Abre `constants.js`.
2. Añade una entrada en `LOCALES` (hay plantillas comentadas para `en`, `pt`,
   `fr`, `it`, `de`).
3. Rellena `dateAdverb`, `units` (singular/plural) y `views`.
4. No hace falta tocar `utils.js` ni `content.js`.

> Nota: idiomas con adverbio pospuesto (inglés: *"3 months ago"*) requieren una
> pequeña variante en la construcción de la regex de fechas; queda indicado en
> los comentarios de `constants.js`.

---

## Rendimiento y robustez

- **Sin polling**: todo se dispara por eventos (`MutationObserver` + eventos SPA).
- **Sin recorrer todo el DOM**: solo se escanean subárboles nuevos.
- **Pre-filtro barato** (`isCandidateText`): descarta nodos sin dígitos antes de
  ejecutar regex, que es la mayoría del DOM.
- **Regex cacheadas**: se compilan una sola vez por idioma.
- **`WeakMap`**: marca lo procesado y permite liberar memoria → apto para
  sesiones de horas sin degradar el rendimiento.
- **Sin flicker**: solo se reescribe el texto cuando cambia realmente.

---

## Limitaciones conocidas

- **Ambigüedad `M`**: `5 M` como *vistas* y `5 M` como *suscriptores* son
  idénticos en texto. Si un nodo contiene exactamente `5 M` sin más contexto,
  podría interpretarse como vistas. Puedes desactivar "Restaurar vistas" si te
  molesta en páginas de canal.
- **Resoluciones** tipo `4K` **no** se ven afectadas: la regex de vistas exige
  un espacio entre número y sufijo (`13 K`), que las resoluciones no tienen.
- Si YouTube cambiara el idioma de la UI, cambia también el locale en las
  opciones (previsto para futuras versiones con selector de idioma).

---

## Mantenimiento futuro

- **Si YouTube introduce nuevas abreviaturas** (p. ej. otra letra para semanas):
  basta con añadir el token en `LOCALES[...].units`. No se toca la lógica.
- **Si cambia el formato de vistas**: ajusta `getViewsRegex()` en `utils.js`.
- **Tests**: `utils.js` son funciones puras; se pueden testear con cualquier
  runner (Node, Vitest, Jest) importando las funciones o copiándolas a un
  entorno de test.
- **Versionado**: sube `version` en `manifest.json` en cada publicación.
- **Depuración**: activa "Mostrar logs en consola" en las opciones y filtra por
  `[YT-Restaurar]` en DevTools.

---

## Licencia

Distribuido bajo licencia [MIT](LICENSE). Adáptalo a tus necesidades.

El historial de versiones está en [CHANGELOG.md](CHANGELOG.md).
