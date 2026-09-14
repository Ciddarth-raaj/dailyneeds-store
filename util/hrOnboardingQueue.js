/**
 * The Onboarding / Pending HR work queue — every rule it runs on.
 *
 * WHY IT IS A SEPARATE SCREEN FROM THE EMPLOYEE MASTER. The employee list
 * answers "who is this person and where do they work"; this answers "whose
 * record is not finished, and what is missing". Running both off one card
 * gave every employee three compliance badges to serve the handful who need
 * chasing. Same data, same endpoint, same permission - two questions.
 *
 * NO NEW SOURCE OF TRUTH, AND NO NEW DEFINITION OF COMPLIANCE. Every status
 * here comes from `GET /hr/employees/status-summary`, which derives all of
 * them from the sections themselves:
 *
 *   Aadhaar    VERIFIED when an Aadhaar identity is attached, else PENDING
 *   Bank       the shared C2 rule; NOT_PROVIDED means nobody has entered an
 *              account
 *   PF / ESI   COMPLETE / PENDING / NOT_APPLICABLE, from the `pf_applicable`
 *              and `esi_applicable` decision the profile's Statutory section
 *              records. PENDING means nobody has been asked yet; a missing
 *              UAN or PF number is NOT pending - that has always been treated
 *              as ordinary, because a UAN routinely takes weeks
 *   Statutory  PF and ESI as ONE section, which is how HR completes them -
 *              `statutory_pending`, derived on the server from the very same
 *              two decisions the PF and ESI columns are
 *   Payroll    whether the employee is actually set up to be paid: a live,
 *              costed salary in effect today and a recorded way to pay it.
 *              Derived on the server from the payroll module's own rules,
 *              NOT from the bank column - an employee can have a verified
 *              account and no salary, or a salary and no account
 *   HR         the `hr_onboarding_pending` flag - the ONE definition of HR
 *              completion, derived on the server as the union of the four:
 *              Aadhaar, Bank, Statutory and Payroll. An employee is HR
 *              complete only when all four are
 *
 * WHAT "PENDING" MEANS - AND WHERE THAT IS DECIDED.
 *
 * ON THE SERVER, AND ONLY THERE. `hr_onboarding_pending` is true when a
 * verified Aadhaar, either statutory decision, a payroll-ready bank account,
 * or the payroll setup itself is outstanding, and `hr_onboarding_missing`
 * names which. Overall onboarding IS that flag - this module does not compose
 * a second answer out of the columns beside it, because two definitions of
 * "finished" is exactly how a queue and a badge start disagreeing about the
 * same employee.
 *
 * AADHAAR IS HR'S ONCE THE FIRST ATTEMPT IS OVER. The store manager attempts
 * it at stage 1 of onboarding; if it is left unverified for any reason -
 * failure, mismatch, a technical problem, a skip, or simply not finished -
 * chasing it is HR's follow-up. So Aadhaar pending means HR pending, and the
 * employee list's HR column says so too. It is the same flag.
 *
 * A BANK ACCOUNT MUST HAVE PASSED ITS CHECK. Entering an account number is
 * not finishing the section: an employee whose verification failed, is
 * awaiting a result, came back a name mismatch or clashes with somebody
 * else's account still cannot be paid. Complete means `bank_payroll_ready`,
 * true for VERIFIED and nothing else - the same value the server's flag is
 * built on and the list's Bank badge is drawn from.
 *
 * THE PER-ITEM COLUMNS EXIST TO SAY WHY, NOT TO DECIDE. Aadhaar, Bank, PF and
 * ESI are rendered so somebody can see which item is holding an employee up
 * and filter to the one they are clearing. Each is read from the same summary
 * the flag is derived from, so `hr` is Pending exactly when at least one of
 * them is - and the tests pin that agreement rather than trusting it.
 *
 * NOT APPLICABLE IS DONE. An employee whose PF or ESI is recorded as "not in
 * the scheme" has nothing outstanding for it. That falls out of the rule
 * rather than being special-cased: the decision has been recorded, so the
 * scheme is not PENDING, so it counts towards neither the PF/ESI pending
 * count nor the overall answer.
 *
 * SO THE QUEUE EMPTIES ITSELF. Every column is derived at its source from the
 * sections themselves, so the moment the last one is filled in on the profile
 * - the Aadhaar verified, the decision recorded, the account passing its
 * check - the employee drops out of All Pending on the next load. Nothing is
 * marked done here and there is no state to clear.
 *
 * UNKNOWN IS NOT PENDING. Where the summary did not load, or a server does
 * not derive a flag, the row reads "—" and is not counted as outstanding.
 * Chasing somebody because a request failed is worse than not chasing them.
 *
 * Pure functions, no React and no API, so `node --test
 * util/hrOnboardingQueue.test.js` can pin all of it.
 */

const PENDING = "PENDING";
const COMPLETE = "COMPLETE";
const NOT_APPLICABLE = "NOT_APPLICABLE";
const UNKNOWN = "UNKNOWN";

/* ------------------------------------------------------------ one employee */

/**
 * One queue row: the employee, plus every status as a plain tri-state the UI
 * can render and the filters can read. `status` is the merged entry from
 * `statusSummaryIndex`, which is `{}` when nothing arrived for this employee.
 */
function queueRow(employee = {}, status = {}) {
  const aadhaar = status.aadhaar_status
    ? status.aadhaar_status === "VERIFIED"
      ? COMPLETE
      : PENDING
    : UNKNOWN;

  // BANK IS COMPLETE ONLY WHEN THE ACCOUNT HAS ACTUALLY PASSED ITS CHECK.
  //
  // `bank_payroll_ready` is the existing answer to "are these details good
  // enough to pay somebody with", and it is true for VERIFIED and nothing
  // else. So an account nobody has entered, one awaiting its check, one that
  // came back NAME_MISMATCH, FAILED, or DUPLICATE_ACCOUNT all read Pending -
  // they are all an employee who cannot be paid, and all of them are work.
  //
  // THE SAME VALUE THE SERVER'S HR FLAG IS BUILT ON, so this column and `hr`
  // cannot disagree: `bank_payroll_ready` is computed once, by the shared C2
  // rule, and is what the list's Bank badge is drawn from as well.
  const bank =
    status.bank_status === undefined || status.bank_status === null
      ? UNKNOWN
      : status.bank_payroll_ready
      ? COMPLETE
      : PENDING;

  const scheme = (value) => {
    if (!value) return UNKNOWN;
    if (value === PENDING || value === COMPLETE || value === NOT_APPLICABLE) return value;
    return UNKNOWN;
  };

  const hr =
    status.hr_onboarding_pending === undefined || status.hr_onboarding_pending === null
      ? UNKNOWN
      : status.hr_onboarding_pending
      ? PENDING
      : COMPLETE;

  const pf = scheme(status.pf_status);
  const esi = scheme(status.esi_status);

  /**
   * STATUTORY IS PF AND ESI AS ONE SECTION - which is how HR does the work.
   *
   * They are one section of the profile, completed in one edit, and the
   * backend already reports `statutory_pending` for exactly this card. It is
   * read here rather than recomposed from the two columns beside it, for the
   * same reason `overall` is the server's flag: two definitions of the same
   * thing is how a card and a badge start disagreeing.
   *
   * The per-scheme columns stay, because "which one" is still the question
   * somebody clearing PF is asking.
   */
  const statutory =
    status.statutory_pending === undefined || status.statutory_pending === null
      ? UNKNOWN
      : status.statutory_pending
      ? PENDING
      : COMPLETE;

  /**
   * PAYROLL - the fourth item, and NOT the bank column restated.
   *
   * Bank asks whether an account can receive a transfer; payroll asks whether
   * there is anything to transfer - an agreed, costed salary in effect today,
   * and a recorded way to pay it. Derived on the server from the payroll
   * module's own rules (`getCurrentSalary`, `utils/salary_engine.js`), so this
   * screen composes nothing and cannot drift from what payroll believes.
   */
  const payroll =
    status.payroll_pending === undefined || status.payroll_pending === null
      ? UNKNOWN
      : status.payroll_pending
      ? PENDING
      : COMPLETE;

  /**
   * OVERALL ONBOARDING IS THE SERVER'S FLAG, NOT A SECOND OPINION ABOUT IT.
   *
   * `hr_onboarding_pending` already means "a verified Aadhaar, both statutory
   * decisions, or a payroll-ready bank account is outstanding" - which is the
   * whole of what this queue asks. Recomposing it here from the four columns
   * would produce a second definition of "finished" that could drift from the
   * one the employee list renders, for no gain: the columns are read from the
   * same summary, so they already agree with it.
   *
   * UNKNOWN stays UNKNOWN. A flag the server did not send is not evidence of
   * outstanding work, and `hr` above already reads that way.
   */
  const overall = hr;

  return {
    employee_id: employee.employee_id,
    employee_name: employee.employee_name,
    employee_image: employee.employee_image,
    store_id: employee.store_id,
    store_name: employee.store_name,
    department_id: employee.department_id,
    department_name: employee.department_name,
    designation_id: employee.designation_id,
    status: employee.status,
    aadhaar,
    bank,
    pf,
    esi,
    statutory,
    payroll,
    hr,
    overall,
    hr_onboarding_missing: Array.isArray(status.hr_onboarding_missing)
      ? status.hr_onboarding_missing
      : [],
    payroll_missing: Array.isArray(status.payroll_missing) ? status.payroll_missing : [],
  };
}

/** True only where a status is known AND outstanding. */
const isPending = (value) => value === PENDING;

/** Is this employee currently employed? The queue is about people who are. */
const isActive = (employee = {}) => Number(employee.status) === 1;

/* ---------------------------------------------------------------- filters */

/**
 * The work filters, each naming exactly one outstanding thing - because the
 * person clearing PF is not the person chasing bank details.
 *
 * `all_pending` is the default and is the server's flag, so it is the queue
 * proper - and every other work filter is a subset of it, because the flag is
 * derived from exactly these items.
 */
const QUEUE_FILTERS = [
  { value: "all", label: "Active Employees" },
  { value: "aadhaar", label: "Aadhaar Pending" },
  { value: "bank", label: "Bank Pending" },
  { value: "statutory", label: "Statutory Pending" },
  { value: "payroll", label: "Payroll Pending" },
  { value: "hr", label: "HR Pending" },
  // The per-scheme halves. NOT cards - the dashboard counts PF and ESI as one
  // Statutory section - but kept as filters because the person clearing PF is
  // not the person chasing ESI numbers, and that is still a real day's work.
  { value: "pf", label: "PF Pending (within Statutory)" },
  { value: "esi", label: "ESI Pending (within Statutory)" },
];

const QUEUE_FILTER_VALUES = QUEUE_FILTERS.map((f) => f.value);

/**
 * THE CARDS, AND THE ONE FILTER EACH ONE SELECTS.
 *
 * A card and the dropdown are two controls for ONE piece of state, so they
 * are defined together here rather than wired up twice on the screen: that is
 * what makes it impossible for the page to show a selected card and a
 * dropdown that disagrees with it.
 *
 * `count` names the key on `queueCounts` the card displays - every one of
 * which is computed over the whole active population, never over the rows the
 * current filter left on screen.
 */
const QUEUE_CARDS = [
  { filter: "all", label: "Active employees", count: "active" },
  { filter: "aadhaar", label: "Aadhaar pending", count: "aadhaar" },
  { filter: "bank", label: "Bank pending", count: "bank" },
  { filter: "statutory", label: "Statutory pending", count: "statutory" },
  { filter: "payroll", label: "Payroll pending", count: "payroll" },
  // The overall answer, and the one HR works from, so it is the accented one.
  { filter: "hr", label: "HR pending", count: "hr", accent: true },
];

/** Does one row belong under `filter`? */
function matchesFilter(row, filter) {
  switch (filter) {
    // EVERY ACTIVE EMPLOYEE. `filterQueue` has already dropped the inactive
    // ones, so "all" here is exactly the population the Active card counts -
    // which is what makes clicking that card show precisely its own number.
    case "all":
      return true;
    case "aadhaar":
      return isPending(row.aadhaar);
    case "bank":
      return isPending(row.bank);
    case "statutory":
      return isPending(row.statutory);
    case "payroll":
      return isPending(row.payroll);
    case "pf":
      return isPending(row.pf);
    case "esi":
      return isPending(row.esi);
    case "hr":
    case "all_pending": // the old name for this filter, still honoured
    default:
      return isPending(row.hr);
  }
}

/**
 * The rows a screen should show: active employees only, then the outlet,
 * department and search narrowing, then the work filter.
 *
 * RESIGNED EMPLOYEES ARE NOT A QUEUE. Somebody who has left is not waiting on
 * HR to record their PF applicability, and leaving them in would fill the
 * screen with work nobody will ever do.
 */
function filterQueue(rows, { filter = "hr", outlet = "", department = "", search = "" } = {}) {
  const needle = String(search || "").trim().toLowerCase();
  return (rows || []).filter((row) => {
    if (Number(row.status) !== 1) return false;
    if (outlet && String(row.store_id) !== String(outlet)) return false;
    if (department && String(row.department_id) !== String(department)) return false;
    if (needle) {
      const matches =
        String(row.employee_id).includes(needle) ||
        String(row.employee_name || "").toLowerCase().includes(needle);
      if (!matches) return false;
    }
    return matchesFilter(row, filter);
  });
}

/* ----------------------------------------------------------------- counts */

/**
 * The live counts across the top, over ACTIVE employees only and over the
 * outlet / department narrowing but NOT the work filter.
 *
 * EVERY COUNT IS EVALUATED AGAINST THE WHOLE ACTIVE POPULATION, AND NEVER
 * AGAINST ANOTHER CARD'S RESULT. `scoped` is built once, from every active
 * row, and each card counts its own predicate over it independently - so
 * Payroll pending is measured against all active employees rather than
 * against the employees some other card left on screen, and clicking a card
 * cannot change any number including its own. A count that moved when you
 * clicked the thing it counts would be useless for deciding what to click.
 *
 * Every number is derived from the rows on screen. Nothing here is a
 * constant, and there is no example data anywhere in this module.
 */
function queueCounts(rows, { outlet = "", department = "" } = {}) {
  const scoped = (rows || []).filter((row) => {
    if (Number(row.status) !== 1) return false;
    if (outlet && String(row.store_id) !== String(outlet)) return false;
    if (department && String(row.department_id) !== String(department)) return false;
    return true;
  });

  const count = (predicate) => scoped.reduce((n, row) => n + (predicate(row) ? 1 : 0), 0);

  return {
    active: scoped.length,
    aadhaar: count((r) => isPending(r.aadhaar)),
    bank: count((r) => isPending(r.bank)),
    statutory: count((r) => isPending(r.statutory)),
    payroll: count((r) => isPending(r.payroll)),
    hr: count((r) => isPending(r.hr)),
    // The per-scheme halves, for the two filters that still name them. Not
    // cards, and counted the same way as everything else here.
    pf: count((r) => isPending(r.pf)),
    esi: count((r) => isPending(r.esi)),
    // The old name for the HR count. Identical by construction - `overall` IS
    // `hr` - and kept so nothing reading it silently becomes undefined.
    pending: count((r) => isPending(r.overall)),
  };
}

/* ----------------------------------------------------------------- badges */

/**
 * One tri-state, as a badge. Kept here beside the rule that produces it so a
 * colour can never say something the filter disagrees with.
 *
 * UNKNOWN is a plain dash, never "Pending": see the note at the top.
 */
function statusBadge(value, { pendingLabel = "Pending", completeLabel = "Complete" } = {}) {
  if (value === COMPLETE) return { label: completeLabel, colorScheme: "green" };
  if (value === PENDING) return { label: pendingLabel, colorScheme: "orange" };
  if (value === NOT_APPLICABLE) return { label: "Not applicable", colorScheme: "gray" };
  return { label: "—", colorScheme: "gray", unknown: true };
}

module.exports = {
  PENDING,
  COMPLETE,
  NOT_APPLICABLE,
  UNKNOWN,
  QUEUE_FILTERS,
  QUEUE_FILTER_VALUES,
  QUEUE_CARDS,
  queueRow,
  isPending,
  isActive,
  matchesFilter,
  filterQueue,
  queueCounts,
  statusBadge,
};
