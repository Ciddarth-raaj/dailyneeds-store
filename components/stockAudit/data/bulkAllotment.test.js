/**
 * Bulk allotment import rules.  Run: preview/stock-audit/test.sh
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readAuditorFile, validateBatch, parseCsv, sampleAuditorCsv } from "./bulkAllotment";
import { sampleBulkBatch } from "./sampleBulk";

const HEAD = "Store,Store name,Auditor,Auditor name,Node,Level,Article ID,Article,Owned,Positive stock,Negative stock,Net stock,Sellable,Buyable,Effective,Reason";
const csv = (rows) => [HEAD, ...rows].join("\n");
const row = (store, auditor, article, eff = "Y", node = "Tea") => `${store},ecr,${auditor},name ${auditor},${node},category,${article},"item, ${article}",Y,1.000,0,1.000,Y,Y,${eff},${eff === "Y" ? "has stock" : "no stock record at store"}`;
const ctx = (extra = {}) => ({
  cycleStores: new Set(["kKFom", "sooWy"]),
  storeOf: (rp) => ({ kKFom: { outlet_id: 7, name: "ECR" }, sooWy: { outlet_id: 5, name: "Moolakulam" }, "9rJMC": { outlet_id: 2, name: "Warehouse" } })[rp] || null,
  employeeOf: (rp) => (rp.startsWith("u") ? { employee_id: 1, rp_user_id: rp } : null),
  current: new Map(),
  audits: [],
  ...extra,
});

describe("reading one RetailPilot file", () => {
  it("identifies store and auditor from the contents, whatever the file is called", () => {
    const f = readAuditorFile("anything.csv", csv([row("kKFom", "u1", 100117), row("kKFom", "u1", 100125, "N")]));
    assert.equal(f.store_id, "kKFom");
    assert.equal(f.auditor_id, "u1");
    assert.equal(f.auditable, 1);
    assert.equal(f.not_auditable, 1);
  });
  it("handles quoted commas (RetailPilot quotes node and article names)", () => {
    const p = parseCsv(`${HEAD}\nkKFom,ecr,u1,a,"Cakes, Muffins & Pastries",category,1,"x, y",Y,,,,Y,Y,Y,has stock`);
    assert.equal(p.rows[0].Node, "Cakes, Muffins & Pastries");
  });
  it("rejects a file that is not an assortment-effective export, or mixes stores or auditors", () => {
    assert.equal(readAuditorFile("x.csv", "Item,Qty\nA,1").ok, false);
    assert.match(readAuditorFile("x.csv", csv([row("kKFom", "u1", 1), row("sooWy", "u1", 2)])).errors[0], /More than one store/);
    assert.match(readAuditorFile("x.csv", csv([row("kKFom", "u1", 1), row("kKFom", "u2", 2)])).errors[0], /More than one auditor/);
  });
  it("flags a bad article ID, a bad Effective flag and a repeated article", () => {
    const f = readAuditorFile("x.csv", csv([row("kKFom", "u1", "ABC"), row("kKFom", "u1", 5, "Maybe"), row("kKFom", "u1", 6), row("kKFom", "u1", 6)]));
    assert.equal(f.lines.filter((l) => l.errors.length).length, 3);
  });
});

describe("validating a bulk upload", () => {
  it("only Effective = Y counts as allotted; N is not auditable", () => {
    const r = validateBatch([readAuditorFile("a.csv", csv([row("kKFom", "u1", 1), row("kKFom", "u1", 2, "N"), row("kKFom", "u1", 3, "N")]))], ctx());
    assert.equal(r.summary.auditable, 1);
    assert.equal(r.summary.not_auditable, 2);
  });
  it("rejects the same content twice, two files for one auditor, a store outside the cycle and an unknown store", () => {
    const a = readAuditorFile("a.csv", csv([row("kKFom", "u1", 1)]));
    const a2 = readAuditorFile("a (1).csv", csv([row("kKFom", "u1", 1)]));
    const a3 = readAuditorFile("a-new.csv", csv([row("kKFom", "u1", 9)]));
    const wh = readAuditorFile("wh.csv", csv([row("9rJMC", "u9", 1)]));
    const unk = readAuditorFile("zz.csv", csv([row("ZZZZ", "u8", 1)]));
    const r = validateBatch([a, a2, a3, wh, unk], ctx());
    assert.deepEqual(r.files.map((f) => f.status), ["VALID", "REJECTED", "REJECTED", "REJECTED", "REJECTED"]);
    assert.match(r.files[1].issues[0], /Same content/);
    assert.match(r.files[2].issues[0], /also in a.csv/);
    assert.match(r.files[3].issues[0], /not taking part/);
    assert.match(r.files[4].issues[0], /not in Branch Master/);
  });
  it("an article allotted to two auditors in one store is a conflict and blocks confirmation", () => {
    const r = validateBatch([readAuditorFile("a.csv", csv([row("kKFom", "u1", 1)])), readAuditorFile("b.csv", csv([row("kKFom", "u2", 1)]))], ctx());
    assert.equal(r.files[1].status, "CONFLICT");
    assert.equal(r.conflicts.length, 1);
    assert.equal(r.canConfirm, false);
  });
  it("the same article at two different stores is not a conflict", () => {
    const r = validateBatch([readAuditorFile("a.csv", csv([row("kKFom", "u1", 1)])), readAuditorFile("b.csv", csv([row("sooWy", "u2", 1)]))], ctx());
    assert.equal(r.conflicts.length, 0);
    assert.equal(r.canConfirm, true);
  });
  it("conflicts with an EARLIER import of another auditor are caught too", () => {
    const current = new Map([["kKFom|u7", { revision: 1, fp: "x", articles: new Map([["1", true]]) }]]);
    const r = validateBatch([readAuditorFile("a.csv", csv([row("kKFom", "u1", 1)]))], ctx({ current }));
    assert.equal(r.files[0].status, "CONFLICT");
  });
  it("a corrected file becomes that auditor's next revision with its changes; an identical one is already imported", () => {
    const first = readAuditorFile("a.csv", csv([row("kKFom", "u1", 1), row("kKFom", "u1", 2)]));
    const current = new Map([["kKFom|u1", { revision: 1, fp: first.fp, articles: new Map([["1", true], ["2", true]]) }]]);
    const same = validateBatch([readAuditorFile("again.csv", csv([row("kKFom", "u1", 2), row("kKFom", "u1", 1)]))], ctx({ current }));
    assert.equal(same.files[0].status, "ALREADY_IMPORTED");
    const fixed = validateBatch([readAuditorFile("fixed.csv", csv([row("kKFom", "u1", 1), row("kKFom", "u1", 3)]))], ctx({ current }));
    assert.equal(fixed.files[0].revision, 2);
    assert.deepEqual(fixed.files[0].diff, { added: 1, removed: 1, unchanged: 1 });
  });
  it("shows unmapped auditors before confirming (warning, not a block)", () => {
    const r = validateBatch([readAuditorFile("a.csv", csv([row("kKFom", "kvvUlR2Ptiod", 1)]))], ctx());
    assert.equal(r.files[0].status, "WARNINGS");
    assert.equal(r.summary.unmapped, 1);
    assert.equal(r.canConfirm, true);
  });
  it("matches audits on Store + Auditor + Article: own, by another auditor, not allotted, pending", () => {
    const audits = [
      { rp_store_id: "kKFom", rp_user_id: "u1", article_id: "1" },
      { rp_store_id: "kKFom", rp_user_id: "u2", article_id: "2" },
      { rp_store_id: "kKFom", rp_user_id: "u1", article_id: "77" },
      { rp_store_id: "sooWy", rp_user_id: "u1", article_id: "3" },
    ];
    const r = validateBatch([readAuditorFile("a.csv", csv([row("kKFom", "u1", 1), row("kKFom", "u1", 2), row("kKFom", "u1", 3), row("kKFom", "u1", 4, "N")]))], ctx({ audits }));
    assert.deepEqual(r.files[0].match, { audited_own: 1, audited_by_other: 1, audited_not_allotted: 1, pending: 1 });
  });
});

describe("the preview's sample upload", () => {
  it("shows every case HR can meet", () => {
    const { files, ctx: c } = sampleBulkBatch();
    const r = validateBatch(files.map((f) => readAuditorFile(f.name, f.text)), c);
    const st = r.files.map((f) => f.status);
    for (const s of ["VALID", "WARNINGS", "REJECTED", "CONFLICT", "ALREADY_IMPORTED"]) assert.ok(st.includes(s), s);
    assert.ok(r.files.some((f) => f.revision === 2 && f.diff));
    assert.equal(r.canConfirm, false);
  });
});
