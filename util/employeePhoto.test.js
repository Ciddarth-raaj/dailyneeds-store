/**
 * The employee photo helper — the limits, not the canvas.
 *
 *   node --test util/employeePhoto.test.js
 *
 * `resizeToDataUri` needs a browser (FileReader, Image, canvas) and is
 * therefore not exercised here; everything it depends on to decide what is
 * acceptable is a pure function and is.
 */
const test = require("node:test");
const { describe, it } = test;
const assert = require("node:assert/strict");
const p = require("./employeePhoto");

describe("scaledDimensions", () => {
  it("fits the longest edge to the maximum and keeps the aspect ratio", () => {
    assert.deepEqual(p.scaledDimensions(4000, 3000), { width: 512, height: 384 });
    assert.deepEqual(p.scaledDimensions(3000, 4000), { width: 384, height: 512 });
    assert.deepEqual(p.scaledDimensions(1000, 1000), { width: 512, height: 512 });
  });

  it("never upscales a photo that is already small", () => {
    assert.deepEqual(p.scaledDimensions(200, 100), { width: 200, height: 100 });
  });

  it("never returns a zero edge, however extreme the ratio", () => {
    const { width, height } = p.scaledDimensions(10000, 3);
    assert.ok(width >= 1 && height >= 1);
  });
});

describe("rejectionReason", () => {
  it("accepts the image types a phone or a desktop will produce", () => {
    for (const type of p.ACCEPTED_TYPES) {
      assert.equal(p.rejectionReason({ type, size: 1024 }), null, type);
    }
  });

  it("refuses a file that is not an image at all", () => {
    assert.match(p.rejectionReason({ type: "application/pdf", size: 1024 }), /not an image/i);
  });

  it("lets an empty type through, because some Android pickers report none", () => {
    // The decode is the real check; refusing here would refuse valid photos.
    assert.equal(p.rejectionReason({ type: "", size: 1024 }), null);
  });

  it("refuses something too large to be worth reading at all", () => {
    assert.match(p.rejectionReason({ type: "image/jpeg", size: 40 * 1024 * 1024 }), /MB/);
  });

  it("refuses nothing at all", () => {
    assert.match(p.rejectionReason(null), /Choose an image/);
  });
});

describe("isStorablePhoto", () => {
  const uri = (bytes) => `data:image/jpeg;base64,${"A".repeat(Math.ceil((bytes * 4) / 3))}`;

  it("accepts a small JPEG data URI", () => {
    assert.equal(p.isStorablePhoto(uri(30 * 1024)), true);
  });

  it("refuses anything larger than the stored cap, so the column cannot be filled with a raw photo", () => {
    assert.equal(p.isStorablePhoto(uri(p.MAX_STORED_BYTES + 1024)), false);
  });

  it("refuses anything that is not an image data URI", () => {
    assert.equal(p.isStorablePhoto("https://example.com/a.jpg"), false);
    assert.equal(p.isStorablePhoto("data:text/html;base64,AAAA"), false);
    assert.equal(p.isStorablePhoto(""), false);
    assert.equal(p.isStorablePhoto(null), false);
  });

  it("its cap is far below what a raw camera photo would be", () => {
    assert.ok(p.MAX_STORED_BYTES < 1024 * 1024, "a stored photo is never a megabyte");
  });
});
