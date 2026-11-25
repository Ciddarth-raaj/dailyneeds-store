import { useCallback, useEffect, useRef, useState } from "react";
import PayrunHelper from "../helper/payrun";
import { describeApiResult, KIND } from "../util/salaryApiError";

/**
 * Payrun Initialization - one payroll month, for the Payrun screen.
 *
 * ONE REQUEST FOR THE WHOLE MONTH, for the reason
 * `customHooks/usePendingSalaryQueue.js` states about the approval queue: the
 * per-employee alternative is six hundred requests to draw one table, and it
 * would mean deciding eligibility in the browser.
 *
 * FILTERS GO TO THE SERVER, not to a `.filter()` here. Sending them means the
 * rows that do not match are never read out of the database; filtering
 * client-side would be the same disclosure with a smaller table.
 *
 * NO SILENT FALLBACK TO EMPTY. A refusal, a failure and a genuinely empty
 * month are told apart - "nobody is waiting to be initialized" and "we could
 * not find out" are different things to tell a payroll clerk, and only one of
 * them means they can stop looking.
 *
 * THE SUMMARY IS THE SERVER'S AND IS NEVER RECOUNTED HERE. It counts the whole
 * month while `rows` may be a filtered view of it, so counting what came back
 * would quietly report a filtered month as the month.
 */
function usePayrunMonth(filters, canView) {
  const [month, setMonth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState(null);

  /* Only the newest read may write state - a slow first request must not
     overwrite the answer to a second one somebody has already triggered. */
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

      const body = await PayrunHelper.getMonth(params);
      if (!isCurrentRead()) return;

      // Success carries the month's rows. Every other shape is a refusal or a
      // failure, and neither is an empty month.
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
      setError("The payroll month could not be loaded. Please try again.");
    } finally {
      if (isCurrentRead()) setLoading(false);
    }
  }, [key, canView]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = month && Array.isArray(month.rows) ? month.rows : [];
  const summary = (month && month.summary) || {
    total_eligible: 0,
    ready: 0,
    blocked: 0,
    initialized: 0,
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

export default usePayrunMonth;
