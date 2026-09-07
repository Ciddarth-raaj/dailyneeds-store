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
function useDesignations() {
  const [designations, setDesignations] = useState([]);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState(false);

  const init = async () => {
    try {
      const result = unwrapList(await DesignationHelper.getDesignation());
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
  }, []);

  return { designations, accessDenied, error };
}

export default useDesignations;
