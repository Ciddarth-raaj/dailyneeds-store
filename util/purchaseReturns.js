/**
 * Business Dashboard - Purchase returns (`GET /business-dashboard/purchase-returns`).
 * Turns the server's rows (already narrowed to the caller's store scope) into
 * the cards, the per-location table, top suppliers and open returns, for all
 * stores or the one picked.
 *
 * CommonJS, so it is unit-tested with `node --test` and no bundler.
 */

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Open-return age bands: amber after 7 days, red after 15.
const AGE_AMBER = 7;
const AGE_RED = 15;

function ageTone(days) {
  if (days === null || days === undefined) return "normal";
  if (days > AGE_RED) return "red";
  if (days > AGE_AMBER) return "amber";
  return "normal";
}

/**
 * @param data   the response's data: { stores, settled: { rows }, open: { rows } }
 * @param store  a store key to narrow to, or "" for all
 * @param purchase  purchases in the period (same stores), for "% of purchases"
 */
function summarise(data, store = "", purchase = null, topN = 10) {
  const empty = {
    totals: { debit_note: 0, debit_notes: 0, replacement: 0, replacements: 0, debit_note_pct: null, open_value: 0, open_claims: 0, open_suppliers: 0, oldest_days: null },
    byStore: [],
    topSuppliers: [],
    open: [],
  };
  if (!data) return empty;
  const pick = (rows) => (rows || []).filter((r) => !store || r.store === store);
  const settled = pick(data.settled && data.settled.rows);
  const openRows = pick(data.open && data.open.rows);
  const stores = (data.stores || []).filter((s) => !store || s.key === store);
  const storeName = new Map((data.stores || []).map((s) => [s.key, s.name]));

  const t = { ...empty.totals };
  const per = new Map(stores.map((s) => [s.key, { key: s.key, name: s.name, mapped: s.mapped, debit_note: 0, debit_notes: 0, replacement: 0, replacements: 0 }]));
  const suppliers = new Map();
  for (const r of settled) {
    const s = per.get(r.store) || { key: r.store, name: storeName.get(r.store) || r.store, mapped: false, debit_note: 0, debit_notes: 0, replacement: 0, replacements: 0 };
    if (r.kind === "debit_note") {
      t.debit_note = round2(t.debit_note + r.amount);
      t.debit_notes += 1;
      s.debit_note = round2(s.debit_note + r.amount);
      s.debit_notes += 1;
      const k = r.supplier_id || r.supplier_name;
      const sup = suppliers.get(k) || { key: k, name: r.supplier_name, notes: 0, value: 0 };
      sup.notes += 1;
      sup.value = round2(sup.value + r.amount);
      suppliers.set(k, sup);
    } else if (r.kind === "replacement") {
      t.replacement = round2(t.replacement + r.amount);
      t.replacements += 1;
      s.replacement = round2(s.replacement + r.amount);
      s.replacements += 1;
    }
    per.set(r.store, s);
  }
  const p = Number(purchase);
  t.debit_note_pct = Number.isFinite(p) && p > 0 ? round2((100 * t.debit_note) / p) : null;

  // Open returns: one line per supplier per store; age and date are the oldest claim's.
  const groups = new Map();
  const supplierSet = new Set();
  for (const r of openRows) {
    t.open_value = round2(t.open_value + r.amount);
    t.open_claims += 1;
    supplierSet.add(r.supplier_id || r.supplier_name);
    if (r.age_days !== null && r.age_days !== undefined && (t.oldest_days === null || r.age_days > t.oldest_days)) t.oldest_days = r.age_days;
    const k = `${r.supplier_id || r.supplier_name}|${r.store}`;
    const g = groups.get(k) || { key: k, supplier: r.supplier_name, store: r.store, location: storeName.get(r.store) || r.store, claims: 0, value: 0, raised_on: null, age_days: null };
    g.claims += 1;
    g.value = round2(g.value + r.amount);
    if (r.raised_on && (!g.raised_on || r.raised_on < g.raised_on)) {
      g.raised_on = r.raised_on;
      g.age_days = r.age_days;
    }
    groups.set(k, g);
  }
  t.open_suppliers = supplierSet.size;

  return {
    totals: t,
    byStore: [...per.values()].sort((a, b) => a.name.localeCompare(b.name)),
    topSuppliers: [...suppliers.values()].sort((a, b) => b.value - a.value).slice(0, topN),
    open: [...groups.values()].sort((a, b) => (b.age_days ?? -1) - (a.age_days ?? -1) || b.value - a.value),
  };
}

module.exports = { AGE_AMBER, AGE_RED, ageTone, summarise };
