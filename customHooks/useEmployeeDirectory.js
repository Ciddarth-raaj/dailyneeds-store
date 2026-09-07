import { useEffect, useState } from "react";
import EmployeeHelper from "../helper/employee";
import unwrapList from "../util/apiList";

/**
 * Names for a dropdown, without an HR permission.
 *
 * `useEmployees` calls /employee/employees, which B2 gates on
 * `view_employees` - correctly, since it returns the whole employee record.
 * An outlet user filling in the accounts sheet holds no such permission, so
 * that hook returns nothing for them. This one calls /employee/directory,
 * which returns two columns for the caller's own outlet and needs only a
 * session.
 *
 * Sorted here, by name, so every caller gets the same order without
 * remembering to ask for it.
 */
function useEmployeeDirectory() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState(false);

  const fetchDirectory = async () => {
    try {
      setLoading(true);
      const result = unwrapList(await EmployeeHelper.getDirectory());
      setEmployees(
        [...result.items].sort((a, b) =>
          ("" + a.employee_name).localeCompare(b.employee_name)
        )
      );
      setAccessDenied(result.accessDenied);
      setError(result.error);
    } catch (err) {
      console.log(err);
      setEmployees([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectory();
  }, []);

  return { employees, loading, accessDenied, error, refetch: fetchDirectory };
}

export default useEmployeeDirectory;
