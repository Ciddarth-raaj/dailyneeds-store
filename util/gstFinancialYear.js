import moment from "moment";

/**
 * Indian financial year: April → March.
 * @param {Date} [ref]
 * @returns {{ year: number, month: number }[]} 12 entries in order Apr→Mar
 */
export function getIndianFinancialYearMonths(ref = new Date()) {
  const calY = ref.getFullYear();
  const calM = ref.getMonth() + 1;
  const fyStartYear = calM >= 4 ? calY : calY - 1;
  const out = [];
  for (let m = 4; m <= 12; m += 1) {
    out.push({ year: fyStartYear, month: m });
  }
  for (let m = 1; m <= 3; m += 1) {
    out.push({ year: fyStartYear + 1, month: m });
  }
  return out;
}

/** Stable field id for AgGrid column (e.g. p_2026_04). */
export function gstFyMonthFieldKey(year, month) {
  return `p_${year}_${String(month).padStart(2, "0")}`;
}

/** Header label e.g. "Apr 2026". */
export function gstFyMonthHeaderLabel(year, month) {
  return moment({ year, month: month - 1, day: 1 }).format("MMM YYYY");
}

/** `YYYY-MM` for the calendar month before `ref` (default sync period). */
export function lastMonthYYYYMM(ref = new Date()) {
  const d = new Date(ref);
  d.setMonth(d.getMonth() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** @returns {{ year: number, month: number } | null} */
export function parseYYYYMM(value) {
  if (!value || typeof value !== "string") return null;
  const m = /^([0-9]{4})-([0-9]{2})$/.exec(value.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

/** FY start year for a calendar year/month pair (April starts the year). */
export function financialYearStartYear(year, month) {
  return month >= 4 ? year : year - 1;
}

/** FY start year containing a `YYYY-MM` period, or null when unparseable. */
export function financialYearOfPeriod(period) {
  const parsed = parseYYYYMM(period);
  if (!parsed) return null;
  return financialYearStartYear(parsed.year, parsed.month);
}

/** Label e.g. "FY 2026-27". */
export function formatFinancialYearLabel(fyStartYear) {
  const end = String((fyStartYear + 1) % 100).padStart(2, "0");
  return `FY ${fyStartYear}-${end}`;
}

/**
 * `YYYY-MM` bounds of a financial year: April of the start year to March of
 * the next. A financial year still running is cut off at `maxPeriod`, so the
 * range never reaches into months that cannot have a return yet.
 * @returns {{ from: string, to: string } | null} null when the FY has not started
 */
export function financialYearPeriodRange(fyStartYear, maxPeriod) {
  const from = `${fyStartYear}-04`;
  const to = `${fyStartYear + 1}-03`;
  if (!maxPeriod) return { from, to };
  if (from > maxPeriod) return null;
  return { from, to: to > maxPeriod ? maxPeriod : to };
}

/**
 * Financial years available to pick, newest first: the one containing
 * `maxPeriod` and the `previousCount` before it.
 */
export function listFinancialYears(maxPeriod, previousCount = 5) {
  const latest = financialYearOfPeriod(maxPeriod);
  if (latest == null) return [];
  const years = [];
  for (let i = 0; i <= previousCount; i += 1) {
    years.push(latest - i);
  }
  return years;
}

/**
 * The financial year a period range covers exactly, or null when the range is
 * a custom span. Compared against the same clamping selection applies.
 */
export function financialYearForPeriodRange(fromPeriod, toPeriod, maxPeriod) {
  const fy = financialYearOfPeriod(fromPeriod);
  if (fy == null) return null;
  const range = financialYearPeriodRange(fy, maxPeriod);
  if (!range) return null;
  return range.from === fromPeriod && range.to === toPeriod ? fy : null;
}
