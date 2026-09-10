import { useCallback, useEffect, useState } from "react";
import {
  copyDayInto,
  newWorkShiftForm,
  validateWorkShiftForm,
} from "../util/workShiftForm";

const NO_ERRORS = { fields: {}, rows: {}, messages: [] };

/**
 * The Add and Edit Work Shift screens' shared state.
 *
 * Both pages hold the same form and change it in the same three ways — a
 * configuration field, one weekly row, or a Copy Day — so the alternative was
 * writing that twice and having the two drift.
 *
 * ERRORS APPEAR ON SAVE, NOT ON KEYSTROKE. `validate()` is called when the
 * user submits; until then nothing is marked wrong, because a Shift Code that
 * is empty because it has not been typed yet is not an error to complain
 * about. Once a save has been attempted, the errors are re-derived from the
 * form on every change, so fixing a field clears its message rather than
 * leaving a stale one under a value that is now fine.
 */
function useWorkShiftForm(initialForm) {
  const [form, setForm] = useState(() => initialForm || newWorkShiftForm());
  const [validated, setValidated] = useState(false);
  const [errors, setErrors] = useState(NO_ERRORS);

  // Re-derived rather than patched at each call site: one place decides what
  // is wrong, and it always judges the form as it currently is.
  useEffect(() => {
    setErrors(validated ? validateWorkShiftForm(form) : NO_ERRORS);
  }, [form, validated]);

  /** Replace the whole form — how the edit screen installs what it loaded. */
  const replace = useCallback((next) => {
    setForm(next);
    setValidated(false);
  }, []);

  const change = useCallback((name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  }, []);

  /** Patch one weekday's row, leaving the other six exactly as they were. */
  const changeRow = useCallback((day, patch) => {
    setForm((current) => ({
      ...current,
      weekly_schedule: current.weekly_schedule.map((row) =>
        Number(row.day_of_week) === Number(day) ? { ...row, ...patch } : row
      ),
    }));
  }, []);

  /** Copy Day. Browser-side only — see `copyDayInto`. */
  const copyDay = useCallback((sourceDay, targetDays) => {
    setForm((current) => ({
      ...current,
      weekly_schedule: copyDayInto(current.weekly_schedule, sourceDay, targetDays),
    }));
  }, []);

  /** @returns {boolean} true when the form is worth sending. */
  const validate = useCallback(() => {
    const result = validateWorkShiftForm(form);
    setErrors(result);
    setValidated(true);
    return result.messages.length === 0;
  }, [form]);

  return {
    form,
    errors: errors.fields,
    rowErrors: errors.rows,
    messages: errors.messages,
    replace,
    change,
    changeRow,
    copyDay,
    validate,
  };
}

export default useWorkShiftForm;
