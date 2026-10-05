/**
 * PAYRUN > CALCULATION & REVIEW - the bulk payslip export, batch by batch.
 *
 * THE SERVER DECIDES WHO IS EXPORTED. `plan.employee_ids` is the server's list
 * for the active filters (and selection); this module only walks it in
 * batches of `plan.batch_size`, and every batch is re-resolved by the server
 * against the same filters. Nothing here chooses an employee.
 *
 * NOTHING IS SILENTLY OMITTED. A batch that fails is retried once; if it
 * fails again its employees are reported in `failed` (and the export carries
 * on with the other batches). Employees the server declined - no longer
 * published, or outside the filters by the time the batch ran - come back in
 * `skipped` with the server's reason. The caller shows both, and a ZIP that
 * is not complete says so in its name and in a report file inside it.
 */

const chunk = (list, size) => {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
};

/**
 * @param {object}   args.plan        { employee_ids, batch_size } from the server
 * @param {function} args.fetchBatch  (ids) => Promise<{ code, files, skipped }>
 * @param {function} [args.onProgress] ({ done, total, failed }) after each batch
 * @param {function} [args.isCancelled] () => boolean, checked between batches
 */
async function runPayslipExport({ plan, fetchBatch, onProgress = () => {}, isCancelled = () => false }) {
  const ids = (plan && plan.employee_ids) || [];
  const size = Math.max(1, Number((plan && plan.batch_size) || 25));
  const files = [];
  const skipped = [];
  const failed = [];
  let done = 0;
  let cancelled = false;
  for (const batch of chunk(ids, size)) {
    if (isCancelled()) {
      cancelled = true;
      break;
    }
    let body = null;
    for (let attempt = 0; attempt < 2 && body === null; attempt += 1) {
      try {
        const res = await fetchBatch(batch);
        if (res && res.code === 200 && Array.isArray(res.files)) body = res;
      } catch (err) {
        body = null;
      }
    }
    if (body === null) {
      failed.push(...batch);
    } else {
      files.push(...body.files);
      skipped.push(...(body.skipped || []));
    }
    done += batch.length;
    onProgress({ done, total: ids.length, failed: failed.length });
  }
  const complete = !cancelled && failed.length === 0 && skipped.length === 0;
  return { files, skipped, failed, cancelled, complete, total: ids.length };
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "Payslips_September_2026.zip", or "..._INCOMPLETE.zip" when anything is missing. */
function zipName(year, month, complete) {
  return `Payslips_${MONTHS[Number(month) - 1] || "Month"}_${year}${complete ? "" : "_INCOMPLETE"}.zip`;
}

const REASON_TEXT = {
  NOT_EXPORTABLE: "not exported - no longer published, or outside the filters / your branches",
};

/** The report file put inside an incomplete ZIP. `nameOf(id)` labels an employee. */
function exportReport({ result, year, month, nameOf = (id) => String(id) }) {
  const lines = [
    `Payslip export - ${MONTHS[Number(month) - 1]} ${year}`,
    `Exported: ${result.files.length} of ${result.total}`,
  ];
  if (result.cancelled) lines.push("The export was cancelled before it finished.");
  if (result.failed.length) {
    lines.push("", `FAILED (${result.failed.length}) - could not be generated; export these again:`);
    result.failed.forEach((id) => lines.push(`  ${nameOf(id)}`));
  }
  if (result.skipped.length) {
    lines.push("", `NOT EXPORTED (${result.skipped.length}):`);
    result.skipped.forEach((s) => lines.push(`  ${nameOf(s.employee_id)} - ${REASON_TEXT[s.reason] || s.reason}`));
  }
  return lines.join("\n") + "\n";
}

/**
 * The ZIP, as a Blob. PDFs are already compressed, so they are STORED rather
 * than deflated again - the same file, less CPU and memory in the browser.
 */
async function buildExportZip(JSZip, { result, year, month, nameOf }) {
  const zip = new JSZip();
  result.files.forEach((f) => zip.file(f.file_name, f.pdf_base64, { base64: true, binary: true }));
  if (!result.complete) zip.file("EXPORT-REPORT.txt", exportReport({ result, year, month, nameOf }));
  return zip.generateAsync({ type: "blob", compression: "STORE" });
}

module.exports = { runPayslipExport, buildExportZip, exportReport, zipName, chunk };
