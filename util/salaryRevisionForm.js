/**
 * M4 — what the Salary Revision form will and will not let somebody submit.
 *
 * Pure functions, no React, so the rules can be tested without a renderer.
 *
 * THIS IS NOT WHERE THE RULES LIVE. Every one of them is enforced by
 * `usecase/employee_salary.js` and `utils/salary_engine.js` on the server, on
 * every request, whatever this file returns - a screen that validated and a
 * server that did not would be a screen anybody could talk past. What this
 * does is stop somebody filling in a form, pressing Save and being told no
 * afterwards, for the cases where the answer was knowable before they pressed
 * it.
 *
 * IT CALCULATES NO SALARY. It compares amounts a person typed against amounts
 * the SERVER sent back in a preview - the automatic Basic, the conveyance and
 * HRA caps - and never derives one. Those live in
 * `statutory_snapshot`, which every preview carries precisely so a screen can
 * check an entry against the rates that produced it rather than against a
 * number compiled into a bundle a year ago.
 *
 * THE FOUR RULES THAT ARE THIS MODULE'S REASON TO EXIST:
 *
 *   a REVISION needs an effective date, and it is the user's
 *   a REVISION needs a business reason; an OPENING SALARY does not
 *   an OPENING SALARY's effective date is the server's and is not editable
 *   a manual override needs its OWN reason, which is a different question
 */

/** Blank, in every way a form field can be blank. */
function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

/** A typed amount as a number, or null when it is not one. */
function toAmount(value) {
  if (isBlank(value)) return null;
  const n = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

/** `YYYY-MM-DD` and nothing else. A date input gives exactly this. */
function isDateOnly(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

/** Rupees as whole paise, so four components can be compared to a gross exactly. */
function toPaise(value) {
  const n = toAmount(value);
  if (n === null) return null;
  return Math.round(n * 100);
}

const COMPONENT_FIELDS = ["basic", "conveyance", "hra", "special_allowance"];

const COMPONENT_LABELS = {
  basic: "Basic",
  conveyance: "Conveyance",
  hra: "HRA",
  special_allowance: "Special Allowance",
};

/**
 * The caps and the automatic Basic, read off a preview's statutory snapshot.
 *
 * NOT CONSTANTS IN THIS FILE. A cap typed into the browser is a second copy of
 * a statutory rule, and the day it moves there are two answers and no way to
 * tell which one a screen used. Where no preview has come back yet, the caps
 * are simply not checked here and the server checks them, which is the correct
 * failure mode: unenforced on screen, never wrong on screen.
 */
function limitsFromPreview(preview) {
  const snapshot = (preview && preview.statutory_snapshot) || null;
  const automatic = preview && preview.components ? preview.components : null;
  return {
    conveyance_cap: snapshot && snapshot.conveyance_cap != null ? Number(snapshot.conveyance_cap) : null,
    hra_cap: snapshot && snapshot.hra_cap != null ? Number(snapshot.hra_cap) : null,
    automatic_basic: automatic && automatic.basic != null ? Number(automatic.basic) : null,
  };
}

/**
 * Validate the whole form.
 *
 * @param form {{
 *   is_opening: boolean,        the server said this employee has no live salary
 *   monthly_gross: string,
 *   effective_from: string,     ignored when `is_opening`
 *   revision_reason: string,
 *   manual_override: boolean,
 *   components: {basic, conveyance, hra, special_allowance},
 *   override_reason: string,
 * }}
 * @param options {{ can_override: boolean, limits: object }}
 * @returns {{valid: boolean, errors: object}} errors keyed by field name
 */
function validateRevisionForm(form = {}, options = {}) {
  const errors = {};
  const limits = options.limits || {};

  /* ------------------------------------------------------- the one input */
  const gross = toAmount(form.monthly_gross);
  if (gross === null) {
    errors.monthly_gross = "Enter the monthly gross salary.";
  } else if (gross <= 0) {
    // Zero is not a salary. The server would take a 0 quite happily - it is a
    // non-negative number - so this is the screen catching a typo rather than
    // a rule, and it is worth catching: a gross of nothing silently produces
    // a whole structure of zeroes that reads as if it were calculated.
    errors.monthly_gross = "Monthly gross must be more than zero.";
  }

  /* ------------------------------------------- effective date and reason */
  if (form.is_opening) {
    /*
     * NOTHING IS VALIDATED FOR AN OPENING SALARY'S DATE, because there is
     * nothing for the user to get wrong: the server dates the first record at
     * the later of the opening floor and the date of joining, and ignores
     * anything sent. The screen shows that date; it does not offer it.
     */
  } else {
    if (isBlank(form.effective_from)) {
      errors.effective_from = "Choose the date this revision takes effect from.";
    } else if (!isDateOnly(form.effective_from)) {
      errors.effective_from = "Effective From must be a date.";
    }

    if (isBlank(form.revision_reason)) {
      errors.revision_reason = "Say why this salary is changing.";
    } else if (String(form.revision_reason).trim().length > 500) {
      errors.revision_reason = "A revision reason may be at most 500 characters.";
    }
  }

  /* ------------------------------------------------ the manual override */
  if (form.manual_override) {
    if (!options.can_override) {
      // Belt and braces: the toggle is not rendered without the permission, so
      // reaching this means the state was set some other way.
      errors.manual_override =
        "You do not have permission to enter a manual salary component breakup.";
      return { valid: false, errors };
    }

    const components = form.components || {};
    const paise = {};
    for (const field of COMPONENT_FIELDS) {
      const value = toPaise(components[field]);
      if (value === null) {
        errors[field] = `${COMPONENT_LABELS[field]} must be a number.`;
      } else if (value < 0) {
        errors[field] = `${COMPONENT_LABELS[field]} cannot be negative.`;
      }
      paise[field] = value;
    }

    const allPresent = COMPONENT_FIELDS.every((f) => paise[f] !== null && paise[f] >= 0);
    const grossPaise = toPaise(form.monthly_gross);

    if (allPresent && grossPaise !== null) {
      /*
       * THE GROSS IS FIXED; AN OVERRIDE REDISTRIBUTES IT. Compared in paise so
       * the identity holds exactly rather than nearly - the same reason the
       * engine works in paise.
       */
      const sum = COMPONENT_FIELDS.reduce((total, f) => total + paise[f], 0);
      if (sum !== grossPaise) {
        errors.components = `The four components must add up to the monthly gross (${
          sum / 100
        } entered against ${grossPaise / 100}).`;
      }
    }

    // The caps, when a preview has told us what they are.
    if (limits.conveyance_cap != null && paise.conveyance !== null) {
      if (paise.conveyance > Math.round(limits.conveyance_cap * 100)) {
        errors.conveyance = `Conveyance cannot exceed ${limits.conveyance_cap}.`;
      }
    }
    if (limits.hra_cap != null && paise.hra !== null) {
      if (paise.hra > Math.round(limits.hra_cap * 100)) {
        errors.hra = `HRA cannot exceed ${limits.hra_cap}.`;
      }
    }

    /*
     * A REASON FOR THE OVERRIDE, AND IT IS NOT THE REVISION REASON.
     *
     * Required here whenever the override is ON, which is slightly stricter
     * than the server, where a reason becomes compulsory at the point Basic
     * actually departs from the automatic figure. Being stricter on screen is
     * safe - the server accepts everything this lets through - and it matches
     * the approved rule, which is that turning the override on is the thing
     * that has to be explained. Somebody who moves HRA into Special Allowance
     * and then moves Basic a minute later would otherwise have an audited
     * statutory change with an empty explanation.
     */
    if (isBlank(form.override_reason)) {
      errors.override_reason = "Say why the components depart from the automatic breakup.";
    } else if (String(form.override_reason).trim().length > 500) {
      errors.override_reason = "An override reason may be at most 500 characters.";
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * The request body for a preview, a create or an amendment.
 *
 * WHAT IS NOT HERE IS THE POINT. No `basic` outside an override, no
 * contribution, no CTC, no `daily_salary`, no `status`, no `source`, no
 * `effective_from` on an opening salary. The route's Joi schema runs without
 * `allowUnknown` and answers 422 to a body that so much as names
 * `employee_pf`, so sending one would not merely be ignored - it would break
 * the screen. Building the body from named keys rather than spreading form
 * state is what keeps that true as the form grows.
 */
function toRequestBody(form = {}) {
  const body = { monthly_gross: toAmount(form.monthly_gross) };

  // The opening date is the server's rule, so it is not sent at all - not even
  // the one the server itself displayed back to us.
  if (!form.is_opening && !isBlank(form.effective_from)) {
    body.effective_from = String(form.effective_from).trim();
  }

  if (!isBlank(form.revision_reason)) {
    body.revision_reason = String(form.revision_reason).trim();
  }

  if (form.manual_override) {
    const components = form.components || {};
    body.manual_override = true;
    body.manual_components = {
      basic: toAmount(components.basic),
      conveyance: toAmount(components.conveyance),
      hra: toAmount(components.hra),
      special_allowance: toAmount(components.special_allowance),
    };
    if (!isBlank(form.override_reason)) {
      body.override_reason = String(form.override_reason).trim();
    }
  }

  return body;
}

/**
 * Is this employee's next proposal their OPENING salary or a REVISION?
 *
 * DECIDED FROM THE HISTORY, EXACTLY AS THE SERVER DECIDES IT: a rejected row
 * does not count, so somebody whose only proposal so far was refused still has
 * no salary and their next attempt is still their first. Reading the resolver's
 * `/current` instead would get this wrong in two ways - a PENDING first
 * proposal is not current, and neither is an approved one dated in the future,
 * so both would look like "no salary" and offer an opening date the server
 * would then refuse as a duplicate.
 *
 * The screen only ever DISPLAYS this; the server decides it again on the way
 * in and its answer is the one that lands on the record.
 */
function isOpeningSalary(history) {
  if (!Array.isArray(history)) return false;
  return !history.some((r) => r && r.status !== "REJECTED");
}

module.exports = {
  COMPONENT_FIELDS,
  COMPONENT_LABELS,
  isBlank,
  toAmount,
  toPaise,
  isDateOnly,
  limitsFromPreview,
  validateRevisionForm,
  toRequestBody,
  isOpeningSalary,
};
