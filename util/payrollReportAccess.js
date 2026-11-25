/**
 * Payroll Reports - who may do what. Mirrors `routes/payroll_report.js` on
 * the server exactly; the server re-decides every one of these.
 *
 *   open      view_reports + view_employees + view_payroll + view_salary
 *   export    the above + export_reports            (Excel / PDF)
 *   statutory the above + view_employee_sensitive   (ECR / ESIC files)
 *
 * CommonJS so `node --test` runs it without a bundler.
 */
const has = (permissions, key) =>
  Array.isArray(permissions) &&
  permissions.some((p) => (p && p.permission_key ? p.permission_key : p) === key);

const READ_KEYS = ["view_reports", "view_employees", "view_payroll", "view_salary"];

function canOpenPayrollReports({ permissions = [], isAdmin = false } = {}) {
  if (isAdmin === true) return true;
  return READ_KEYS.every((k) => has(permissions, k));
}

function canExportPayrollReports(actor = {}) {
  if (actor.isAdmin === true) return true;
  return canOpenPayrollReports(actor) && has(actor.permissions, "export_reports");
}

function canDownloadStatutoryFiles(actor = {}) {
  if (actor.isAdmin === true) return true;
  return canExportPayrollReports(actor) && has(actor.permissions, "view_employee_sensitive");
}

function canShareReportTemplates(actor = {}) {
  if (actor.isAdmin === true) return true;
  return has(actor.permissions, "manage_shared_report_templates");
}

module.exports = {
  READ_KEYS,
  canOpenPayrollReports,
  canExportPayrollReports,
  canDownloadStatutoryFiles,
  canShareReportTemplates,
};
