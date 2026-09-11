import { useEffect, useState } from "react";
import DepartmentHelper from "../helper/department";
import unwrapList from "../util/apiList";

/**
 * `/department` is B2-gated on `view_department`. Modelled on
 * `useDesignations`: a permission refusal is reported as `accessDenied`
 * rather than as an empty list, so a screen can say "you cannot see
 * departments" instead of implying there are none.
 */
function useDepartments({ directory = false } = {}) {
  const [departments, setDepartments] = useState([]);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // See `useDesignations`: `directory: true` is the id-and-name list for
        // a dropdown, and the default is the unchanged `view_department` read.
        const result = unwrapList(
          directory
            ? await DepartmentHelper.getDepartmentDirectory()
            : await DepartmentHelper.getDepartment()
        );
        if (cancelled) return;
        setDepartments(result.items);
        setAccessDenied(result.accessDenied);
        setError(result.error);
      } catch (err) {
        if (cancelled) return;
        setDepartments([]);
        setAccessDenied(false);
        setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [directory]);

  return { departments, accessDenied, error };
}

export default useDepartments;
