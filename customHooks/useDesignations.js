import React, { useEffect, useState } from "react";
import DesignationHelper from "../helper/designation";

function useDesignations() {
  const [designations, setDesignations] = useState([]);

  const init = async () => {
    const response = await DesignationHelper.getDesignation();

    if (!response.code) {
      setDesignations(response);
    }
  };

  useEffect(() => {
    init();
  }, []);

  return { designations };
}

export default useDesignations;
