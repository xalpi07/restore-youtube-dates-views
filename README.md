<div align="center">

# Restore YouTube Dates &amp; Views

A browser extension that brings back the **long format** for the dates and view
counts that YouTube shortened in its interface.

![Manifest V3](https://img.shields.io/badge/manifest-v3-blue)
![Browsers](https://img.shields.io/badge/Chrome%20·%20Brave%20·%20Edge%20·%20Firefox-informational)
![Languages](https://img.shields.io/badge/i18n-ES%20·%20EN%20·%20PT%20·%20FR%20·%20IT%20·%20DE-success)
![License](https://img.shields.io/badge/license-MIT-green)

</div>

---

## What it does

YouTube started showing abbreviated dates and view counts. This extension
restores them automatically as you browse:

| YouTube shows  | The extension restores    |
| -------------- | ------------------------- |
| `3 m` / `3mo`  | `3 months ago`            |
| `1 a` / `1y`   | `1 year ago`              |
| `8 d` / `8d`   | `8 days ago`              |
| `3 sem` / `3w` | `3 weeks ago`             |
| `13K`          | `13 thousand views`       |
| `1M`           | `1 million views`         |
| `632`          | `632 views`               |
| `1B`           | `1 billion views`         |
| `35.5K` (subs) | `35.5 thousand subscribers` |

It works across the whole platform: home, search, channel, subscriptions,
trending, history, watch page, Shorts, etc.

> The default output language matches YouTube's interface. Examples above use
> English; in Spanish it produces `hace 3 meses`, `13 mil vistas`, and so on.

---

## Features

- **Text-based, not CSS-class based.** Recognition uses regular expressions on
  the content, so it survives YouTube's HTML changes.
- **Only changes the visible text** (`Text.nodeValue`); it never alters the
  HTML, so it can't break the page.
- **No polling.** A single `MutationObserver` processes only new or modified
  nodes.
- **No memory leaks.** Uses a `WeakMap` to mark processed nodes; removed nodes
  are freed automatically.
- **SPA-aware.** Reacts to YouTube's internal navigation.
- **Multi-language.** Spanish, English, Portuguese, French, Italian and German,
  with automatic detection of the interface language.
- **Cross-browser.** Chrome, Brave, Edge and Firefox from the same code
  (Manifest V3).
- **No dependencies.** Plain JavaScript.
- **Plays well with others.** Text inside interactive widgets (like/dislike
  buttons, etc.) is skipped, so it doesn't clash with extensions such as
  Return YouTube Dislike.

---

## Installation

> The extension is not on the stores yet; it is loaded in developer mode.

### Chrome · Brave · Edge

1. Download or clone this repository.
2. Open `chrome://extensions` (on Edge, `edge://extensions`).
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the project folder.
5. Open YouTube and reload.

### Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…**.
3. Select the `manifest.json` file.
4. Open YouTube and reload.

---

## Configuration

Open the extension's options page to adjust:

- ☑ **Restore full dates** — `3 mo. ago` → `3 months ago`.
- ☑ **Restore view counts** — `13K` → `13 thousand views`.
- ☑ **Restore subscriber counts** — `35.5K subscribers` → `35.5 thousand subscribers`.
- ☑ **Restore video counts** — `1.8K videos` → `1.8 thousand videos`.
- ☑ **Show logs in the console** — useful for debugging (DevTools).
- **Language** — Automatic (match YouTube) or a fixed one.

Changes apply instantly, without reloading YouTube.

---

## Supported languages

| Language   | Adverb   | Example         |
| ---------- | -------- | --------------- |
| Español    | `hace`   | `hace 3 meses`  |
| English    | `ago`    | `3 months ago`  |
| Português  | `há`     | `há 3 meses`    |
| Français   | `il y a` | `il y a 3 mois` |
| Italiano   | `fa`     | `3 mesi fa`     |
| Deutsch    | `vor`    | `vor 3 Monaten` |

Adding a language is as simple as adding an entry to `LOCALES`
(`constants.js`): adverb, position, units and view templates. No logic changes
required.

---

## Project structure

```
.
├── manifest.json        # Manifest V3 (+ Firefox settings)
├── constants.js         # Default options and i18n (LOCALES)
├── utils.js             # Pure transformations (text-based regex)
├── content.js           # MutationObserver + SPA navigation + storage
├── options.html/js      # Options page
├── style.css            # Options styles
├── icons/               # 16/32/48/128 icons
└── tools/
    ├── make_icons.py    # Regenerates the icons
    └── package.py       # Packages the extension into dist/
```

### How it works (summary)

```
YouTube DOM ─▶ MutationObserver ─▶ new nodes only ─▶ processTextNode
                                                          │
                                              transformText (regex, i18n)
                                                          │
                                              Text.nodeValue = "…"  (text only)
```

A `WeakMap<Text, string>` remembers the last output per node to avoid
reprocessing and to break the loop the observer would otherwise trigger when
detecting the write.

---

## Packaging

Build a ZIP with only the runtime files (manifest at the root):

```bash
python tools/package.py     # → dist/restore-youtube-dates-views-v<version>.zip
```

To regenerate the icons (requires Pillow):

```bash
python tools/make_icons.py
```

---

## Contributing

1. Fork the repo and create a branch.
2. Keep the style: modern JavaScript, small functions, no dependencies.
3. Verify the `utils.js` logic (pure functions, easy to test).
4. Open a Pull Request describing the change.

---

## License

Released under the [MIT](LICENSE) license. The version history is in
[CHANGELOG.md](CHANGELOG.md).
