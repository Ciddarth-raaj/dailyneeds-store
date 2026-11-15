/**
 * Warehouse Flow on the Business Dashboard - what is in each step, for the
 * chosen store, from `GET /warehouse-flow/flow`.
 *
 *   1. Gate pass -> 2. Inspection -> 3. GRN -> 4. Allocation -> 5. Ready to dispatch
 *
 * Every row says when it entered its step (`since`); its age is worked out
 * here against now, so a list read a minute ago still ages.
 *
 * CommonJS, so it is unit-tested with `node --test` and no bundler.
 */

/** Hours since an ISO time, to one decimal; null when there is no time. */
function hoursSince(isoTime, nowMs = Date.now()) {
  const t = Date.parse(isoTime);
  return Number.isFinite(t) ? Math.round((Math.max(0, nowMs - t) / 3600000) * 10) / 10 : null;
}

/** A step's (or a list's) rows for the chosen store, longest waiting first, each with `hours`. */
function stepRows(section, store = "", nowMs = Date.now()) {
  return ((section && section.rows) || [])
    .filter((r) => !store || r.store === store)
    .map((r) => ({ ...r, hours: hoursSince(r.since, nowMs) }))
    .sort((a, b) => (b.hours || 0) - (a.hours || 0));
}

/** A tile's numbers: how many, the longest wait, how many over a day, GRNs started. */
function stepSummary(rows) {
  const list = rows || [];
  return {
    count: list.length,
    oldest_hours: list.length ? Math.max(...list.map((r) => r.hours || 0)) : null,
    over_day: list.filter((r) => (r.hours || 0) >= 24).length,
    grn_started: list.filter((r) => r.grn_started).length,
  };
}

/** What a row's status reads as, in the step it is in. */
function rowStatus(stepKey, row) {
  if (stepKey === "gate_pass") return "No inspection yet";
  if (stepKey === "grn") return row.grn_started ? "GRN started" : "GRN not started";
  if (stepKey === "written_off") return "Written off";
  return stateText(row.state);
}

/** "45m", "5h 20m", "2d 3h". */
function ageText(hours) {
  if (hours === null || hours === undefined) return "—";
  const mins = Math.round(hours * 60);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ${mins % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

/** "IN_PROGRESS" -> "In progress". */
function stateText(state) {
  const s = String(state || "").replace(/_/g, " ").trim().toLowerCase();
  return s ? s[0].toUpperCase() + s.slice(1) : "Started";
}

module.exports = { hoursSince, stepRows, stepSummary, rowStatus, ageText, stateText };
