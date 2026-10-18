/**
 * The Purchase screen's RetailPilot Sync summary, from what
 * POST /purchase/retailpilot-sync returns (a dry run or a real run - both
 * report the same counts; a dry run's are what a real run would do).
 *
 *   new           bills not in DNDS yet (imported, or would be)
 *   existing      bills already in DNDS: updated + unchanged + approved
 *                 (an approved bill is never touched)
 *   skipped       invoices not imported, each with its reason
 *   discrepancies findings for Accounts on the synced bills
 *
 * Plain CommonJS with no dependencies, so `node --test` loads it as is.
 */

const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const RETAILPILOT_SYNC_MAX_DAYS = 90;
const RETAILPILOT_SYNC_DEFAULT_DAYS = 3;

function syncSummary(r) {
  const updated = n(r && r.updated);
  const unchanged = n(r && r.unchanged);
  const approved = n(r && r.approved_untouched);
  const discrepancies = (r && r.discrepancies) || [];
  return {
    dryRun: !!(r && r.dry_run),
    days: r && r.days,
    total: n(r && r.row_count),
    new: n(r && r.inserted),
    existing: updated + unchanged + approved,
    updated,
    unchanged,
    approved,
    skipped: ((r && r.skipped) || []).length,
    discrepancies: discrepancies.length,
    discrepancyBills: new Set(discrepancies.map((d) => `${d.outlet}|${d.invoice_slug}`)).size,
  };
}

/** The reason a run failed, or null when it succeeded. */
function syncError(r) {
  if (!r) return "No response from the server";
  if (r.code === 200) return null;
  return r.message || r.msg || `Sync failed (code ${r.code})`;
}

/** The look-back the server accepts: a whole number of days from 0 to 90. */
function validDays(value) {
  const d = Number(value);
  return String(value).trim() !== "" && Number.isInteger(d) && d >= 0 && d <= RETAILPILOT_SYNC_MAX_DAYS;
}

const ACTION_LABELS = {
  inserted: "New",
  updated: "Updated",
  unchanged: "Unchanged",
  approved: "Approved - not touched",
};

module.exports = {
  RETAILPILOT_SYNC_MAX_DAYS,
  RETAILPILOT_SYNC_DEFAULT_DAYS,
  ACTION_LABELS,
  syncSummary,
  syncError,
  validDays,
};
