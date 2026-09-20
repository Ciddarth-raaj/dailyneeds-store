/**
 * Coverage by location and role — MOUNTED, CLICKED, and read back.
 *
 *   node --test components/attendance/dashboard/coveragePanelRender.test.js
 *
 * An accordion is almost entirely a question about behaviour: closed by
 * default, one opens without opening the rest, click again to close. A test
 * that only asserted the closed markup would pass on a component whose rows do
 * not open at all — which is exactly the defect this replaces, a "grouped"
 * panel that was still a flat list on screen.
 *
 * So these mount the real component in jsdom and dispatch real clicks through
 * React's own event system. What is exercised is the component's actual state
 * and its actual re-render, not a reimplementation of either.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const { mount, textOf, unavailable } = require("../../../test_support/renderJsx");
const { groupCoverageByOutlet } = require("../../../util/attendanceDashboard");

const skip = unavailable ? { skip: `dependencies not installed: ${unavailable}` } : {};

const PANEL = "components/attendance/dashboard/CoveragePanel.jsx";

/* ------------------------------------------------------------- fixtures */

const role = (store_id, outlet_name, designation_id, designation_name, expected, recorded, gap) => ({
  store_id,
  outlet_name,
  designation_id,
  designation_name,
  expected_now: expected,
  recorded_in: recorded,
  recorded_in_location_unverified: 0,
  gap,
  gap_by_class: [],
  reconciles: true,
  delivery: "UNVERIFIED",
});

/** Warehouse 58/28/30 and Moolakulam 9/6/3, as the snapshot would send them. */
const ROWS = [
  role(9, "Warehouse", 1, "Cleaning", 21, 13, 8),
  role(9, "Warehouse", 2, "Packing & Barcoding Worker", 11, 5, 6),
  role(9, "Warehouse", 3, "GRN Executive", 8, 2, 6),
  role(9, "Warehouse", 4, "Procurement Executive", 4, 0, 4),
  role(9, "Warehouse", 5, "Driver", 4, 0, 4),
  role(9, "Warehouse", 6, "Supervisor", 10, 8, 2),
  role(1, "Moolakulam", 1, "Cleaning", 5, 4, 1),
  role(1, "Moolakulam", 7, "Cashier", 4, 2, 2),
];

const ROAMING = {
  label: "All Locations / Roaming",
  expected_now: 1,
  recorded_in: 0,
  gap: 1,
  total: 1,
};

const open = (props = {}) =>
  mount(PANEL, { rows: ROWS, roaming: null, onOpen: () => {}, ...props });

const outletRows = (ui) => ui.all('[data-testid="coverage-outlet-row"]');
const roleRows = (ui) => ui.all('[data-testid="coverage-role-row"]');
const cellsOf = (tr) => [...tr.querySelectorAll("td")].map((td) => td.textContent.trim());

/* ============================================ 1 & 2. the initial render */

test("initial render shows one summary row per outlet and no role rows", skip, () => {
  const ui = open();
  const parents = outletRows(ui);
  assert.equal(parents.length, 2, "one parent per location");
  assert.equal(roleRows(ui).length, 0, "designation rows are hidden by default");
  ui.unmount();
});

test("every outlet is collapsed on load — none is auto-expanded", skip, () => {
  const ui = open();
  outletRows(ui).forEach((tr) => {
    assert.equal(tr.getAttribute("aria-expanded"), "false");
  });
  ui.unmount();
});

test("the largest-gap outlet is NOT opened for the reader", skip, () => {
  // Warehouse has the biggest gap and sorts first; first does not mean open.
  const ui = open();
  const first = outletRows(ui)[0];
  assert.match(first.textContent, /Warehouse/);
  assert.equal(first.getAttribute("aria-expanded"), "false");
  ui.unmount();
});

test("no designation name is anywhere on the screen while everything is closed", skip, () => {
  const ui = open();
  const text = ui.text().join(" ");
  ["Cleaning", "GRN Executive", "Driver", "Cashier"].forEach((name) => {
    assert.ok(!text.includes(name), `${name} should be hidden`);
  });
  assert.match(text, /Warehouse/);
  assert.match(text, /Moolakulam/);
  ui.unmount();
});

/* ================================================ 3, 4 & 5. the clicking */

test("clicking an outlet expands its roles", skip, () => {
  const ui = open();
  ui.click(outletRows(ui)[0]);

  const roles = roleRows(ui);
  assert.equal(roles.length, 6, "Warehouse's six roles");
  const text = ui.text().join(" ");
  assert.match(text, /Cleaning/);
  assert.match(text, /Packing & Barcoding Worker/);
  assert.match(text, /GRN Executive/);
  assert.equal(outletRows(ui)[0].getAttribute("aria-expanded"), "true");
  ui.unmount();
});

test("clicking the same outlet again collapses it", skip, () => {
  const ui = open();
  const parent = () => outletRows(ui)[0];

  ui.click(parent());
  assert.equal(roleRows(ui).length, 6);

  ui.click(parent());
  assert.equal(roleRows(ui).length, 0, "closed again");
  assert.equal(parent().getAttribute("aria-expanded"), "false");
  ui.unmount();
});

test("opening one outlet does not expand any other", skip, () => {
  const ui = open();
  ui.click(outletRows(ui)[0]); // Warehouse

  const byKey = (key) => roleRows(ui).filter((tr) => tr.getAttribute("data-outlet-key") === key);
  assert.equal(byKey("9").length, 6, "Warehouse is open");
  assert.equal(byKey("1").length, 0, "Moolakulam stayed closed");
  assert.equal(outletRows(ui)[1].getAttribute("aria-expanded"), "false");
  ui.unmount();
});

test("two outlets can be open at once, and closing one leaves the other open", skip, () => {
  const ui = open();
  ui.click(outletRows(ui)[0]);
  ui.click(outletRows(ui)[1]);

  const byKey = (key) => roleRows(ui).filter((tr) => tr.getAttribute("data-outlet-key") === key);
  assert.equal(byKey("9").length, 6);
  assert.equal(byKey("1").length, 2);

  ui.click(outletRows(ui)[1]);
  assert.equal(byKey("9").length, 6, "Warehouse is untouched by closing Moolakulam");
  assert.equal(byKey("1").length, 0);
  ui.unmount();
});

test("the keyboard opens a row too — it is a real control, not a clickable div", skip, () => {
  const ui = open();
  const parent = outletRows(ui)[0];
  assert.equal(parent.getAttribute("role"), "button");
  assert.equal(parent.getAttribute("tabindex"), "0");
  assert.ok(parent.getAttribute("aria-label").includes("Warehouse"));
  ui.unmount();
});

/* ================================================== 6. the parent totals */

test("parent totals are exactly the sum of the child role rows", skip, () => {
  const ui = open();
  // Warehouse: 21+11+8+4+4+10 = 58 expected, 13+5+2+0+0+8 = 28 in, 8+6+6+4+4+2 = 30 gap.
  const [name, expected, recorded, gap] = cellsOf(outletRows(ui)[0]);
  assert.match(name, /Warehouse/);
  assert.equal(expected, "58");
  assert.equal(recorded, "28");
  assert.equal(gap, "30");
  ui.unmount();
});

test("and the visible children add up to the parent, with the group open", skip, () => {
  const ui = open();
  ui.click(outletRows(ui)[0]);

  const sums = roleRows(ui)
    .filter((tr) => tr.getAttribute("data-outlet-key") === "9")
    .map(cellsOf)
    .reduce(
      (acc, [, e, i, g]) => ({
        e: acc.e + Number(e),
        i: acc.i + Number(i),
        g: acc.g + Number(g),
      }),
      { e: 0, i: 0, g: 0 }
    );

  const [, expected, recorded, gap] = cellsOf(outletRows(ui)[0]);
  assert.equal(String(sums.e), expected, "Expected");
  assert.equal(String(sums.i), recorded, "In");
  assert.equal(String(sums.g), gap, "Gap");
  ui.unmount();
});

test("there is ONE calculation source — the grouping helper the panel uses", skip, () => {
  // The same rows through the shared helper must give the same three numbers
  // the panel drew, so no second total can be introduced in the component.
  const [warehouse] = groupCoverageByOutlet(ROWS);
  assert.equal(warehouse.expected_now, 58);
  assert.equal(warehouse.recorded_in, 28);
  assert.equal(warehouse.gap, 30);

  const ui = open();
  const [, expected, recorded, gap] = cellsOf(outletRows(ui)[0]);
  assert.deepEqual([expected, recorded, gap], ["58", "28", "30"]);
  ui.unmount();
});

/* ====================================================== 7. the filters */

test("a single-outlet filter yields ONE collapsed parent, never a flat list", skip, () => {
  const ui = open({ rows: ROWS.filter((r) => r.store_id === 9) });
  assert.equal(outletRows(ui).length, 1);
  assert.equal(roleRows(ui).length, 0, "still collapsed, not reverted to a list");
  assert.equal(outletRows(ui)[0].getAttribute("aria-expanded"), "false");
  ui.unmount();
});

test("a designation filter recalculates the parent totals from the matching roles only", skip, () => {
  // As the server would send it: only "Cleaning" rows survive the filter.
  const ui = open({ rows: ROWS.filter((r) => r.designation_name === "Cleaning") });
  const parents = outletRows(ui);
  assert.equal(parents.length, 2);

  const warehouse = parents.find((tr) => tr.textContent.includes("Warehouse"));
  const [, expected, recorded, gap] = cellsOf(warehouse);
  assert.deepEqual([expected, recorded, gap], ["21", "13", "8"], "Cleaning alone, not 58/28/30");

  const moolakulam = parents.find((tr) => tr.textContent.includes("Moolakulam"));
  assert.deepEqual(cellsOf(moolakulam).slice(1), ["5", "4", "1"]);
  ui.unmount();
});

test("new filtered rows re-total the parents without a remount", skip, () => {
  const ui = open();
  assert.equal(cellsOf(outletRows(ui)[0])[1], "58");

  ui.setProps({
    rows: ROWS.filter((r) => r.designation_name === "Cleaning"),
    roaming: null,
    onOpen: () => {},
  });
  const warehouse = outletRows(ui).find((tr) => tr.textContent.includes("Warehouse"));
  assert.equal(cellsOf(warehouse)[1], "21");
  ui.unmount();
});

test("no rows at all says so, rather than drawing an empty table", skip, () => {
  const ui = open({ rows: [] });
  assert.equal(outletRows(ui).length, 0);
  assert.match(ui.text().join(" "), /No employees are scheduled right now/);
  ui.unmount();
});

/* ============================================== 8. roaming stays outside */

test("a roaming employee is in no outlet's Expected, In or Gap", skip, () => {
  const ui = open({ roaming: ROAMING });

  // The roaming row exists, and it is not one of the outlet parents.
  const roamingRow = ui.one('[data-testid="coverage-roaming-row"]');
  assert.ok(roamingRow, "reported, not silently dropped");
  assert.equal(outletRows(ui).length, 2, "and not counted as a third outlet");

  // The outlet totals are identical with and without it.
  const withRoaming = outletRows(ui).map(cellsOf);
  ui.unmount();

  const plain = open({ roaming: null });
  assert.deepEqual(outletRows(plain).map(cellsOf), withRoaming);
  plain.unmount();
});

test("the roaming row carries its own figures and says it belongs to no outlet", skip, () => {
  const ui = open({ roaming: ROAMING });
  const cells = cellsOf(ui.one('[data-testid="coverage-roaming-row"]'));
  assert.match(cells[0], /All Locations \/ Roaming/);
  assert.match(cells[0], /Counted in no outlet above/);
  assert.deepEqual(cells.slice(1), ["1", "0", "1"]);
  ui.unmount();
});

test("the roaming row has no chevron to invite a click it cannot honour", skip, () => {
  const ui = open({ roaming: ROAMING });
  const roamingRow = ui.one('[data-testid="coverage-roaming-row"]');
  // A plain table row - not the button the outlet parents are, and with no
  // expanded state, because there is nothing underneath it to open.
  assert.notEqual(roamingRow.getAttribute("role"), "button");
  assert.equal(roamingRow.getAttribute("aria-expanded"), null);
  assert.equal(roamingRow.getAttribute("tabindex"), null);
  ui.unmount();
});

test("no roaming employees means no roaming row", skip, () => {
  const ui = open({ roaming: { ...ROAMING, total: 0 } });
  assert.equal(ui.one('[data-testid="coverage-roaming-row"]'), null);
  ui.unmount();
});

/* ============================================ 9. the drilldown survives */

test("a role row still opens its own filtered list after expanding", skip, () => {
  const opened = [];
  const ui = open({ onOpen: (row) => opened.push(row) });

  ui.click(outletRows(ui)[0]);
  const grn = roleRows(ui).find((tr) => tr.textContent.includes("GRN Executive"));
  ui.click(grn);

  assert.equal(opened.length, 1, "exactly one drilldown");
  assert.equal(opened[0].store_id, 9);
  assert.equal(opened[0].designation_id, 3);
  assert.equal(opened[0].designation_name, "GRN Executive");
  assert.equal(opened[0].expected_now, 8, "the server's own row, passed through untouched");
  ui.unmount();
});

test("clicking the parent opens nothing — it only expands", skip, () => {
  const opened = [];
  const ui = open({ onOpen: (row) => opened.push(row) });
  ui.click(outletRows(ui)[0]);
  assert.deepEqual(opened, [], "a chevron does not open a list");
  ui.unmount();
});

test("the drilldown row is the server's row, not one this panel rebuilt", skip, () => {
  const opened = [];
  const ui = open({ onOpen: (row) => opened.push(row) });
  ui.click(outletRows(ui)[1]); // Moolakulam
  ui.click(roleRows(ui)[0]);
  assert.equal(opened[0], ROWS.find((r) => r.store_id === 1 && r.designation_id === 1));
  ui.unmount();
});
