import { useCallback, useEffect, useRef, useState } from "react";
import PayrollSalaryHelper from "../helper/payrollSalary";
import { describeApiResult, KIND } from "../util/salaryApiError";

/**
 * M4 — every pending salary proposal, for the Salary Approval screen.
 *
 * ONE REQUEST FOR THE WHOLE QUEUE. The obvious alternative - list the
 * employees, read each one's history, keep the pending rows - is six hundred
 * requests to draw a list that is usually four rows long, and it hands the
 * browser five hundred and ninety-six salary histories nobody asked for.
 * `GET /hr/salary/pending` answers it with one indexed read, and this hook
 * calls that and nothing else.
 *
 * FILTERS GO TO THE SERVER, not to a `.filter()` here. Sending them means the
 * rows that do not match are never read out of the database, let alone sent;
 * filtering client-side would mean fetching everything and hiding most of it,
 * which is the same disclosure with a smaller table.
 *
 * NO SILENT FALLBACK TO EMPTY. A refusal and a failure are told apart from
 * each other and from a genuinely empty queue - "nothing is waiting for you"
 * and "we could not find out" are different things to tell an approver, and
 * only one of them means they can stop looking.
 */
function usePendingSalaryQueue(filters, canView) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState(null);

  /* Only the newest read may write state - see `useEmployeeSalaryRecord`. */
  const ticketRef = useRef(0);

  // Serialised, so a caller may rebuild the filter object on every render
  // without this refetching forever.
  const key = JSON.stringify(filters || {});

  const load = useCallback(async () => {
    const ticket = ticketRef.current + 1;
    ticketRef.current = ticket;
    const isCurrentRead = () => ticketRef.current === ticket;

    if (!canView) {
      setItems([]);
      setLoaded(false);
      setLoading(false);
      setDenied(false);
      setError(null);
      return;
    }

    setLoading(true);
    setDenied(false);
    setError(null);

    try {
      const parsed = JSON.parse(key);
      // Only the filters somebody actually set are sent; an empty string is
      // "no filter", not a filter on the empty string.
      const params = {};
      for (const [name, value] of Object.entries(parsed)) {
        if (value !== "" && value !== null && value !== undefined) params[name] = value;
      }

      const body = await PayrollSalaryHelper.getPendingQueue(
        Object.keys(params).length ? params : undefined
      );
      if (!isCurrentRead()) return;

      // Success is an ARRAY. Every other shape is a refusal or a failure.
      if (!Array.isArray(body)) {
        const outcome = describeApiResult(body);
        setItems([]);
        setLoaded(false);
        setDenied(outcome.kind === KIND.DENIED);
        setError(outcome.kind === KIND.DENIED ? null : outcome.message);
        return;
      }

      setItems(body);
      setLoaded(true);
    } catch (err) {
      if (!isCurrentRead()) return;
      setItems([]);
      setLoaded(false);
      setError("The approval queue could not be loaded. Please try again.");
    } finally {
      if (isCurrentRead()) setLoading(false);
    }
  }, [key, canView]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, loaded, denied, error, refresh: load };
}

export default usePendingSalaryQueue;
