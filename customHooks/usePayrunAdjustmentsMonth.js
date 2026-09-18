import { useCallback, useEffect, useRef, useState } from "react";
import PayrunAdjustmentsHelper from "../helper/payrunAdjustments";
import { describeApiResult, KIND } from "../util/salaryApiError";

/**
 * Payrun Adjustments - one payroll month's adjustment stage.
 *
 * THE SAME SHAPE `customHooks/usePayrunMonth.js` HAS, for the same reasons:
 * one request for the whole month, filters sent to the server rather than
 * applied to a full month in the browser, and a refusal, a failure and a
 * genuinely empty month told apart rather than all collapsing to "nothing to
 * do".
 *
 * THE SUMMARY IS THE SERVER'S AND IS NEVER RECOUNTED HERE. It counts the whole
 * CURRENT initialized population while `rows` may be a filtered view of it.
 * Recounting what came back would report a filtered month as the month - and
 * on this screen that number is "how many people still need confirming", which
 * is the one thing somebody will act on.
 *
 * REFRESHING IS THE WHOLE DYNAMIC-POPULATION MECHANISM. There is no cached
 * completion and no local state that survives a reload: every read asks the
 * server who is initialized right now, so an employee initialized on another
 * screen a minute ago turns up as pending on the next refresh.
 */
function usePayrunAdjustmentsMonth(filters, canView) {
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

      const body = await PayrunAdjustmentsHelper.getMonth(params);
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
      setError("The adjustments for this payroll month could not be loaded. Please try again.");
    } finally {
      if (isCurrentRead()) setLoading(false);
    }
  }, [key, canView]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = month && Array.isArray(month.rows) ? month.rows : [];
  const summary = (month && month.summary) || {
    initialized_count: 0,
    has_adjustment_count: 0,
    no_adjustment_confirmed_count: 0,
    pending_adjustment_confirmation_count: 0,
    completed_count: 0,
    is_complete: false,
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

export default usePayrunAdjustmentsMonth;
