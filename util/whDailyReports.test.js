/**
 *   node --test util/whDailyReports.test.js
 */
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const W = require("./whDailyReports");

describe("warehouse daily reports page", () => {
  it("reads report and date from RetailPilot file names", () => {
    assert.equal(W.typeFromFileName("Unloading_Report_2026-11-16_ALL.csv"), "UNLOADING");
    assert.equal(W.typeFromFileName("Loading_Report_2026-11-16_ALL.csv"), "LOADING");
    assert.equal(W.typeFromFileName("Packing_Report_2026-11-16_ALL.csv"), "PACKING");
    assert.equal(W.dateFromFileName("Picking_Report_2026-11-16_ALL_1.csv"), "2026-11-16");
  });
  it("today, yesterday and times are India's, whatever the device's time zone", () => {
    // 20 Nov, 8:30 pm UTC is 21 Nov, 2:00 am IST: the reports are for 20 Nov.
    const late = new Date(Date.UTC(2026, 10, 20, 20, 30));
    assert.equal(W.istTodayIso(late), "2026-11-21");
    assert.equal(W.yesterdayIso(late), "2026-11-20");
    assert.equal(W.istDateTimeText("2026-11-20T17:49:00Z").replace(/\s+/g, " "), "20 Nov, 11:19 pm IST");
    assert.equal(W.istDateTimeText(null), "");
  });
  it("yesterday and day steps", () => {
    assert.equal(W.yesterdayIso(new Date(2026, 10, 1, 9)), "2026-10-31");
    assert.equal(W.addDays("2026-12-31", 1), "2027-01-01");
  });
  it("turns a sheet into headers and rows, dropping blank rows around it", () => {
    const p = W.toPayload([[], [" Job Type ", "Box ID"], ["STA", "0380903545"], ["", ""], ["", null]]);
    assert.deepEqual(p.headers, ["Job Type", "Box ID"]);
    assert.deepEqual(p.rows, [["STA", "0380903545"]]);
  });
  it("plans a month of files: report and date from each name, duplicates and unknown names set aside", () => {
    const plan = W.planUploads(
      ["Verification_Report_2026-11-02_ALL.csv", "Picking_Report_2026-11-02_ALL.csv", "Picking_Report_2026-11-01_ALL.csv", "Picking_Report_2026-11-01_ALL (1).csv", "notes.csv", "Loading report.xlsx"],
      "2026-11-16"
    );
    assert.deepEqual(plan.items.map((i) => [i.date, i.type, i.index]), [
      ["2026-11-01", "PICKING", 2],
      ["2026-11-02", "PICKING", 1],
      ["2026-11-02", "VERIFICATION", 0],
      ["2026-11-16", "LOADING", 5],
    ]);
    assert.deepEqual(plan.duplicates, ["Picking_Report_2026-11-01_ALL (1).csv"]);
    assert.deepEqual(plan.unknown, ["notes.csv"]);
    assert.deepEqual(plan.dates, ["2026-11-01", "2026-11-02", "2026-11-16"]);
  });
  it("five slots a day, and a grid of days", () => {
    const uploads = [{ report_date: "2026-11-16", report_type: "LOADING", upload_id: 1 }];
    const slots = W.slotsFor("2026-11-16", uploads);
    assert.equal(slots.length, 5);
    assert.equal(slots.find((s) => s.key === "LOADING").upload.upload_id, 1);
    const grid = W.uploadGrid("2026-11-15", "2026-11-16", uploads);
    assert.deepEqual(grid.map((d) => [d.date, d.done]), [["2026-11-16", 1], ["2026-11-15", 0]]);
  });
  it("puts each report's write-off side by side per store, worst first", () => {
    const rows = W.pivotByReport(
      [
        { report_type: "PICKING", to_store: "ecr", short_qty: 5, short_value: 50, short_lines: 1 },
        { report_type: "VERIFICATION", to_store: "ecr", short_qty: 1, short_value: 10, returned_qty: 1 },
        { report_type: "PICKING", to_store: "moolakulam", short_qty: 9, short_value: 900 },
      ],
      "to_store"
    );
    assert.deepEqual(rows.map((r) => r.key), ["moolakulam", "ecr"]);
    assert.equal(rows[1].total_short_qty, 6);
    assert.equal(rows[1].VERIFICATION.returned_qty, 1);
    assert.equal(W.excel.byKey(rows, "Store")[1]["Total short value"], 60);
  });
  it("daily rows join write-offs and box issues", () => {
    const d = W.dailyRows([{ report_date: "2026-11-16", report_type: "PICKING", short_qty: 3 }], [{ report_date: "2026-11-15", boxes: 4, issue_lines: 1 }]);
    assert.deepEqual(d.map((x) => [x.date, x.PICKING.short_qty, x.box_issue_lines]), [["2026-11-16", 3, 0], ["2026-11-15", 0, 1]]);
  });
  it("funnel by job type or all", () => {
    const f = [
      { store: "ecr", job_type: "STA", picked: 10, loaded: 8 },
      { store: "ecr", job_type: "GRN", picked: 5, loaded: 5 },
    ];
    assert.equal(W.funnelRows(f, "STA")[0].picked, 10);
    assert.equal(W.funnelRows(f, "")[0].picked, 15);
    assert.deepEqual(W.jobTypesOf(f), ["GRN", "STA"]);
  });
  it("filters articles", () => {
    const list = [{ report_type: "PICKING", article_id: 100108, article_name: "Cinthol soap" }, { report_type: "VERIFICATION", article_id: 1, article_name: "Colgate" }];
    assert.equal(W.filterArticles(list, { report: "PICKING" }).length, 1);
    assert.equal(W.filterArticles(list, { search: "colg" })[0].article_id, 1);
    assert.equal(W.filterArticles(list, { search: "1001" })[0].article_id, 100108);
  });
});
