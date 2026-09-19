import { useEffect, useState } from "react";
import HrHelper from "../helper/hr";
import unwrapList from "../util/apiList";

/**
 * THE BRANCHES THIS USER MAY FILTER EMPLOYEES BY — `GET /hr/employees/outlets`.
 *
 * WHY THIS IS NOT `useOutlets` IN ITS DIRECTORY MODE. That hook calls
 * `/outlet/directory`, which is authenticated and DELIBERATELY company-wide:
 * it was widened on purpose so a purchase or accounts filter could name every
 * branch, and narrowing it would break those screens. An employee screen
 * using it received every outlet in the company - id and name - and then hid
 * the ones a branch-scoped user may not use. That is not an authorization
 * boundary. The whole list was in the response, in the network tab, one
 * keystroke away, whatever React chose to render.
 *
 * So the narrowing happens on the server, by the SAME `employee_branch_scope`
 * middleware that narrows the employee list and the onboarding status
 * summary. There is no second branch-scope implementation here and none in
 * React: this hook holds no rule at all, it reports what it was given.
 *
 * IT IS THE SCOPE, NOT THE POPULATION. The endpoint answers "which branches
 * may you filter by", not "which branches currently have somebody in them",
 * so an authorised branch that happens to hold no employees is still offered
 * and the list does not move when a search or a status filter empties one.
 *
 * A REFUSAL IS NOT AN EMPTY DROPDOWN. `accessDenied` is returned separately
 * so a screen can tell "you may not do this" apart from "there is nothing
 * here", exactly as `useOutlets` does - and the outlets stay `[]` either way,
 * which fails closed.
 */
function useEmployeeOutlets({ skip = false } = {}) {
  const [outlets, setOutlets] = useState([]);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    // A user who may not open the screen causes no request, as the screen's
    // own loaders do.
    if (skip) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const result = unwrapList(await HrHelper.getEmployeeOutlets());
        if (cancelled) return;
        setOutlets(result.items);
        setAccessDenied(result.accessDenied);
        setError(result.error);
      } catch (err) {
        if (cancelled) return;
        // A rejected helper is a network failure, not a denial.
        setOutlets([]);
        setAccessDenied(false);
        setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [skip]);

  return { outlets, accessDenied, error };
}

export default useEmployeeOutlets;
