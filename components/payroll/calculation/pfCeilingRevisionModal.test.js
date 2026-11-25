/**
 * PF ceiling 2026 / ECR modal - MOUNTED, CLICKED, and read back.
 *
 *   node --test components/payroll/calculation/pfCeilingRevisionModal.test.js
 *
 * The three buttons are the whole of this screen's job, so these run the real
 * component in jsdom with the real Chakra modal, and stub only the two server
 * calls in `helper/payrunCalculation.js`. The responses are shaped exactly as
 * the backend sends them: the report as JSON (the CSV is built here), the ECR
 * as JSON carrying `lines`, `text` and the refused members in `errors`.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const { mount, unavailable, root } = require("../../../test_support/renderJsx");

const skip = unavailable ? { skip: `dependencies not installed: ${unavailable}` } : {};
const MODAL = "components/payroll/calculation/PfCeilingRevisionModal.jsx";

/* ------------------------------------------------------------- fixtures */

const REPORT = {
  employees: [
    {
      employee_id: 11,
      employee_name: "Kumar, R",
      store_name: "Moolakulam",
      basic: 20000,
      pf_applicable: true,
      current: { employee_pf: 1800 },
      september: { employee_pf: 2080 },
      october: { employee_pf: 2400 },
      if_enrolled: null,
      flags: ["CONTRIBUTION_INCREASES"],
      category_label: "PF wage 15,001 - 25,000",
      reason: "Contribution increases",
    },
  ],
  summary: {
    by_category: {},
    monthly_employer_cost_increase: 600,
    eps_correction_affected: 0,
    may_require_enrolment: 0,
    potential_monthly_employer_cost_if_enrolled: 0,
  },
};

const ecrOf = (lines, errors = []) => ({
  period: { year: 2026, month: 9 },
  lines,
  text: lines.join("\n"),
  members: lines.map((_, i) => ({ employee_id: i + 1 })),
  errors,
  totals: { members: lines.length, epf_wages: 0, ee_share: 0, eps_share: 0, er_epf_share: 0, edli_contribution: 0, admin_charge: 0, total_remittance: 0 },
  validation: [],
});

const NONE_APPROVED = ecrOf(
  [],
  [
    { employee_id: 11, code: "NOT_APPROVED" },
    { employee_id: 12, code: "NOT_APPROVED" },
    { employee_id: 13, code: "NOT_CALCULATED" },
  ]
);
const ONE_APPROVED = ecrOf(["100200300400#~#KUMAR R#~#20000#~#20000#~#20000#~#20000#~#2400#~#1666#~#734#~#0#~#0"], [
  { employee_id: 12, code: "NOT_APPROVED" },
]);

/* --------------------------------------------------------------- harness */

let helper = null;
let act = null;
if (!unavailable) {
  helper = require(path.join(root, "helper/payrunCalculation.js")).default;
  ({ act } = require("react-dom/test-utils"));
}

/**
 * Chakra's open modal schedules its focus with requestAnimationFrame, which
 * jsdom does not provide. The DOM only exists once something is mounted, so a
 * CLOSED modal is mounted first (it schedules nothing) and the frame is then
 * supplied as a timer.
 */
if (!unavailable) {
  test.before(() => {
    stub();
    mount(MODAL, { isOpen: false, onClose: () => {}, year: 2026, month: 9 }).unmount();
    window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
    window.cancelAnimationFrame = (id) => clearTimeout(id);
  });
}

/** Let the pending promise chains settle inside act. */
const settle = () => act(() => new Promise((r) => setTimeout(r, 0)));

const button = (name) =>
  [...document.body.querySelectorAll("button")].find((b) => b.textContent.trim() === name);
const bodyText = () => document.body.textContent.replace(/\s+/g, " ");

/** Stub the server calls and capture what the browser is asked to download. */
function stub({ report = REPORT, ecr = NONE_APPROVED } = {}) {
  const calls = { impact: 0, ecr: [] };
  helper.getPfCeilingImpact = async () => {
    calls.impact += 1;
    return typeof report === "function" ? report() : report;
  };
  helper.getEcr = async (args) => {
    calls.ecr.push(args);
    return typeof ecr === "function" ? ecr() : ecr;
  };
  const downloads = [];
  const revoked = [];
  global.URL.createObjectURL = (blob) => {
    downloads.push({ blob });
    return `blob:test/${downloads.length}`;
  };
  global.URL.revokeObjectURL = (url) => revoked.push(url);
  return { calls, downloads, revoked };
}

/** jsdom exists only once something is mounted, so the anchor is stubbed after. */
function captureAnchorClicks({ downloads, revoked }) {
  window.HTMLAnchorElement.prototype.click = function click() {
    const d = downloads[downloads.length - 1];
    d.filename = this.download;
    d.href = this.href;
    d.clickedWhileUrlLive = !revoked.includes(this.href);
  };
}

/** Unmounted after every test, pass or fail, so no modal leaks into the next. */
let mounted = null;
test.afterEach(() => {
  if (mounted) mounted.unmount();
  mounted = null;
});

async function open(opts) {
  const spies = stub(opts);
  const ui = mount(MODAL, { isOpen: true, onClose: () => {}, year: 2026, month: 9 });
  mounted = ui;
  captureAnchorClicks(spies);
  await settle();
  return { ui, ...spies };
}

const clickAsync = async (ui, el) => {
  ui.click(el);
  await settle();
};

/* ----------------------------------------------------------------- tests */

test("Download report (CSV) triggers a browser download of the report as CSV", skip, async () => {
  const { ui, downloads, revoked } = await open();
  const csv = button("Download report (CSV)");
  assert.equal(csv.disabled, false);

  ui.click(csv);
  assert.equal(downloads.length, 1, "one file handed to the browser");
  assert.deepEqual(revoked, [], "the object URL is not revoked in the same tick as the click");
  await settle();
  const d = downloads[0];
  assert.equal(d.filename, "epfo-ceiling-2026-affected-employees.csv");
  assert.equal(d.blob.type, "text/csv");
  assert.equal(d.clickedWhileUrlLive, true, "the object URL is alive when the download starts");

  const text = await d.blob.text();
  const lines = text.split("\n");
  assert.equal(lines.length, 2);
  assert.match(lines[0], /^Employee ID,Employee Name,/);
  // A comma in a name is quoted, not a column shift.
  assert.match(lines[1], /^11,"Kumar, R",Moolakulam,/);

  // ...and is released on a later tick.
  assert.deepEqual(revoked, [d.href]);
});

test("a CSV that cannot be built says so instead of doing nothing", skip, async () => {
  // A field only the CSV reads, so the screen itself still renders.
  const broken = { ...REPORT, employees: [{ ...REPORT.employees[0], eps_correction: { get old_employer_eps() { throw new Error("bad row"); } } }] };
  const { ui, downloads } = await open({ report: broken });
  await clickAsync(ui, button("Download report (CSV)"));
  assert.equal(downloads.length, 0);
  assert.match(bodyText(), /The CSV could not be built: bad row/);
});

test("CSV export permission failure: the report is refused, the reason is shown and CSV stays disabled", skip, async () => {
  const { ui } = await open({ report: { code: 403, msg: "You do not have permission to perform this action" } });
  assert.match(bodyText(), /You do not have permission/);
  assert.equal(button("Download report (CSV)").disabled, true);
});

test("Download ECR is disabled before the ECR is built", skip, async () => {
  const { ui, calls } = await open();
  assert.equal(button("Download ECR").disabled, true);
  assert.equal(calls.ecr.length, 0, "nothing is built until somebody asks");
  assert.match(bodyText(), /Build the ECR first/);
});

test("Build ECR with zero approved employees: a clear message, and Download ECR stays disabled", skip, async () => {
  const { ui, calls } = await open({ ecr: NONE_APPROVED });
  await clickAsync(ui, button("Build ECR (approved employees only)"));
  assert.deepEqual(calls.ecr, [{ year: 2026, month: 9 }]);
  const text = bodyText();
  assert.match(
    text,
    /No approved employees are available for ECR generation\. Complete and approve payroll first\./
  );
  assert.match(text, /3 employee\(s\) not filed: 2 calculated, not yet approved · 1 not calculated/);
  assert.equal(button("Download ECR").disabled, true);
});

test("Build ECR with zero employees in the month at all still explains the disabled download", skip, async () => {
  const { ui } = await open({ ecr: ecrOf([]) });
  await clickAsync(ui, button("Build ECR (approved employees only)"));
  assert.match(bodyText(), /No approved employees are available for ECR generation/);
  assert.equal(button("Download ECR").disabled, true);
});

test("Build ECR with approved employees enables Download ECR, which downloads the ECR text", skip, async () => {
  const { ui, downloads } = await open({ ecr: ONE_APPROVED });
  await clickAsync(ui, button("Build ECR (approved employees only)"));
  assert.doesNotMatch(bodyText(), /No approved employees are available/);
  assert.match(bodyText(), /1 members/);
  assert.match(bodyText(), /1 employee\(s\) left out \(1 calculated, not yet approved\)/);

  const dl = button("Download ECR");
  assert.equal(dl.disabled, false);
  await clickAsync(ui, dl);
  assert.equal(downloads.length, 1);
  assert.equal(downloads[0].filename, "ECR-2026-09.txt");
  assert.equal(await downloads[0].blob.text(), ONE_APPROVED.text);
});

test("an ECR the server refuses shows the server's reason and keeps Download ECR disabled", skip, async () => {
  const { ui } = await open({ ecr: { code: 403, msg: "You do not have permission to perform this action" } });
  await clickAsync(ui, button("Build ECR (approved employees only)"));
  assert.match(bodyText(), /You do not have permission/);
  assert.equal(button("Download ECR").disabled, true);
});

test("rebuilding after a successful build clears the old ECR first - no stale download", skip, async () => {
  let answer = ONE_APPROVED;
  const { ui } = await open({ ecr: () => answer });
  await clickAsync(ui, button("Build ECR (approved employees only)"));
  assert.equal(button("Download ECR").disabled, false);
  answer = NONE_APPROVED;
  await clickAsync(ui, button("Build ECR (approved employees only)"));
  assert.equal(button("Download ECR").disabled, true);
});
