/*
 * content.js — runs on wallhaven.cc listing pages.
 *
 * Responsibilities:
 *   1. Find every thumbnail card.
 *   2. Inject a small overlay download button onto each (idempotently).
 *   3. On click: extract {id, ext} from the card, read the target resolution
 *      from storage, and message the background worker to do the actual
 *      fetch + crop + download.
 *   4. Watch the DOM (MutationObserver) so infinite-scroll thumbnails also get
 *      a button.
 *
 * All selectors come from WQD_CONFIG (config.js, loaded first).
 */
(() => {
  const CFG = globalThis.WQD_CONFIG;
  const S = CFG.selectors;

  // Localized string lookup (content scripts can use chrome.i18n). Falls back
  // to the key if a message is somehow missing.
  const t = (key, subs) => chrome.i18n.getMessage(key, subs) || key;

  // --- Inline SVG glyphs (no external assets needed) ---
  // Declared up top: the initial scan() below calls makeButton(), which uses
  // these. Declaring them at the bottom would hit the const temporal dead zone.
  const ICON_DOWNLOAD =
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.3a1 1 0 0 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.42l2.3 2.3V4a1 1 0 0 1 1-1Zm-7 14a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z"/></svg>';
  const ICON_CHECK =
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M9.55 17.05 4.5 12l1.4-1.4 3.65 3.6 8.15-8.15L19.1 7.5z"/></svg>';
  const ICON_ERROR =
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2 1 21h22zm0 6 7.5 13h-15zM11 10v5h2v-5zm0 6v2h2v-2z"/></svg>';
  const ICON_SPINNER =
    '<svg class="wqd-spin" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 0 10 10h-2a8 8 0 1 1-8-8z"/></svg>';

  /** Pull {id, ext} from a thumbnail <figure>. Returns null if id not found. */
  function extractInfo(thumb) {
    let id = null;

    const link = thumb.querySelector(S.link);
    if (link && link.href) {
      const m = link.href.match(CFG.idFromHref);
      if (m) id = m[1];
    }
    // Fallback: id attribute on the figure.
    if (!id) {
      const attr = thumb.getAttribute(S.idAttr);
      if (attr) id = attr;
    }
    if (!id) return null;

    // PNG badge present => png, else assume jpg (worker falls back on 404).
    const ext = thumb.querySelector(S.pngBadge) ? "png" : "jpg";
    return { id, ext };
  }

  /** Build the overlay button element with its little state machine. */
  function makeButton(info) {
    const btn = document.createElement("button");
    btn.className = "wqd-btn";
    btn.type = "button";
    btn.title = t("btnDownload");
    btn.setAttribute("aria-label", btn.title);
    btn.innerHTML = ICON_DOWNLOAD;

    btn.addEventListener("click", async (e) => {
      // Don't navigate to the wallpaper page; this button sits over a link.
      e.preventDefault();
      e.stopPropagation();
      if (btn.dataset.busy === "1") return;

      setState(btn, "loading");
      try {
        const cfg = await getTargetConfig();
        const res = await chrome.runtime.sendMessage({
          type: "WQD_DOWNLOAD",
          id: info.id,
          ext: info.ext,
          targetW: cfg.targetW,
          targetH: cfg.targetH,
          jpegQuality: cfg.jpegQuality,
          saveAs: cfg.saveAs
        });
        if (res && res.ok) {
          setState(btn, "done");
        } else {
          setState(btn, "error", (res && res.error) || t("downloadFailed"));
        }
      } catch (err) {
        setState(btn, "error", String(err && err.message ? err.message : err));
      }
    });

    return btn;
  }

  /** Visual feedback on the button. */
  function setState(btn, state, msg) {
    btn.classList.remove("wqd-loading", "wqd-done", "wqd-error");
    btn.dataset.busy = state === "loading" ? "1" : "0";
    if (state === "loading") {
      btn.classList.add("wqd-loading");
      btn.innerHTML = ICON_SPINNER;
      btn.title = t("btnDownloading");
    } else if (state === "done") {
      btn.classList.add("wqd-done");
      btn.innerHTML = ICON_CHECK;
      btn.title = t("btnSaved");
      // Revert to the download glyph after a moment.
      setTimeout(() => {
        btn.classList.remove("wqd-done");
        btn.innerHTML = ICON_DOWNLOAD;
        btn.title = t("btnDownload");
      }, 1600);
    } else if (state === "error") {
      btn.classList.add("wqd-error");
      btn.innerHTML = ICON_ERROR;
      btn.title = t("btnError", [msg || t("downloadFailed")]);
      console.warn("[Wallhaven Quick Downloader]", msg);
      setTimeout(() => {
        btn.classList.remove("wqd-error");
        btn.innerHTML = ICON_DOWNLOAD;
        btn.title = t("btnDownload");
      }, 2600);
    }
  }

  /** Read target resolution / behavior from storage, falling back to defaults. */
  async function getTargetConfig() {
    const d = CFG.defaults;
    const stored = await chrome.storage.sync.get({
      targetW: d.targetW,
      targetH: d.targetH,
      jpegQuality: d.jpegQuality,
      saveAs: d.saveAs
    });
    return stored;
  }

  /** Attach a button to one thumbnail if it doesn't already have one. */
  function processThumb(thumb) {
    if (thumb.getAttribute(CFG.processedAttr) === "1") return;
    const info = extractInfo(thumb);
    // Mark as processed regardless, so we don't re-scan dead cards every tick.
    thumb.setAttribute(CFG.processedAttr, "1");
    if (!info) return;

    const anchor = thumb.querySelector(S.buttonAnchor) || thumb;
    // The button is absolutely positioned; ensure the anchor is a containing block.
    const cs = getComputedStyle(anchor);
    if (cs.position === "static") anchor.style.position = "relative";
    anchor.appendChild(makeButton(info));
  }

  /** Scan a root for thumbnails. */
  function scan(root) {
    const nodes = (root || document).querySelectorAll(S.thumbnail);
    nodes.forEach(processThumb);
  }

  // Initial pass.
  scan(document);

  // Infinite scroll / dynamic loads: re-scan added subtrees.
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue; // elements only
        if (node.matches && node.matches(S.thumbnail)) {
          processThumb(node);
        } else if (node.querySelectorAll) {
          scan(node);
        }
      }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
