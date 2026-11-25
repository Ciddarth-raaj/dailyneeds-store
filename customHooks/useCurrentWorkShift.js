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
 * M1 REVIEW FIX - the endpoint needs `view_employees` and nothing else. Shift
 * is part of Employment Details now, so whoever may open the profile may see
 * which shift the employee is on. It used to demand `view_shift_assignments`
 * too - an HR/administrator key - which left this field reading "not
 * permitted" for most of the people the section was built for. CHANGING the
 * shift is untouched and still takes `employee_edit` + `assign_employee_shift`.
 *
 * `denied` is still reported rather than an empty result, because the caller
 * may hold no `view_employees` at all: the field can then say why it is blank
 * instead of claiming the employee has no shift - "not permitted" and "not
 * assigned" are different facts, and only one of them is somebody's job.
 *
 * A failure here never affects anything else on the profile: the caller
 * renders one field from it and nothing depends on it loading.
 */
function useCurrentWorkShift(employeeId, version = 0) {
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
    // `version` is bumped by the profile after it assigns a shift, so the
    // field re-reads what was stored rather than what was chosen.
  }, [employeeId, version]);

  return { shift, loading, denied, error };
}

export default useCurrentWorkShift;
