# Chrome Web Store listing copy

Paste these into the Web Store developer dashboard when publishing. Nothing here
ships in the extension package.

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

This extension does not collect or transmit any personal data.

Unofficial — not affiliated with, or endorsed by, wallhaven.cc.
```

## Permission justifications

The dashboard asks for a justification per permission:

- **downloads** — Saves the cropped/scaled wallpaper to the user's computer via
  `chrome.downloads` when they click the download button.
- **storage** — Persists the user's target resolution and preferences via
  `chrome.storage.sync`.
- **Host `https://wallhaven.cc/*`** — The content script runs on wallhaven.cc
  listing pages to add the download button and read each wallpaper's id and
  format from the thumbnail.
- **Host `https://w.wallhaven.cc/*`** — The background worker fetches the
  full-resolution image bytes from w.wallhaven.cc to crop and scale them.

## Data use / privacy

Certify **"does not collect user data."** True — nothing leaves the browser
except the image fetch from wallhaven itself. Settings are stored locally via
`chrome.storage.sync`. No privacy-policy URL is required.

## Listing assets checklist

- [ ] At least one screenshot, 1280×800 or 640×400 (PNG/JPEG)
- [ ] Store icon 128×128 (can reuse `icons/icon128.png`)
- [ ] Category (e.g. Productivity or Photos)
- [ ] Language: English (default)
