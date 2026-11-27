import { useEffect, useState } from "react";
import * as D from "./sampleData";

/**
 * The ONE place screens get data from. Today it serves SAMPLE data (every
 * response carries source: "SAMPLE"); the API adapter for the backend
 * /stock-audit endpoints replaces it without touching the screens.
 * Paged methods page on the "server" side: a screen never loads 75,000 rows.
 */
const delay = (v) => new Promise((r) => setTimeout(() => r(v), 120));
const scopeStores = (state, outlets) => D.stores(state, outlets);

export const sampleAdapter = {
  source: D.SOURCE,
  meta: () => delay({ source: D.SOURCE, today: D.TODAY, last_sync: D.LAST_SYNC, cycles: D.CYCLES, stores: D.STORES, warehouse: D.WAREHOUSE }),
  stores: ({ state, outlets }) => delay(scopeStores(state, outlets)),
  store: ({ state, outletId }) => delay(D.stores(state, [Number(outletId)])[0] || null),
  employees: ({ state, outlets, search = "", page = 1, size = 20, sort = "audited" }) => {
    let list = D.employees().filter((e) => !outlets || outlets.includes(e.outlet_id)).map((e) => D.employeeView(e, state));
    if (search) list = list.filter((e) => `${e.name || ""} ${e.rp_name} ${e.code || ""} ${e.rp_user_id}`.toLowerCase().includes(search.toLowerCase()));
    list.sort((a, b) => (sort === "name" ? (a.name || a.rp_name).localeCompare(b.name || b.rp_name) : b[sort] - a[sort]));
    return delay({ rows: list.slice((page - 1) * size, page * size), total: list.length, page, size, pages: Math.max(1, Math.ceil(list.length / size)), source: D.SOURCE });
  },
  employee: ({ state, rpUserId }) => {
    const e = D.employees().find((x) => x.rp_user_id === rpUserId);
    return delay(e ? D.employeeView(e, state) : null);
  },
  articles: ({ state, rpUserId, page, size }) => {
    const e = D.employees().find((x) => x.rp_user_id === rpUserId);
    return delay(e ? D.articlesFor(e, { page, size, state }) : { rows: [], total: 0, page: 1, pages: 1 });
  },
  verifications: (q) => delay(D.verifications(q.state, q)),
  variances: (q) => delay(D.variances(q.state, q)),
  management: ({ state }) => delay(D.management(state)),
  standings: ({ state, weights }) => delay(D.saplStandings(state, weights)),
  seasons: () => delay(D.SEASONS),
  syncRuns: () => delay({ runs: D.SYNC_RUNS, issues: D.SYNC_ISSUES, last_success: D.LAST_SYNC }),
  approvals: ({ state }) => delay(D.approvals(state)),
  policyVersions: () => delay(D.POLICY_VERSIONS),
  allotmentUploads: () => delay(D.ALLOTMENT_UPLOADS),
  my: ({ state }) => {
    const me = D.employees().find((e) => e.outlet_id === 7 && e.employee_id) || D.employees()[0];
    return delay({ mapped: true, employees: [D.employeeView(me, state)] });
  },
  mapping: () =>
    delay(D.employees().map((e) => ({ rp_user_id: e.rp_user_id, rp_name: e.rp_name, store: e.store, outlet_id: e.outlet_id, employee_id: e.employee_id, employee_name: e.name, designation: e.designation, mapped: e.employee_id != null }))),
  cycles: () => delay(D.CYCLES),
  mappingEmployees: () => delay(D.employees().filter((e) => e.employee_id).map((e) => ({ employee_id: e.employee_id, employee_name: e.name, store_id: e.outlet_id, designation: e.designation }))),
  hrReport: async ({ state, date }) => ({
    date,
    cycle: D.CYCLES[0].name,
    generatedAt: new Date().toISOString(),
    lastSync: D.LAST_SYNC,
    // the preview has no history: a past date prints cumulative figures as Unavailable
    historical: date !== D.TODAY,
    stores: await sampleAdapter.stores({ state }),
    standings: await sampleAdapter.standings({ state }),
    sample: true,
  }),
};

/**
 * The adapter screens use. The preview keeps the SAMPLE one; the DNDS
 * Connect page switches to the live API adapter before rendering.
 */
let impl = sampleAdapter;
export const setAdapter = (a) => {
  impl = a;
};
export const isLive = () => impl.source === "LIVE";
export const adapter = new Proxy({}, { get: (_, key) => impl[key] });

/** Load with loading / error states. */
export function useLoad(fn, deps) {
  const [s, setS] = useState({ data: null, loading: true, error: null });
  useEffect(() => {
    let live = true;
    setS((p) => ({ ...p, loading: true, error: null }));
    Promise.resolve()
      .then(fn)
      .then((data) => live && setS({ data, loading: false, error: null }))
      .catch((error) => live && setS({ data: null, loading: false, error }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return s;
}

export { D };
