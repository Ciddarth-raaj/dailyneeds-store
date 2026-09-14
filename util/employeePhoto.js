/**
 * The employee photo: chosen in a browser, stored as a small data URI.
 *
 * WHY A DATA URI AND NOT A NEW UPLOAD SERVICE. `new_employee.employee_image`
 * already exists, is already on the employee-master editable allowlist, and
 * is already what `components/hr/EmployeeCard.jsx` and every avatar in the
 * application renders. The only thing missing was a way to PUT a photo
 * there. Inventing a bucket, a signed URL and a second identity for the same
 * picture would be a bigger change with a worse outcome: two places a photo
 * can live and a screen that has to know which.
 *
 * WHY IT IS RESIZED FIRST, AND NOT OPTIONAL. A modern phone camera produces
 * four to twelve megabytes, and base64 adds a third on top; the column would
 * take it and the profile request would then carry it on every read. The
 * picture is drawn onto a canvas at MAX_EDGE and re-encoded as JPEG, which
 * turns any input into something around thirty kilobytes. A photo whose
 * longest edge is already smaller is not upscaled.
 *
 * The canvas work has to happen in a browser. `resizeToDataUri` therefore
 * takes the File and is only called from a component; everything a test can
 * usefully check - the limits, the accepted types, the size of the result -
 * is a separate pure function below.
 */

/** The longest edge of the stored image, in pixels. A profile photo, not an asset. */
const MAX_EDGE = 512;

/** JPEG quality. 0.82 is where the artefacts stop being visible at this size. */
const QUALITY = 0.82;

/** What a file picker may offer, and what we will actually read. */
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

/** The largest file we will even attempt to read, before resizing. */
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

/**
 * The largest data URI we will send.
 *
 * Generous next to the ~30KB a 512px JPEG actually produces, so it is a
 * backstop against a pathological image rather than a limit anybody meets.
 */
const MAX_STORED_BYTES = 400 * 1024;

/** Why this file cannot be used, or null when it can. */
function rejectionReason(file) {
  if (!file) return "Choose an image file";
  if (file.size > MAX_SOURCE_BYTES) {
    return `That image is ${Math.round(file.size / (1024 * 1024))} MB. Choose one under ${
      MAX_SOURCE_BYTES / (1024 * 1024)
    } MB.`;
  }
  const type = String(file.type || "").toLowerCase();
  // An empty type is what some Android pickers report; the decode below is
  // the real check, so it is allowed through rather than refused on a guess.
  if (type !== "" && !ACCEPTED_TYPES.includes(type)) {
    return "That is not an image. Choose a JPEG, PNG or WebP.";
  }
  return null;
}

/** Target dimensions, preserving aspect ratio and never upscaling. */
function scaledDimensions(width, height, maxEdge = MAX_EDGE) {
  const w = Math.max(1, Math.round(Number(width) || 0));
  const h = Math.max(1, Math.round(Number(height) || 0));
  const longest = Math.max(w, h);
  if (longest <= maxEdge) return { width: w, height: h };
  const scale = maxEdge / longest;
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

/** Payload bytes of a data URI - the base64 part, not the string length. */
function dataUriBytes(dataUri) {
  const comma = String(dataUri || "").indexOf(",");
  if (comma < 0) return 0;
  const base64 = String(dataUri).slice(comma + 1);
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

/** Is this something we are willing to store in `employee_image`? */
function isStorablePhoto(dataUri) {
  if (typeof dataUri !== "string") return false;
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(dataUri)) return false;
  return dataUriBytes(dataUri) > 0 && dataUriBytes(dataUri) <= MAX_STORED_BYTES;
}

/**
 * A File -> a small JPEG data URI. Browser only.
 *
 * Rejects with a sentence a person can act on rather than a DOM error.
 */
function resizeToDataUri(file, { maxEdge = MAX_EDGE, quality = QUALITY } = {}) {
  return new Promise((resolve, reject) => {
    const refusal = rejectionReason(file);
    if (refusal) {
      reject(new Error(refusal));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("That image could not be read"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That image could not be opened"));
      img.onload = () => {
        try {
          const { width, height } = scaledDimensions(img.naturalWidth, img.naturalHeight, maxEdge);
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          // White behind it: a transparent PNG re-encoded as JPEG would
          // otherwise get a black background rather than none.
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const dataUri = canvas.toDataURL("image/jpeg", quality);
          if (!isStorablePhoto(dataUri)) {
            reject(new Error("That image is still too large after resizing. Try a different one."));
            return;
          }
          resolve(dataUri);
        } catch (err) {
          reject(new Error("That image could not be processed"));
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

module.exports = {
  MAX_EDGE,
  QUALITY,
  ACCEPTED_TYPES,
  MAX_SOURCE_BYTES,
  MAX_STORED_BYTES,
  rejectionReason,
  scaledDimensions,
  dataUriBytes,
  isStorablePhoto,
  resizeToDataUri,
};
