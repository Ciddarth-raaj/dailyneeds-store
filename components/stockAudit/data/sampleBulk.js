/**
 * SAMPLE bulk upload for the preview: RetailPilot assortment-effective CSVs
 * (exact layout) for several auditors, with every problem HR may meet:
 * a duplicate file, an unmapped auditor, a conflicting article, a corrected
 * (revision 2) file, an already-imported file, a warehouse file and a file
 * that is not a RetailPilot export. Plus the "earlier import" and the actual
 * audits the validation matches against. Nothing here is real data.
 */
import { STORES, WAREHOUSE, employees } from "./sampleData";
import { readAuditorFile, sampleAuditorCsv } from "./bulkAllotment";

const byStore = (outletId) => employees().filter((e) => e.outlet_id === outletId);

export function sampleBulkBatch() {
  const ecr = STORES.find((s) => s.outlet_id === 7);
  const mlk = STORES.find((s) => s.outlet_id === 5);
  const mtp = STORES.find((s) => s.outlet_id === 6);
  const E = byStore(7);
  const M = byStore(5);
  const T = byStore(6);
  const files = [];
  const add = (name, text) => files.push({ name, text });
  const fileName = (a) => `assortment-effective-${(a.rp_name || a.rp_user_id).toLowerCase().replace(/\s+/g, "-")}.csv`;

  // ECR: five auditors; #3 also lists one of #2's articles (conflict); #12 is not mapped
  const ecrAuditors = [E[0], E[1], E[2], E[3], E.find((e) => !e.employee_id) || E[11]];
  ecrAuditors.forEach((a, i) => {
    const overrides = i === 2 ? { 0: (row) => { row[6] = 210000 + 60 * 1 + 1; return row; } } : {};
    add(fileName(a), sampleAuditorCsv(ecr, a, { startArticle: 210000 + 60 * i, count: 60, nodeOffset: i * 2, overrides }));
  });
  // the same ECR file downloaded twice
  add(`${fileName(ecrAuditors[0]).replace(".csv", "")} (1).csv`, sampleAuditorCsv(ecr, ecrAuditors[0], { startArticle: 210000, count: 60, nodeOffset: 0 }));

  // Moolakulam: #1 is a CORRECTED file (revision 2), #2 and #3 new, #6 unmapped
  const mlkAuditors = [M[0], M[1], M[2], M.find((e) => !e.employee_id) || M[5]];
  mlkAuditors.forEach((a, i) => {
    const count = i === 0 ? 64 : 55; // revision adds articles
    add(fileName(a), sampleAuditorCsv(mlk, a, { startArticle: i === 0 ? 320004 : 320000 + 60 * i, count, nodeOffset: i + 1 }));
  });

  // Muthialpet: #1 identical to what was imported yesterday; #2 new
  add(fileName(T[0]), sampleAuditorCsv(mtp, T[0], { startArticle: 430000, count: 50 }));
  add(fileName(T[1]), sampleAuditorCsv(mtp, T[1], { startArticle: 430060, count: 50, nodeOffset: 3 }));

  // Warehouse is outside the programme
  add("assortment-effective-warehouse-picker.csv", sampleAuditorCsv({ ...WAREHOUSE }, { rp_user_id: "WHpicker01", rp_name: "warehouse picker" }, { startArticle: 900000, count: 20 }));
  // Not a RetailPilot export
  add("stock-report-export.csv", "Item,Qty,Value\nSugar 1kg,12,540\nTea 250g,4,480\n");

  // ---------------- what was imported earlier in the cycle (accepted allotments)
  const current = new Map();
  const keep = (store, a, text) => {
    const f = readAuditorFile("earlier", text);
    current.set(`${store.rp_id}|${a.rp_user_id}`, { revision: 1, fp: f.fp, articles: new Map(f.lines.filter((l) => l.auditable && !l.errors.length).map((l) => [l.article_id, true])) });
  };
  keep(mlk, M[0], sampleAuditorCsv(mlk, M[0], { startArticle: 320000, count: 60, nodeOffset: 1 })); // rev 1 of the corrected file
  keep(mtp, T[0], sampleAuditorCsv(mtp, T[0], { startArticle: 430000, count: 50 })); // identical re-upload
  keep(mtp, T[5], sampleAuditorCsv(mtp, T[5], { startArticle: 430200, count: 40 })); // not re-uploaded: stays in force

  // ---------------- actual finalized audits since 25 Nov 2026 (Store + Auditor + Article)
  const audits = [];
  const auditRange = (store, a, start, n, every = 1) => { for (let i = 0; i < n; i += every) audits.push({ rp_store_id: store.rp_id, rp_user_id: a.rp_user_id, article_id: String(start + i) }); };
  ecrAuditors.forEach((a, i) => auditRange(ecr, a, 210000 + 60 * i, 34 - i * 4));
  auditRange(ecr, ecrAuditors[1], 210000, 3); // counted someone else's articles
  auditRange(ecr, ecrAuditors[0], 299990, 4); // counted articles nobody was allotted
  mlkAuditors.forEach((a, i) => auditRange(mlk, a, 320000 + 60 * i, 30 - i * 6));
  auditRange(mtp, T[0], 430000, 41);
  auditRange(mtp, T[1], 430060, 12);

  const cycleStores = new Set(STORES.map((s) => s.rp_id));
  const storeOf = (rp) => [...STORES, WAREHOUSE].find((s) => s.rp_id === rp) || null;
  const map = new Map(employees().filter((e) => e.employee_id).map((e) => [e.rp_user_id, e]));
  return { files, ctx: { cycleStores, storeOf, employeeOf: (rp) => map.get(rp) || null, current, audits } };
}

/** The context for files the reviewer uploads themselves (their real CSVs). */
export function liveContext() {
  return sampleBulkBatch().ctx;
}
