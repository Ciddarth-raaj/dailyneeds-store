/**
 * Payroll Dashboard - the screen's pure helpers.
 *
 * NOTHING HERE TOTALS A PAYROLL. Every count and every rupee is aggregated on
 * the server (`/payroll/dashboard/*`); this file only formats what came back,
 * names the financial year, and builds the links into the Payrun screen.
 *
 * CommonJS so `node --test` can load it, like the other payroll utils.
 */
const { formatMoney } = require("./salaryView");

const MONTH_ABBR = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const MONTH_NAME = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/* ------------------------------------------------------------------ money */

/** "₹29,07,375.00" - Indian grouping, paise kept. "—" when there is no figure. */
function formatINR(value) {
  return formatMoney(value) || "—";
}

/**
 * THE COMPACT INDIAN FORM, for cards and chart labels.
 *
 *   below one lakh   in full, Indian grouping: ₹0, ₹9, ₹950, ₹9,500, ₹95,000
 *                    (paise shown only when there are any: ₹9.50)
 *   lakh             two fixed decimals: ₹9.50L, ₹29.07L
 *   crore            two fixed decimals: ₹1.46Cr
 *
 * Decimals are FIXED, never trimmed - ₹9.50L stays ₹9.50L - and no
 * meaningful zero is ever removed (the ₹950 -> ₹95 bug). A value that rounds
 * up to the next unit moves to it (99,99,999 -> ₹1.00Cr, not ₹100.00L).
 */
function compactINR(value) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const r2 = (x) => Math.round(x * 100) / 100;
  if (abs >= 1e5) {
    const lakh = r2(abs / 1e5);
    if (abs >= 1e7 || lakh >= 100) return `${sign}₹${r2(abs / 1e7).toFixed(2)}Cr`;
    return `${sign}₹${lakh.toFixed(2)}L`;
  }
  const paise = Math.round(abs * 100);
  const whole = paise % 100 === 0;
  const text = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(paise / 100);
  return `${sign}₹${text}`;
}

/* ----------------------------------------------------------------- months */

/** The financial year (its starting calendar year) a month belongs to. */
function financialYearOf(year, month) {
  return Number(month) >= 4 ? Number(year) : Number(year) - 1;
}

function fyLabel(fy) {
  return `FY ${fy}-${String(Number(fy) + 1).slice(-2)}`;
}

/** The selectable financial years: this one and the `back` before it, newest first. */
function fyOptions(currentFy, back = 3) {
  return Array.from({ length: back + 1 }, (_, i) => Number(currentFy) - i);
}

/** April of `fy` to March of `fy + 1`. */
function financialYearMonths(fy) {
  const start = Number(fy);
  return Array.from({ length: 12 }, (_, i) => {
    const m = ((3 + i) % 12) + 1;
    return { year: m >= 4 ? start : start + 1, month: m };
  });
}

function shortMonthLabel(year, month) {
  return `${MONTH_ABBR[month - 1]} '${String(year).slice(-2)}`;
}

function monthLabel(year, month) {
  return `${MONTH_NAME[month - 1]} ${year}`;
}

function monthKey(p) {
  return p ? `${p.year}-${p.month}` : "";
}

function parseMonthKey(key) {
  const m = String(key || "").match(/^(\d{4})-(\d{1,2})$/);
  return m ? { year: Number(m[1]), month: Number(m[2]) } : null;
}

function previousMonth({ year, month }) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

/**
 * THE MONTH THE DASHBOARD OPENS ON for a financial year: the latest month that
 * has a payroll started, else the current month if it is in that year, else
 * April.
 */
function defaultMonth(strip, fy, today) {
  const started = (strip || []).filter((m) => Number(m.initialized) > 0);
  if (started.length) {
    const last = started[started.length - 1];
    return { year: last.year, month: last.month };
  }
  if (today && financialYearOf(today.year, today.month) === Number(fy)) return { year: today.year, month: today.month };
  return financialYearMonths(fy)[0];
}

/** The months a comparison can be made against: two financial years, minus the selected one. */
function comparisonChoices(selected, fy) {
  const all = [...financialYearMonths(Number(fy) - 1), ...financialYearMonths(fy)];
  return all
    .filter((m) => !(selected && m.year === selected.year && m.month === selected.month))
    .reverse()
    .map((m) => ({ ...m, key: monthKey(m), label: monthLabel(m.year, m.month) }));
}

/** How each month-strip status looks and reads. */
const MONTH_STATUS = Object.freeze({
  FUTURE: { label: "Upcoming", color: "gray.300" },
  NOT_STARTED: { label: "Not started", color: "gray.400" },
  INITIALIZED: { label: "Initialized", color: "blue.400" },
  CALCULATING: { label: "In progress", color: "orange.400" },
  // About the INITIALIZED employees only - the month may still have people
  // not initialized (the Not Initialized card says how many).
  APPROVED: { label: "All initialized approved & locked", color: "green.500" },
  PUBLISHED: { label: "All initialized payslips published", color: "green.700" },
});

function monthStatusMeta(status) {
  return MONTH_STATUS[status] || MONTH_STATUS.NOT_STARTED;
}

/* ---------------------------------------------------------------- filters */

const EMPTY_FILTERS = Object.freeze({ store_id: "", department_id: "", designation_id: "" });

/**
 * DEPENDENT FILTERS. A new location clears the department and designation; a
 * new department clears the designation. The server then offers only what
 * exists under the new choice.
 */
function nextFilters(current, key, value) {
  const next = { ...EMPTY_FILTERS, ...current, [key]: value === null || value === undefined ? "" : String(value) };
  if (key === "store_id") {
    next.department_id = "";
    next.designation_id = "";
  }
  if (key === "department_id") next.designation_id = "";
  return next;
}

function hasFilters(filters) {
  return Boolean(filters && (filters.store_id || filters.department_id || filters.designation_id));
}

/** Only the filters that are set - what goes on the request. */
function filterParams(filters) {
  const out = {};
  ["store_id", "department_id", "designation_id"].forEach((k) => {
    if (filters && filters[k] !== "" && filters[k] !== null && filters[k] !== undefined) out[k] = filters[k];
  });
  return out;
}

/* ------------------------------------------------------------- comparison */

/** "up" / "down" / "flat" for a difference the server computed. */
function direction(difference) {
  const n = Number(difference);
  if (difference === null || difference === undefined || !Number.isFinite(n) || n === 0) return "flat";
  return n > 0 ? "up" : "down";
}

/* ------------------------------------------------------- links to Payrun */

const STAGES = ["INITIALIZATION", "ADJUSTMENTS", "CALCULATION"];
const CARD_PATTERN = /^[A-Z_]{1,60}$/;

/**
 * A link into the Payrun screen at exactly the month, stage, card and filters
 * - and, for one employee, their id as the search (the payrun screens search
 * on the employee id).
 */
function payrunHref({ year, month, stage, card, store_id, department_id, designation_id, search } = {}) {
  const q = new URLSearchParams();
  if (year) q.set("year", String(year));
  if (month) q.set("month", String(month));
  if (stage && STAGES.includes(stage)) q.set("stage", stage);
  if (card && CARD_PATTERN.test(card)) q.set("card", card);
  if (store_id) q.set("store_id", String(store_id));
  if (department_id) q.set("department_id", String(department_id));
  if (designation_id) q.set("designation_id", String(designation_id));
  if (search !== undefined && search !== null && search !== "") q.set("search", String(search));
  const s = q.toString();
  return s ? `/payroll/payrun?${s}` : "/payroll/payrun";
}

/**
 * THE PAYRUN SCREEN'S SIDE OF THAT LINK - what it may take from the URL.
 * Anything malformed is dropped, never guessed; the server still decides
 * what the caller may see.
 */
function parsePayrunLink(query = {}) {
  const one = (v) => (Array.isArray(v) ? v[0] : v);
  const int = (v, min, max) => {
    const n = Number(one(v));
    return Number.isInteger(n) && n >= min && n <= max ? n : null;
  };
  const id = (v) => {
    const n = int(v, 1, Number.MAX_SAFE_INTEGER);
    return n === null ? "" : String(n);
  };
  const stage = String(one(query.stage) || "").toUpperCase();
  const card = String(one(query.card) || "").toUpperCase();
  const search = one(query.search);
  const link = {
    year: int(query.year, 2000, 2100),
    month: int(query.month, 1, 12),
    stage: STAGES.includes(stage) ? stage : null,
    card: CARD_PATTERN.test(card) ? card : null,
    store_id: id(query.store_id),
    department_id: id(query.department_id),
    designation_id: id(query.designation_id),
    search: typeof search === "string" ? search.slice(0, 120) : "",
  };
  link.present = Boolean(link.year || link.month || link.stage || link.card || link.store_id || link.search);
  return link;
}

/* --------------------------------------------------------------- severity */

const SEVERITY_TONE = Object.freeze({ high: "red", medium: "orange", low: "blue" });

function severityTone(severity) {
  return SEVERITY_TONE[severity] || "gray";
}

/** The panel's headline: how many employees still need something. */
function outstandingActions(actions) {
  return (actions || []).filter((a) => a.severity !== "low" && Number(a.count) > 0);
}

module.exports = {
  MONTH_ABBR,
  MONTH_NAME,
  EMPTY_FILTERS,
  formatINR,
  compactINR,
  financialYearOf,
  fyLabel,
  fyOptions,
  financialYearMonths,
  shortMonthLabel,
  monthLabel,
  monthKey,
  parseMonthKey,
  previousMonth,
  defaultMonth,
  comparisonChoices,
  monthStatusMeta,
  nextFilters,
  hasFilters,
  filterParams,
  direction,
  payrunHref,
  parsePayrunLink,
  severityTone,
  outstandingActions,
};
