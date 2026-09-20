/**
 * Staff Budget Master — the screen's formatting, its grid and its payloads.
 *
 * Pure, and separate from the screen for the reason util/workShiftForm.js
 * gives: there is no React test runner in this repo, so logic left inside a
 * component is logic that cannot be tested. What most needs testing here is
 * exactly what would otherwise hide in JSX — which shifts the editor offers,
 * what gets sent to the backend, and the difference between "no rate
 * configured" and "zero rupees".
 *
 * THE BACKEND IS AUTHORITATIVE. Every total, every monthly budget and every
 * Opening/Peak/Closing figure on this screen is computed server-side in
 * utils/staffBudget.js and arrives ready to render. Nothing here recomputes
 * them, so the screen and the API can never disagree about what a location
 * costs. What is here is presentation, plus the shape of what is sent back.
 *
 * A PARTIAL MONEY FIGURE IS NEVER LABELLED A TOTAL. Only two designations
 * have agreed rates today, so a location holding five more is showing the
 * priced PART of its staff budget. `budgetSummary` is what decides the words:
 * "Monthly Budget" only when every approved position at that level is priced,
 * and "Priced Budget" with the unpriced headcount beside it otherwise.
 *
 * THE SHIFT IS A `work_shift` - the master the attendance engine resolves
 * against. Its window comes from the server, reduced from the shift's weekly
 * schedule; `schedule_varies` means the shift does not run the same hours on
 * every working day, which qualifies the checkpoint figures rather than
 * hiding them.
 *
 * NAMES ARE FOR PEOPLE, IDS ARE FOR THE SERVER. Everything displayed is a
 * master's name; every payload carries that master's id. No lookup in this
 * file matches a record by its display name.
 */

/** A blank, not a zero: nothing was configured, which is not the same as free. */
const NOT_PRICED = "—";

/**
 * Rupees, Indian digit grouping, no paise.
 *
 * Budgets here are whole monthly salaries; showing "₹1,82,500.00" adds two
 * digits that are always zero to every row of the screen.
 */
function formatRupees(value) {
  if (value === null || value === undefined || value === "") return NOT_PRICED;
  const n = Number(value);
  if (!Number.isFinite(n)) return NOT_PRICED;
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/** Headcount is always a number, including zero — zero approved IS a decision. */
function formatHeadcount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : "0";
}

/** "9:00 AM", from the "09:00:00" MySQL hands back. */
function formatTimeOfDay(value) {
  if (!value) return "";
  const match = /^(\d{1,2}):([0-5]\d)/.exec(String(value).trim());
  if (!match) return String(value);
  const hours = Number(match[1]);
  const minutes = match[2];
  const suffix = hours >= 12 ? "PM" : "AM";
  const display = hours % 12 === 0 ? 12 : hours % 12;
  return `${display}:${minutes} ${suffix}`;
}

/** "9:00 AM – 6:00 PM", the label a shift row carries. */
function formatShiftWindow(shift) {
  if (!shift) return "";
  const from = formatTimeOfDay(shift.in_time);
  const to = formatTimeOfDay(shift.out_time);
  if (!from || !to) return shift.shift_name || "";
  return `${from} – ${to}`;
}

/**
 * The editable grid for one designation: EVERY active shift, whether or not
 * it is already in the plan.
 *
 * A shift with no budget row appears at 0 rather than being absent, because
 * the question the screen asks is "how many on each shift" and a missing line
 * reads as an answer of none while actually being no answer at all. Rows that
 * exist keep their `staff_budget_id` so the screen can show their history.
 *
 * Ordered by In time, which is how a roster reads.
 */
function buildShiftGrid(shifts, existingRows) {
  const byShift = new Map(
    (existingRows || []).map((row) => [Number(row.work_shift_id), row])
  );

  return (shifts || [])
    .map((shift) => {
      const existing = byShift.get(Number(shift.work_shift_id));
      return {
        work_shift_id: Number(shift.work_shift_id),
        shift_name: shift.shift_name,
        shift_code: shift.shift_code,
        in_time: shift.in_time,
        out_time: shift.out_time,
        schedule_varies: Boolean(shift.schedule_varies),
        staff_budget_id: existing ? existing.staff_budget_id : null,
        approved_headcount: existing ? Number(existing.approved_headcount) : 0,
        monthly_rate:
          existing && existing.monthly_rate !== null && existing.monthly_rate !== undefined
            ? Number(existing.monthly_rate)
            : null,
        is_new: !existing,
      };
    })
    .sort((a, b) => String(a.in_time || "").localeCompare(String(b.in_time || "")));
}

/**
 * What a grid save sends.
 *
 * Every row goes, including the ones left at 0: sending only the changed ones
 * would make "set this shift back to nobody" indistinguishable from "leave it
 * alone". The four ids travel with each row because the combination IS the
 * identity of a budget row.
 */
function toBulkPayload({ outlet_id, department_id, designation_id }, gridRows) {
  return {
    rows: (gridRows || []).map((row) => ({
      outlet_id: Number(outlet_id),
      department_id: Number(department_id),
      designation_id: Number(designation_id),
      work_shift_id: Number(row.work_shift_id),
      approved_headcount: Number(row.approved_headcount) || 0,
    })),
  };
}

/**
 * Is what somebody typed into an Approved HC box a number the backend will
 * accept?
 *
 * Mirrors utils/staffBudget.js so the screen can refuse it immediately, and
 * does NOT replace it: the backend validates every request regardless of what
 * this returned.
 */
function validateGridRow(row) {
  const raw = row && row.approved_headcount;
  if (raw === "" || raw === null || raw === undefined) {
    return "Approved HC is required";
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    return "Approved HC must be a whole number";
  }
  if (n < 0) return "Approved HC cannot be negative";
  return null;
}

/** The first problem in a grid, or null when it is ready to save. */
function validateGrid(gridRows) {
  for (const row of gridRows || []) {
    const problem = validateGridRow(row);
    if (problem) return `${row.shift_name || "Shift"}: ${problem}`;
  }
  return null;
}

/**
 * Filter the hierarchy by what somebody typed, keeping the hierarchy.
 *
 * A match on a designation keeps its department and its location around it,
 * because a designation shown without the two levels above it is not
 * something anyone can act on. Totals are NOT recomputed for a filtered view:
 * they remain what the server said the level actually holds, and the screen
 * says the view is filtered rather than quietly showing a smaller total.
 */
function filterLocations(locations, search) {
  const needle = String(search || "").trim().toLowerCase();
  if (!needle) return locations || [];

  const matches = (value) => String(value || "").toLowerCase().includes(needle);

  return (locations || [])
    .map((location) => {
      if (matches(location.outlet_name)) return location;

      const departments = location.departments
        .map((department) => {
          if (matches(department.department_name)) return department;
          const designations = department.designations.filter((designation) =>
            matches(designation.designation_name)
          );
          return designations.length === 0 ? null : { ...department, designations };
        })
        .filter(Boolean);

      return departments.length === 0 ? null : { ...location, departments };
    })
    .filter(Boolean);
}

/**
 * The Opening / Peak / Closing line for a designation.
 *
 * SAID IN WORDS ON THE SCREEN, because the numbers invite exactly one
 * misreading: that they should add up to the total. They do not. The total is
 * approved POSITIONS; each checkpoint is how many of those positions are on
 * the floor at that moment, and one position on a long shift appears at more
 * than one checkpoint while still being one position.
 */
function coverageCells(checkpoints, coverage) {
  return (checkpoints || []).map((checkpoint) => ({
    key: checkpoint.key,
    label: checkpoint.label,
    time: formatTimeOfDay(checkpoint.time),
    headcount: coverage ? Number(coverage[checkpoint.key]) || 0 : 0,
  }));
}

/**
 * What a level's money figure may be CALLED, and what has to be said beside
 * it.
 *
 * This is the whole of the partial-pricing rule in one place. A level whose
 * every approved position carries a rate has a complete figure and is called
 * a Monthly Budget. A level holding even one unpriced approved position does
 * not: calling the priced part "ECR Monthly Budget" would understate what the
 * store actually costs, by an amount nobody can see. So it is labelled Priced
 * Budget and the unpriced headcount is reported alongside, where it cannot be
 * missed.
 *
 * A level with nothing priced gets no money figure at all rather than a zero.
 */
function budgetSummary(level) {
  if (!level) return null;

  const priced = level.priced_monthly_budget;
  const unpriced = Number(level.unpriced_headcount) || 0;

  if (priced === null || priced === undefined) {
    return {
      complete: false,
      label: null,
      amount: null,
      unpriced_headcount: unpriced,
      note: unpriced > 0 ? `${unpriced} approved HC not priced` : null,
    };
  }

  if (level.fully_priced) {
    return {
      complete: true,
      label: "Monthly Budget",
      amount: formatRupees(priced),
      unpriced_headcount: 0,
      note: null,
    };
  }

  return {
    complete: false,
    label: "Priced Budget",
    amount: formatRupees(priced),
    unpriced_headcount: unpriced,
    note: `${unpriced} approved HC not priced`,
  };
}

/**
 * The agreed monthly rates, as SUGGESTIONS ON THE RATE SCREEN ONLY.
 *
 * Matched to a work shift by the window the SERVER resolved for it, purely to
 * pre-fill the amount box after a person has already chosen the designation
 * and the shift by name. Nothing here selects a master record, and nothing
 * here is sent: the payload carries the `designation_id` and `work_shift_id`
 * the person picked. A wrong suggestion is visible in the box and editable
 * before it is saved, which is exactly what a silent server-side match would
 * not be.
 */
const SUGGESTED_RATES = [
  { in_time: "09:00", out_time: "18:00", monthly_rate: 11000 },
  { in_time: "09:00", out_time: "21:00", monthly_rate: 14000 },
  { in_time: "10:00", out_time: "22:00", monthly_rate: 14500 },
  { in_time: "14:00", out_time: "22:00", monthly_rate: 11500 },
  { in_time: "18:00", out_time: "22:00", monthly_rate: 5000 },
];

/** "09:00:00" and "09:00" are the same time; compare on HH:MM. */
const hhmm = (value) => {
  const match = /^(\d{1,2}):([0-5]\d)/.exec(String(value || "").trim());
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : null;
};

/**
 * The agreed amount for a shift's window, or null when it is not one of the
 * five. A suggestion, never a selection - see SUGGESTED_RATES.
 */
function suggestedRateFor(shift) {
  if (!shift) return null;
  const found = SUGGESTED_RATES.find(
    (rate) =>
      hhmm(rate.in_time) === hhmm(shift.in_time) &&
      hhmm(rate.out_time) === hhmm(shift.out_time)
  );
  return found ? found.monthly_rate : null;
}

module.exports = {
  NOT_PRICED,
  SUGGESTED_RATES,
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
};
