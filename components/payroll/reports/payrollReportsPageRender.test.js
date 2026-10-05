/**
 * Payroll Reports - the PAGE, mounted in jsdom and clicked.
 *
 *   node --test components/payroll/reports/payrollReportsPageRender.test.js
 *
 * The real page and its real components; only the server (helper/
 * payrollReport.js), the signed-in user and the app chrome are stubbed. The
 * fake server keeps month layouts per month, so what these prove about
 * month-wise columns, export payloads and the statutory gate is proved
 * through the screen.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const { mount, unavailable, root } = require("../../../test_support/renderJsx");

const skip = unavailable ? { skip: `dependencies not installed: ${unavailable}` } : {};

const GROUPS = [
  { group: "Employee (as at payrun)", fields: [
    { key: "employee_id", label: "Employee ID", type: "number", source: "PAYRUN" },
    { key: "employee_name", label: "Employee Name", type: "text", source: "PAYRUN_SNAPSHOT" },
  ] },
  { group: "Payroll - Totals", fields: [{ key: "net_pay", label: "Net Pay", type: "amount", source: "PAYRUN", summable: true }] },
  { group: "Statutory (EPF / ESI)", fields: [{ key: "epf_wages", label: "EPF Wages", type: "amount", source: "PAYRUN" }] },
];
const LABEL = Object.fromEntries(GROUPS.flatMap((g) => g.fields.map((f) => [f.key, f])));
const META = {
  report_types: [
    { key: "PAYROLL_REGISTER", label: "Payroll Register", statutory_file: null, default_field_keys: ["employee_id", "employee_name", "net_pay"] },
    { key: "EPF", label: "EPF", statutory_file: "ECR", default_field_keys: ["employee_id", "epf_wages"] },
    { key: "ESI", label: "ESI", statutory_file: "ESIC", default_field_keys: ["employee_id"] },
  ],
  groups: GROUPS,
  esic_reason_codes: [{ code: 1, label: "On Leave", requires_last_working_day: false }],
  max_fields: 60,
  can_export: true,
  can_download_statutory: true,
};

let helper = null;
let act = null;
let server = null;

function fakeServer() {
  const s = { layouts: {}, calls: [] };
  const key = (p) => `${p.report_type}|${p.year}|${p.month}`;
  const layoutOf = (p) => {
    const saved = s.layouts[key(p)];
    const type = META.report_types.find((t) => t.key === p.report_type);
    return saved
      ? { ...saved, source: "MONTH", warnings: [], report_type: p.report_type }
      : { field_keys: type.default_field_keys, display: { show_totals: true, sort_by: null, sort_dir: "asc" }, filters: { outlet_ids: [], department_ids: [], pay_type: null }, template_id: null, source: "REPORT_DEFAULT", warnings: [], report_type: p.report_type };
  };
  helper.getMeta = async () => META;
  helper.getMonths = async () => ({ months: [{ year: 2026, month: 10, label: "October 2026", finalized: 2, payrun_employees: 2 }, { year: 2026, month: 9, label: "September 2026", finalized: 2, payrun_employees: 2 }] });
  helper.getLayout = async (p) => ({ layout: layoutOf(p) });
  helper.saveLayout = async (p) => {
    s.calls.push(["saveLayout", p]);
    s.layouts[key(p)] = { field_keys: p.field_keys, display: p.display, filters: p.filters, template_id: p.template_id };
    return { layout: layoutOf(p) };
  };
  helper.copyPreviousMonth = async (p) => {
    s.calls.push(["copyPreviousMonth", p]);
    const prev = s.layouts[key({ ...p, month: p.month - 1 })];
    s.layouts[key(p)] = prev;
    return { layout: { ...layoutOf(p), copied_from: { year: p.year, month: p.month - 1, label: "September 2026" } } };
  };
  helper.listTemplates = async () => ({ templates: [] });
  helper.preview = async (p) => {
    s.calls.push(["preview", p]);
    return {
      columns: p.field_keys.map((k) => ({ key: k, label: LABEL[k].label, type: LABEL[k].type })),
      rows: [Object.fromEntries(p.field_keys.map((k) => [k, k === "net_pay" ? (p.month === 9 ? 18200 : 18500) : k === "employee_id" ? 1 : "Asha"]))],
      totals: null,
      matching_count: 1,
      not_finalized_count: 0,
      page: 1,
      page_size: 50,
      period: { year: p.year, month: p.month },
    };
  };
  helper.exportXlsx = async (p) => {
    s.calls.push(["exportXlsx", p]);
    return { filename: "x.xlsx" };
  };
  helper.exportPdf = async (p) => {
    s.calls.push(["exportPdf", p]);
    return { filename: "x.pdf" };
  };
  helper.getEpfValidation = async () => ({
    kind: "EPF",
    summary: { considered: 3, ready: 2, blocked: 1 },
    blocked: [{ employee_id: 7, employee_name: "Babu", reasons: [{ code: "UAN_MISSING", message: "UAN is not recorded" }] }],
  });
  helper.downloadEcr = async (p) => {
    s.calls.push(["downloadEcr", p]);
    return { filename: "ECR.txt", blocked: 1 };
  };
  return s;
}

/** Replace a module in the require cache before the page loads it. */
function stubModule(rel, value) {
  const file = require.resolve(path.join(root, rel));
  require.cache[file] = { id: file, filename: file, loaded: true, exports: { __esModule: true, default: value } };
}

if (!unavailable) {
  const React = require("react");
  helper = require(path.join(root, "helper/payrollReport.js")).default;
  ({ act } = require("react-dom/test-utils"));
  const Passthrough = ({ children }) => React.createElement("div", null, children);
  stubModule("components/globalWrapper/globalWrapper", Passthrough);
  stubModule("customHooks/usePayrollActor", () => ({ isAdmin: true, permissions: [] }));
  stubModule("customHooks/useEmployeeOutlets", () => ({ outlets: [{ outlet_id: 1, outlet_name: "Outlet A" }] }));
}

const settle = async () => {
  for (let i = 0; i < 4; i += 1) await act(() => new Promise((r) => setTimeout(r, 0)));
};
const button = (name) => [...document.body.querySelectorAll("button")].find((b) => b.textContent.trim() === name);
const headers = () => [...document.querySelectorAll('[data-testid="payroll-report-table"] thead th')].map((th) => th.textContent.trim());
const callsOf = (name) => server.calls.filter((c) => c[0] === name).map((c) => c[1]);

let ui = null;
test.afterEach(() => {
  if (ui) ui.unmount();
  ui = null;
});

async function open(layouts = {}) {
  server = fakeServer();
  Object.assign(server.layouts, layouts);
  ui = mount("pages/payroll/reports.jsx", {});
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  window.cancelAnimationFrame = (id) => clearTimeout(id);
  await settle();
}

test("opens on the latest finalized month, shows it as a heading, and the default columns in order", skip, async () => {
  await open();
  assert.equal(document.querySelector('[data-testid="payroll-month-heading"]').textContent, "October 2026");
  assert.deepEqual(headers(), ["Employee ID", "Employee Name", "Net Pay"]);
  assert.equal(callsOf("preview")[0].month, 10);
});

test("each month keeps its own columns; Copy Previous Month brings September's into October", skip, async () => {
  await open();
  // Save a September layout through the month selector + a saved layout.
  const monthSelect = document.querySelector('select[aria-label="Payroll month"]');
  await act(async () => {
    monthSelect.value = "2026-9";
    monthSelect.dispatchEvent(new window.Event("change", { bubbles: true }));
  });
  await settle();
  assert.equal(document.querySelector('[data-testid="payroll-month-heading"]').textContent, "September 2026");
  server.layouts["PAYROLL_REGISTER|2026|9"] = { field_keys: ["net_pay", "employee_id"], display: { show_totals: true }, filters: {}, template_id: null };

  await act(async () => {
    monthSelect.value = "2026-10";
    monthSelect.dispatchEvent(new window.Event("change", { bubbles: true }));
  });
  await settle();
  assert.deepEqual(headers(), ["Employee ID", "Employee Name", "Net Pay"], "October is untouched by September's layout");

  ui.click(button("Copy Previous Month"));
  await settle();
  assert.deepEqual(callsOf("copyPreviousMonth")[0], { report_type: "PAYROLL_REGISTER", year: 2026, month: 10 });
  assert.deepEqual(headers(), ["Net Pay", "Employee ID"]);
  assert.equal(callsOf("preview").pop().month, 10, "October's data, September's layout");
});

test("Excel and PDF send the selected columns in the selected order for the selected month", skip, async () => {
  await open({ "PAYROLL_REGISTER|2026|10": { field_keys: ["net_pay", "employee_name"], display: { show_totals: false }, filters: { pay_type: "BANK" }, template_id: null } });
  assert.deepEqual(headers(), ["Net Pay", "Employee Name"]);
  ui.click(button("Excel"));
  await settle();
  ui.click(button("PDF"));
  await settle();
  for (const payload of [callsOf("exportXlsx")[0], callsOf("exportPdf")[0]]) {
    assert.deepEqual(payload.field_keys, ["net_pay", "employee_name"]);
    assert.equal(payload.year, 2026);
    assert.equal(payload.month, 10);
    assert.equal(payload.filters.pay_type, "BANK");
  }
});

test("EPF: blocked employees are listed and ONE blocked employee keeps Download ECR File disabled - no confirmation can enable it", skip, async () => {
  await open();
  const epfTab = [...document.querySelectorAll('[role="tab"]')].find((t) => t.textContent === "EPF");
  ui.click(epfTab);
  await settle();
  const text = document.body.textContent;
  assert.match(text, /Ready: 2 employees/);
  assert.match(text, /Blocked: 1 employee/);
  assert.match(text, /UAN is not recorded/);
  assert.match(text, /cannot be generated while any employee is blocked/);
  assert.equal(button("Download ECR File").disabled, true);
  assert.equal(document.querySelectorAll('[data-testid="statutory-validation"] input[type="checkbox"]').length, 0, "no ready-only option");
  assert.equal(callsOf("downloadEcr").length, 0);
  assert.ok(!/upload/i.test(document.body.textContent), "never called Upload");
});

test("EPF with nobody blocked: Download ECR File sends the month only", skip, async () => {
  await open();
  helper.getEpfValidation = async () => ({ kind: "EPF", summary: { considered: 2, ready: 2, blocked: 0 }, blocked: [] });
  const epfTab = [...document.querySelectorAll('[role="tab"]')].find((t) => t.textContent === "EPF");
  ui.click(epfTab);
  await settle();
  assert.equal(button("Download ECR File").disabled, false);
  ui.click(button("Download ECR File"));
  await settle();
  assert.deepEqual(callsOf("downloadEcr")[0], { year: 2026, month: 10 });
});

test("Payroll Register: a non-finalized payrun row is shown, highlighted, and the reconciliation is displayed", skip, async () => {
  await open();
  const realPreview = helper.preview;
  helper.preview = async (p) => ({
    ...(await realPreview(p)),
    row_status: [{ status: "PENDING_APPROVAL", finalized: false, label: "Not Finalized - Pending Approval" }],
    figure_keys: ["net_pay"],
    not_finalized_count: 1,
    reconciliation: { reconciled: true, payrun: { employees: 1, finalized: 0, net_pay: 0 }, report: { employees: 1, net_pay: 0 } },
  });
  const monthSelect = document.querySelector('select[aria-label="Payroll month"]');
  await act(async () => {
    monthSelect.value = "2026-9";
    monthSelect.dispatchEvent(new window.Event("change", { bubbles: true }));
  });
  await settle();
  assert.match(document.querySelector('[data-testid="payrun-reconciliation"]').textContent, /Reconciled with the payrun: 1 employees/);
  assert.equal(document.querySelector('[data-testid="payroll-report-table"] tbody tr').getAttribute("data-finalized"), "false");
  assert.match(document.body.textContent, /listed \(highlighted\), their payroll figures shown as "Not finalized"/);
  const cells = [...document.querySelectorAll('[data-testid="payroll-report-table"] tbody tr td')].map((td) => td.textContent);
  assert.ok(cells.includes("Not finalized"), "a figure of a not-finalized row is never a blank that reads as zero");
});
