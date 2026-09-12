import API from "../util/api";

/**
 * M4 — Payroll's own salary helper.
 *
 * SEPARATE FROM `helper/employeeSalary.js` ON PURPOSE, and the line between
 * them is the product rule rather than a filing preference. The Employee
 * Master reads a salary and enters the FIRST one during onboarding - four
 * calls, none of which can change a salary that already exists. Everything
 * that REVISES pay lives here: amend, approve, reject and the bulk pair.
 * Putting any of those into the profile's helper would make the Employee
 * Master a second salary-revision screen one import at a time, and a second
 * place to revise a salary is a second answer to what somebody is paid.
 *
 * M5 ADDS THE BULK PAIR. Validate and submit are a BATCH over the same
 * lifecycle - same engine, same one-pending rule, same PENDING outcome - and
 * they exist because a file of six hundred rows must not become twelve hundred
 * requests from this file.
 *
 * THE ENDPOINTS ARE M2'S, PLUS THE ONE READ M4 ADDED. Nothing here is a new
 * concept: the lifecycle - propose, amend while pending, approve, reject - was
 * built and tested in M2, and M4 is the two screens that drive it. The only
 * addition is `/hr/salary/pending`, because no per-employee endpoint can list
 * everybody's outstanding proposals without this file asking six hundred
 * times.
 *
 * NOTHING HERE CALCULATES ANYTHING. Every amount displayed by either Payroll
 * screen comes from `preview` or from a stored record; the browser sends a
 * gross, a date, a reason and - for an override - four component amounts, and
 * receives every other figure. A second implementation of the breakup or the
 * statutory rules here would be a second answer, and the two would disagree
 * the first time a rate changed.
 *
 * REFUSALS ARE ROUTINE AND ARRIVE AS DATA. `util/api.js` resolves anything
 * under 429, so a 403 (`{ code: 403, msg }`) and a 400/422 validation refusal
 * (`{ code: 422, msg }`) come back to the caller instead of rejecting - see
 * `util/handle403.js`, which keeps the session alive through an authorisation
 * refusal. `util/salaryApiError.js` is what turns those bodies into something
 * to show. Only a genuine transport failure rejects.
 */
const payrollSalary = {
  /**
   * POST /hr/salary/preview/:id — the server's calculation, saving nothing.
   *
   * The ONLY way either screen learns a breakup, a contribution or a CTC. The
   * create path runs the same function on the same inputs, so what is
   * previewed is what gets stored.
   */
  preview: (employeeId, body) =>
    new Promise((resolve, reject) => {
      API.post(`/hr/salary/preview/${employeeId}`, body)
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /**
   * POST /hr/salary/employee/:id — propose a salary. Always lands PENDING.
   *
   * The server decides whether this is an OPENING_SALARY or a REVISION, and
   * for an opening it decides the effective date too. Neither is this screen's
   * to choose, so neither is asserted here.
   */
  create: (employeeId, body) =>
    new Promise((resolve, reject) => {
      API.post(`/hr/salary/employee/${employeeId}`, body)
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /**
   * POST /hr/salary/revision/:id — amend a PENDING proposal.
   *
   * Approved and rejected records are never edited, by this or by anything
   * else: a correction to an approved salary is a NEW revision that somebody
   * has to approve.
   */
  amendPending: (salaryId, body) =>
    new Promise((resolve, reject) => {
      API.post(`/hr/salary/revision/${salaryId}`, body)
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /** GET /hr/salary/employee/:id/history — every revision, newest first. */
  getHistory: (employeeId) =>
    new Promise((resolve, reject) => {
      API.get(`/hr/salary/employee/${employeeId}/history`)
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /**
   * GET /hr/salary/employee/:id/current — the resolver's answer.
   *
   * The latest APPROVED revision effective on or before today. A `null`
   * `current_salary` means nothing has been approved yet and this will be the
   * employee's opening salary; it does NOT mean zero.
   */
  getCurrentSalary: (employeeId) =>
    new Promise((resolve, reject) => {
      API.get(`/hr/salary/employee/${employeeId}/current`)
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /**
   * GET /hr/salary/pending — the approval queue, across all employees.
   *
   * `params` may narrow by employee, outlet and an effective-date window. It
   * cannot widen: PENDING is fixed in the server's query, not defaulted from
   * anything sent here.
   */
  getPendingQueue: (params) =>
    new Promise((resolve, reject) => {
      API.get("/hr/salary/pending", params ? { params } : undefined)
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /** POST /hr/salary/revision/:id/approve — the money decision. */
  approve: (salaryId) =>
    new Promise((resolve, reject) => {
      API.post(`/hr/salary/revision/${salaryId}/approve`, {})
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /**
   * POST /hr/salary/bulk/validate — a whole file, priced and checked.
   *
   * SAVES NOTHING. `rows` is the three template cells per row, as text. Every
   * verdict comes back from the server: whether each row is an opening salary
   * or a revision, what effective date the rule resolves to, the full breakup
   * it would create, and - for a refused row - the one sentence saying why.
   * The browser classifies nothing and prices nothing.
   */
  bulkValidate: (rows) =>
    new Promise((resolve, reject) => {
      API.post("/hr/salary/bulk/validate", { rows })
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /**
   * POST /hr/salary/bulk/submit — create the rows that passed, as PENDING.
   *
   * THE ROWS ARE SENT AGAIN AND CHECKED AGAIN. There is no validation token to
   * hand back: a proposal can be raised for one of these employees between the
   * preview and the click, so the server revalidates and a row that has since
   * become invalid comes back as a per-row failure. Nothing is created on the
   * strength of a check that has expired, and nothing is ever auto-approved.
   */
  bulkSubmit: (rows) =>
    new Promise((resolve, reject) => {
      API.post("/hr/salary/bulk/submit", { rows })
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /** POST /hr/salary/revision/:id/reject — with a reason the server requires. */
  reject: (salaryId, reason) =>
    new Promise((resolve, reject) => {
      API.post(`/hr/salary/revision/${salaryId}/reject`, { reason })
        .then((res) => resolve(res.data))
        .catch(reject);
    }),
};

export default payrollSalary;
