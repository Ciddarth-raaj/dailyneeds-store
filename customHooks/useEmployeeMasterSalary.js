import { useCallback, useEffect, useRef, useState } from "react";
import EmployeeSalaryHelper from "../helper/employeeSalary";

/**
 * ONE employee's salary, as the Employee Master's Payroll section needs it:
 * the current approved record AND the whole history, together.
 *
 * BOTH, BECAUSE NEITHER ANSWERS THE OTHER'S QUESTION. `/current` is the
 * resolver - the latest approved revision effective today - and it is what the
 * read-only display shows. `/history` is every row there has ever been, and it
 * is the only thing that can tell the four payroll states apart:
 *
 *   no salary at all      history has no live row. This is onboarding, and the
 *                         opening-salary entry belongs here.
 *   a pending proposal    somebody has proposed one and nobody has decided it.
 *   a current approved    the M3 read-only display, unchanged.
 *   approved, but later   an approved row dated ahead of today. The resolver
 *                         answers `null` for it, exactly as it does for an
 *                         employee with nothing - and offering an opening
 *                         salary to this person would be proposing a second
 *                         first salary.
 *
 * The last two lines are the reason this hook replaced a `/current`-only read.
 * A screen that asked only the resolver would show three different people the
 * same "No approved salary available." and offer two of them a form the server
 * is going to refuse.
 *
 * THE HISTORY IS READ, NOT INTERPRETED, HERE. Which state the rows mean is
 * `util/employeeMasterPayroll.js`, which has no React in it and is unit-tested
 * against the statuses the backend actually sends.
 *
 * IT DOES NOT ASK WHEN IT MAY NOT ASK. `canView` is the caller's
 * `view_employees` + `view_salary` decision, and a false one short-circuits
 * before either request: the section shows a no-access state and no salary
 * figure is fetched. The backend refuses the same requests independently -
 * this is what to render, not the boundary. No employee id likewise means no
 * request, because `/hr/salary/employee/undefined/current` is a bad request
 * that would come back as an error and read, on the card, as a failure.
 *
 * FOUR OUTCOMES, TOLD APART ON PURPOSE:
 *
 *   loading          a read is in flight
 *   denied           a 403. The caller may not see this salary.
 *   error            the read failed. NOT the same as "no salary" - showing
 *                    "No approved salary available." for a failed request
 *                    would tell HR a salary is missing when it may well exist.
 *   loaded           it worked. An empty history is then a real answer.
 *
 * `refresh` is what the opening-salary form calls after a successful submit,
 * so the section re-reads the server rather than patching state into a shape
 * it guessed at.
 */
function useEmployeeMasterSalary(employeeId, canView) {
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState(false);

  /*
   * WHICH READ IS THE LIVE ONE. A slow answer for the employee whose profile
   * was open a moment ago must not land under the name on screen now - that is
   * a salary shown against the wrong person, which is the worst thing this
   * card could do. Every read takes a ticket and only the newest may write
   * state. The same guard `useEmployeeSalaryRecord` uses on the Payroll screen.
   */
  const ticketRef = useRef(0);

  const load = useCallback(async () => {
    const ticket = ticketRef.current + 1;
    ticketRef.current = ticket;
    const isCurrentRead = () => ticketRef.current === ticket;

    setCurrent(null);
    setHistory([]);
    setLoaded(false);
    setDenied(false);
    setError(false);

    if (!employeeId || !canView) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Two independent reads, in parallel: neither depends on the other's
      // answer, and running them in series would double the wait for no gain.
      const [currentBody, historyBody] = await Promise.all([
        EmployeeSalaryHelper.getCurrentSalary(employeeId),
        EmployeeSalaryHelper.getHistory(employeeId),
      ]);
      if (!isCurrentRead()) return;

      // A B2 refusal arrives as `{ code: 403, msg }` rather than a rejection.
      const refused = [currentBody, historyBody].find(
        (b) => b && !Array.isArray(b) && b.code && b.code !== 200
      );
      if (refused) {
        setDenied(refused.code === 403);
        setError(refused.code !== 403);
        return;
      }

      // The history endpoint answers with an ARRAY on success. Anything else is
      // a failure body, never an empty history.
      if (!Array.isArray(historyBody) || !currentBody || !("current_salary" in currentBody)) {
        setError(true);
        return;
      }

      // `null` here is the real answer "nothing approved applies today". It is
      // NOT "no salary": the history beside it is what says which.
      setCurrent(currentBody.current_salary || null);
      setHistory(historyBody);
      setLoaded(true);
    } catch (err) {
      if (!isCurrentRead()) return;
      setError(true);
    } finally {
      if (isCurrentRead()) setLoading(false);
    }
  }, [employeeId, canView]);

  useEffect(() => {
    load();
  }, [load]);

  return { current, history, loading, loaded, denied, error, refresh: load };
}

export default useEmployeeMasterSalary;
