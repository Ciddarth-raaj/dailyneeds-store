/**
 * The bulk payslip export's batching, retry and reporting.
 *
 *   node --test util/payslipExport.test.js
 */
const test = require("node:test");
const assert = require("node:assert");
const JSZip = require("jszip");
const { runPayslipExport, buildExportZip, exportReport, zipName, chunk } = require("./payslipExport");

const ids = (n) => Array.from({ length: n }, (_, i) => i + 1);
const okBatch = (calls) => async (batch) => {
  calls.push(batch);
  return { code: 200, files: batch.map((id) => ({ employee_id: id, file_name: `${id}_E_September_2026.pdf`, pdf_base64: Buffer.from(`%PDF ${id}`).toString("base64") })), skipped: [] };
};

test("1 employee: one batch, complete", async () => {
  const calls = [];
  const r = await runPayslipExport({ plan: { employee_ids: [7], batch_size: 25 }, fetchBatch: okBatch(calls) });
  assert.deepStrictEqual(calls, [[7]]);
  assert.deepStrictEqual([r.files.length, r.complete, r.total], [1, true, 1]);
});

test("25 employees: exactly one batch of 25", async () => {
  const calls = [];
  const r = await runPayslipExport({ plan: { employee_ids: ids(25), batch_size: 25 }, fetchBatch: okBatch(calls) });
  assert.deepStrictEqual(calls.map((c) => c.length), [25]);
  assert.strictEqual(r.files.length, 25);
});

test("more than 25 (223): batches of 25, every employee requested exactly once, in plan order", async () => {
  const calls = [];
  const progress = [];
  const r = await runPayslipExport({
    plan: { employee_ids: ids(223), batch_size: 25 },
    fetchBatch: okBatch(calls),
    onProgress: (p) => progress.push(p.done),
  });
  assert.deepStrictEqual(calls.map((c) => c.length), [25, 25, 25, 25, 25, 25, 25, 25, 23]);
  assert.deepStrictEqual(calls.flat(), ids(223));
  assert.deepStrictEqual(progress, [25, 50, 75, 100, 125, 150, 175, 200, 223]);
  assert.strictEqual(r.complete, true);
});

test("one failed batch: retried once, then reported by id; the other batches still export; nothing silent", async () => {
  let attemptsOnSecond = 0;
  const fetchBatch = async (batch) => {
    if (batch[0] === 26) {
      attemptsOnSecond += 1;
      throw new Error("502 Bad Gateway");
    }
    return okBatch([])(batch);
  };
  const r = await runPayslipExport({ plan: { employee_ids: ids(60), batch_size: 25 }, fetchBatch });
  assert.strictEqual(attemptsOnSecond, 2, "retried once");
  assert.deepStrictEqual(r.failed, ids(50).slice(25));
  assert.strictEqual(r.files.length, 35);
  assert.strictEqual(r.complete, false);
});

test("a batch that fails once and then succeeds is not reported as failed", async () => {
  let first = true;
  const fetchBatch = async (batch) => {
    if (first) { first = false; return { code: 500, msg: "busy" }; }
    return okBatch([])(batch);
  };
  const r = await runPayslipExport({ plan: { employee_ids: ids(3), batch_size: 25 }, fetchBatch });
  assert.deepStrictEqual([r.failed, r.files.length, r.complete], [[], 3, true]);
});

test("server-skipped employees make the export incomplete and are reported with the reason", async () => {
  const fetchBatch = async (batch) => ({ code: 200, files: [], skipped: batch.map((id) => ({ employee_id: id, reason: "NOT_EXPORTABLE" })) });
  const r = await runPayslipExport({ plan: { employee_ids: [4], batch_size: 25 }, fetchBatch });
  assert.strictEqual(r.complete, false);
  assert.match(exportReport({ result: r, year: 2026, month: 9, nameOf: (id) => `Emp ${id}` }), /NOT EXPORTED \(1\):\n  Emp 4 - not exported - no longer published/);
});

test("cancel stops between batches and is reported", async () => {
  let n = 0;
  const r = await runPayslipExport({
    plan: { employee_ids: ids(100), batch_size: 25 },
    fetchBatch: okBatch([]),
    isCancelled: () => n++ >= 2,
  });
  assert.deepStrictEqual([r.files.length, r.cancelled, r.complete], [50, true, false]);
});

test("the ZIP: deterministic names, PDFs stored as-is, a report only when incomplete", async () => {
  const full = await runPayslipExport({ plan: { employee_ids: [1, 2], batch_size: 25 }, fetchBatch: okBatch([]) });
  const zip1 = await JSZip.loadAsync(await (await buildExportZip(JSZip, { result: full, year: 2026, month: 9 })).arrayBuffer());
  assert.deepStrictEqual(Object.keys(zip1.files).sort(), ["1_E_September_2026.pdf", "2_E_September_2026.pdf"]);
  assert.strictEqual(await zip1.file("1_E_September_2026.pdf").async("string"), "%PDF 1");
  const partial = { ...full, failed: [3], total: 3, complete: false };
  const zip2 = await JSZip.loadAsync(await (await buildExportZip(JSZip, { result: partial, year: 2026, month: 9, nameOf: (id) => `${id} - Ravi` })).arrayBuffer());
  assert.match(await zip2.file("EXPORT-REPORT.txt").async("string"), /FAILED \(1\)[\s\S]*3 - Ravi/);
  assert.strictEqual(zipName(2026, 9, true), "Payslips_September_2026.zip");
  assert.strictEqual(zipName(2026, 9, false), "Payslips_September_2026_INCOMPLETE.zip");
  assert.deepStrictEqual(chunk([1, 2, 3], 2), [[1, 2], [3]]);
});
