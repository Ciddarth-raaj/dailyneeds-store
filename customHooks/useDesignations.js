import React, { useEffect, useState } from "react";
import DesignationHelper from "../helper/designation";
import unwrapList from "../util/apiList";

/**
 * `/designation` is B2-gated on `view_designation`. The previous guard,
 * `if (!response.code)`, did stop the refusal being stored - so this hook
 * never crashed - but it left the list silently empty, which presents an
 * authorisation failure as "there are no designations". `accessDenied` makes
 * the difference visible to the screen.
 */
function useDesignations({ directory = false } = {}) {
  const [designations, setDesignations] = useState([]);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState(false);

  const init = async () => {
    try {
      // `directory: true` asks for the id-and-name list behind no permission,
      // for callers that only render a dropdown - the Employee Master screens,
      // where `employee_edit` is the permission that matters and
      // `view_designation` is not held. The default is unchanged, so every
      // existing consumer keeps the full record and its `view_designation`
      // gate. Modelled on the same option in `useOutlets`.
      const result = unwrapList(
        directory
          ? await DesignationHelper.getDesignationDirectory()
          : await DesignationHelper.getDesignation()
      );
      setDesignations(result.items);
      setAccessDenied(result.accessDenied);
      setError(result.error);
    } catch (err) {
      console.log(err);
      setDesignations([]);
      setError(true);
    }
  };

  useEffect(() => {
    init();
  }, [directory]);

  return { designations, accessDenied, error };
}

export default useDesignations;
