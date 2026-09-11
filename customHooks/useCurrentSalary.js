import { useEffect, useState } from "react";
import EmployeeSalaryHelper from "../helper/employeeSalary";

/**
 * M3 — ONE employee's current approved salary, for the profile's Payroll
 * section.
 *
 * IT DOES NOT ASK WHEN IT MAY NOT ASK. `canView` is the caller's `view_salary`
 * decision, and a false one short-circuits before the request: the section
 * shows a no-access state and no salary figure is fetched, so nothing reaches
 * the browser for a user who may not see it. The backend refuses the same
 * request independently - this is what to render, not the boundary.
 *
 * NOR WHEN THERE IS NOTHING TO ASK ABOUT. No employee id means no request; a
 * call to `/hr/salary/employee/undefined/current` is a bad request that would
 * come back as an error and read, on the card, as a failure.
 *
 * EMPTY AND BROKEN ARE DIFFERENT ANSWERS, and the whole reason this returns
 * four flags rather than a value:
 *
 *   loading          the read is in flight
 *   denied           a 403. The caller may not see this salary.
 *   error            the read failed. NOT the same as "no salary" - showing
 *                    "No approved salary available." for a failed request
 *                    would tell HR a salary is missing when it may well exist.
 *   loaded + null    the read succeeded and there is genuinely no approved
 *                    salary yet.
 */
function useCurrentSalary(employeeId, canView) {
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setCurrent(null);
    setLoaded(false);
    setDenied(false);
    setError(false);

    if (!employeeId || !canView) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const res = await EmployeeSalaryHelper.getCurrentSalary(employeeId);
        if (cancelled) return;

        // A B2 refusal arrives as `{ code: 403, msg }` rather than a rejection.
        if (res && res.code && res.code !== 200) {
          setDenied(res.code === 403);
          setError(res.code !== 403);
          return;
        }
        if (!res || !("current_salary" in res)) {
          setError(true);
          return;
        }
        // `null` here is the real answer "nothing approved yet", and is the
        // one case that sets `loaded` with no record.
        setCurrent(res.current_salary || null);
        setLoaded(true);
      } catch (err) {
        if (cancelled) return;
        setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [employeeId, canView]);

  return { current, loading, loaded, denied, error };
}

export default useCurrentSalary;
