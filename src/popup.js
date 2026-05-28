/* popup.js — toolbar popup; read/write target resolution + behavior in chrome.storage.sync. */

const DEFAULTS = {
  targetW: 1920,
  targetH: 1080,
  jpegQuality: 0.95,
  saveAs: true
};

const $ = (id) => document.getElementById(id);

// Localize: set <html> lang/dir and fill every [data-i18n] element from the
// active locale (Chrome picks it from the browser/OS UI language). Missing keys
// fall back to the default locale, and we leave the English markup as-is.
function applyI18n() {
  const html = document.documentElement;
  const locale = chrome.i18n.getMessage("@@ui_locale");
  if (locale) html.lang = locale.replace("_", "-");
  const dir = chrome.i18n.getMessage("@@bidi_dir");
  if (dir) html.dir = dir; // "rtl" for Arabic etc.
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const msg = chrome.i18n.getMessage(el.getAttribute("data-i18n"));
    if (msg) el.textContent = msg;
  });
}

// Common display resolutions. screen.width * devicePixelRatio rounds
// imprecisely under fractional display scaling, so "Use my screen" can land a
// pixel or two off the real panel size (e.g. a 3840×2160 panel detected as
// 3841×2162 — wallhaven's own detector has the same quirk). If the raw reading
// is within a small tolerance of a standard resolution, we snap to it.
const COMMON_RESOLUTIONS = [
  [1280, 720], [1366, 768], [1280, 800], [1440, 900], [1536, 864],
  [1600, 900], [1680, 1050], [1920, 1080], [1920, 1200], [2048, 1152],
  [2560, 1080], [2560, 1440], [2560, 1600], [2880, 1800], [3072, 1920],
  [3200, 1800], [3440, 1440], [3840, 1080], [3840, 1600], [3840, 2160],
  [4096, 2160], [5120, 1440], [5120, 2160], [5120, 2880], [7680, 4320]
];

// Snap to the closest standard resolution if both axes are within 0.6%;
// otherwise keep the raw reading.
function snapResolution(w, h) {
  const TOL = 0.006;
  let best = null;
  let bestErr = Infinity;
  for (const [sw, sh] of COMMON_RESOLUTIONS) {
    const ew = Math.abs(w - sw) / sw;
    const eh = Math.abs(h - sh) / sh;
    if (ew <= TOL && eh <= TOL && ew + eh < bestErr) {
      bestErr = ew + eh;
      best = [sw, sh];
    }
  }
  return best ? { w: best[0], h: best[1] } : { w, h };
}

function showScreenInfo() {
  const rawW = Math.round(screen.width * window.devicePixelRatio);
  const rawH = Math.round(screen.height * window.devicePixelRatio);
  const { w, h } = snapResolution(rawW, rawH);
  $("screenInfo").textContent = `(${w} × ${h})`;
  return { w, h };
}

async function load() {
  applyI18n();
  const cfg = await chrome.storage.sync.get(DEFAULTS);
  $("targetW").value = cfg.targetW;
  $("targetH").value = cfg.targetH;
  $("jpegQuality").value = cfg.jpegQuality;
  $("saveAs").checked = cfg.saveAs;
  showScreenInfo();
}

// Persist silently. Invalid numbers are skipped (not written); an out-of-range
// JPEG quality is reset to the default.
async function save() {
  const targetW = parseInt($("targetW").value, 10);
  const targetH = parseInt($("targetH").value, 10);
  let jpegQuality = parseFloat($("jpegQuality").value);

  if (!Number.isFinite(targetW) || targetW <= 0 || !Number.isFinite(targetH) || targetH <= 0) {
    return;
  }
  if (!Number.isFinite(jpegQuality) || jpegQuality < 0.1 || jpegQuality > 1) {
    jpegQuality = DEFAULTS.jpegQuality;
    $("jpegQuality").value = jpegQuality;
  }

  await chrome.storage.sync.set({
    targetW,
    targetH,
    jpegQuality,
    saveAs: $("saveAs").checked
  });
  flashSaved();
}

// Briefly show the "Saved ✓" tick, then fade it out.
function flashSaved() {
  const el = $("saved");
  el.style.opacity = "1";
  clearTimeout(flashSaved._t);
  flashSaved._t = setTimeout(() => (el.style.opacity = "0"), 500);
}

$("useScreen").addEventListener("click", () => {
  const { w, h } = showScreenInfo();
  $("targetW").value = w;
  $("targetH").value = h;
  save();
});

// Auto-save on every change; no Save button. "change" fires on blur/enter for
// number inputs and on toggle for checkboxes.
["targetW", "targetH", "jpegQuality", "saveAs"].forEach((id) =>
  $(id).addEventListener("change", save)
);

document.addEventListener("DOMContentLoaded", load);
