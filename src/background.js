/*
 * background.js — MV3 service worker. Does the heavy lifting:
 *   fetch full image -> Blob -> ImageBitmap -> OffscreenCanvas (cover crop +
 *   scale) -> convertToBlob -> download.
 *
 * MV3 gotcha & the choice made here
 * ---------------------------------
 * URL.createObjectURL does NOT exist in a service worker, so we can't make a
 * blob: URL to hand chrome.downloads.download. Two ways out:
 *   (A) FileReader.readAsDataURL(blob) -> data: URL (FileReader DOES work in a
 *       worker). Self-contained, no extra files. Cost: base64 inflates bytes
 *       ~33%, all held in memory, and very large wallpapers (tens of MB) make
 *       a correspondingly huge data: URL.
 *   (B) chrome.offscreen API: spin up an offscreen document that has a real DOM
 *       and URL.createObjectURL, pass it the blob, get back a blob: URL. No
 *       base64 bloat; more moving parts (extra html/js + permission + lifecycle).
 *
 * We use (A) for simplicity. For wallhaven's typical JPEGs and downscaled PNG
 * output this is comfortably fine. If you start downloading very large native
 * PNGs without downscaling and hit memory/size limits, switch to (B).
 */

const FULL_URL = (id, ext) =>
  `https://w.wallhaven.cc/full/${id.slice(0, 2)}/wallhaven-${id}.${ext}`;

const DEFAULTS = {
  targetW: 1920,
  targetH: 1080,
  jpegQuality: 0.95,
  saveAs: true
};

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.type !== "WQD_DOWNLOAD") return false;
  handleDownload(msg)
    .then((r) => sendResponse(r))
    .catch((err) => sendResponse({ ok: false, error: String(err && err.message ? err.message : err) }));
  // Keep the message channel open for the async response.
  return true;
});

async function handleDownload(msg) {
  const targetW = clampInt(msg.targetW, DEFAULTS.targetW);
  const targetH = clampInt(msg.targetH, DEFAULTS.targetH);
  const jpegQuality =
    typeof msg.jpegQuality === "number" ? msg.jpegQuality : DEFAULTS.jpegQuality;
  const saveAs = msg.saveAs !== undefined ? !!msg.saveAs : DEFAULTS.saveAs;

  // Fetch the full image, trying the detected ext first and falling back to the
  // other extension on a 404 (wallhaven only serves jpg or png).
  const { blob, ext } = await fetchFull(msg.id, msg.ext);

  // Decode -> crop/scale -> re-encode.
  const bitmap = await createImageBitmap(blob);
  const outBlob = await cropAndEncode(bitmap, targetW, targetH, ext, jpegQuality);
  bitmap.close();

  const dataUrl = await blobToDataURL(outBlob);
  const filename = `wallhaven-${msg.id}-${targetW}x${targetH}.${ext}`;

  const downloadId = await chrome.downloads.download({
    url: dataUrl,
    filename,
    saveAs
  });

  return { ok: true, downloadId, filename, width: targetW, height: targetH, ext };
}

/** Try detected ext, then the other one on 404. Returns the winning blob+ext. */
async function fetchFull(id, detectedExt) {
  const order = detectedExt === "png" ? ["png", "jpg"] : ["jpg", "png"];
  let lastErr = null;
  for (const ext of order) {
    const url = FULL_URL(id, ext);
    let resp;
    try {
      resp = await fetch(url, { credentials: "omit" });
    } catch (e) {
      lastErr = e;
      continue;
    }
    if (resp.ok) {
      return { blob: await resp.blob(), ext };
    }
    // 404 -> try the other extension; any other status is a hard error.
    if (resp.status !== 404) {
      throw new Error(`Fetch failed (${resp.status}) for ${url}`);
    }
    lastErr = new Error(`404 for ${url}`);
  }
  throw lastErr || new Error("Could not fetch full image");
}

/**
 * Cover center-crop + scale to exactly tw×th.
 *   - Compute the largest centered region of the source matching the target
 *     aspect ratio (this is the "cover" crop).
 *   - Scale that region to target tw×th (upscaling small sources as needed).
 */
async function cropAndEncode(bitmap, tw, th, ext, jpegQuality) {
  const W = bitmap.width;
  const H = bitmap.height;
  const targetAspect = tw / th;
  const sourceAspect = W / H;

  let cropW, cropH;
  if (sourceAspect > targetAspect) {
    // Source is relatively wider -> full height, crop the sides.
    cropH = H;
    cropW = Math.round(H * targetAspect);
  } else {
    // Source is relatively taller (or equal) -> full width, crop top/bottom.
    cropW = W;
    cropH = Math.round(W / targetAspect);
  }
  const sx = Math.round((W - cropW) / 2);
  const sy = Math.round((H - cropH) / 2);

  const canvas = new OffscreenCanvas(tw, th);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, cropW, cropH, 0, 0, tw, th);

  const type = ext === "png" ? "image/png" : "image/jpeg";
  const opts = type === "image/jpeg" ? { type, quality: jpegQuality } : { type };
  const outBlob = await canvas.convertToBlob(opts);
  return outBlob;
}

/** FileReader works in a service worker; URL.createObjectURL does not. */
function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("FileReader failed"));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

function clampInt(v, fallback) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, 30000); // sanity cap
}
