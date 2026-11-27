/**
 * SAMPLE DATA for the Stock Audit & SAPL preview.
 *
 * Deterministic, realistic, and ALWAYS labelled as sample: every object the
 * adapter returns carries `source: "SAMPLE"`, and every screen shows the
 * sample banner. Nothing here is RetailPilot data or an Excel import, and
 * nothing is ever written anywhere.
 *
 * Shape follows the five programme stores (Branch Master names and
 * RetailPilot IDs) and the 27 Nov 2026 headcount of counters per store.
 * Two data states let the reviewer see both worlds:
 *   "allotment"     - as if the RetailPilot allotment Excel had been imported
 *   "no-allotment"  - today: allotted / pending / completion are Unavailable
 */

import { available, pending, unavailable, notApplicable, known, requiredSample, employeeIncentive, roleIncentive, omStoreAmount, saplPoints, SAPL_DEFAULT_WEIGHTS, SAPL_PRIZE } from "./calc";

export const SOURCE = "SAMPLE";
export const TODAY = "2026-11-27";
export const LAST_SYNC = "2026-11-27T05:45:00+05:30";

export const STORES = [
  { outlet_id: 4, name: "Vallalar Salai", short: "VLS", rp_id: "FuUGY", counters: 16, articles: 13820 },
  { outlet_id: 3, name: "Kathirkamam", short: "KTK", rp_id: "huABy", counters: 21, articles: 15210 },
  { outlet_id: 5, name: "Moolakulam", short: "MLK", rp_id: "sooWy", counters: 24, articles: 16480 },
  { outlet_id: 6, name: "Muthialpet", short: "MTP", rp_id: "rnMT1", counters: 20, articles: 14650 },
  { outlet_id: 7, name: "ECR", short: "ECR", rp_id: "kKFom", counters: 25, articles: 15040 },
];
export const WAREHOUSE = { outlet_id: 2, name: "Warehouse", rp_id: "9rJMC" };

export const CYCLES = [
  { cycle_id: 101, name: "Q4 2026 Full Audit", period_code: "2026-Q4", start_date: "2026-11-25", end_date: "2026-12-10", deadline: "2026-12-05", status: "OPEN", stores: STORES.map((s) => s.outlet_id) },
];

// ------------------------------------------------------------------ PRNG
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["Arun", "Bharathi", "Karthik", "Divya", "Elango", "Gayathri", "Hari", "Indhu", "Jeeva", "Kavitha", "Lokesh", "Meena", "Naveen", "Oviya", "Prakash", "Revathi", "Saravanan", "Thenmozhi", "Udhaya", "Vasanth", "Yamuna", "Anbu", "Bala", "Chitra", "Deepa", "Ezhil", "Ganesh", "Jothi", "Kumar", "Lakshmi", "Mani", "Nithya", "Priya", "Ramesh", "Selvi", "Tamil", "Vijay", "Kalai", "Murugan", "Sangeetha"];
const INITIAL = ["A", "B", "K", "M", "P", "R", "S", "T", "V"];
const DESIGNATIONS = [
  ["Customer Service Associate", 0.62],
  ["Cashier", 0.3],
  ["Customer Service Executive", 0.08],
];
const ARTICLES = [
  ["Aashirvaad Atta 5kg", "Foodgrains, Oils & Masala"], ["Gold Winner Sunflower Oil 1L", "Foodgrains, Oils & Masala"], ["Sugar 1kg", "Foodgrains, Oils & Masala"],
  ["Ponni Raw Rice 25kg", "Foodgrains, Oils & Masala"], ["Toor Dal 1kg", "Foodgrains, Oils & Masala"], ["Britannia Good Day 100g", "Snacks & Branded Foods"],
  ["Parle-G 250g", "Snacks & Branded Foods"], ["Lays Classic Salted 52g", "Snacks & Branded Foods"], ["Bru Instant Coffee 100g", "Beverages"],
  ["3 Roses Tea 500g", "Beverages"], ["Aavin Ghee 500ml", "Foodgrains, Oils & Masala"], ["Colgate Strong Teeth 200g", "Beauty & Hygiene"],
  ["Lifebuoy Soap 4x100g", "Beauty & Hygiene"], ["Surf Excel Easy Wash 1kg", "Cleaning & Household"], ["Vim Bar 300g", "Cleaning & Household"],
  ["Pampers Pants M 56", "Baby Needs"], ["Happilo Almonds 500g", "Foodgrains, Oils & Masala"], ["MTR Sambar Powder 200g", "Foodgrains, Oils & Masala"],
  ["Sakthi Chilli Powder 500g", "Foodgrains, Oils & Masala"], ["Dettol Handwash 200ml", "Beauty & Hygiene"], ["Horlicks 500g", "Beverages"],
  ["Maggi Noodles 12 pack", "Snacks & Branded Foods"], ["Nescafe Classic 50g", "Beverages"], ["Kissan Jam 500g", "Snacks & Branded Foods"],
];

// ------------------------------------------------------------------ employees
let EMP_CACHE = null;
export function employees() {
  if (EMP_CACHE) return EMP_CACHE;
  const out = [];
  let id = 2101;
  STORES.forEach((st, si) => {
    const r = rng(1000 + si);
    // Split the store's articles across its counters, unevenly (no fixed 1,000).
    const weights = Array.from({ length: st.counters }, () => 0.7 + r() * 0.6);
    const wsum = weights.reduce((a, b) => a + b, 0);
    let left = st.articles;
    for (let i = 0; i < st.counters; i++) {
      const allotted = i === st.counters - 1 ? left : Math.round((st.articles * weights[i]) / wsum);
      left -= allotted;
      const x = r();
      const designation = x < DESIGNATIONS[0][1] ? DESIGNATIONS[0][0] : x < DESIGNATIONS[0][1] + DESIGNATIONS[1][1] ? DESIGNATIONS[1][0] : DESIGNATIONS[2][0];
      const name = `${FIRST[(si * 7 + i * 3) % FIRST.length]} ${INITIAL[(i + si) % INITIAL.length]}`;
      const progress = 0.28 + r() * 0.62; // share of allotment audited so far
      const audited = Math.round(allotted * progress);
      const today = Math.round(audited * (0.25 + r() * 0.3));
      const recountProgress = r();
      const required = requiredSample(audited);
      const verified = recountProgress < 0.18 ? 0 : Math.min(required, Math.round(required * (0.4 + recountProgress * 0.75)));
      const wrongRate = r() < 0.15 ? 0.04 + r() * 0.04 : r() * 0.025;
      const matched = Math.max(0, verified - Math.round(verified * wrongRate));
      const mapped = !(si === 2 && i === 5) && !(si === 4 && i === 11); // two unmapped RetailPilot users
      out.push({
        employee_id: mapped ? id : null,
        code: mapped ? `DN${id}` : null,
        rp_user_id: `RP${(si * 97 + i * 31).toString(36).toUpperCase().padStart(4, "0")}${["q", "x", "k", "m"][i % 4]}${i}`,
        name: mapped ? name : null,
        rp_name: name,
        designation,
        outlet_id: st.outlet_id,
        store: st.name,
        allotted,
        audited,
        today,
        within_deadline: audited,
        recount_required: required,
        recount_done: verified,
        recount_matched: matched,
        unresolved: verified ? Math.round(r() * 2) : 0,
        pending_eligibility: si === 1 && i === 2 ? 3 : 0,
        approved: null,
        payment: "NOT_STARTED",
      });
      id += 1;
    }
  });
  EMP_CACHE = out;
  return out;
}

// ------------------------------------------------------------------ derived figures
const sum = (list, f) => list.reduce((t, x) => t + f(x), 0);

export function employeeView(e, state) {
  const withAllot = state === "allotment";
  const allotted = withAllot ? available(e.allotted) : unavailable("ALLOTMENT_UNAVAILABLE");
  const pend = withAllot ? available(e.allotted - e.audited) : unavailable("ALLOTMENT_UNAVAILABLE");
  const completion = withAllot ? available((e.audited * 100) / e.allotted) : unavailable("ALLOTMENT_UNAVAILABLE");
  const inc = employeeIncentive({
    audited: e.audited,
    eligible: withAllot ? e.audited - e.pending_eligibility : 0,
    pendingEligibility: withAllot ? e.pending_eligibility : e.audited,
    verified: e.recount_done,
    matched: e.recount_matched,
  });
  return {
    ...e,
    source: SOURCE,
    allotted_c: allotted,
    pending_c: pend,
    completion_c: completion,
    within_deadline_c: withAllot ? available(e.within_deadline) : unavailable("ALLOTMENT_UNAVAILABLE"),
    accuracy: inc.accuracy,
    rate: inc.rate,
    estimated: inc.amount,
    provisional: inc.provisional ?? null,
    calc_status: inc.status,
    sample: inc.sample,
    approved_c: pending("NOT_APPROVED"),
  };
}

export function storeView(st, state) {
  const list = employees().filter((e) => e.outlet_id === st.outlet_id).map((e) => employeeView(e, state));
  const withAllot = state === "allotment";
  const audited = sum(list, (e) => e.audited);
  const verified = sum(list, (e) => e.recount_done);
  const matched = sum(list, (e) => e.recount_matched);
  const required = sum(list, (e) => e.recount_required);
  const r = rng(st.outlet_id * 13);
  const shortageQty = Math.round(audited * (0.011 + r() * 0.01));
  const excessQty = Math.round(audited * (0.006 + r() * 0.008));
  const participating = list.filter((e) => e.audited > 0).length;
  return {
    ...st,
    source: SOURCE,
    employees: list,
    eligible_employees: list.length,
    participating,
    allotted: withAllot ? available(st.articles) : unavailable("ALLOTMENT_UNAVAILABLE"),
    audited_today: sum(list, (e) => e.today),
    audited,
    pending: withAllot ? available(st.articles - audited) : unavailable("ALLOTMENT_UNAVAILABLE"),
    completion: withAllot ? available((audited * 100) / st.articles) : unavailable("ALLOTMENT_UNAVAILABLE"),
    recount_required: required,
    recount_done: verified,
    recount_progress: required ? available((verified * 100) / required) : notApplicable("NO_ARTICLES"),
    accuracy: verified ? available((matched * 100) / verified) : pending("PENDING_VERIFICATION"),
    shortage_qty: shortageQty,
    shortage_value: Math.round(shortageQty * (38 + r() * 20)),
    excess_qty: excessQty,
    excess_value: Math.round(excessQty * (30 + r() * 18)),
    estimated_employee: list.reduce((t, e) => t + (known(e.estimated) ? e.estimated.value : 0), 0),
    estimated_employee_pending: list.filter((e) => !known(e.estimated)).length,
    independent_verification: st.outlet_id === 6 ? null : true,
  };
}

export function stores(state, outletIds = null) {
  return STORES.filter((s) => !outletIds || outletIds.includes(s.outlet_id)).map((s) => storeView(s, state));
}

export function management(state) {
  return stores(state).map((s) => {
    const thresholds = { employee_counting_accuracy: 97, independent_recount_verification: 100, verification_quality_control: 95, completion_within_deadline: 100 };
    // Completion WITHIN DEADLINE can only be judged once the deadline has passed.
    const completion = !known(s.completion) ? unavailable("ALLOTMENT_UNAVAILABLE") : TODAY <= CYCLES[0].deadline ? pending("BEFORE_DEADLINE") : available(s.completion.value);
    const sampleMet = s.employees.length ? available((s.employees.filter((e) => e.sample.met).length * 100) / s.employees.length) : notApplicable("NO_ARTICLES");
    const resolvedPct = s.recount_done ? available(100 - (sum(s.employees, (e) => e.unresolved) * 100) / s.recount_done) : pending("PENDING_VERIFICATION");
    const sup = roleIncentive("SUPERVISOR", { completion_within_deadline: completion, employee_counting_accuracy: s.accuracy, independent_recount_verification: sampleMet }, thresholds);
    const sm = roleIncentive("STORE_MANAGER", { completion_within_deadline: completion, employee_counting_accuracy: s.accuracy, verification_quality_control: resolvedPct }, thresholds);
    return {
      store: s,
      supervisor: { name: `${FIRST[(s.outlet_id * 5) % FIRST.length]} S`, ...sup },
      storeManager: { name: `${FIRST[(s.outlet_id * 9) % FIRST.length]} M`, ...sm },
      om: omStoreAmount(sm.weightedScore, s.independent_verification),
    };
  });
}

// ------------------------------------------------------------------ SAPL
/** The four scored KPIs of a store. Shortage / excess are deliberately NOT inputs. */
export function saplKpisOf(s) {
  return {
    completion: s.completion,
    accuracy: s.accuracy,
    recount: s.recount_progress,
    participation: s.eligible_employees ? available((s.participating * 100) / s.eligible_employees) : notApplicable("NO_DATA"),
  };
}

export function saplStandings(state, weights = SAPL_DEFAULT_WEIGHTS) {
  const list = stores(state).map((s) => {
    const kpis = saplKpisOf(s);
    return { store: s, kpis, ...saplPoints(kpis, weights) };
  });
  const ranked = [...list].sort((a, b) => b.total - a.total || a.store.name.localeCompare(b.store.name));
  const prev = { 7: 2, 5: 1, 3: 4, 6: 3, 4: 5 }; // yesterday's sample ranks
  return ranked.map((r, i) => ({ ...r, rank: i + 1, previous_rank: prev[r.store.outlet_id], provisional: true, comparable: r.complete }));
}

/** One complete audit cycle = one season (preview). Each season starts with fresh points. */
export const SEASONS = [
  { season_no: 1, name: "SAPL Season 1", start: "2026-11-25", deadline: "2026-12-05", end: null, cycles: [101], stores: STORES.map((s) => s.outlet_id), prize: SAPL_PRIZE, scoring: "35 / 40 / 20 / 5 (confirmed 27 Nov 2026)", qualification: "Pending your review", status: "IN_PROGRESS", winner: null, approval: "NOT_STARTED", distribution: "NOT_STARTED" },
];

// ------------------------------------------------------------------ articles (drilldown)
export function articlesFor(emp, { page = 1, size = 20, state }) {
  const r = rng((emp.rp_user_id || "x").split("").reduce((t, c) => t + c.charCodeAt(0), 0));
  const total = state === "allotment" ? emp.allotted : emp.audited;
  const rows = [];
  for (let i = (page - 1) * size; i < Math.min(total, page * size); i++) {
    const [name, category] = ARTICLES[i % ARTICLES.length];
    const audited = state === "allotment" ? i < emp.audited : true;
    const sys = Math.round(r() * 60);
    const counted = audited ? Math.max(0, sys + (r() < 0.12 ? -Math.ceil(r() * 3) : r() < 0.06 ? Math.ceil(r() * 2) : 0)) : null;
    const recounted = audited && r() < 0.06;
    const recountMatch = recounted ? r() > 0.03 : null;
    rows.push({
      article_id: 100000 + ((i * 7919 + emp.outlet_id * 31) % 29000),
      article_name: `${name}${i >= ARTICLES.length ? ` #${Math.floor(i / ARTICLES.length) + 1}` : ""}`,
      category,
      status: audited ? "AUDITED" : "PENDING",
      audited_at: audited ? `2026-11-${25 + (i % 3)}T${String(10 + (i % 10)).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")}:00+05:30` : null,
      counted_qty: counted,
      book_qty_hidden: true,
      variance_kind: counted == null ? null : counted < sys ? "Short" : counted > sys ? "Over" : "No variance",
      recount: recounted ? { verdict: recountMatch ? "MATCH" : "MISMATCH", by: "RPS2", at: "2026-11-27T16:10:00+05:30", net_movement: -Math.round(r() * 3) } : null,
      session: audited ? `${(i * 2654435761 >>> 0).toString(16)}${emp.outlet_id}` : null,
    });
  }
  return { rows, total, page, size, pages: Math.max(1, Math.ceil(total / size)) };
}

// ------------------------------------------------------------------ verification, variance, sync, approvals
export function verifications(state, { outletId = null, page = 1, size = 20 } = {}) {
  const list = [];
  stores(state, outletId ? [outletId] : null).forEach((s) => {
    s.employees.forEach((e, ei) => {
      for (let k = 0; k < Math.min(e.recount_done, 3); k++) {
        const r = rng(e.outlet_id * 1000 + ei * 10 + k);
        const original = Math.round(r() * 80);
        const sold = r() < 0.5 ? Math.round(r() * 6) : 0;
        const wrong = k === 0 && e.recount_matched < e.recount_done;
        const unresolved = k === 2 && e.unresolved > 0;
        list.push({
          store: s.name, outlet_id: s.outlet_id,
          employee: e.name || e.rp_name, original_user: e.rp_user_id, recount_user: `RPS${s.outlet_id}`,
          article: ARTICLES[(ei + k) % ARTICLES.length][0],
          original_qty: original, movement_qty: -sold,
          expected_qty: original - sold,
          recount_qty: unresolved ? original - sold - 1 : wrong ? original - sold - 2 : original - sold,
          verdict: unresolved ? "UNRESOLVED" : wrong ? "MISMATCH" : "MATCH",
          reason: unresolved ? "Sale within 2 minutes of the recount" : null,
          kind: k === 1 && ei % 5 === 0 ? "TARGETED" : "RANDOM",
          original_at: "2026-11-26T11:20:00+05:30", recount_at: "2026-11-27T15:05:00+05:30",
        });
      }
    });
  });
  const start = (page - 1) * size;
  return { rows: list.slice(start, start + size), total: list.length, page, size, pages: Math.max(1, Math.ceil(list.length / size)) };
}

export function variances(state, { outletId = null, kind = null, page = 1, size = 20 } = {}) {
  const list = [];
  stores(state, outletId ? [outletId] : null).forEach((s) => {
    const r = rng(s.outlet_id * 77);
    const n = 40;
    for (let i = 0; i < n; i++) {
      const short = r() < 0.62;
      const qty = Math.ceil(r() * (short ? 6 : 4));
      const cost = 18 + Math.round(r() * 260);
      list.push({
        store: s.name, outlet_id: s.outlet_id, article: ARTICLES[i % ARTICLES.length][0], category: ARTICLES[i % ARTICLES.length][1],
        kind: short ? "Short" : "Over", qty: short ? -qty : qty, value: (short ? -1 : 1) * qty * cost,
        counted_by: s.employees[i % s.employees.length].name || s.employees[i % s.employees.length].rp_name,
        audited_at: `2026-11-${25 + (i % 3)}T1${i % 9}:15:00+05:30`,
      });
    }
  });
  const filtered = list.filter((v) => !kind || v.kind === kind);
  const start = (page - 1) * size;
  return { rows: filtered.slice(start, start + size), total: filtered.length, page, size, pages: Math.max(1, Math.ceil(filtered.length / size)) };
}

export const SYNC_RUNS = [
  { run_id: 418, kind: "INCREMENTAL", trigger: "cron", status: "SUCCESS", started_at: "2026-11-27T05:45:00+05:30", finished_at: "2026-11-27T05:45:09+05:30", counts: { session: { read: 412, inserted: 377, updated: 35, unchanged: 0 }, line: { read: 301 }, adjustment: { read: 388 } }, issues: 3 },
  { run_id: 417, kind: "INCREMENTAL", trigger: "cron", status: "DEFERRED", started_at: "2026-11-27T05:30:00+05:30", finished_at: "2026-11-27T05:30:02+05:30", resume_after: "2026-11-27T05:40:00+05:30", error: "RetailPilot asked to wait 600 s (Retry-After) - above the 120 s limit; watermark unchanged", issues: 0 },
  { run_id: 416, kind: "INCREMENTAL", trigger: "cron", status: "FAILED", started_at: "2026-11-27T05:15:00+05:30", finished_at: "2026-11-27T05:15:41+05:30", error: "Page 3 of sessions failed after 4 attempts (HTTP 503); watermark unchanged", issues: 0 },
  { run_id: 415, kind: "DRY_RUN", trigger: "manual", status: "SUCCESS", started_at: "2026-11-26T18:02:00+05:30", finished_at: "2026-11-26T18:02:11+05:30", counts: { session: { read: 8962, inserted: 0, updated: 0, unchanged: 0, would_insert: 8888 } }, issues: 5 },
  { run_id: 414, kind: "HISTORICAL", trigger: "manual", status: "SUCCESS", started_at: "2026-11-26T09:00:00+05:30", finished_at: "2026-11-26T09:01:30+05:30", counts: { session: { read: 9449, inserted: 9449 } }, issues: 6 },
];
export const SYNC_ISSUES = [
  { kind: "UNMAPPED_USER", ref: "RP0123k5", detail: "Finalized 214 counts at Moolakulam; RetailPilot name shown on the mapping screen" },
  { kind: "UNMAPPED_USER", ref: "RP04a1m11", detail: "Finalized 188 counts at ECR" },
  { kind: "NO_LINES", ref: "a9f3…c21", detail: "Finalized count without count lines (booked difference only)" },
  { kind: "STALE_IN_PROGRESS", ref: "9f92…7490", detail: "In progress since 15 Sep 2026 at Kathirkamam" },
  { kind: "OUTSIDE_PROGRAMME", ref: "9rJMC", detail: "47 Warehouse counts excluded from the programme" },
  { kind: "BEFORE_EFFECTIVE_DATE", ref: "—", detail: "61 original audits before 25 Nov 2026 00:00 IST: not eligible" },
];

export function approvals(state) {
  const items = [];
  stores(state).forEach((s) => {
    s.employees.slice(0, 4).forEach((e) => items.push({ id: `E-${s.outlet_id}-${e.rp_user_id}`, type: "Employee incentive", recipient: e.name || e.rp_name, store: s.name, amount: e.estimated, stage: "Supervisor review", next: "Store Manager approval" }));
  });
  management(state).forEach((m) => {
    items.push({ id: `S-${m.store.outlet_id}`, type: "Supervisor incentive", recipient: m.supervisor.name, store: m.store.name, amount: m.supervisor.amount, stage: "Store Manager approval", next: "Payroll" });
    items.push({ id: `M-${m.store.outlet_id}`, type: "Store Manager incentive", recipient: m.storeManager.name, store: m.store.name, amount: m.storeManager.amount, stage: "Operations Manager approval", next: "Payroll" });
  });
  items.push({ id: "OM-2026-Q4", type: "Operations Manager incentive", recipient: "Operations Manager", store: "All five stores", amount: pending("COMPONENT_PENDING"), stage: "Management approval", next: "Payroll" });
  items.push({ id: "SAPL-S1", type: "SAPL – Winner Incentive", recipient: "Winning store team", store: "Season 1", amount: pending("NOT_APPROVED"), stage: "Management approval", next: "Payroll" });
  return items;
}

export const POLICY_VERSIONS = [
  { version: 2, status: "DRAFT", note: "Proposed scoring thresholds for review", created: "2026-11-27", by: "Stock Audit admin" },
  { version: 1, status: "DRAFT", note: "Confirmed amounts (27 Nov 2026), default thresholds", created: "2026-11-27", by: "Stock Audit admin" },
];

export const ALLOTMENT_UPLOADS = [
  { upload_id: 3, cycle: "Q4 2026 Full Audit", file: "13 files · bulk upload", stores: "ECR, Moolakulam, Muthialpet", files: 13, imported: 8, revisions: 1, already: 1, rejected: 4, auditable: 486, not_auditable: 211, status: "Preview only", at: "2026-11-27T10:12:00+05:30", by: "HR (sample)" },
  { upload_id: 2, cycle: "Q4 2026 Full Audit", file: "assortment-effective-anbu-s.csv", stores: "Moolakulam", files: 1, imported: 1, revisions: 1, already: 0, rejected: 0, auditable: 52, not_auditable: 8, status: "Preview only", at: "2026-11-26T18:40:00+05:30", by: "HR (sample)" },
  { upload_id: 1, cycle: "Q4 2026 Full Audit", file: "41 files · bulk upload", stores: "Muthialpet, Vallalar Salai", files: 41, imported: 41, revisions: 0, already: 0, rejected: 0, auditable: 20340, not_auditable: 9120, status: "Preview only", at: "2026-11-25T09:40:00+05:30", by: "HR (sample)" },
];

export { SAPL_DEFAULT_WEIGHTS, SAPL_PRIZE };
