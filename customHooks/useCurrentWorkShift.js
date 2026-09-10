import { useEffect, useState } from "react";
import EmployeeWorkShiftHelper from "../helper/employeeWorkShift";

/**
 * ONE employee's current work shift, for the profile.
 *
 * Reads the NEW mapping through `GET /hr/work-shift-assignments/employee/:id`.
 * The legacy `/shift` master is not called from here at all, which is the
 * point: the profile used to show `shift_master` under "Default shift", and
 * that column, `shift_code` and the Digisme sync have never agreed.
 *
 * The endpoint needs `view_employees` AND `view_shift`, and HR does not
 * necessarily hold the second. A refusal is reported as `denied` rather than
 * as an empty result, so the field can say why it is blank instead of
 * claiming the employee has no shift - "not permitted" and "not assigned" are
 * different facts, and only one of them is somebody's job to fix.
 *
 * A failure here never affects anything else on the profile: the caller
 * renders one field from it and nothing depends on it loading.
 */
function useCurrentWorkShift(employeeId) {
  const [shift, setShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!employeeId) return undefined;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setDenied(false);
      setError(false);
      try {
        const res = await EmployeeWorkShiftHelper.getEmployeeAssignment(employeeId);
        if (cancelled) return;
        if (res && res.code === 200 && res.data) {
          setShift(res.data);
        } else {
          setShift(null);
          // A B2 refusal arrives as `{ code: 403, msg }`, like every other
          // helper in this repo, rather than as a rejected promise.
          setDenied(Boolean(res && res.code === 403));
          setError(!res || (res.code !== 403 && res.code !== 200));
        }
      } catch (err) {
        if (cancelled) return;
        setShift(null);
        setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  return { shift, loading, denied, error };
}

export default useCurrentWorkShift;
