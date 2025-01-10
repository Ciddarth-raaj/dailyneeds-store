import React, { useEffect, useState } from "react";
import { getAllWarehouseCashDenominations } from "../helper/accounts";

function useWarehouseDenomination(filter) {
  const [denomination, setDenomination] = useState(null);
  const [isSaved, setIsSaved] = useState(false);

  const getDenomination = async (filter) => {
    const response = await getAllWarehouseCashDenominations(filter);

    if (response.code == 200) {
      if (response.data.length > 0) {
        setIsSaved(true);
        setDenomination(response.data[0]);
      } else {
        setIsSaved(false);
        setDenomination(null);
      }
    }
  };

  useEffect(() => {
    getDenomination(filter);
  }, [filter]);

  return { denomination, isSaved };
}

export default useWarehouseDenomination;
