/**
 * The Staff Budget screen's formatting, grid and payloads.
 *
 *   node --test util/staffBudget.test.js
 */
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  NOT_PRICED,
  budgetSummary,
  suggestedRateFor,
  formatRupees,
  formatHeadcount,
  formatTimeOfDay,
  formatShiftWindow,
  buildShiftGrid,
  toBulkPayload,
  validateGridRow,
  validateGrid,
  filterLocations,
  coverageCells,
} = require("./staffBudget");

/** `work_shift` rows as the API hands them over: window already resolved. */
const SHIFTS = [
  { work_shift_id: 13, shift_name: "10-10", in_time: "10:00:00", out_time: "22:00:00" },
  { work_shift_id: 11, shift_name: "9-6", in_time: "09:00:00", out_time: "18:00:00" },
  { work_shift_id: 15, shift_name: "6-10", in_time: "18:00:00", out_time: "22:00:00" },
];

describe("formatting", () => {
  it("writes rupees in Indian grouping with no paise", () => {
    assert.equal(formatRupees(182500), "₹1,82,500");
    assert.equal(formatRupees(11000), "₹11,000");
    assert.equal(formatRupees(0), "₹0");
  });

  it("shows an unpriced figure as a blank, never as ₹0", () => {
    assert.equal(formatRupees(null), NOT_PRICED);
    assert.equal(formatRupees(undefined), NOT_PRICED);
    assert.notEqual(formatRupees(null), formatRupees(0));
  });

  it("keeps a zero headcount visible", () => {
    assert.equal(formatHeadcount(0), "0");
    assert.equal(formatHeadcount(4), "4");
  });

  it("turns a MySQL time into something readable", () => {
    assert.equal(formatTimeOfDay("09:00:00"), "9:00 AM");
    assert.equal(formatTimeOfDay("18:00:00"), "6:00 PM");
    assert.equal(formatTimeOfDay("00:30:00"), "12:30 AM");
    assert.equal(formatTimeOfDay("12:00:00"), "12:00 PM");
    assert.equal(formatTimeOfDay(null), "");
  });

  it("labels a shift by its window, not by whatever it is named", () => {
    assert.equal(
      formatShiftWindow({ shift_name: "Anything", in_time: "10:00:00", out_time: "22:00:00" }),
      "10:00 AM – 10:00 PM"
    );
  });
});

describe("the editable grid", () => {
  const existing = [
    { work_shift_id: 13, staff_budget_id: 7, approved_headcount: 2, monthly_rate: 14500 },
  ];

  it("offers every active shift, ordered by In time", () => {
    const grid = buildShiftGrid(SHIFTS, existing);
    assert.deepEqual(grid.map((r) => r.work_shift_id), [11, 13, 15]);
  });

  it("shows a shift that is not yet in the plan at zero, flagged as new", () => {
    const grid = buildShiftGrid(SHIFTS, existing);
    const nineToSix = grid.find((r) => r.work_shift_id === 11);
    assert.equal(nineToSix.approved_headcount, 0);
    assert.equal(nineToSix.is_new, true);
    assert.equal(nineToSix.staff_budget_id, null);
  });

  it("keeps an existing row's id and rate", () => {
    const grid = buildShiftGrid(SHIFTS, existing);
    const tenToTen = grid.find((r) => r.work_shift_id === 13);
    assert.equal(tenToTen.staff_budget_id, 7);
    assert.equal(tenToTen.approved_headcount, 2);
    assert.equal(tenToTen.monthly_rate, 14500);
    assert.equal(tenToTen.is_new, false);
  });
});

describe("what a save sends", () => {
  it("sends every row, including the ones left at zero", () => {
    const grid = buildShiftGrid(SHIFTS, []);
    grid[0].approved_headcount = 4;
    const payload = toBulkPayload(
      { outlet_id: 3, department_id: 1, designation_id: 21 },
      grid
    );

    assert.equal(payload.rows.length, 3);
    assert.deepEqual(payload.rows[0], {
      outlet_id: 3,
      department_id: 1,
      designation_id: 21,
      work_shift_id: 11,
      approved_headcount: 4,
    });
    assert.equal(payload.rows[1].approved_headcount, 0);
  });

  it("sends ids, never a display name", () => {
    const payload = toBulkPayload(
      { outlet_id: 3, department_id: 1, designation_id: 21 },
      buildShiftGrid(SHIFTS, [])
    );
    for (const row of payload.rows) {
      assert.deepEqual(Object.keys(row).sort(), [
        "approved_headcount",
        "department_id",
        "designation_id",
        "outlet_id",
        "work_shift_id",
      ]);
    }
  });
});

describe("what the screen refuses before the backend has to", () => {
  it("accepts zero and whole numbers", () => {
    assert.equal(validateGridRow({ approved_headcount: 0 }), null);
    assert.equal(validateGridRow({ approved_headcount: 12 }), null);
  });

  it("refuses a blank, a fraction and a negative", () => {
    assert.match(validateGridRow({ approved_headcount: "" }), /required/);
    assert.match(validateGridRow({ approved_headcount: 2.5 }), /whole number/);
    assert.match(validateGridRow({ approved_headcount: -1 }), /negative/);
  });

  it("names the shift whose figure is wrong", () => {
    const problem = validateGrid([
      { shift_name: "9-6", approved_headcount: 3 },
      { shift_name: "10-10", approved_headcount: -2 },
    ]);
    assert.match(problem, /^10-10:/);
  });
});

/** Two locations, one of them the Warehouse, same shape. */
const LOCATIONS = [
  {
    outlet_name: "ECR",
    departments: [
      {
        department_name: "Sales",
        designations: [
          { designation_name: "Customer Service Associate" },
          { designation_name: "Store Keeper" },
        ],
      },
    ],
  },
  {
    outlet_name: "Daily Needs-Warehouse",
    departments: [
      { department_name: "Inward", designations: [{ designation_name: "Loader" }] },
    ],
  },
];

describe("filtering", () => {
  it("keeps everything when nothing is typed", () => {
    assert.equal(filterLocations(LOCATIONS, "").length, 2);
    assert.equal(filterLocations(LOCATIONS, "   ").length, 2);
  });

  it("keeps a whole location when the location matches", () => {
    const filtered = filterLocations(LOCATIONS, "warehouse");
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].departments[0].designations.length, 1);
  });

  it("keeps the levels above a matching designation", () => {
    const filtered = filterLocations(LOCATIONS, "loader");
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].outlet_name, "Daily Needs-Warehouse");
    assert.equal(filtered[0].departments[0].department_name, "Inward");
  });

  it("drops a location with nothing matching in it", () => {
    assert.equal(filterLocations(LOCATIONS, "cashier").length, 0);
  });
});

describe("the checkpoint line", () => {
  it("labels each checkpoint with its time of day", () => {
    const cells = coverageCells(
      [
        { key: "opening", label: "Opening", time: "09:00" },
        { key: "peak", label: "Peak", time: "18:00" },
        { key: "closing", label: "Closing", time: "22:00" },
      ],
      { opening: 7, peak: 16, closing: 9 }
    );

    assert.deepEqual(cells.map((c) => [c.label, c.time, c.headcount]), [
      ["Opening", "9:00 AM", 7],
      ["Peak", "6:00 PM", 16],
      ["Closing", "10:00 PM", 9],
    ]);
  });

  it("reads a missing coverage object as zeroes rather than throwing", () => {
    const cells = coverageCells([{ key: "opening", label: "Opening", time: "09:00" }], null);
    assert.equal(cells[0].headcount, 0);
  });
});

describe("what a money figure may be called", () => {
  const level = (over) => ({
    total_headcount: 18,
    priced_headcount: 16,
    unpriced_headcount: 2,
    priced_monthly_budget: 182500,
    fully_priced: false,
    ...over,
  });

  it("calls it a Monthly Budget only when every approved position is priced", () => {
    const summary = budgetSummary(
      level({ unpriced_headcount: 0, priced_headcount: 18, fully_priced: true })
    );
    assert.equal(summary.complete, true);
    assert.equal(summary.label, "Monthly Budget");
    assert.equal(summary.amount, "₹1,82,500");
    assert.equal(summary.note, null);
  });

  it("calls a partial figure a Priced Budget and reports the unpriced HC", () => {
    const summary = budgetSummary(level());
    assert.equal(summary.complete, false);
    assert.equal(summary.label, "Priced Budget");
    assert.equal(summary.amount, "₹1,82,500");
    assert.equal(summary.unpriced_headcount, 2);
    assert.match(summary.note, /2 approved HC not priced/);
  });

  it("never lets a partial figure be labelled Monthly Budget", () => {
    // The regression: ECR showing the CSA+Cashier sum as "ECR Monthly Budget"
    // while Supervisor, Store Manager and Housekeeping sit there unpriced.
    const ecr = budgetSummary(
      level({ total_headcount: 42, priced_headcount: 16, unpriced_headcount: 26 })
    );
    assert.notEqual(ecr.label, "Monthly Budget");
    assert.equal(ecr.label, "Priced Budget");
    assert.equal(ecr.unpriced_headcount, 26);
  });

  it("gives no money figure at all when nothing is priced", () => {
    const summary = budgetSummary(
      level({ priced_monthly_budget: null, priced_headcount: 0, unpriced_headcount: 18 })
    );
    assert.equal(summary.amount, null);
    assert.equal(summary.label, null);
    assert.match(summary.note, /18 approved HC not priced/);
  });
});

describe("the rate suggestions", () => {
  it("offers the agreed amount for each of the five windows", () => {
    assert.equal(suggestedRateFor({ in_time: "09:00:00", out_time: "18:00:00" }), 11000);
    assert.equal(suggestedRateFor({ in_time: "09:00:00", out_time: "21:00:00" }), 14000);
    assert.equal(suggestedRateFor({ in_time: "10:00:00", out_time: "22:00:00" }), 14500);
    assert.equal(suggestedRateFor({ in_time: "14:00:00", out_time: "22:00:00" }), 11500);
    assert.equal(suggestedRateFor({ in_time: "18:00:00", out_time: "22:00:00" }), 5000);
  });

  it("offers nothing for a shift outside the five, rather than a guess", () => {
    assert.equal(suggestedRateFor({ in_time: "07:00:00", out_time: "15:00:00" }), null);
    assert.equal(suggestedRateFor({ in_time: null, out_time: null }), null);
    assert.equal(suggestedRateFor(null), null);
  });

  it("suggests an amount, and never a master record", () => {
    // It answers with a number. Which designation and which work shift the
    // rate belongs to is chosen by the person on the screen and sent as ids.
    assert.equal(typeof suggestedRateFor({ in_time: "10:00", out_time: "22:00" }), "number");
  });
});
