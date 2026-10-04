/**
 * The joining-date entry window, on the browser's side.
 *
 *   node --test util/joiningDateWindow.test.js
 *
 * The backend applies the same rule to every API that writes a joining date;
 * this file proves the browser copy agrees with it, and that each screen that
 * records a joining date both bounds its picker and checks the value.
 */
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  JOINING_DATE_ERROR,
  istTodayIso,
  joiningDateBounds,
  joiningDateWindowError,
  canCorrectJoiningDateHistorically,
  historicalCorrectionBounds,
  historicalCorrectionDateError,
  correctionReasonError,
} = require("./joiningDateWindow");
const { joiningDateChanged } = require("./joiningDate");

const TODAY = "2026-10-04";
const check = (date) => joiningDateWindowError(date, TODAY);

describe("the window for 04-Oct-2026", () => {
  it("bounds the picker to 04-Sep-2026 .. 03-Nov-2026", () => {
    assert.deepEqual(joiningDateBounds(TODAY), { min: "2026-09-04", max: "2026-11-03" });
  });
  it("1-3. today, today - 1 and today - 30 are allowed", () => {
    assert.equal(check("2026-10-04"), null);
    assert.equal(check("2026-10-03"), null);
    assert.equal(check("2026-09-04"), null);
    assert.equal(check("2026-09-20"), null);
  });
  it("4. today - 31 is blocked", () => {
    assert.equal(check("2026-09-03"), "Joining date cannot be more than 30 days before today.");
    assert.equal(check("2026-08-03"), JOINING_DATE_ERROR.TOO_EARLY);
  });
  it("5-6. today + 1 and today + 30 are allowed", () => {
    assert.equal(check("2026-10-05"), null);
    assert.equal(check("2026-11-03"), null);
  });
  it("7. today + 31 is blocked", () => {
    assert.equal(check("2026-11-04"), "Joining date cannot be more than 30 days after today.");
  });
  it("8. the 03/10/2006 typo is blocked", () => {
    assert.equal(check("2006-10-03"), JOINING_DATE_ERROR.TOO_EARLY);
  });
});

describe("14. today is the IST calendar date, whatever the browser's zone", () => {
  it("19:00 UTC on 3 Oct is already 4 Oct in India", () => {
    assert.equal(istTodayIso(new Date(Date.UTC(2026, 9, 3, 19, 0))), "2026-10-04");
  });
  it("18:29 UTC on 4 Oct is still 4 Oct in India", () => {
    assert.equal(istTodayIso(new Date(Date.UTC(2026, 9, 4, 18, 29))), "2026-10-04");
  });
  it("crosses month and year ends by whole days", () => {
    assert.deepEqual(joiningDateBounds("2026-12-20"), { min: "2026-11-20", max: "2027-01-19" });
    assert.deepEqual(joiningDateBounds("2028-02-29"), { min: "2028-01-30", max: "2028-03-30" });
  });
});

describe("9-11. a historical employee's edit judges only a CHANGED date", () => {
  const STORED = "2015-06-15";
  /** What the profile's save does: judge the date only when it moved. */
  const saveError = (submitted) =>
    joiningDateChanged(submitted, STORED) ? joiningDateWindowError(submitted, TODAY) : null;

  it("9/10. the untouched 2015 date is not judged", () => {
    assert.equal(saveError("2015-06-15"), null);
  });
  it("11. moving it to 2010 is blocked", () => {
    assert.equal(saveError("2010-01-01"), JOINING_DATE_ERROR.TOO_EARLY);
  });
});

describe("every screen that records a joining date bounds its picker and checks the value", () => {
  const read = (rel) => fs.readFileSync(path.join(__dirname, "..", rel), "utf8");

  it("New Employee", () => {
    const src = read("pages/hr/employees/new.jsx");
    assert.match(src, /joiningDateBounds\(\)/);
    const rules = read("util/hrOnboarding.js");
    assert.match(rules, /joiningDateWindowError\(form\.date_of_joining/);
  });
  it("Employee profile - Employment Details joining-date correction", () => {
    const src = read("components/hr/profile/EmploymentSection.jsx");
    assert.match(src, /joiningDateBounds\(\)/);
    assert.match(src, /joiningChanged \? joiningDateWindowError\(date_of_joining\) : null/);
  });
  it("Rejoin", () => {
    const src = read("components/hr/LifecycleActionModals.jsx");
    assert.match(src, /joiningDateBounds\(\)/);
    assert.match(src, /joiningDateWindowError\(date\)/);
  });
});

describe("the historical joining-date correction (its own action)", () => {
  const key = (k) => ({ permission_key: k });
  it("is offered only with the historical key AND employee_edit, or to an administrator", () => {
    assert.equal(canCorrectJoiningDateHistorically({ permissions: [key("employee_edit")] }), false);
    assert.equal(
      canCorrectJoiningDateHistorically({ permissions: [key("employee_joining_date_historical_correction")] }),
      false
    );
    assert.equal(
      canCorrectJoiningDateHistorically({
        permissions: [key("employee_edit"), key("employee_joining_date_historical_correction")],
      }),
      true
    );
    assert.equal(canCorrectJoiningDateHistorically({ permissions: [], isAdmin: true }), true);
    assert.equal(canCorrectJoiningDateHistorically({ permissions: [], isAdmin: "true" }), false);
  });
  it("allows any past date but still not today + 31", () => {
    assert.deepEqual(historicalCorrectionBounds(TODAY), { max: "2026-11-03" });
    assert.equal(historicalCorrectionDateError("2015-06-01", TODAY), null);
    assert.equal(historicalCorrectionDateError("2026-11-03", TODAY), null);
    assert.equal(historicalCorrectionDateError("2026-11-04", TODAY), JOINING_DATE_ERROR.TOO_LATE);
  });
  it("requires a reason of at least 10 characters", () => {
    assert.ok(correctionReasonError(""));
    assert.ok(correctionReasonError("typo fix"));
    assert.equal(correctionReasonError("Appointment letter on file"), null);
  });
  it("is not exposed on New Employee or Rejoin, and is labelled on the profile", () => {
    const read = (rel) => fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
    assert.ok(!/historicalCorrection|HistoricalJoiningDate/.test(read("pages/hr/employees/new.jsx")));
    const modals = read("components/hr/LifecycleActionModals.jsx");
    const rejoin = modals.slice(modals.indexOf("export function RejoinModal"), modals.indexOf("export function HistoricalJoiningDateModal"));
    assert.ok(!/historicalCorrection/.test(rejoin), "Rejoin keeps the 30-day picker");
    assert.match(modals, /This is a HISTORICAL CORRECTION/);
    assert.match(modals, /isDisabled=\{!date \|\| Boolean\(correctionReasonError\(reason\)\)\}/);
    const profile = read("pages/hr/employees/[id].jsx");
    assert.match(profile, /mayCorrectHistorically && lifecycle \?/);
  });
});
