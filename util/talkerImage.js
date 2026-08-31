/**
 * Talker photo preparation.
 *
 * Deliberately not reusing compressImageIfNeeded(): that pads the photo onto a
 * white square (wasting ~a third of the pixels, and therefore of the tokens the
 * check is billed for) and targets 1920px. A talker photo wants its real aspect
 * ratio and a ~1000px long edge - big enough that the sign's text stays
 * readable, small enough to keep the per-photo cost down.
 */

/** Long edge, in px, sent to the checker. The main cost lever. */
export const TARGET_LONG_EDGE = 1000;

/** Below this the source photo is too small to read a sign off. */
export const MIN_LONG_EDGE = 1000;

/** A "photo" smaller than this is a thumbnail or a broken capture. */
export const MIN_FILE_BYTES = 40 * 1024;

/**
 * Should this photo be rejected before it costs an upload and a check?
 * Pure so it can be tested without a DOM.
 *
 * Deliberately no blur detection - it false-rejects under dim aisle lighting,
 * and the checker's retake verdict covers genuinely unreadable photos.
 */
export function screenTalkerImage({ width, height, size }) {
  if (!width || !height) {
    return { ok: false, reason: "That file could not be read as an image." };
  }
  if (size != null && size < MIN_FILE_BYTES) {
    return {
      ok: false,
      reason: "That photo is too small to check. Take it with the camera.",
    };
  }
  if (Math.max(width, height) < MIN_LONG_EDGE) {
    return {
      ok: false,
      reason: `That photo is too low-resolution (${width}×${height}). Take a clearer one.`,
    };
  }
  return { ok: true };
}

/** Target size preserving aspect ratio; never upscales. */
export function targetDimensions(width, height, longEdge = TARGET_LONG_EDGE) {
  const max = Math.max(width, height);
  if (max <= longEdge) {
    return { width, height };
  }
  const scale = longEdge / max;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not read that image"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Screen and resize one talker photo.
 * Resolves { ok: false, reason } for a photo that fails the guard, or
 * { ok: true, file } with the resized JPEG.
 */
export async function prepareTalkerImage(file) {
  let img;
  try {
    img = await readImage(file);
  } catch (err) {
    return { ok: false, reason: err.message };
  }

  const screened = screenTalkerImage({
    width: img.width,
    height: img.height,
    size: file.size,
  });
  if (!screened.ok) {
    return screened;
  }

  const { width, height } = targetDimensions(img.width, img.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise((resolve) =>
    // High quality: the sign's text has to survive.
    canvas.toBlob(resolve, "image/jpeg", 0.85)
  );
  if (!blob) {
    return { ok: true, file };
  }

  const name = `${file.name.replace(/\.[^/.]+$/, "")}.jpg`;
  return {
    ok: true,
    file: new File([blob], name, {
      type: "image/jpeg",
      lastModified: Date.now(),
    }),
  };
}
