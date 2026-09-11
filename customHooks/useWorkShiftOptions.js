import { useEffect, useState } from "react";
import EmployeeWorkShiftHelper from "../helper/employeeWorkShift";

/**
 * M1 — the ACTIVE work shifts as dropdown options, from
 * `GET /hr/work-shift-assignments/options`.
 *
 * Read through the assignment endpoint rather than `/work-shift`, because
 * that one needs `view_work_shifts` - the master's own key - and the two
 * screens that need a dropdown (a store manager choosing a new hire's initial
 * shift; the profile's Employment section) hold `employee_create` or
 * `assign_employee_shift` instead. The options carry identity and timing
 * only; the configuration stays behind the master's key.
 *
 * `enabled` false skips the request entirely: somebody who cannot choose a
 * shift is not shown the list, and does not fetch it.
 *
 * A refusal or failure resolves to an EMPTY list and `denied`/`error`, never a
 * throw: the shift is optional at create, and a list that could not be
 * fetched must not stop an employee being created.
 */
function useWorkShiftOptions(enabled = true) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setDenied(false);
      setError(false);
      try {
        const res = await EmployeeWorkShiftHelper.getShiftOptions();
        if (cancelled) return;
        if (res && res.code === 200 && Array.isArray(res.data)) {
          setOptions(res.data);
        } else {
          setOptions([]);
          setDenied(Boolean(res && res.code === 403));
          setError(!res || (res.code !== 403 && res.code !== 200));
        }
      } catch (err) {
        if (cancelled) return;
        setOptions([]);
        setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { options, loading, denied, error };
}

export default useWorkShiftOptions;
