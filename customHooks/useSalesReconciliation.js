import React, { useCallback, useEffect, useState } from "react";
import { getReconciliationData } from "../helper/reconciliation";

function useSalesReconciliation(filters) {
  const [sales, setSales] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const response = await getReconciliationData(filters);

      if (response.code === 200) {
        setSales(response.data);
      }
    } catch (err) {
      console.log(err);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { sales };
}

export default useSalesReconciliation;
