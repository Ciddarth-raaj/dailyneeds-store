/**
 * All GRN -> "Search GRN No" finds a GRN on ANY date.
 *
 *   node --test components/grn/grnSearch.test.js
 *
 * The rules being pinned:
 *
 *   ANY DATE     with 02/10/2026 selected, searching 5972 shows GRN 5972 from
 *                September - the term goes to GET /grn/search with no date.
 *   SERVER SIDE  the page shows what the server returned, in its order (exact
 *                match first); it never filters the date list in the browser.
 *   DEBOUNCED    typing a number sends ONE request, not one per keystroke;
 *                Enter searches at once.
 *   CLEAR        × (or emptying the box) restores the date list for the SAME
 *                selected date and month, and drops `q` from the URL.
 *   SAME FLOW    a result opens through the existing /grn/view link.
 *   DATES        browsing by date works as before.
 *   SCOPE        a GRN the server does not return is never shown.
 *
 * The page is mounted for real - its hooks, its search bar, CustomContainer
 * and the column definitions. Only the router, the HTTP helper, the session
 * wrapper, the calendar widget and the ag-grid shell are stand-ins.
 */
const { describe, it, before, beforeEach, after, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const Module = require("module");

const { load, unavailable, root } = require("../../test_support/renderJsx");

const skip = unavailable ? { skip: `dependencies not installed: ${unavailable}` } : {};
const src = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------ fixtures -- */

// GRN history the "server" holds. 9999 stands for a GRN this user is not
// authorised to see: the server never returns it, so the page must not show it.
const HISTORY = [
  { mmh_mrc_refno: "6100", mmh_mrc_dt: "2026-10-02", supplier_name: "ACME", mmh_mrc_amt: 75, product_count: 1 },
  { mmh_mrc_refno: "6101", mmh_mrc_dt: "2026-10-01", supplier_name: "SUN", mmh_mrc_amt: 80, product_count: 2 },
  { mmh_mrc_refno: "5972", mmh_mrc_dt: "2026-09-18", supplier_name: "ACME", mmh_mrc_amt: 999, product_count: 3,
    verification: { status: "VERIFIED", verified_by_name: "Asha R", verified_at: "2026-09-19T05:00:00Z" } },
  { mmh_mrc_refno: "59721", mmh_mrc_dt: "2026-10-02", supplier_name: "SUN", mmh_mrc_amt: 50, product_count: 2 },
  { mmh_mrc_refno: "5901", mmh_mrc_dt: "2025-08-03", supplier_name: "SUN", mmh_mrc_amt: 120, product_count: 1 },
];
const OUT_OF_SCOPE = { mmh_mrc_refno: "9999", mmh_mrc_dt: "2026-10-02", supplier_name: "HIDDEN", mmh_mrc_amt: 1, product_count: 1 };

/* -------------------------------------------------------------- stubs --- */

const calls = { list: [], search: [], push: [], replace: [] };

const router = {
  isReady: true,
  pathname: "/grn",
  query: {},
  asPath: "/grn",
  push: (url) => {
    calls.push.push(url);
    return Promise.resolve(true);
  },
  replace: (url) => {
    calls.replace.push(url);
    router.query = { ...url.query };
    const qs = new URLSearchParams(url.query).toString();
    router.asPath = `/grn${qs ? `?${qs}` : ""}`;
    return Promise.resolve(true);
  },
};

const api = {
  getGrnList: async ({ from_date, to_date }) => {
    calls.list.push({ from_date, to_date });
    // The date list's server answers for the range asked - 9999 included, as
    // the out-of-scope GRN is only absent from what SEARCH may reveal.
    return {
      code: 200,
      data: [...HISTORY, OUT_OF_SCOPE].filter((g) => g.mmh_mrc_dt >= from_date && g.mmh_mrc_dt <= to_date && g !== OUT_OF_SCOPE),
    };
  },
  getGrnIssues: async () => ({ code: 200, data: { items: [], price_checker_items_by_product: {} } }),
  searchGrn: async (q) => {
    calls.search.push(q);
    if (api.searchFails) throw new Error("boom");
    const data = HISTORY.filter((g) => g.mmh_mrc_refno.startsWith(q)).sort(
      (a, b) => (b.mmh_mrc_refno === q) - (a.mmh_mrc_refno === q) || b.mmh_mrc_dt.localeCompare(a.mmh_mrc_dt)
    );
    return { code: 200, data, meta: { truncated: false } };
  },
  searchFails: false,
};

function stubModule(rel, exports) {
  const filename = rel.startsWith(".") || rel.startsWith("/")
    ? require.resolve(path.join(root, rel))
    : require.resolve(rel, { paths: [root] });
  const mod = new Module(filename);
  mod.filename = filename;
  mod.loaded = true;
  mod.exports = exports;
  require.cache[filename] = mod;
}

let dom = null;
function installDom() {
  if (dom) return;
  const { JSDOM } = require("jsdom");
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/grn", pretendToBeVisual: true });
  for (const key of ["window", "document", "navigator", "Element", "HTMLElement", "HTMLInputElement", "Node", "Event", "MouseEvent", "KeyboardEvent", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"]) {
    global[key] = key === "window" ? dom.window : dom.window[key];
  }
  global.localStorage = dom.window.localStorage;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  delete global.MessageChannel;
}

/* -------------------------------------------------------------- tests --- */

describe("All GRN search (mounted page)", skip, () => {
  let React;
  let ReactDOM;
  let act;
  let container;

  before(() => {
    installDom();
    React = require("react");
    ReactDOM = require("react-dom");
    ({ act } = require("react-dom/test-utils"));
    const h = React.createElement;

    stubModule("next/router", { useRouter: () => router, default: { push: router.push } });
    stubModule("./helper/grnList", api);
    stubModule("./components/globalWrapper/globalWrapper", { __esModule: true, default: ({ children }) => h("div", null, children) });
    // The grid shell: one row per record, clickable the way ag-grid's
    // onRowClicked is, showing the cells the column definitions produce.
    stubModule("./components/AgGrid", {
      __esModule: true,
      default: ({ rowData, columnDefs, gridOptions }) =>
        h("table", { "data-testid": "grid" },
          h("tbody", null, (rowData || []).map((row) =>
            h("tr", {
              key: row.mmh_mrc_refno,
              "data-refno": row.mmh_mrc_refno,
              onClick: () => gridOptions.onRowClicked({ data: row }),
            }, columnDefs.map((col, i) => {
              const value = col.valueGetter ? col.valueGetter({ data: row }) : row[col.field];
              return h("td", { key: col.colId || col.field || i, "data-col": col.colId || col.field }, value == null ? "" : String(value));
            }))
          ))),
    });
    stubModule("./components/grn/GrnMonthCalendar", {
      __esModule: true,
      default: ({ selectedDate, onSelectDate, viewingMonth }) =>
        h("div", { "data-testid": "calendar", "data-selected": selectedDate, "data-month": viewingMonth.format("YYYY-MM") },
          ["2026-10-01", "2026-10-02"].map((d) => h("button", { key: d, type: "button", "data-date": d, onClick: () => onSelectDate(d) }, d))),
    });
  });

  beforeEach(() => {
    calls.list.length = 0;
    calls.search.length = 0;
    calls.push.length = 0;
    calls.replace.length = 0;
    api.searchFails = false;
    router.query = { date: "2026-10-02" };
    router.asPath = "/grn?date=2026-10-02";
  });

  after(() => {
    if (dom) dom.window.close();
  });

  async function mountPage() {
    const Page = load("pages/grn/index.jsx");
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      ReactDOM.render(React.createElement(Page), container);
    });
    await settle();
  }

  /** Idempotent, and run after EVERY test: a failed assertion must not leave
   * an open modal animating, or the process never exits. */
  async function unmount() {
    if (!container) return;
    const node = container;
    container = null;
    await act(async () => {
      ReactDOM.unmountComponentAtNode(node);
    });
    node.remove();
    await sleep(50);
  }

  afterEach(() => unmount());

  /** Let pending promises and effects flush. */
  async function settle(ms = 0) {
    await act(async () => {
      await sleep(ms);
    });
    await act(async () => {
      await sleep(0);
    });
  }

  const input = () => container.querySelector("input[aria-label='Search GRN No']");
  const refnos = () => [...container.querySelectorAll("tr[data-refno]")].map((tr) => tr.getAttribute("data-refno"));
  const text = () => container.textContent;

  async function type(value) {
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(input(), value);
      input().dispatchEvent(new window.Event("input", { bubbles: true }));
    });
  }

  async function click(el) {
    await act(async () => {
      el.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    await settle();
  }

  it("shows the search box above the table with the agreed placeholder", async () => {
    await mountPage();
    assert.ok(input(), "a Search GRN No input");
    assert.equal(input().getAttribute("placeholder"), "Search GRN No");
    assert.equal(container.querySelector("button[aria-label='Clear GRN search']") === null, true, "no × while empty");
    const order = [...container.querySelectorAll("input[aria-label='Search GRN No'], [data-testid=grid]")];
    assert.equal(order[0] === input(), true, "the box comes before the table");
    await unmount();
  });

  it("existing date browsing still works and makes no search request", async () => {
    await mountPage();
    assert.deepEqual([...refnos()].sort(), ["59721", "6100"]);
    assert.match(text(), /All GRN \(02\/10\/2026\)/);

    await click(container.querySelector("button[data-date='2026-10-01']"));
    assert.deepEqual(refnos(), ["6101"]);
    assert.match(text(), /All GRN \(01\/10\/2026\)/);
    assert.equal(router.query.date, "2026-10-01");
    assert.deepEqual(calls.search, []);
    await unmount();
  });

  it("finds GRN 5972 from September while 02/10/2026 is selected", async () => {
    await mountPage();
    await type("5972");
    await settle(450);

    assert.deepEqual(calls.search, ["5972"]);
    assert.equal(refnos()[0], "5972");
    const row = container.querySelector("tr[data-refno='5972']");
    assert.equal(row.querySelector("[data-col=mmh_mrc_dt]").textContent, "2026-09-18");
    assert.equal(row.querySelector("[data-col=supplier_name]").textContent, "ACME");
    assert.equal(row.querySelector("[data-col=verification_status]").textContent, "Verified");
    assert.equal(row.querySelector("[data-col=verified_by]").textContent, "Asha R");
    assert.match(text(), /Search GRN No "5972" \(all dates\)/);
    // The selected date is untouched underneath, and the URL carries both.
    assert.equal(container.querySelector("[data-testid=calendar]").getAttribute("data-selected"), "2026-10-02");
    assert.deepEqual(router.query, { date: "2026-10-02", q: "5972" });
    // No date-list request was widened to look for it.
    assert.ok(calls.list.every((c) => c.from_date === "2026-10-01" && c.to_date === "2026-10-31"));
    await unmount();
  });

  it("puts the exact GRN first, as the server ranked it", async () => {
    await mountPage();
    await type("5972");
    await settle(450);
    assert.deepEqual(refnos(), ["5972", "59721"]);
    await unmount();
  });

  it("a partial number lists every match across months and years", async () => {
    await mountPage();
    await type("59");
    await settle(450);
    assert.deepEqual(refnos(), ["59721", "5972", "5901"]);
    await unmount();
  });

  it("typing sends one request after the pause, not one per keystroke", async () => {
    await mountPage();
    for (const partial of ["5", "59", "597", "5972"]) {
      await type(partial);
      await settle(60);
    }
    assert.deepEqual(calls.search, [], "nothing while still typing");
    await settle(450);
    assert.deepEqual(calls.search, ["5972"]);
    await unmount();
  });

  it("Enter searches at once", async () => {
    await mountPage();
    await type("5972");
    await act(async () => {
      input().dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    await settle();
    assert.deepEqual(calls.search, ["5972"]);
    assert.equal(refnos()[0], "5972");
    await settle(450);
    assert.deepEqual(calls.search, ["5972"], "the debounce does not repeat it");
    await unmount();
  });

  it("× restores the date list for the SAME date, and drops q from the URL", async () => {
    await mountPage();
    await click(container.querySelector("button[data-date='2026-10-01']"));
    await type("5972");
    await settle(450);
    assert.deepEqual(refnos(), ["5972", "59721"]);

    await click(container.querySelector("button[aria-label='Clear GRN search']"));

    assert.equal(input().value, "");
    assert.deepEqual(refnos(), ["6101"]);
    assert.match(text(), /All GRN \(01\/10\/2026\)/);
    assert.equal(container.querySelector("[data-testid=calendar]").getAttribute("data-selected"), "2026-10-01");
    assert.equal(container.querySelector("[data-testid=calendar]").getAttribute("data-month"), "2026-10");
    assert.deepEqual(router.query, { date: "2026-10-01" });
    await unmount();
  });

  it("emptying the box by hand restores the date list too", async () => {
    await mountPage();
    await type("5972");
    await settle(450);
    await type("");
    await settle();
    assert.deepEqual([...refnos()].sort(), ["59721", "6100"]);
    assert.match(text(), /All GRN \(02\/10\/2026\)/);
    await unmount();
  });

  it("opening a result uses the existing GRN detail link, and Back returns to the search", async () => {
    await mountPage();
    await type("5972");
    await settle(450);
    await click(container.querySelector("tr[data-refno='5972']"));

    assert.equal(calls.push.length, 1);
    const url = calls.push[0];
    assert.match(url, /^\/grn\/view\?refno=5972&from=/);
    const from = decodeURIComponent(url.split("from=")[1]);
    assert.equal(from, "/grn?date=2026-10-02&q=5972");
    await unmount();
  });

  it("normal date-list rows still open the same detail link", async () => {
    await mountPage();
    await click(container.querySelector("tr[data-refno='6100']"));
    assert.equal(calls.push[0], `/grn/view?refno=6100&from=${encodeURIComponent("/grn?date=2026-10-02")}`);
    await unmount();
  });

  it("arriving with ?q= (Back from a GRN) shows that search again", async () => {
    router.query = { date: "2026-10-02", q: "5972" };
    router.asPath = "/grn?date=2026-10-02&q=5972";
    await mountPage();
    await settle(450);
    assert.equal(input().value, "5972");
    assert.equal(refnos()[0], "5972");
    assert.equal(container.querySelector("[data-testid=calendar]").getAttribute("data-selected"), "2026-10-02");
    await unmount();
  });

  it("a GRN the server does not return is never shown, even when it is on the selected day", async () => {
    await mountPage();
    await type("9999");
    await settle(450);
    assert.deepEqual(calls.search, ["9999"]);
    assert.deepEqual(refnos(), []);
    assert.ok(!/HIDDEN/.test(text()));
    assert.match(text(), /No GRN found with a GRN No starting with "9999"/);
    await unmount();
  });

  it("a failed search says so and shows no rows", async () => {
    api.searchFails = true;
    await mountPage();
    await type("5972");
    await settle(450);
    assert.deepEqual(refnos(), []);
    assert.match(text(), /Could not search GRNs/);
    await unmount();
  });

  it("picking a date while searching goes back to browsing that date", async () => {
    await mountPage();
    await type("5972");
    await settle(450);
    await click(container.querySelector("button[data-date='2026-10-01']"));
    assert.equal(input().value, "");
    assert.deepEqual(refnos(), ["6101"]);
    await unmount();
  });
});

describe("All GRN search (source)", () => {
  const page = src("pages/grn/index.jsx");
  const helper = src("helper/grnList.js");
  const hook = src("customHooks/useGrnSearch.js");

  it("searches on the server, with the term only", () => {
    assert.match(helper, /API\.get\("\/grn\/search", \{ params: \{ q \} \}\)/);
    assert.match(hook, /searchGrn\(term\)/);
  });

  it("never filters the date list in the browser to search", () => {
    assert.ok(!/grnList[\s\S]{0,80}searchTerm/.test(page));
    assert.ok(!/startsWith\(|includes\(searchTerm/.test(page));
  });

  it("keeps the date list's own request exactly as it was", () => {
    assert.match(page, /useGrnList\(viewingMonthDateRange\)/);
    assert.match(src("helper/grnList.js"), /API\.get\("\/grn\/list", \{ params \}\)/);
  });
});
