const { presentCurrentSalary, formatEffectiveFrom } = require("./salaryView");

/**
 * M4 — the server's preview, in the shape the salary presenter already reads.
 *
 * `POST /hr/salary/preview/:id` answers with the engine's own structure -
 * `components`, `pf`, `esi`, `monthly_ctc`, `unresolved` - while a STORED row
 * is flat: `basic`, `employee_pf`, `pf_status`, `unresolved_notes`. The two
 * describe identical facts in two shapes, because one is a calculation result
 * and the other is a table.
 *
 * THIS IS A RENAME AND NOTHING ELSE. Not one value is derived, combined,
 * rounded or defaulted here; every field is copied from the field the engine
 * put it in. That matters more than it looks: the whole reason the preview
 * endpoint exists is that what somebody is shown before they submit is
 * produced by the same function that fills the record afterwards, and a
 * flattener that quietly "fixed up" a null would break exactly that guarantee
 * - a Pending contribution would preview as something and store as Pending.
 *
 * So a preview and the record it becomes go through ONE presenter,
 * `util/salaryView.js#presentCurrentSalary`, which is also the one the
 * Employee Master's Payroll card uses. Three screens, one set of rules about
 * what an unresolved figure reads as.
 */

/**
 * @param calculated the body of a successful preview
 * @returns a flat record, as `presentCurrentSalary` expects one
 */
function flattenPreview(calculated) {
  if (!calculated || typeof calculated !== "object") return null;

  const components = calculated.components || {};
  const pf = calculated.pf || {};
  const esi = calculated.esi || {};

  return {
    monthly_gross: calculated.monthly_gross,
    daily_salary: calculated.daily_salary,

    basic: components.basic,
    conveyance: components.conveyance,
    hra: components.hra,
    special_allowance: components.special_allowance,

    pf_status: pf.status,
    pf_wage: pf.pf_wage,
    employee_pf: pf.employee_pf,
    employer_pf_total: pf.employer_pf_total,
    employer_epf: pf.employer_epf,
    employer_eps: pf.employer_eps,
    edli: pf.edli,
    pf_admin_charge: pf.pf_admin_charge,

    esi_status: esi.status,
    esi_wage: esi.esi_wage,
    employee_esi: esi.employee_esi,
    employer_esi: esi.employer_esi,

    monthly_ctc: calculated.monthly_ctc,
    ctc_status: calculated.ctc_status,

    // The engine calls the list `unresolved`; a stored row calls it
    // `unresolved_notes`. Same notes, same codes, same `component` keys - the
    // presenter reads the reasons out of it either way.
    unresolved_notes: Array.isArray(calculated.unresolved) ? calculated.unresolved : [],

    effective_from: calculated.effective_from,
    manual_override: calculated.manual_override === true,
    override_reason: calculated.override_reason || null,

    // A preview is not a record and has no lifecycle. Left null deliberately,
    // so nothing renders a status badge on something nobody has proposed yet.
    status: null,
  };
}

/** The preview, presented by the shared salary presenter. */
function presentPreview(calculated) {
  const record = flattenPreview(calculated);
  return record ? presentCurrentSalary(record) : null;
}

/**
 * The effective date the SERVER resolved for this preview.
 *
 * For an opening salary that is the later of the opening floor and the date of
 * joining, and it is the only place the screen learns it - the rule is the
 * server's and the screen displays its answer rather than working it out.
 */
function previewEffectiveFrom(calculated) {
  if (!calculated) return null;
  return formatEffectiveFrom(calculated.effective_from);
}

/**
 * Is the salary period this preview lands in locked?
 *
 * `period_lock` is a real contract that answers "not locked, because monthly
 * payroll does not exist yet" today. Read rather than assumed, so the screen
 * already handles a locked period the day the implementation behind it starts
 * returning one.
 */
function periodLockOf(calculated) {
  const lock = calculated && calculated.period_lock;
  if (!lock || !lock.locked) return null;
  return {
    period: lock.period || null,
    message:
      lock.message || `The salary period ${lock.period} is locked and cannot accept changes.`,
  };
}

module.exports = { flattenPreview, presentPreview, previewEffectiveFrom, periodLockOf };
