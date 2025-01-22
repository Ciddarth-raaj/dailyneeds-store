import React, { useCallback, useEffect, useState } from "react";
import { getReconciliationEpaymentData } from "../helper/reconciliation";

function useEpaymentReconciliation(filters) {
  const [epayments, setEpayments] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const response = await getReconciliationEpaymentData(filters);

      if (response.code === 200) {
        setEpayments(response.data);
      }
    } catch (err) {
      console.log(err);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { epayments };
}

export default useEpaymentReconciliation;
