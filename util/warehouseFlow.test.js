/**
 *   node --test util/warehouseFlow.test.js
 */
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  sinceLabel,
  stepRows,
  stepSummary,
  rowStatus,
  invoiceLine,
  hasInvoiceNotStarted,
  hasInvoiceStarted,
  docStateText,
  ageText,
  stateText,
} = require("./warehouseFlow");

const NOW = Date.parse("2026-11-15T06:00:00Z");
const GRN = {
  key: "grn",
  ok: true,
  rows: [
    { ref: "GP-1", store: "outlet:2", since: "2026-11-15T05:00:00Z", grn_started: true, invoices: 3, invoices_grn_started: 1 },
    { ref: "IN-9", store: "outlet:3", since: "2026-11-13T03:00:00Z", grn_started: false, invoices: 1 },
    { ref: "GP-3", store: "outlet:2", since: "2026-11-15T05:30:00Z", grn_started: false },
  ],
};

describe("steps", () => {
  it("longest waiting first, aged now, narrowed by store", () => {
    assert.deepEqual(stepRows(GRN, "", NOW).map((r) => [r.ref, r.hours]), [["IN-9", 51], ["GP-1", 1], ["GP-3", 0.5]]);
    assert.deepEqual(stepRows(GRN, "outlet:2", NOW).map((r) => r.ref), ["GP-1", "GP-3"]);
    assert.deepEqual(stepRows(null), []);
  });
  it("rows are oldest date first; a row without a date goes last", () => {
    const rows = stepRows(
      {
        rows: [
          { ref: "b", since: "2026-11-15T05:00:00Z" },
          { ref: "none", since: null },
          { ref: "a", since: "2026-11-01T05:00:00Z" },
          { ref: "c", since: "2026-11-15T05:00:00Z" },
        ],
      },
      "",
      NOW
    );
    assert.deepEqual(rows.map((r) => r.ref), ["a", "b", "c", "none"]);
    assert.equal(sinceLabel("grn"), "Uploaded");
    assert.equal(sinceLabel("allocation"), "GRN entered");
  });
  it("a tile counts, finds the oldest, the ones over a day and GRNs started", () => {
    assert.deepEqual(stepSummary(stepRows(GRN, "", NOW)), { count: 3, oldest_hours: 51, over_day: 1, grn_started: 1, gate_passes: 3, invoices: 4, invoices_started: 1 });
    assert.deepEqual(stepSummary([]), { count: 0, oldest_hours: null, over_day: 0, grn_started: 0, gate_passes: 0, invoices: 0, invoices_started: 0 });
  });
  it("invoices on one gate pass count it once", () => {
    const rows = [
      { kind: "document", ref: "d1", gate_pass: "GP-1", invoices: 1 },
      { kind: "document", ref: "d2", gate_pass: "GP-1", invoices: 1 },
      { kind: "document", ref: "d3", gate_pass: null, invoices: 1 },
    ];
    assert.deepEqual([stepSummary(rows).invoices, stepSummary(rows).gate_passes], [3, 2]);
  });
  it("GRN splits by invoice: a pass part way through is under both", () => {
    const partly = { invoices: 3, invoices_grn_started: 1 };
    assert.deepEqual([hasInvoiceNotStarted(partly), hasInvoiceStarted(partly)], [true, true]);
    const none = { invoices: 2, invoices_grn_started: 0 };
    assert.deepEqual([hasInvoiceNotStarted(none), hasInvoiceStarted(none)], [true, false]);
    const all = { invoices: 2, invoices_grn_started: 2 };
    assert.deepEqual([hasInvoiceNotStarted(all), hasInvoiceStarted(all)], [false, true]);
  });
  it("a row's status reads for its step", () => {
    assert.equal(rowStatus("gate_pass", {}), "No inspection yet");
    assert.equal(rowStatus("grn", { grn_started: true }), "GRN started");
    assert.equal(rowStatus("grn", { grn_started: false }), "GRN not started");
    assert.equal(rowStatus("inspection", { state: "IN_PROGRESS" }), "In progress");
    assert.equal(rowStatus("written_off", {}), "Written off");
    assert.equal(rowStatus("grn", { grn_started: true, invoices: 3, invoices_grn_started: 2 }), "GRN started 2/3");
    assert.equal(rowStatus("grn", { grn_started: true, invoices: 3, invoices_grn_started: 3 }), "GRN started");
  });
  it("a consignment's invoices read as a count and amount", () => {
    const inr = (v) => `₹${v}`;
    assert.equal(invoiceLine({ invoices: 3, invoice_amount: 1250.5 }, inr), "3 invoices · ₹1250.5");
    assert.equal(invoiceLine({ invoices: 1, invoice_amount: null }, inr), "1 invoice");
    assert.equal(invoiceLine({ invoices: 0 }, inr), null);
  });
  it("ages and states read plainly", () => {
    assert.equal(ageText(0.5), "30m");
    assert.equal(ageText(5.25), "5h 15m");
    assert.equal(ageText(51), "2d 3h");
    assert.equal(ageText(null), "—");
    assert.equal(stateText(null), "Started");
    assert.equal(docStateText("no_template"), "Yet to start");
    assert.equal(docStateText("cost_qc_failed"), "Cost variance detected");
    assert.equal(docStateText("some_new_state"), "Some new state");
    assert.equal(rowStatus("no_invoice", {}), "Invoice not uploaded");
    assert.equal(rowStatus("allocation", { allocated: false }), "Not allocated");
    assert.equal(rowStatus("allocation", { allocated: true }), "Allocated");
  });
});
