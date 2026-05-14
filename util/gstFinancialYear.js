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
