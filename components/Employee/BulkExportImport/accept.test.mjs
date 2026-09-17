/**
 * node --test components/Employee/BulkExportImport/accept.test.mjs
 *
 * THE BUG THIS EXISTS FOR. Bulk Import shipped to production with
 *
 *   accept={{ "application/...sheet": [".xlsx"], ... }}
 *
 * which is react-dropzone 12+ syntax. This repo is on react-dropzone 11, whose
 * `attr-accept` does `accepts.split(",")` on whatever it is handed and throws
 * `TypeError: r.split is not a function` for an object. The throw happens
 * inside the drop / file-selection handler, so `onDropAccepted` never fired and
 * choosing a file did nothing whatsoever - no error, no preview, NO REACTION.
 *
 * NEITHER THE BUILD NOR ANY EXISTING TEST COULD SEE IT. `next build` does not
 * run the dropzone, lint does not know the prop's contract, and the feature's
 * other tests cover pure request-shaping. The only thing that would have caught
 * it is what this file does: take the prop value the component actually passes
 * and run the REAL `attr-accept` against it.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const accepts = require("attr-accept");
const attrAccept = accepts.default || accepts;

const SOURCE = fs.readFileSync(path.join(import.meta.dirname, "index.jsx"), "utf8");

/** The literal `accept=` value the component hands to FileUpload. */
function acceptProp() {
  const match = /accept=(\{[\s\S]*?\}\}|"[^"]*")/.exec(SOURCE);
  assert.ok(match, "no accept prop found on the FileUpload in this component");
  return match[1];
}

const XLSX = {
  name: "employee-bulk-2026-09-16.xlsx",
  type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

describe("the Bulk Import dropzone accepts the files it is given", () => {
  it("passes accept as a STRING, the only form react-dropzone 11 understands", () => {
    const prop = acceptProp();
    assert.ok(
      prop.startsWith('"'),
      `accept must be a string for react-dropzone 11; found ${prop.slice(0, 60)}`
    );
  });

  it("the real attr-accept accepts an exported .xlsx with that exact value", () => {
    // The end-to-end point: this is the file the export produces, checked by
    // the library that actually decides, using the component's own prop value.
    const value = JSON.parse(acceptProp());
    assert.equal(attrAccept(XLSX, value), true, "the exported .xlsx would be rejected");
  });

  it("also accepts .xls and .csv, and still rejects an unrelated file", () => {
    const value = JSON.parse(acceptProp());
    assert.equal(attrAccept({ name: "a.xls", type: "application/vnd.ms-excel" }, value), true);
    assert.equal(attrAccept({ name: "a.csv", type: "text/csv" }, value), true);
    assert.equal(attrAccept({ name: "a.pdf", type: "application/pdf" }, value), false);
  });

  it("REGRESSION: the object form throws rather than rejecting, which is why nothing happened", () => {
    // Pinned so the failure mode is documented as behaviour, not folklore: it
    // is not that the file was refused, it is that the handler threw.
    assert.throws(
      () =>
        attrAccept(XLSX, {
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
        }),
      /split is not a function/
    );
  });

  it("matches how every other FileUpload caller in this repo passes accept", () => {
    const root = path.join(import.meta.dirname, "..", "..", "..");
    const callers = [
      "pages/price-checker/index.jsx",
      "pages/master/distributors/index.jsx",
      "pages/sto/[mode].jsx",
    ];
    for (const file of callers) {
      const src = fs.readFileSync(path.join(root, file), "utf8");
      assert.match(
        src,
        /accept="[^"]*"/,
        `${file} was expected to pass accept as a string; the convention may have changed`
      );
    }
  });
});
