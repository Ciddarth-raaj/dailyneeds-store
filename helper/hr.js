import API from "../util/api";

/**
 * Stage 0C / C3 — the /hr API surface, as the backend actually defines it.
 *
 * Every path here was read from `routes/employee_master.js`; nothing is
 * invented. The permission each one needs is noted so a screen can decide
 * what to offer before it calls and gets a 403.
 *
 * These resolve `res.data` like every other helper in this repo, which means
 * a caller can receive `{ code: 403, msg }` instead of the happy shape - see
 * `util/apiList.js` for why that is deliberate and how to unwrap it.
 */
const hr = {
  /* ------------------------------------------------------- the employee */

  /**
   * GET /hr/employees/status-summary — view_employees.
   *
   * Aadhaar and bank status for a WHOLE employee list, in one request. It
   * exists so the list can show those columns without asking per employee;
   * calling it once per employee would defeat the only reason it is there.
   *
   * Returns `[{ employee_id, aadhaar_status, bank_status,
   * bank_payroll_ready }]` and nothing else - no Aadhaar or account digits,
   * no fingerprints, no verification ids. It shows exactly the employees
   * `/employee/employees` shows the same caller.
   */
  getStatusSummary: (filters = {}) =>
    new Promise((resolve, reject) => {
      API.get("/hr/employees/status-summary", { params: filters })
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /** POST /hr/employee — employee_create. Never send employee_id: the DB allocates it. */
  createEmployee: (payload) =>
    new Promise((resolve, reject) => {
      API.post("/hr/employee", payload)
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /** POST /hr/employee/:id/edit — employee_edit. */
  editEmployee: (employeeId, patch) =>
    new Promise((resolve, reject) => {
      API.post(`/hr/employee/${employeeId}/edit`, patch)
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /** POST /hr/employee/:id/resign — employee_resign. */
  resignEmployee: (employeeId, payload) =>
    new Promise((resolve, reject) => {
      API.post(`/hr/employee/${employeeId}/resign`, payload)
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /** POST /hr/employee/:id/rejoin — employee_rejoin. Same permanent employee_id. */
  rejoinEmployee: (employeeId, payload) =>
    new Promise((resolve, reject) => {
      API.post(`/hr/employee/${employeeId}/rejoin`, payload)
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /** GET /hr/employee/:id/lifecycle — view_employee_lifecycle. Periods and events. */
  getLifecycle: (employeeId) =>
    new Promise((resolve, reject) => {
      API.get(`/hr/employee/${employeeId}/lifecycle`)
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /**
   * POST /hr/employee/check-duplicate — employee_create.
   * ADVISORY ONLY. Never gates the create.
   */
  checkDuplicate: (payload) =>
    new Promise((resolve, reject) => {
      API.post("/hr/employee/check-duplicate", payload)
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /* -------------------------------------------------------------- Aadhaar */

  /**
   * POST /hr/aadhaar/initiate — employee_create, plus edit_employee_sensitive
   * because the body carries an Aadhaar number and B3 guards the write.
   * Returns an opaque `verification_token`; the number never comes back.
   */
  initiateAadhaar: ({ aadhaar_number, consent_given }) =>
    new Promise((resolve, reject) => {
      API.post("/hr/aadhaar/initiate", { aadhaar_number, consent_given })
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /**
   * POST /hr/aadhaar/verify-otp — employee_create.
   * The OTP is sent once and never stored, logged or echoed back.
   */
  verifyAadhaarOtp: ({ verification_token, otp }) =>
    new Promise((resolve, reject) => {
      API.post("/hr/aadhaar/verify-otp", { verification_token, otp })
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /** GET /hr/employee/:id/aadhaar — view_employee_lifecycle. VERIFIED or PENDING; never the number. */
  getAadhaarStatus: (employeeId) =>
    new Promise((resolve, reject) => {
      API.get(`/hr/employee/${employeeId}/aadhaar`)
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /**
   * POST /hr/employee/:id/aadhaar/attach — employee_edit.
   * The other half of "Skip for now": attaches a verification to an employee
   * who already exists, keeping the same permanent employee_id.
   */
  attachAadhaar: (employeeId, aadhaarVerificationId) =>
    new Promise((resolve, reject) => {
      API.post(`/hr/employee/${employeeId}/aadhaar/attach`, {
        aadhaar_verification_id: aadhaarVerificationId,
      })
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /* ----------------------------------------------------------------- bank */

  /** GET /hr/employee/:id/bank/verification — view_employee_lifecycle. Read-only; spends nothing. */
  getBankStatus: (employeeId) =>
    new Promise((resolve, reject) => {
      API.get(`/hr/employee/${employeeId}/bank/verification`)
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /**
   * POST /hr/employee/:id/bank/verify — verify_employee_bank AND
   * view_employee_sensitive. This is the only call that spends a paid
   * Penny-Less check; the account number is read from the employee record
   * server-side and is never sent from here.
   */
  verifyBank: (employeeId) =>
    new Promise((resolve, reject) => {
      API.post(`/hr/employee/${employeeId}/bank/verify`, {})
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /**
   * GET /hr/bank/ifsc/:ifsc — edit_employee_sensitive AND view_employee_sensitive.
   *
   * Resolves a branch code to a bank and a branch name so the form can fill
   * itself in. NOT a verification: it spends no Penny-Less check, takes no
   * employee, and the backend answers from its local IFSC master wherever it
   * can. Sandbox is never called from the browser.
   */
  lookupIfsc: (ifsc) =>
    new Promise((resolve, reject) => {
      const code = encodeURIComponent(ifsc);
      API.get(`/hr/bank/ifsc/${code}`)
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /** POST /hr/employee/:id/bank/confirm-name — confirm_bank_name_mismatch AND view_employee_sensitive. */
  confirmBankName: (employeeId, note) =>
    new Promise((resolve, reject) => {
      API.post(`/hr/employee/${employeeId}/bank/confirm-name`, { note })
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /**
   * POST /hr/employee/:id/bank/override-duplicate — override_duplicate_bank_account
   * AND view_employee_sensitive. Granted to nobody by design, so in practice
   * an administrator. A reason is required and is audited.
   */
  overrideDuplicateBank: (employeeId, reason) =>
    new Promise((resolve, reject) => {
      API.post(`/hr/employee/${employeeId}/bank/override-duplicate`, { reason })
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /* ------------------------------------------------------------- review */

  /** GET /hr/lifecycle/review — view_employee_lifecycle. Read-only; historical cleanup is deferred. */
  getLifecycleReview: () =>
    new Promise((resolve, reject) => {
      API.get("/hr/lifecycle/review")
        .then((res) => resolve(res.data))
        .catch(reject);
    }),
};

export default hr;
