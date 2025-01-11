import React, { useEffect, useState } from "react";
import BranchHelper from "../helper/outlets";

function useOutletById(outletId) {
  const [outlet, setOutlet] = useState([]);

  const init = async () => {
    const response = await BranchHelper.getOutletByOutletId(outletId);

    if (response?.length > 0) {
      setOutlet(response[0]);
    }
  };

  useEffect(() => {
    init();
  }, []);

  return { outlet };
}

export default useOutletById;
