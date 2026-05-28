# Chrome Web Store listing copy

Paste these into the Web Store developer dashboard when publishing. Nothing here
ships in the extension package. The description field is **plain text only** (no
Markdown/HTML) — bare URLs auto-link, so leave links unwrapped.

## Name

```
Wallhaven Quick Downloader
```

## Short description (max 132 chars)

```
One-click download of wallhaven.cc wallpapers, center-cropped and scaled to your target resolution.
```

## Detailed description

```
Wallhaven Quick Downloader adds a one-click download button to every thumbnail on wallhaven.cc listing pages. Click it to grab the full-resolution wallpaper, automatically center-cropped (cover) and scaled to your exact target resolution — no need to open each wallpaper page.

FEATURES
• One-click download from search, latest, toplist, tag, and collection grids
• Center-crop + scale to your target resolution (matches wallhaven's own crop)
• "Use my screen" auto-fills your display resolution
• Keeps the source format — PNG stays lossless, JPEG quality adjustable
• Works with infinite scroll
• Available in 11 languages (auto-detected from your browser)
• No account, no API key, no tracking — images are fetched only when you click

PERMISSIONS
• Downloads — to save the cropped image
• Storage — to remember your resolution and preferences
• Access to wallhaven.cc / w.wallhaven.cc — to read thumbnails and fetch the full image

OPEN SOURCE
Source code: https://github.com/aea555/wallhaven-quick-downloader

This extension does not collect or transmit any personal data.
Unofficial — not affiliated with, or endorsed by, wallhaven.cc.
```

## Link fields (render as proper links on the listing)

- **Homepage URL:** `https://github.com/aea555/wallhaven-quick-downloader`
- **Support URL:** `https://github.com/aea555/wallhaven-quick-downloader/issues`

## Privacy practices form (Gizlilik tab)

### Single purpose

```
Wallhaven Quick Downloader has a single purpose: let users download wallpapers from wallhaven.cc listing pages in one click, cropped and scaled to their chosen resolution. It adds a download button to each thumbnail; clicking it fetches the full-resolution image, center-crops and scales it to the user's target resolution, and saves it — without opening each wallpaper page.
```

### Permission justifications (max 1,000 chars each)

**downloads**
```
Used to save the processed (cropped and scaled) wallpaper to the user's computer via chrome.downloads.download when they click the download button. This is the extension's core action.
```

**storage**
```
Used to remember the user's preferences — target resolution, JPEG quality, and the "ask where to save" toggle — via chrome.storage.sync, so they persist across sessions and sync across the user's devices.
```

**Host permission**
```
Access to wallhaven.cc lets the content script run on listing pages to add the download button and read each wallpaper's ID and file type from the thumbnail. Access to w.wallhaven.cc lets the background service worker fetch the full-resolution image so it can be cropped and scaled. Requests go only to wallhaven's own servers, and only when the user clicks a download button. No data is sent to any third party.
```

### Remote code

Answer **No — does not use remote code.** All JavaScript is bundled in the
package; the font is a local file; fetching images from wallhaven is data, not
code. There is no eval(), no external scripts, and no remotely loaded modules.

### Data use

Certify **"does not collect user data."** Nothing leaves the browser except the
image fetch from wallhaven itself. Settings are stored locally via
`chrome.storage.sync`. No privacy-policy URL is required.

## Listing assets checklist

- [x] Screenshots, 1280×800 — `store-screenshot-1-grid.png`,
      `store-screenshot-2-popup.png`, `store-screenshot-3-popup-tr.png` (Turkish)
- [x] Store icon 128×128 — reuse `icons/icon128.png`
- [ ] Category (e.g. Productivity or Photos)
- [ ] Languages: English (default) + Turkish
