/**
 * /sto LOADS ONE MONTH OF COUNTS AND ONE DAY OF ROWS.
 *
 *   node --test components/sto/stoBoundedLoading.test.js
 *
 * The page used to fetch the viewed month one day at a time (30 sequential
 * GET /stock-transfer-out calls, each returning every transfer with all its
 * item lines) just to colour a calendar and show one day's table. Now:
 *
 *   THE CALENDAR   reads GET /stock-transfer-out/calendar?year=&month= - per
 *                  day counts only - and keeps the Show All meaning: OFF shows
 *                  checked transfers only (green n/n or red), ON shows all
 *                  with the pending ones (yellow done/n).
 *   THE LIST       reads GET /stock-transfer-out for the selected day only,
 *                  and does not re-filter rows by browser time zone.
 *   THE HOOKS      make one request per real change of their inputs.
 *
 * The source checks run everywhere; the mounted ones need node_modules.
 */
const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { load, unavailable, root } = require("../../test_support/renderJsx");

const skip = unavailable ? { skip: `dependencies not installed: ${unavailable}` } : {};
const src = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

/**
 * jsdom globals as test_support/renderJsx's `mount` installs them (including
 * dropping MessageChannel so the process can exit). Mounted here directly
 * because the hooks are exercised through a harness component, not a file.
 */
let dom = null;
function installDom() {
  if (dom) return;
  const { JSDOM } = require("jsdom");
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
  for (const key of ["window", "document", "navigator", "Element", "HTMLElement", "Node", "Event", "MouseEvent", "getComputedStyle"]) {
    global[key] = key === "window" ? dom.window : dom.window[key];
  }
  global.IS_REACT_ACT_ENVIRONMENT = true;
  delete global.MessageChannel;
}

/** Render `element` into a fresh container; returns { container, render, unmount }. */
function mountElement() {
  installDom();
  const ReactDOM = require("react-dom");
  const { act } = require("react-dom/test-utils");
  const container = document.createElement("div");
  document.body.appendChild(container);
  return {
    container,
    render: (element) => act(async () => ReactDOM.render(element, container)),
    unmount: () => act(async () => ReactDOM.unmountComponentAtNode(container)),
  };
}

describe("the /sto page asks for bounded data", () => {
  const page = src("pages/sto/index.jsx");

  it("the calendar reads the month summary for the viewed month", () => {
    assert.match(page, /useStockTransferCalendar\(\{\s*year: viewingMonth\.year\(\),\s*month: viewingMonth\.month\(\) \+ 1,\s*\}\)/);
    assert.match(page, /days=\{calendarDays\}/);
    assert.doesNotMatch(page, /transfersList=/);
  });

  it("the list reads the selected day only, with Show All still meaning is_checked", () => {
    assert.match(page, /is_checked: showAll \? undefined : true,\s*from_date: selectedDate,\s*to_date: selectedDate,/);
    assert.doesNotMatch(page, /endOf\("month"\)/);
    assert.doesNotMatch(page, /DN_date\)\.format\("YYYY-MM-DD"\) === selectedDate/);
  });

  it("delete refreshes both the day list and the calendar", () => {
    assert.match(page, /await stoCheck\.deleteByRef\(dnRefNo\);[\s\S]*?refetch\(\);\s*refetchCalendar\(\);/);
  });

  it("permissions are unchanged", () => {
    assert.match(page, /usePermissions\("add_sto"\)/);
    assert.match(page, /usePermissions\("delete_sto"\)/);
    assert.match(page, /permissionKey="view_sto"/);
    assert.match(page, /if \(canDelete\)/);
  });

  it("useStockTransfer no longer walks the range a day at a time", () => {
    const hook = src("customHooks/useStockTransfer.js");
    assert.doesNotMatch(hook, /getDaysInRange|for \(let i = 0; i < days\.length/);
    assert.equal(hook.match(/getStockTransfers\(/g).length, 1);
  });
});

describe("STOMonthCalendar colours days from the summary", skip, () => {
  const moment = require("moment");
  const days = {
    "2026-09-01": { date: "2026-09-01", total: 3, checked: 2, unchecked: 1 },
    "2026-09-02": { date: "2026-09-02", total: 2, checked: 2, unchecked: 0 },
    "2026-09-03": { date: "2026-09-03", total: 1, checked: 0, unchecked: 1 },
  };

  /**
   * The colour/label of a day is `getDayVisual`, which STOMonthCalendar hands
   * to the shared MonthStatusCalendar (where it only shows in a tooltip). The
   * shared grid is swapped for a stub that keeps what it was given, so the
   * test reads the function the real grid would call.
   */
  function dayVisuals(showAll) {
    const React = require("react");
    const ReactDOMServer = require("react-dom/server");
    const gridPath = path.join(root, "components/calendar/MonthStatusCalendar.jsx");
    const calPath = path.join(root, "components/sto/STOMonthCalendar.jsx");
    let captured = null;
    require.cache[gridPath] = {
      id: gridPath,
      filename: gridPath,
      loaded: true,
      exports: { __esModule: true, default: (props) => ((captured = props), null) },
    };
    delete require.cache[calPath];
    try {
      ReactDOMServer.renderToStaticMarkup(
        React.createElement(load("components/sto/STOMonthCalendar.jsx"), {
          selectedDate: "2026-09-01",
          onSelectDate: () => {},
          days,
          viewingMonth: moment("2026-09-01"),
          onViewingMonthChange: () => {},
          showAll,
          onShowAllChange: () => {},
        })
      );
    } finally {
      delete require.cache[gridPath];
      delete require.cache[calPath];
    }
    const at = (d) => {
      const v = captured.getDayVisual(moment(d));
      return `${v.primary} ${v.secondary}`;
    };
    return at;
  }

  it("Show All ON: pending days are done/total, complete days n/n", () => {
    const at = dayVisuals(true);
    assert.equal(at("2026-09-01"), "2/3 Files pending");
    assert.equal(at("2026-09-02"), "2/2 Complete");
    assert.equal(at("2026-09-03"), "0/1 Files pending");
    assert.equal(at("2026-09-04"), "0 No transfers");
  });

  it("Show All OFF: only checked transfers count, a day with none is 'No transfers'", () => {
    const at = dayVisuals(false);
    assert.equal(at("2026-09-01"), "2/2 Complete");
    assert.equal(at("2026-09-02"), "2/2 Complete");
    assert.equal(at("2026-09-03"), "0 No transfers");
    assert.equal(at("2026-09-04"), "0 No transfers");
  });
});

describe("the hooks make one request per real change", skip, () => {
  let React;
  let api;
  const calls = { list: [], calendar: [] };

  before(() => {
    installDom();
    React = require("react");
    api = load("helper/stockTransferOut.js");
    api.getStockTransfers = async (opts) => {
      calls.list.push(opts);
      return [{ Dn_no: 1 }];
    };
    api.getStockTransferCalendar = async (opts) => {
      calls.calendar.push(opts);
      return [{ date: "2026-09-01", total: 1, checked: 1, unchecked: 0 }];
    };
  });

  function harness(hookRel) {
    const useHook = load(hookRel);
    const seen = {};
    function Harness(props) {
      Object.assign(seen, useHook(props));
      return null;
    }
    const view = mountElement();
    return {
      seen,
      render: (props) => view.render(React.createElement(Harness, props)),
      unmount: view.unmount,
    };
  }

  it("useStockTransfer: one request for a whole range, none for an unchanged re-render", async () => {
    calls.list.length = 0;
    const h = harness("customHooks/useStockTransfer.js");
    await h.render({ from_date: "2026-09-23", to_date: "2026-09-29" });
    assert.deepEqual(calls.list, [{ is_checked: undefined, from_date: "2026-09-23", to_date: "2026-09-29" }]);
    assert.deepEqual(h.seen.transfers, [{ Dn_no: 1 }]);
    assert.equal(h.seen.loading, false);
    assert.equal(h.seen.fetchProgress, null);

    await h.render({ from_date: "2026-09-23", to_date: "2026-09-29" });
    assert.equal(calls.list.length, 1, "same inputs, no new request");

    await h.render({ is_checked: true, from_date: "2026-09-23", to_date: "2026-09-29" });
    assert.equal(calls.list.length, 2, "Show All toggled: exactly one new request");
    await h.unmount();
  });

  it("useStockTransfer: disabled makes no request (View/Edit pages)", async () => {
    calls.list.length = 0;
    const h = harness("customHooks/useStockTransfer.js");
    await h.render({ from_date: "2026-09-23", to_date: "2026-09-29", enabled: false });
    assert.equal(calls.list.length, 0);
    assert.equal(h.seen.loading, false);
    await h.unmount();
  });

  it("useStockTransferCalendar: one request per month, keyed by date", async () => {
    calls.calendar.length = 0;
    const h = harness("customHooks/useStockTransferCalendar.js");
    await h.render({ year: 2026, month: 9 });
    await h.render({ year: 2026, month: 9 });
    assert.deepEqual(calls.calendar, [{ year: 2026, month: 9 }]);
    assert.deepEqual(h.seen.days, {
      "2026-09-01": { date: "2026-09-01", total: 1, checked: 1, unchecked: 0 },
    });
    await h.render({ year: 2026, month: 8 });
    assert.deepEqual(calls.calendar[1], { year: 2026, month: 8 });
    assert.equal(calls.calendar.length, 2);
    await h.unmount();
  });
});
