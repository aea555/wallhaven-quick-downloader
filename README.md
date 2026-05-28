# Wallhaven Quick Downloader

A Manifest V3 Chrome extension that adds a one-click **"download cropped to my
resolution"** button to every thumbnail on wallhaven.cc listing pages (search,
latest, toplist, tag, collection).

Clicking the button fetches the **full-resolution** image, **center-crops** it
(cover) and scales it to your target resolution, and saves it — without ever
opening the wallpaper page. SFW only; no login / API key required.

> **Unofficial.** This is a community extension and is not affiliated with, or
> endorsed by, wallhaven.cc.

## Install (load unpacked)

1. Open `chrome://extensions` (also works in Edge/Brave: `edge://extensions`,
   `brave://extensions`).
2. Toggle **Developer mode** on (top-right).
3. Click **Load unpacked** and select this folder
   (`wallhaven-quick-downloader/`, the one containing `manifest.json`).
4. Click the extension's **toolbar icon** (pin it via the puzzle-piece menu) to
   open the settings popup, then set your **target resolution** (or click
   **Use my screen**). Settings auto-save — see [Settings](#settings-popup) for
   the rest.
5. Go to https://wallhaven.cc/ , hover a thumbnail, click the download button.

To reload after editing files: `chrome://extensions` → the extension's reload
icon. If you change `manifest.json` you must reload.

## How it works

- **content script** (`src/config.js` + `src/content.js`): finds thumbnails,
  injects an overlay button, extracts `{id, ext}`, and on click messages the
  background worker. A `MutationObserver` attaches buttons to thumbnails added
  by infinite scroll.
- **background service worker** (`src/background.js`): fetches the full image
  (cross-origin, `host_permissions`), decodes it with `createImageBitmap`,
  crops + scales on an `OffscreenCanvas`, re-encodes, and downloads via
  `chrome.downloads`.
- **popup** (`src/popup.html` + `src/popup.js`): the toolbar-button settings
  popup; stores target resolution / behavior in `chrome.storage.sync`.

### Settings (popup)

Everything auto-saves to `chrome.storage.sync` the moment you change it (no Save
button; a brief "Saved ✓" confirms):

- **Target resolution** (`tw × th`) — the size every download is cropped/scaled to.
- **Use my screen** — fills in `screen.width × devicePixelRatio` (etc.), snapped
  to the nearest standard resolution to correct the ±1–2px error that fractional
  display scaling introduces (e.g. a 4K panel reported as `3841×2162` → `3840×2160`).
  A genuinely non-standard reading is left as-is.
- **JPEG quality** (`0.1`–`1`, default `0.95`) — affects JPEG sources only; PNG
  output is always lossless.
- **Ask where to save** — on: opens Chrome's Save dialog each time; off: saves
  straight to Downloads.

**About the save location:** a Chrome extension can only save into Chrome's
default download directory (or a subfolder) — it can't target an arbitrary folder
or make the Save dialog reopen at your last-used folder. For fully silent
downloads, turn **off** "Ask where to save each file before downloading" in
`chrome://settings/downloads` *and* untick **Ask where to save** here. To collect
wallpapers elsewhere, set that folder as Chrome's default download location.

### Cropping

Cover center-crop: the largest centered region of the source matching your
target **aspect ratio** is kept, then scaled to your target `tw × th`. This
matches wallhaven's own crop behavior.

- **Output format matches source**: PNG → PNG (lossless), JPEG → JPEG
  (quality configurable, default `0.95`).
- **Always scales to your exact target**: smaller sources are upscaled to fill
  `tw × th` (a small source therefore looks softer).
- **Filename**: `wallhaven-{id}-{tw}x{th}.{ext}` — always your target size.

### Full image URL

`https://w.wallhaven.cc/full/{id[:2]}/wallhaven-{id}.{ext}` — `ext` is detected
from the thumbnail's PNG badge; if absent we try `.jpg` and fall back to `.png`
on a 404 (and vice-versa).

### MV3 note (blob → download)

`URL.createObjectURL` doesn't exist in a service worker, so we convert the
cropped blob to a `data:` URL with `FileReader` (which *does* work in a worker)
and hand that to `chrome.downloads`. Simple and self-contained; the trade-off is
base64 memory overhead for very large files. The alternative — the
`chrome.offscreen` API with a real `createObjectURL` — avoids the bloat but adds
an offscreen document + permission + lifecycle. See the comment at the top of
`src/background.js`.

### Localization

UI strings live in `_locales/<lang>/messages.json` and are loaded via Chrome's
`chrome.i18n` API, which **auto-selects the language from the browser/OS UI
locale** (no setting in the extension). English is the `default_locale` and the
fallback for any missing string.

Bundled languages: **English, Turkish, Spanish, Chinese (Simplified), Hindi,
Arabic (RTL), Portuguese, French, Russian, German, Japanese.** To add another,
copy `_locales/en/messages.json` to `_locales/<lang>/` and translate the
`message` values. The brand name (`appName`, `headerTitle`) is intentionally
left untranslated and falls back to English everywhere.

### Politeness

No prefetching. The full image is fetched **only when you click**, to avoid
tripping wallhaven's bot detection.

## Selectors

All DOM selectors live in **one place**: `src/config.js` (`WQD_CONFIG.selectors`),
so if wallhaven ever changes its markup, that's the only file to edit — nothing
downstream depends on the markup. Verified against a live listing page
(`https://wallhaven.cc/search`):

| Purpose | Selector | Status |
| --- | --- | --- |
| Thumbnail card (repeats per wallpaper) | `figure.thumb` | ✅ confirmed |
| Wallpaper link (source of `id`) | `a.preview` (href `…/w/{id}`) | ✅ confirmed |
| `id` attribute fallback | `data-wallpaper-id` on the figure | ✅ confirmed |
| Button anchor | `figure.thumb` | ✅ confirmed |
| PNG badge | `.thumb-info .png` | ⚠️ not directly observed; the `.jpg`→`.png` 404 fallback covers it regardless |

The **id-from-href** regex is `\/w\/([a-zA-Z0-9]+)`, and the **full image URL**
is `/full/{id[:2]}/wallhaven-{id}.{ext}`.

## Files

```
manifest.json
src/config.js       # all selectors + defaults (EDIT HERE to fix selectors)
src/content.js      # find thumbs, inject buttons, message worker
src/content.css     # button styling
src/background.js    # fetch + crop + download
src/popup.html      # toolbar-button settings popup (dark-purple theme)
src/popup.js
fonts/inter-variable.woff2  # bundled Inter (loaded via @font-face, offline)
icons/icon{16,48,128}.png   # extension icons
_locales/<lang>/messages.json   # UI translations (en is default + fallback)
package.ps1         # builds the Web Store upload zip (run: powershell -File package.ps1)
```
