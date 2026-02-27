import React, { useEffect, useMemo, useState } from "react";
import BranchHelper from "../helper/outlets";

function useOutlets({ skipIds = [] } = {}) {
  const [outlets, setOutlets] = useState([]);

  const init = async () => {
    const response = await BranchHelper.getOutlet();
    setOutlets(response);
  };

  useEffect(() => {
    init();
  }, []);

  const filteredOutlets = useMemo(() => {
    return outlets.filter((outlet) => !skipIds.includes(outlet.outlet_id));
  }, [outlets, skipIds]);

  return { outlets: filteredOutlets };
}

export default useOutlets;
