<div align="center">

# Restaurar fechas y vistas de YouTube

Extensión de navegador que devuelve el **formato largo** a las fechas y vistas
que YouTube abrevió en su interfaz.

![Manifest V3](https://img.shields.io/badge/manifest-v3-blue)
![Navegadores](https://img.shields.io/badge/Chrome%20·%20Brave%20·%20Edge%20·%20Firefox-informational)
![Idiomas](https://img.shields.io/badge/i18n-ES%20·%20EN%20·%20PT%20·%20FR%20·%20IT%20·%20DE-success)
![Licencia](https://img.shields.io/badge/licencia-MIT-green)

</div>

---

## ¿Qué hace?

YouTube empezó a mostrar fechas y vistas abreviadas. Esta extensión las
restaura automáticamente mientras navegas:

| YouTube muestra | La extensión restaura      |
| --------------- | -------------------------- |
| `hace 3 m`      | `hace 3 meses`             |
| `hace 1 a`      | `hace 1 año`               |
| `hace 8 d`      | `hace 8 días`              |
| `hace 3 sem`    | `hace 3 semanas`           |
| `13 K`          | `13 mil vistas`            |
| `1 M`           | `1 millón de vistas`       |
| `3,5 M`         | `3,5 millones de vistas`   |
| `1 B`           | `1 mil millones de vistas` |

Funciona en toda la plataforma: inicio, búsqueda, canal, suscripciones,
tendencias, historial, página de reproducción, Shorts, etc.

---

## Características

- **Basada en el texto, no en clases CSS.** El reconocimiento se hace con
  expresiones regulares sobre el contenido, así que sobrevive a los cambios de
  HTML de YouTube.
- **Solo modifica el texto visible** (`Text.nodeValue`); nunca altera el HTML,
  por lo que no rompe la página.
- **Sin polling.** Un único `MutationObserver` procesa únicamente los nodos
  nuevos o modificados.
- **Sin fugas de memoria.** Usa `WeakMap` para marcar lo ya procesado; los
  nodos eliminados se liberan solos.
- **Compatible con SPA.** Reacciona a la navegación interna de YouTube.
- **Multi-idioma.** Español, inglés, portugués, francés, italiano y alemán, con
  detección automática del idioma de la interfaz.
- **Multi-navegador.** Chrome, Brave, Edge y Firefox con el mismo código
  (Manifest V3).
- **Sin dependencias.** JavaScript puro.

---

## Instalación

> La extensión aún no está en las tiendas; se instala en modo desarrollador.

### Chrome · Brave · Edge

1. Descarga o clona este repositorio.
2. Abre `chrome://extensions` (en Edge, `edge://extensions`).
3. Activa el **Modo desarrollador**.
4. Pulsa **Cargar descomprimida** y selecciona la carpeta del proyecto.
5. Abre YouTube y recarga.

### Firefox

1. Abre `about:debugging#/runtime/this-firefox`.
2. Pulsa **Cargar complemento temporal…**.
3. Selecciona el archivo `manifest.json`.
4. Abre YouTube y recarga.

---

## Configuración

Abre la página de opciones de la extensión para ajustar:

- ☑ **Restaurar fechas completas** — `hace 3 m` → `hace 3 meses`.
- ☑ **Restaurar texto de vistas** — `13 K` → `13 mil vistas`.
- ☑ **Mostrar logs en consola** — útil para depurar (DevTools).
- **Idioma** — Automático (según YouTube) o uno fijo.

Los cambios se aplican al instante, sin recargar YouTube.

---

## Idiomas soportados

| Idioma     | Adverbio  | Ejemplo                       |
| ---------- | --------- | ----------------------------- |
| Español    | `hace`    | `hace 3 meses`                |
| English    | `ago`     | `3 months ago`                |
| Português  | `há`      | `há 3 meses`                  |
| Français   | `il y a`  | `il y a 3 mois`               |
| Italiano   | `fa`      | `3 mesi fa`                   |
| Deutsch    | `vor`     | `vor 3 Monaten`               |

Añadir un idioma es tan simple como agregar una entrada en `LOCALES`
(`constants.js`): adverbio, posición, unidades y plantillas de vistas. No hace
falta tocar la lógica.

---

## Estructura del proyecto

```
.
├── manifest.json        # Manifest V3 (+ ajustes de Firefox)
├── constants.js         # Opciones por defecto e i18n (LOCALES)
├── utils.js             # Transformaciones puras (regex por texto)
├── content.js           # MutationObserver + navegación SPA + storage
├── options.html/js      # Página de opciones
├── style.css            # Estilos de las opciones
├── icons/               # Iconos 16/32/48/128
└── tools/
    ├── make_icons.py    # Regenera los iconos
    └── package.py       # Empaqueta la extensión en dist/
```

### Cómo funciona (resumen)

```
YouTube DOM ─▶ MutationObserver ─▶ solo nodos nuevos ─▶ processTextNode
                                                              │
                                                transformText (regex, i18n)
                                                              │
                                                Text.nodeValue = "…"  (solo texto)
```

Un `WeakMap<Text, string>` recuerda la última salida por nodo para no
reprocesar y para evitar el bucle que provocaría el propio observer al detectar
la escritura.

---

## Empaquetado

Genera un ZIP con solo los archivos de ejecución (manifest en la raíz):

```bash
python tools/package.py     # → dist/yt-restaurar-fechas-v<versión>.zip
```

Para regenerar los iconos (requiere Pillow):

```bash
python tools/make_icons.py
```

---

## Contribuir

1. Haz un fork y crea una rama.
2. Mantén el estilo: JavaScript moderno, funciones pequeñas y sin dependencias.
3. Verifica la lógica de `utils.js` (son funciones puras, fáciles de probar).
4. Abre un Pull Request describiendo el cambio.

---

## Licencia

Distribuido bajo licencia [MIT](LICENSE). El historial de versiones está en
[CHANGELOG.md](CHANGELOG.md).
