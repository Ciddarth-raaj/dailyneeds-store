import React, { useEffect, useState, useMemo, useCallback } from "react";
import { getAllWarehouseSales } from "../helper/accounts";

function useWarehouseSales(filters) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSales = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAllWarehouseSales(filters);

      if (response.code === 200) {
        setSales(response.data);
      }
    } catch (err) {
      console.error("Error fetching warehouse sales:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  return {
    sales,
    loading,
    error,
    refetch: fetchSales,
  };
}

export default useWarehouseSales;
