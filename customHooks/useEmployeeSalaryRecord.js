import { useCallback, useEffect, useRef, useState } from "react";
import PayrollSalaryHelper from "../helper/payrollSalary";
import { describeApiResult, KIND } from "../util/salaryApiError";

/**
 * M4 — one employee's salary, as the Salary Revision & History screen needs it:
 * the current approved record AND the whole history, together.
 *
 * BOTH, BECAUSE THEY ANSWER DIFFERENT QUESTIONS AND NEITHER IMPLIES THE OTHER.
 * `/current` is the RESOLVER's answer - the latest approved revision effective
 * today - and it is what decides which history row wears the "Current" badge,
 * without the browser comparing any date to its own clock. `/history` is every
 * row there has ever been, pending and rejected included, and it is what
 * decides whether the next proposal is an OPENING SALARY or a REVISION.
 *
 * Reading only `/current` would get that second question wrong in two ways: a
 * PENDING first proposal is not current, and neither is an approved one dated
 * in the future, so both would look like "no salary yet" and the screen would
 * offer an opening date the server then refuses as a duplicate.
 *
 * FOUR STATES, TOLD APART, exactly as `useCurrentSalary` tells them apart on
 * the Employee Master:
 *
 *   loading   a read is in flight
 *   denied    a 403. Said as a refusal, never as an empty record.
 *   error     the read failed. NOT "no salary" - one of those is a record
 *             somebody has to create and the other is a server that did not
 *             answer, and HR would chase the wrong one.
 *   loaded    it worked. An empty history is then a real answer and means
 *             this employee's next salary will be their opening one.
 *
 * IT DOES NOT ASK WHEN IT MAY NOT ASK, and it does not ask when there is
 * nothing to ask about: no `view_salary`, or no employee selected, and no
 * request is made at all.
 */
function useEmployeeSalaryRecord(employeeId, canView) {
  const [history, setHistory] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState(null);

  /*
   * WHICH READ IS THE LIVE ONE.
   *
   * Somebody picking through a list of employees starts a read per selection,
   * and they do not come back in the order they were sent. A slow answer for
   * the person selected two clicks ago must not land on the person selected
   * now - that is a salary history shown under the wrong name, which is the
   * single worst thing this screen could do. Every read takes a ticket, and
   * only the newest ticket may write state.
   */
  const ticketRef = useRef(0);

  const load = useCallback(async () => {
    const ticket = ticketRef.current + 1;
    ticketRef.current = ticket;
    const isCurrentRead = () => ticketRef.current === ticket;

    if (!employeeId || !canView) {
      setHistory([]);
      setCurrent(null);
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
      // Two independent reads, in parallel: neither depends on the other's
      // answer, and running them in series would double the wait for no gain.
      const [historyBody, currentBody] = await Promise.all([
        PayrollSalaryHelper.getHistory(employeeId),
        PayrollSalaryHelper.getCurrentSalary(employeeId),
      ]);

      // The history endpoint answers with an ARRAY on success. Anything else
      // is a refusal or a failure body, never an empty history.
      if (!isCurrentRead()) return;

      if (!Array.isArray(historyBody)) {
        const outcome = describeApiResult(historyBody);
        setHistory([]);
        setCurrent(null);
        setLoaded(false);
        setDenied(outcome.kind === KIND.DENIED);
        setError(outcome.kind === KIND.DENIED ? null : outcome.message);
        return;
      }

      const currentOutcome = describeApiResult(currentBody);
      if (currentOutcome.kind !== KIND.OK || !currentBody || !("current_salary" in currentBody)) {
        setHistory([]);
        setCurrent(null);
        setLoaded(false);
        setDenied(currentOutcome.kind === KIND.DENIED);
        setError(currentOutcome.kind === KIND.DENIED ? null : currentOutcome.message);
        return;
      }

      setHistory(historyBody);
      // `null` here is the real answer "nothing approved applies today", and
      // is what makes every approved row on this employee read as Future.
      setCurrent(currentBody.current_salary || null);
      setLoaded(true);
    } catch (err) {
      if (!isCurrentRead()) return;
      setHistory([]);
      setCurrent(null);
      setLoaded(false);
      setError("The salary record could not be loaded. Please try again.");
    } finally {
      if (isCurrentRead()) setLoading(false);
    }
  }, [employeeId, canView]);

  useEffect(() => {
    load();
  }, [load]);

  return { history, current, loading, loaded, denied, error, refresh: load };
}

export default useEmployeeSalaryRecord;
