import React, { useEffect, useState } from "react";
import BranchHelper from "../helper/outlets";

function useOutlets() {
  const [outlets, setOutlets] = useState([]);

  const init = async () => {
    const response = await BranchHelper.getOutlet();
    setOutlets(response);
  };

  useEffect(() => {
    init();
  }, []);

  return { outlets };
}

export default useOutlets;
