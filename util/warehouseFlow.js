/**
 * Warehouse Flow on the Business Dashboard - what is in each stage, for the
 * chosen store, from `GET /warehouse-flow/flow`.
 *
 *   1. Gate pass -> 2. Inspection -> 3. GRN -> 4. Allocation -> 5. Ready to dispatch
 *
 * CommonJS, so it is unit-tested with `node --test` and no bundler.
 */

/** Hours since an ISO time, to one decimal; null when there is no time. */
function hoursSince(isoTime, nowMs = Date.now()) {
  const t = Date.parse(isoTime);
  return Number.isFinite(t) ? Math.round((Math.max(0, nowMs - t) / 3600000) * 10) / 10 : null;
}

/**
 * Open gate passes for the chosen store, oldest first, each aged now (from
 * entry_time, so a cached list still ages) and marked `inspecting` once a GRN
 * inspection has started on it.
 */
function gatePasses(stage, store = "", nowMs = Date.now()) {
  const rows = ((stage && stage.rows) || []).filter((r) => !store || r.store === store);
  return rows
    .map((r) => {
      const h = hoursSince(r.entry_time, nowMs);
      return { ...r, open_hours: h === null ? r.open_hours : h, inspecting: (r.inspections || []).length > 0 };
    })
    .sort((a, b) => (b.open_hours || 0) - (a.open_hours || 0));
}

/** The tile's numbers for the gate pass stage. */
function gatePassSummary(rows) {
  const list = rows || [];
  return {
    count: list.length,
    waiting: list.filter((r) => !r.inspecting).length,
    over_day: list.filter((r) => (r.open_hours || 0) >= 24).length,
    oldest_hours: list.length ? Math.max(...list.map((r) => r.open_hours || 0)) : null,
  };
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

/** "in_progress" -> "In progress". */
function stateText(state) {
  const s = String(state || "").replace(/_/g, " ").trim().toLowerCase();
  return s ? s[0].toUpperCase() + s.slice(1) : "Started";
}

module.exports = { hoursSince, gatePasses, gatePassSummary, ageText, stateText };
