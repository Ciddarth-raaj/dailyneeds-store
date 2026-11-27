/**
 * Revised KPI policy (27 Nov 2026). Run: preview/stock-audit/test.sh
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MANAGEMENT, SAPL_DEFAULT_WEIGHTS, saplPoints, roleIncentive, omStoreAmount, available, pending, unavailable, known } from "./calc";
import * as D from "./sampleData";
import { consolidatedPdf, storePdf } from "../pdf/reports";

const A = available;
const sum = (l) => l.reduce((t, x) => t + x.max, 0);

describe("confirmed maximums", () => {
  it("Premier League: 35 / 40 / 20 / 5 = 100 points; full marks give exactly 100", () => {
    assert.deepEqual(SAPL_DEFAULT_WEIGHTS.map((w) => [w.key, w.max]), [["completion", 35], ["accuracy", 40], ["recount", 20], ["participation", 5]]);
    assert.equal(sum(SAPL_DEFAULT_WEIGHTS), 100);
    const p = saplPoints({ completion: A(100), accuracy: A(100), recount: A(100), participation: A(100) });
    assert.equal(p.total, 100);
    assert.equal(p.complete, true);
    assert.equal(saplPoints({ completion: A(150), accuracy: A(100), recount: A(100), participation: A(100) }).total, 100, "never above 100");
  });
  it("Store Manager: 600 / 500 / 400 = Rs 1,500; no variance KPI", () => {
    assert.deepEqual(MANAGEMENT.STORE_MANAGER.components.map((c) => [c.key, c.max]), [["completion_within_deadline", 600], ["employee_counting_accuracy", 500], ["verification_quality_control", 400]]);
    assert.equal(MANAGEMENT.STORE_MANAGER.max, 1500);
    assert.equal(roleIncentive("STORE_MANAGER", { completion_within_deadline: A(100), employee_counting_accuracy: A(100), verification_quality_control: A(100) }).amount.value, 1500);
  });
  it("Supervisor: 200 / 300 / 500 = Rs 1,000", () => {
    assert.equal(sum(MANAGEMENT.SUPERVISOR.components), 1000);
    assert.equal(roleIncentive("SUPERVISOR", { completion_within_deadline: A(100), employee_counting_accuracy: A(100), independent_recount_verification: A(100) }).amount.value, 1000);
  });
  it("Operations Manager: Rs 400 a store, Rs 2,000 across five; nil without independent verification", () => {
    const five = [1, 2, 3, 4, 5].map(() => omStoreAmount(A(99), true).value);
    assert.equal(five.reduce((a, b) => a + b, 0), MANAGEMENT.OPERATIONS_MANAGER.max);
    assert.equal(omStoreAmount(A(100), false).value, 0);
    assert.equal(omStoreAmount(A(100), null).status, "PENDING");
  });
});

describe("shortage and excess never affect money or rankings", () => {
  it("points are the same whatever the shortage / excess values", () => {
    const st = D.stores("allotment")[0];
    const a = saplPoints(D.saplKpisOf(st));
    const b = saplPoints(D.saplKpisOf({ ...st, shortage_value: 9e9, shortage_qty: 9e9, excess_value: 0, excess_qty: 0 }));
    assert.deepEqual(a, b);
    assert.deepEqual(Object.keys(D.saplKpisOf(st)), ["completion", "accuracy", "recount", "participation"]);
  });
  it("management incentives take no variance input", () => {
    for (const role of ["SUPERVISOR", "STORE_MANAGER"]) {
      assert.ok(!MANAGEMENT[role].components.some((c) => /variance|shortage|excess/.test(c.key)), role);
    }
    for (const m of D.management("allotment")) {
      assert.ok(!JSON.stringify(m.storeManager.components).includes("variance"));
    }
  });
  it("employee incentives are unchanged by shortage / excess", () => {
    const e = D.employees()[0];
    const a = D.employeeView(e, "allotment");
    const b = D.employeeView({ ...e, shortage_value: 1e6 }, "allotment");
    assert.deepEqual(a.estimated, b.estimated);
  });
});

describe("missing data never becomes a misleading final figure", () => {
  it("a pending or unavailable KPI scores no points and leaves the total incomplete", () => {
    const p = saplPoints({ completion: unavailable("ALLOTMENT_UNAVAILABLE"), accuracy: A(98), recount: pending("PENDING_VERIFICATION"), participation: A(100) });
    assert.equal(p.complete, false);
    assert.equal(p.rows.find((r) => r.key === "completion").points, null);
    assert.equal(p.rows.find((r) => r.key === "recount").points, null);
  });
  it("before allotment import, no store is comparable and the Store Manager total stays pending", () => {
    assert.ok(D.saplStandings("no-allotment").every((r) => r.comparable === false));
    assert.ok(D.management("no-allotment").every((m) => !known(m.storeManager.amount) && !known(m.om)));
  });
});

describe("completion within deadline", () => {
  it("stays pending until the common deadline has passed, never zero mid-cycle", () => {
    for (const m of D.management("allotment")) {
      assert.equal(m.storeManager.components[0].amount.status, "PENDING");
      assert.equal(m.storeManager.components[0].amount.reason, "BEFORE_DEADLINE");
      assert.equal(m.supervisor.components[0].amount.status, "PENDING");
    }
  });
});

describe("the same scoring everywhere: dashboards, leaderboard and PDFs", () => {
  const data = (state) => ({ date: D.TODAY, cycle: "Q4 2026 Full Audit", generatedAt: "2026-11-27T06:00:00+05:30", lastSync: D.LAST_SYNC, historical: false, stores: D.stores(state), standings: D.saplStandings(state), sample: true });
  it("the consolidated PDF prints each store's leaderboard points and rank", () => {
    const d = data("allotment");
    const text = consolidatedPdf(d).output();
    for (const r of d.standings) {
      assert.ok(text.includes(`${r.total} pts`), `${r.store.name} ${r.total}`);
      assert.ok(text.includes(`SAPL rank ${r.rank} \\(provisional\\)`) || text.includes(`SAPL rank ${r.rank} (provisional)`), r.store.name);
    }
    assert.ok(!/variance/i.test(text));
  });
  it("the store PDF prints the same rank and points, every employee, and no incentive amounts", () => {
    const d = data("allotment");
    const st = d.stores.find((s) => s.outlet_id === 7);
    const r = d.standings.find((x) => x.store.outlet_id === 7);
    const text = storePdf({ ...d, store: st, standing: r }).output();
    assert.ok(text.includes(`${r.total} pts`));
    for (const e of st.employees) assert.ok(text.includes(e.name || e.rp_name), e.rp_user_id);
    assert.ok(!/incentive amount|Rs\. ?\d+[,.]?\d* per article|estimated/i.test(text.split("No salary or individual incentive amounts").join("")));
    assert.ok(!/variance/i.test(text));
  });
});

describe("estimated individual incentive", async () => {
  const { estimateIncentive, employeeIncentive } = await import("./calc.js");
  it("no recounts: pending, never an assumed accuracy", () => {
    const r = estimateIncentive({ audited: 400, verified: 0 });
    assert.equal(r.estimate.status, "PENDING");
    assert.equal(r.maxSoFar.value, 440);
  });
  it("partial sample uses the accuracy so far; same numbers as the backend", () => {
    const r = estimateIncentive({ audited: 400, allotted: 800, verified: 10, matched: 10 });
    assert.equal(r.basis, "PARTIAL_SAMPLE");
    assert.equal(r.estimate.value, 440);
    assert.equal(r.projected.value, 880);
    assert.equal(estimateIncentive({ audited: 1000, verified: 1000, matched: 969 }).estimate.value, 500);
    assert.equal(estimateIncentive({ audited: 300, pendingEligibility: 20, verified: 15, matched: 15 }).estimate.value, 308);
  });
  it("does not make the payable amount available", () => {
    assert.equal(employeeIncentive({ audited: 400, eligible: 400, verified: 10, matched: 10 }).amount.status, "PENDING");
  });
  it("sample employees all carry an estimate cell", async () => {
    const D = await import("./sampleData.js");
    const v = D.employees().map((e) => D.employeeView(e, "allotment"));
    assert.ok(v.every((e) => e.est && e.est.estimate && e.est.estimate.status));
    assert.ok(v.some((e) => e.est.estimate.status === "AVAILABLE"));
  });
});
