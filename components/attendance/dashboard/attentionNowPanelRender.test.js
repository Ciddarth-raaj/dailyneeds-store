/**
 * Needs attention now — RENDERED, not read.
 *
 *   node --test components/attendance/dashboard/attentionNowPanelRender.test.js
 *
 * Every other screen test in this repository asserts against the SOURCE TEXT,
 * because there is no React runner wired up. Source text proves the code says
 * `group.outlet_name`; it cannot prove the browser puts "Kathirkamam" above
 * the two people who work there. That distinction is the whole of this change
 * — a grouping that exists only in the API payload is not a grouped screen —
 * so this file renders the component for real with `react-dom/server` and
 * reads the HTML the way a person reads the panel.
 *
 * IT TRANSPILES WITH NEXT'S OWN BABEL PRESET, the one `next build` uses, so
 * the thing under test is the component as it ships rather than a hand-written
 * approximation of it.
 *
 * IT SKIPS ITSELF WHEN `node_modules` IS ABSENT rather than failing. The rest
 * of this suite runs on a bare checkout; a render test that went red there
 * would train everybody to ignore a red suite, which costs more than this test
 * is worth. When the dependencies are installed — which is the state any CI or
 * pre-deploy run is in — it runs and it is strict.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const { render, textOf, unavailable } = require("../../../test_support/renderJsx");

const skip = unavailable ? { skip: `dependencies not installed: ${unavailable}` } : {};

const PANEL = "components/attendance/dashboard/AttentionNowPanel.jsx";

/* ------------------------------------------------------------- the fixture */

const BUSINESS_DATE = "2026-09-20";

const item = (over) => ({
  employee_id: 1,
  employee_name: "Employee 1",
  designation_name: "Cashier",
  reason_key: "NO_CHECK_IN",
  reason: "No check-in after shift start",
  detail: "The shift started 45 minutes ago",
  target: "ATTENDANCE_DETAIL",
  attendance_date: BUSINESS_DATE,
  age_minutes: 45,
  owner_name: null,
  ...over,
});

/**
 * Two branches, a branch with nobody on record, and a roaming employee — the
 * shape the server produces, in the order it produces it.
 */
const GROUPS = [
  {
    group_key: "2",
    store_id: 2,
    outlet_name: "Kathirkamam",
    works_all_locations: false,
    count: 2,
    items: [
      item({ employee_id: 21, employee_name: "Anitha R" }),
      item({ employee_id: 22, employee_name: "Bharath K" }),
    ],
  },
  {
    group_key: "1",
    store_id: 1,
    outlet_name: "Vallalar Salai",
    works_all_locations: false,
    count: 1,
    items: [
      item({
        employee_id: 11,
        employee_name: "Chandran M",
        reason_key: "REGULARIZATION_PENDING",
        reason: "Regularization Pending",
        detail: "A regularization request is waiting for a decision",
        target: "APPROVAL_QUEUE",
        owner_name: "Priya N",
        age_minutes: 130,
      }),
    ],
  },
  {
    group_key: "roaming",
    store_id: null,
    outlet_name: "All Locations / Roaming",
    works_all_locations: true,
    count: 1,
    items: [item({ employee_id: 31, employee_name: "Devi S", designation_name: "Operations" })],
  },
];

const html = () =>
  render(PANEL, {
    items: GROUPS.flatMap((g) => g.items),
    groups: GROUPS,
    total: 4,
    truncated: false,
    onOpenAll: () => {},
    onOpenEmployee: () => {},
  });

/* ================================================= A1/A2 the grouped screen */

test("the panel renders a heading for every outlet", skip, () => {
  const text = textOf(html());
  ["Kathirkamam", "Vallalar Salai", "All Locations / Roaming"].forEach((name) => {
    assert.ok(text.includes(name), `"${name}" is not on the screen`);
  });
});

test("the headings read in the server's order, roaming last", skip, () => {
  const text = textOf(html());
  const at = (s) => text.indexOf(s);
  assert.ok(at("Kathirkamam") < at("Vallalar Salai"), "outlets keep the server's order");
  assert.ok(
    at("All Locations / Roaming") > at("Vallalar Salai"),
    "the roaming heading is last, not between two branch names"
  );
});

test("each employee is rendered UNDER their own heading, not in a flat list", skip, () => {
  const text = textOf(html());
  const at = (s) => text.indexOf(s);
  // Anitha and Bharath sit between the Kathirkamam heading and the next one.
  assert.ok(at("Kathirkamam") < at("Anitha R"));
  assert.ok(at("Anitha R") < at("Vallalar Salai"));
  assert.ok(at("Bharath K") < at("Vallalar Salai"));
  // Chandran sits between Vallalar Salai and the roaming heading.
  assert.ok(at("Vallalar Salai") < at("Chandran M"));
  assert.ok(at("Chandran M") < at("All Locations / Roaming"));
  // Devi sits after the roaming heading.
  assert.ok(at("All Locations / Roaming") < at("Devi S"));
});

test("the count beside each heading is the number of rows under it", skip, () => {
  const markup = html();
  // The heading and its count are siblings in one flex row; the count is the
  // next rendered text after the outlet name.
  const text = textOf(markup);
  const countAfter = (name) => text[text.indexOf(name) + 1];
  assert.equal(countAfter("Kathirkamam"), "2");
  assert.equal(countAfter("Vallalar Salai"), "1");
  assert.equal(countAfter("All Locations / Roaming"), "1");
});

test("every employee appears exactly once on the screen", skip, () => {
  const markup = html();
  ["Anitha R", "Bharath K", "Chandran M", "Devi S"].forEach((name) => {
    const hits = markup.split(name).length - 1;
    assert.equal(hits, 1, `${name} is rendered ${hits} times`);
  });
});

test("the outlet is not repeated on every row now that it is the heading", skip, () => {
  const markup = html();
  assert.equal(markup.split("Kathirkamam").length - 1, 1, "once, as the heading");
});

/* ============================== B. one date, and no date printed on a row === */

/**
 * THE PANEL IS ABOUT TODAY, so no row needs to say which day it is about.
 *
 * An earlier version carried completed-day Missing Punch rows here with the
 * attendance date chipped onto them. Those rows now live only on the Missing
 * Attendance Report, so there is nothing left to date — and a date repeated on
 * every line is a date nobody reads.
 */
test("no row prints an attendance date", skip, () => {
  const text = textOf(html()).join(" ");
  assert.ok(!/\d{1,2} Sep 2026/.test(text), "no date chip survives on any row");
  assert.ok(!/2026-09-\d{2}/.test(text), "nor a raw one");
});

test("nothing on the screen reads as a completed-day punch exception", skip, () => {
  const text = textOf(html()).join(" ");
  assert.ok(!/Missing Punch/i.test(text));
  assert.ok(!/completed attendance day/i.test(text));
});

test("the panel still names the screen each live row belongs to", skip, () => {
  const text = textOf(html()).join(" ");
  assert.match(text, /Open attendance detail/);
  assert.match(text, /Open approval queue/);
  assert.match(text, /With Priya N/, "and the approver the system itself names");
});

/* --------------------------------------------------------- the empty state */

test("an empty panel says so rather than rendering empty headings", skip, () => {
  const markup = render(PANEL, {
    items: [],
    groups: [],
    total: 0,
    truncated: false,
    onOpenAll: () => {},
    onOpenEmployee: () => {},
  });
  assert.match(markup, /Nothing is waiting on anybody right now/);
});

test("a server that sends no grouping still renders every row", skip, () => {
  const markup = render(PANEL, {
    items: [item({ employee_id: 41, employee_name: "Esakki P" })],
    groups: undefined,
    total: 1,
    truncated: false,
    onOpenAll: () => {},
    onOpenEmployee: () => {},
  });
  assert.match(markup, /Esakki P/);
  assert.match(markup, /All employees/, "under the honest fallback heading");
});
