const {
  formatMoney,
  formatEffectiveFrom,
  presentCurrentSalary,
} = require("./salaryView");

/**
 * M4 — how the Salary History table reads a stored revision.
 *
 * Pure functions, no React, so the decisions that matter can be tested without
 * a renderer: what status a row is in, what its audit line says, and what the
 * three reason fields are called apart from one another.
 *
 * NOTHING HERE CALCULATES A SALARY. Every figure comes from the stored record
 * exactly as the M2 engine produced it, and the breakup is presented by
 * `util/salaryView.js#presentCurrentSalary` - the SAME presenter the Employee
 * Master's Payroll card uses, so one amount cannot read one way on the profile
 * and another way in Payroll.
 *
 * THE FIVE STATUSES, AND WHY NONE OF THEM IS DECIDED FROM A BROWSER CLOCK:
 *
 *   Current        the resolver's answer. Identity against the salary_id that
 *                  `GET /hr/salary/employee/:id/current` returned - not a date
 *                  comparison, not a guess.
 *   Future         APPROVED, dated after the current record. It has been
 *                  agreed and has not started.
 *   Past approved  APPROVED, dated on or before the current record, and
 *                  superseded by it.
 *   Pending        nobody has decided it yet. Never current, whatever its date.
 *   Rejected       it was refused. Never current, and it stays on the record.
 *
 * WHY THE COMPARISON IS AGAINST THE CURRENT RECORD RATHER THAN AGAINST TODAY.
 * "Today" in a browser is the user's device clock and its timezone, and an
 * effective date is a date-only value: comparing them is how a revision
 * effective on the 1st shows as Current in Chennai and Future for somebody
 * whose laptop is set to UTC. The server has already decided which record
 * applies today, and it decided it once, so every other row is positioned
 * relative to THAT. When the resolver answers with nothing - no approved
 * salary applies yet - every approved row is Future, which is exactly what
 * "nothing applies today" means.
 */

const STATUS = {
  CURRENT: "CURRENT",
  FUTURE: "FUTURE",
  PAST_APPROVED: "PAST_APPROVED",
  PENDING: "PENDING",
  REJECTED: "REJECTED",
};

/** Label and Chakra colour scheme for each status. */
const STATUS_BADGE = {
  [STATUS.CURRENT]: { label: "Current", colorScheme: "green" },
  [STATUS.FUTURE]: { label: "Future", colorScheme: "blue" },
  [STATUS.PAST_APPROVED]: { label: "Past approved", colorScheme: "gray" },
  [STATUS.PENDING]: { label: "Pending", colorScheme: "orange" },
  [STATUS.REJECTED]: { label: "Rejected", colorScheme: "red" },
};

/** How a record came to exist, in words rather than in an enum. */
const SOURCE_LABEL = {
  OPENING_SALARY: "Opening Salary",
  REVISION: "Revision",
  CORRECTION: "Correction",
  IMPORT: "Import",
};

/**
 * Which of the five a stored row is in.
 *
 * @param record  one row from `GET /hr/salary/employee/:id/history`
 * @param current the resolver's answer - `{ salary_id, effective_from }` - or
 *                null when nothing is approved and effective today
 */
function statusOf(record, current) {
  if (!record) return null;
  if (record.status === "PENDING") return STATUS.PENDING;
  if (record.status === "REJECTED") return STATUS.REJECTED;

  // Everything below here is APPROVED.
  if (current && Number(current.salary_id) === Number(record.salary_id)) {
    return STATUS.CURRENT;
  }
  // With no current record, nothing approved applies today, so every approved
  // row is still ahead of the line.
  if (!current || !current.effective_from) return STATUS.FUTURE;

  // Two date-only strings the SERVER produced, compared as strings. `YYYY-MM-DD`
  // sorts lexicographically, which is why the API sends that shape.
  return String(record.effective_from) > String(current.effective_from)
    ? STATUS.FUTURE
    : STATUS.PAST_APPROVED;
}

/** The badge for a row, ready to render. */
function badgeFor(record, current) {
  const status = statusOf(record, current);
  return status ? { status, ...STATUS_BADGE[status] } : null;
}

/**
 * A timestamp as "12 Sep 2026, 14:32".
 *
 * A `created_at` IS a moment in time, unlike an effective date, so it goes
 * through a Date quite correctly and is shown in the reader's own timezone.
 * Effective dates never do - see `formatEffectiveFrom`, which parses the
 * string, because moving one of those by a timezone is the difference between
 * a salary applying this month and next.
 */
function formatTimestamp(value) {
  if (!value) return null;
  const at = new Date(value);
  if (Number.isNaN(at.getTime())) return String(value);
  const date = at.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = at.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date}, ${time}`;
}

/**
 * WHO did what, and when.
 *
 * A name when the backend resolved one, the raw employee id when it could not
 * - a deleted or renamed actor leaves an id rather than an empty cell, because
 * "employee 41" is still an answer and a blank is not. Only the steps that
 * actually happened appear: an approved record has no rejection line.
 */
function auditTrail(record) {
  if (!record) return [];
  const trail = [];

  const person = (name, id) => {
    if (name) return name;
    if (id === null || id === undefined) return "not recorded";
    return `Employee ${id}`;
  };

  trail.push({
    key: "created",
    label: "Created by",
    who: person(record.created_by_name, record.created_by),
    at: formatTimestamp(record.created_at),
  });

  if (record.status === "APPROVED" || record.approved_at || record.approved_by) {
    trail.push({
      key: "approved",
      label: "Approved by",
      who: person(record.approved_by_name, record.approved_by),
      at: formatTimestamp(record.approved_at),
    });
  }

  if (record.status === "REJECTED" || record.rejected_at || record.rejected_by) {
    trail.push({
      key: "rejected",
      label: "Rejected by",
      who: person(record.rejected_by_name, record.rejected_by),
      at: formatTimestamp(record.rejected_at),
      note: record.rejection_reason || null,
    });
  }

  return trail;
}

/**
 * One history row, everything a person needs to audit it.
 *
 * THE THREE REASONS ARE THREE FIELDS AND ARE NEVER MERGED. `revision_reason`
 * is why the pay is changing, `override_reason` is why the breakup departs
 * from the automatic one, and the rejection's reason sits on the rejection
 * line where it belongs, because it was written by somebody else at a
 * different moment.
 */
function presentHistoryRow(record, current) {
  if (!record) return null;
  return {
    salary_id: record.salary_id,
    badge: badgeFor(record, current),
    effective_from: formatEffectiveFrom(record.effective_from),
    effective_from_raw: record.effective_from || null,
    monthly_gross: formatMoney(record.monthly_gross),
    source: record.source || null,
    source_label: SOURCE_LABEL[record.source] || record.source || null,
    revision_reason: record.revision_reason || null,
    manual_override: record.manual_override === true || Number(record.manual_override) === 1,
    override_reason: record.override_reason || null,
    rejection_reason: record.rejection_reason || null,
    audit: auditTrail(record),
    // The same presenter the Employee Master's Payroll card uses: the four
    // components, both deductions, the five employer costs and the CTC, with
    // Pending said as Pending and never as zero.
    figures: presentCurrentSalary(record),
  };
}

/** The whole history, newest first - the order the API already sends. */
function presentHistory(records, current) {
  if (!Array.isArray(records)) return [];
  return records.map((record) => presentHistoryRow(record, current));
}

/**
 * The pending record an `edit_salary` holder may amend, if any.
 *
 * AT MOST ONE, because that is what the schema allows: a unique index permits
 * one non-rejected revision per employee per effective date, and the usecase
 * refuses a second outstanding future one. Returning the first pending row
 * rather than a list keeps the screen from implying a queue it cannot have.
 */
function pendingRecord(records) {
  if (!Array.isArray(records)) return null;
  return records.find((r) => r && r.status === "PENDING") || null;
}

module.exports = {
  STATUS,
  STATUS_BADGE,
  SOURCE_LABEL,
  statusOf,
  badgeFor,
  formatTimestamp,
  auditTrail,
  presentHistoryRow,
  presentHistory,
  pendingRecord,
};
