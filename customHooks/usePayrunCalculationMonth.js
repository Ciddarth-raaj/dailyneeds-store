import { useCallback, useEffect, useRef, useState } from "react";
import PayrunCalculationHelper from "../helper/payrunCalculation";
import { describeApiResult, KIND } from "../util/salaryApiError";

/**
 * Payrun Calculation & Review - one payroll month's calculation stage.
 *
 * THE SAME SHAPE `customHooks/usePayrunMonth.js` AND
 * `customHooks/usePayrunAdjustmentsMonth.js` HAVE, for the same reasons: one
 * request for the whole month, filters sent to the server rather than applied
 * to a full month in the browser, and a refusal, a failure and a genuinely
 * empty month told apart rather than all collapsing into "nothing to do".
 *
 * THE SUMMARY IS THE SERVER'S AND IS NEVER RECOUNTED HERE. It counts the whole
 * CURRENT initialized population while `rows` may be a filtered view of it. On
 * this screen those numbers are "how many still need calculating" and "how
 * many are ready to approve", which are the two things somebody will act on -
 * and a "ready: 0" that only meant "none matching this filter" is the single
 * most dangerous number the screen could show.
 *
 * REFRESHING IS THE WHOLE STALE-DETECTION MECHANISM. There is no cached status
 * and no local state that survives a reload: every read asks the server how
 * each employee's stored calculation compares with the sources RIGHT NOW, so a
 * salary approved a minute ago turns up as RECALCULATION_REQUIRED on the next
 * refresh - with the stored figures unchanged, which is the point.
 */
function usePayrunCalculationMonth(filters, canView) {
  const [month, setMonth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState(null);

  /* Only the newest read may write state. */
  const ticketRef = useRef(0);
  const key = JSON.stringify(filters || {});

  const load = useCallback(async () => {
    const ticket = ticketRef.current + 1;
    ticketRef.current = ticket;
    const isCurrentRead = () => ticketRef.current === ticket;

    if (!canView) {
      setMonth(null);
      setLoaded(false);
      setLoading(false);
      setDenied(false);
      setError(null);
      return;
    }

    const parsed = JSON.parse(key);
    if (!parsed.year || !parsed.month) {
      setMonth(null);
      setLoaded(false);
      return;
    }

    setLoading(true);
    setDenied(false);
    setError(null);

    try {
      const params = {};
      for (const [name, value] of Object.entries(parsed)) {
        if (value !== "" && value !== null && value !== undefined) params[name] = value;
      }

      const body = await PayrunCalculationHelper.getMonth(params);
      if (!isCurrentRead()) return;

      if (!body || !Array.isArray(body.rows)) {
        const outcome = describeApiResult(body);
        setMonth(null);
        setLoaded(false);
        setDenied(outcome.kind === KIND.DENIED);
        setError(outcome.kind === KIND.DENIED ? null : outcome.message);
        return;
      }

      setMonth(body);
      setLoaded(true);
    } catch (err) {
      if (!isCurrentRead()) return;
      setMonth(null);
      setLoaded(false);
      setError("This payroll month's calculation could not be loaded. Please try again.");
    } finally {
      if (isCurrentRead()) setLoading(false);
    }
  }, [key, canView]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = month && Array.isArray(month.rows) ? month.rows : [];
  const summary = (month && month.summary) || {
    initialized: 0,
    not_calculated: 0,
    calculated: 0,
    recalculation_required: 0,
    ready_for_approval: 0,
    approved_locked: 0,
    payslip_eligible: 0,
  };

  return {
    month,
    rows,
    summary,
    monthLocked: Boolean(month && month.month_locked),
    loading,
    loaded,
    denied,
    error,
    refresh: load,
  };
}

export default usePayrunCalculationMonth;
