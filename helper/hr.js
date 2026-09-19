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

  /**
   * GET /hr/employees/outlets — view_employees.
   *
   * THE BRANCHES THIS CALLER MAY FILTER EMPLOYEES BY, as `[{ outlet_id,
   * outlet_name }]`, narrowed on the SERVER by the employee branch scope.
   *
   * NOT `/outlet/directory`, AND THAT IS THE WHOLE POINT. That endpoint is
   * authenticated but deliberately company-wide - a purchase filter is
   * supposed to name every branch - so an employee screen using it sent a
   * branch-scoped store manager every outlet in the company and then hid the
   * ones they may not use in React. The names had already crossed the wire.
   * This returns only what the caller may know about.
   *
   * It is the SCOPE, not the population: an authorised branch with no
   * employees in it is still returned, so the dropdown cannot lose a branch
   * because a search or a status filter emptied it.
   */
  getEmployeeOutlets: () =>
    new Promise((resolve, reject) => {
      API.get("/hr/employees/outlets")
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

  /**
   * POST /hr/employee/:id/onboarding-education — employee_create.
   * M1: stage 4 of Add Employee, written against the Employee ID stage 3
   * allocated, by the same manager, without needing `employee_edit`. The
   * body is the three education columns and nothing else.
   */
  saveOnboardingEducation: (employeeId, payload) =>
    new Promise((resolve, reject) => {
      API.post(`/hr/employee/${employeeId}/onboarding-education`, payload)
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

  /**
   * GET /hr/employee/:id/attendance-required — view_employees.
   *
   * Whether biometric attendance is expected of this employee. Anybody who
   * may see the profile may see the value; only an administrator may change
   * it, and the server enforces that on `user_type = 2` directly rather
   * than on a grantable permission key.
   */
  getAttendanceRequired: (employeeId) =>
    new Promise((resolve, reject) => {
      API.get(`/hr/employee/${employeeId}/attendance-required`)
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /**
   * POST /hr/employee/:id/attendance-required — ADMINISTRATORS ONLY.
   *
   * A non-administrator gets a 403 from the server whether or not the web
   * app offered the control, which is the point: hiding the button is a
   * courtesy and this endpoint is the boundary.
   */
  setAttendanceRequired: (employeeId, attendanceRequired) =>
    new Promise((resolve, reject) => {
      API.post(`/hr/employee/${employeeId}/attendance-required`, {
        attendance_required: Boolean(attendanceRequired),
      })
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /**
   * POST /hr/employee/:id/joining-date — employee_edit.
   *
   * Corrects a wrongly recorded joining date. The backend moves the master
   * date and the current employment period's date together and records the
   * old and new value on the lifecycle timeline. `date_of_joining` is
   * YYYY-MM-DD, not in the future.
   */
  correctJoiningDate: (employeeId, dateOfJoining) =>
    new Promise((resolve, reject) => {
      API.post(`/hr/employee/${employeeId}/joining-date`, { date_of_joining: dateOfJoining })
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

  /**
   * POST /hr/employee/:id/aadhaar/initiate — the EXISTING-EMPLOYEE path.
   *
   * `verify_employee_aadhaar` + branch scope, and the employee's Aadhaar must
   * still be PENDING. Deliberately NOT the onboarding endpoint above: that one
   * is gated on `employee_create` and, because the body carries an Aadhaar
   * number, on `edit_employee_sensitive` through B3's write guard - which is
   * why "Verify now" used to fail for a store manager. This one accepts the
   * number after a narrower check and writes nothing to the employee record;
   * attaching the result is still `employee_edit`.
   */
  initiateAadhaarForEmployee: (employeeId, { aadhaar_number, consent_given }) =>
    new Promise((resolve, reject) => {
      API.post(`/hr/employee/${employeeId}/aadhaar/initiate`, { aadhaar_number, consent_given })
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /**
   * POST /hr/employee/:id/aadhaar/verify-otp — the EXISTING-EMPLOYEE path.
   * The same narrow authorization as the step above; the OTP is sent once and
   * is never stored, logged or echoed back.
   */
  verifyAadhaarOtpForEmployee: (employeeId, { verification_token, otp }) =>
    new Promise((resolve, reject) => {
      API.post(`/hr/employee/${employeeId}/aadhaar/verify-otp`, { verification_token, otp })
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /** GET /hr/employee/:id/aadhaar — view_employee_aadhaar. VERIFIED or PENDING; never the number. */
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

  /**
   * POST /hr/employee/:id/bank/name-review — confirm_bank_name_mismatch AND
   * view_employee_sensitive.
   *
   * The authorised review of a name the bank did not agree with, and the
   * action the bank card offers in place of the message that said nobody
   * could confirm it. `decision` is APPROVE_SAME_PERSON or REJECT_ACCOUNT,
   * and a reason is required for both - it is what the backend records
   * against the reviewer.
   *
   * Approving is stored as a bank-name-mismatch override; rejecting leaves
   * the account not payroll-ready. Neither lets a bank transfer through
   * unnoticed.
   */
  reviewBankName: (employeeId, decision, reason) =>
    new Promise((resolve, reject) => {
      API.post(`/hr/employee/${employeeId}/bank/name-review`, { decision, reason })
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /**
   * POST /hr/employee/:id/bank/confirm-name — confirm_bank_name_mismatch AND
   * view_employee_sensitive.
   *
   * The older, narrower action: a REVIEW verdict only, with an optional note.
   * `reviewBankName` above supersedes it on this screen. Kept because it is a
   * live endpoint with its own audit columns, and removing a caller is not a
   * reason to assume nothing else calls it.
   */
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
