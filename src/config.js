/*
 * config.js — ALL DOM selectors and tunables live here.
 *
 * This file is loaded as a content script BEFORE content.js (see manifest
 * content_scripts order). Content-script files share one isolated-world global
 * scope, so anything assigned to `globalThis` here is visible in content.js.
 *
 * >>> VERIFY THESE SELECTORS against live wallhaven DevTools before trusting
 *     the button-injection path. See README "Selector assumptions". <<<
 */
globalThis.WQD_CONFIG = {
  selectors: {
    // The repeating thumbnail card on every listing grid (search / latest /
    // toplist / tag / collection). Wallhaven renders each as a <figure>.
    thumbnail: "figure.thumb",

    // Anchor INSIDE a thumbnail whose href is the wallpaper page: /w/{id}.
    // We parse {id} out of this href (see idFromHref regex below).
    link: "a.preview",

    // PNG badge INSIDE a thumbnail. Presence => source is a .png.
    // If absent we assume .jpg and let the background worker 404-fall back.
    pngBadge: ".thumb-info .png",

    // Fallback id source: attribute on the <figure> itself. Used only if the
    // link/href parse fails.
    idAttr: "data-wallpaper-id",

    // Element inside the thumbnail we anchor the overlay button to. Falls back
    // to the thumbnail element itself if not found.
    buttonAnchor: "figure.thumb"
  },

  // Pull the wallpaper id out of an href like https://wallhaven.cc/w/abc123
  idFromHref: /\/w\/([a-zA-Z0-9]+)/,

  // Full-resolution image URL template. {sub} = first 2 chars of id.
  // e.g. https://w.wallhaven.cc/full/ab/wallhaven-abc123.jpg
  fullUrl: (id, ext) =>
    `https://w.wallhaven.cc/full/${id.slice(0, 2)}/wallhaven-${id}.${ext}`,

  // Marker so we never inject two buttons on the same thumbnail.
  processedAttr: "data-wqd-done",

  // Default target resolution + behavior. Mirrored by options.js; the worker
  // reads the live values from chrome.storage.sync at click time.
  defaults: {
    targetW: 1920,
    targetH: 1080,
    jpegQuality: 0.95,
    // true => show Chrome's Save As dialog (which reopens at your last-used
    // folder). false => drop silently into the default Downloads folder.
    saveAs: true
  }
};
