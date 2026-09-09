/**
 * Reports — the export download, executed.
 *
 *   node --test helper/reportExport.test.js
 *
 * ================================================== WHY THIS FILE EXISTS ====
 *
 * Excel and CSV exports were both broken in production. The fault was in the
 * backend - and finding that out meant first PROVING the frontend was not at
 * fault, because "the download does nothing" looks identical from the browser
 * whether the blob handling is wrong or the server died mid-response.
 *
 * The other Reports tests read source. That is enough for structure, and no
 * use at all here: whether `URL.createObjectURL` receives a real Blob, whether
 * a JSON error hidden inside a Blob is unwrapped, and whether an anchor is
 * clicked are questions about BEHAVIOUR. So this file compiles the real
 * `helper/report.js` and RUNS it against a stubbed axios and a stubbed DOM.
 *
 * What it pins, having been used to rule each of them out:
 *
 *   - the per-request `transformResponse` override really does replace the
 *     instance-wide one that JSON.parses every response (axios 0.21 merges
 *     this by replacement - checked, not assumed), so a Blob arrives intact
 *   - the request goes out as a POST asking for a blob
 *   - a 200 produces a real object URL and a clicked anchor
 *   - a refusal produces a TYPED error and NO download - so a 409 is never
 *     saved to disk as `report.xlsx` containing JSON
 *   - the object URL is revoked, but not before the click
 */
const test = require("node:test");
const assert = require("node:assert");
const path = require("path");
const Module = require("module");
const babel = require("@babel/core");

/* ------------------------------------------------------------- the stubs */

/** Records what was asked for, and answers with whatever the test scripted. */
function fakeApi() {
  return {
    calls: [],
    next: null,
    request(config) {
      this.calls.push(config);
      if (this.next instanceof Error) return Promise.reject(this.next);
      return Promise.resolve(this.next);
    },
  };
}

/** Enough of a Blob to be told apart from a string, and to be read back. */
class FakeBlob {
  constructor(parts, options) {
    this.parts = parts;
    this.type = (options && options.type) || "";
  }
  text() {
    return Promise.resolve(this.parts.join(""));
  }
}

/**
 * Load the REAL helper with `util/api` replaced. Compiled through the
 * project's own babel preset, so what runs is the shipped source rather than
 * a paraphrase of it.
 */
function loadHelper(api) {
  const file = path.join(__dirname, "report.js");
  const { code } = babel.transformFileSync(file, {
    presets: [["next/babel", {}]],
    configFile: false,
    babelrc: false,
  });

  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === "../util/api") return { __esModule: true, default: api };
    return originalLoad.apply(this, arguments);
  };
  try {
    const mod = new Module(file, null);
    mod.filename = file;
    mod.paths = Module._nodeModulePaths(path.dirname(file));
    mod._compile(code, file);
    return mod.exports;
  } finally {
    Module._load = originalLoad;
  }
}

/** A DOM that records the sequence, so ordering can be asserted. */
function fakeDom() {
  const events = [];
  global.Blob = FakeBlob;
  global.URL = {
    createObjectURL: (blob) => {
      events.push({ type: "createObjectURL", isBlob: blob instanceof FakeBlob });
      return "blob:report";
    },
    revokeObjectURL: (url) => events.push({ type: "revokeObjectURL", url }),
  };
  global.document = {
    createElement: (tag) => {
      const el = { tag, click: () => events.push({ type: "click", download: el.download, href: el.href }) };
      return el;
    },
    body: {
      appendChild: () => events.push({ type: "appendChild" }),
      removeChild: () => events.push({ type: "removeChild" }),
    },
  };
  return events;
}

/** The `setTimeout(..., 0)` the helper revokes on. */
const nextTick = () => new Promise((r) => setTimeout(r, 1));

/* ============================ a successful download ===================== */

test("A SUCCESSFUL XLSX EXPORT PRODUCES A REAL BLOB DOWNLOAD", async () => {
  const api = fakeApi();
  const helper = loadHelper(api).default;
  const events = fakeDom();

  api.next = {
    status: 200,
    data: new FakeBlob(["PK"], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    headers: { "content-disposition": 'attachment; filename="employee-master-2026-09-09.xlsx"' },
  };

  const result = await helper.exportXlsx({ template_id: 1 });

  // It asked the right route, the right way.
  const sent = api.calls[0];
  assert.strictEqual(sent.method, "POST");
  assert.strictEqual(sent.url, "/reports/employee-master/export/xlsx");
  assert.strictEqual(sent.responseType, "blob");
  assert.deepStrictEqual(sent.data, { template_id: 1 });
  // The override that stops the instance-wide JSON.parse mangling a Blob.
  assert.strictEqual(typeof sent.transformResponse[0], "function");
  const passthrough = sent.transformResponse[0];
  const blob = new FakeBlob(["x"]);
  assert.strictEqual(passthrough(blob), blob, "the transform must not touch the body");

  // The server's own filename won.
  assert.deepStrictEqual(result, { filename: "employee-master-2026-09-09.xlsx" });

  // A real Blob became an object URL, and the anchor was clicked.
  const created = events.find((e) => e.type === "createObjectURL");
  assert.ok(created, "createObjectURL must be called");
  assert.strictEqual(created.isBlob, true, "it must receive a Blob, not a string");
  const clicked = events.find((e) => e.type === "click");
  assert.ok(clicked, "the anchor must be clicked");
  assert.strictEqual(clicked.download, "employee-master-2026-09-09.xlsx");
  assert.strictEqual(clicked.href, "blob:report");
});

test("A SUCCESSFUL CSV EXPORT DOES THE SAME, ON ITS OWN ROUTE", async () => {
  const api = fakeApi();
  const helper = loadHelper(api).default;
  const events = fakeDom();

  api.next = {
    status: 200,
    data: new FakeBlob(["﻿Employee ID,Employee Name\r\n1,Ravi"], { type: "text/csv" }),
    headers: { "content-disposition": 'attachment; filename="employee-master.csv"' },
  };

  const result = await helper.exportCsv({ template_id: 1 });

  assert.strictEqual(api.calls[0].url, "/reports/employee-master/export/csv");
  assert.strictEqual(api.calls[0].responseType, "blob");
  assert.strictEqual(result.filename, "employee-master.csv");
  assert.strictEqual(events.find((e) => e.type === "click").download, "employee-master.csv");
});

test("THE FILENAME FALLS BACK WHEN Content-Disposition IS NOT READABLE", async () => {
  // Cross-origin, that header is invisible without an expose-headers rule. A
  // download called `download` with no extension is the symptom; each format
  // falls back to a name that at least opens in the right application.
  for (const [fn, expected] of [
    ["exportXlsx", "employee-master.xlsx"],
    ["exportCsv", "employee-master.csv"],
  ]) {
    const api = fakeApi();
    const helper = loadHelper(api).default;
    const events = fakeDom();
    api.next = { status: 200, data: new FakeBlob(["x"]), headers: {} };

    const result = await helper[fn]({ template_id: 1 });
    assert.strictEqual(result.filename, expected, fn);
    assert.strictEqual(events.find((e) => e.type === "click").download, expected, fn);
  }
});

test("the object URL is revoked, but only after the click", async () => {
  // Revoking before the browser has started reading cancels the download; not
  // revoking at all holds the whole file in memory for the page's lifetime.
  const api = fakeApi();
  const helper = loadHelper(api).default;
  const events = fakeDom();
  api.next = { status: 200, data: new FakeBlob(["x"]), headers: {} };

  await helper.exportCsv({});
  assert.ok(!events.some((e) => e.type === "revokeObjectURL"), "not revoked synchronously");

  await nextTick();
  const order = events.map((e) => e.type);
  assert.ok(
    order.indexOf("click") < order.indexOf("revokeObjectURL"),
    "the click must happen before the revoke"
  );
});

/* ============================ a refusal is not a file =================== */

test("A JSON ERROR RETURNED AS A BLOB BECOMES A TYPED ERROR, NOT A DOWNLOAD", async () => {
  // The instance resolves any status below 429, so a refusal arrives here as
  // a normal response whose body happens to be a Blob of JSON. Saving that to
  // disk as `report.xlsx` is the failure this prevents - somebody opens it in
  // six months and believes it.
  const cases = [
    [409, "FILTER_WIDENED", "The filters were widened"],
    [422, "TOO_MANY_ROWS", "Too many rows"],
    [403, "EXPORT_FORBIDDEN", "You do not have permission to export reports"],
  ];

  for (const [status, code, msg] of cases) {
    const api = fakeApi();
    const { default: helper, ReportExportError, REPORT_ERROR } = loadHelper(api);
    const events = fakeDom();

    api.next = {
      status,
      headers: {},
      data: new FakeBlob([JSON.stringify({ code: status, error: code, msg })], {
        type: "application/json",
      }),
    };

    await assert.rejects(
      () => helper.exportXlsx({ template_id: 1 }),
      (err) => {
        assert.ok(err instanceof ReportExportError, `${status} must be typed`);
        assert.strictEqual(err.code, code);
        assert.strictEqual(err.status, status);
        assert.strictEqual(err.message, msg, "the server's own words reach the user");
        return true;
      },
      String(status)
    );

    // The three the UI tells apart by name are the three it is given.
    assert.ok(Object.values(REPORT_ERROR).includes(code));

    // NOTHING was downloaded.
    assert.deepStrictEqual(events, [], `${status} must not produce a download`);
  }
});

test("a refusal whose body is not JSON still fails cleanly", async () => {
  // A gateway returning HTML, say. There is no code to act on, but there must
  // still be no file and no unhandled crash.
  const api = fakeApi();
  const { default: helper, ReportExportError } = loadHelper(api);
  const events = fakeDom();

  api.next = { status: 502, headers: {}, data: new FakeBlob(["<html>bad gateway</html>"]) };

  await assert.rejects(
    () => helper.exportCsv({}),
    (err) => {
      assert.ok(err instanceof ReportExportError);
      assert.strictEqual(err.code, null, "no invented code");
      assert.strictEqual(err.status, 502);
      return true;
    }
  );
  assert.deepStrictEqual(events, []);
});

test("a rejected request never fakes a download either", async () => {
  // Above 429 the instance's validateStatus rejects, so the error arrives as
  // a thrown axios error rather than a resolved response. It must propagate.
  const api = fakeApi();
  const helper = loadHelper(api).default;
  const events = fakeDom();

  api.next = Object.assign(new Error("Network Error"), { isAxiosError: true });

  await assert.rejects(() => helper.exportXlsx({}), /Network Error/);
  assert.deepStrictEqual(events, []);
});

test("THE EXPORT BODY IS PASSED THROUGH UNTOUCHED", async () => {
  // Whatever the screen resolved - a template id, or the expanded definition
  // with its columns and filters - is what is sent. The helper adds nothing
  // and drops nothing, so the export cannot describe a different report from
  // the preview.
  const api = fakeApi();
  const helper = loadHelper(api).default;
  fakeDom();
  api.next = { status: 200, data: new FakeBlob(["x"]), headers: {} };

  const body = {
    template_id: 1,
    field_keys: ["employee_id", "employee_name", "bank_name"],
    filters: {
      status: "active",
      outlet_ids: [2],
      department_ids: [],
      designation_ids: [],
      search: "",
      field_filters: [{ field: "bank_name", value: "State Bank of India" }],
    },
    acknowledge_widened_filters: true,
  };

  await helper.exportXlsx(body);
  assert.deepStrictEqual(api.calls[0].data, body);
});
