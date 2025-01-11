import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  getAllWarehouseSales,
  getOutletsCashHandover,
  getStartingCash,
} from "../helper/accounts";
import useOutletById from "./useOutletById";
import { WAREHHOUSE_ID } from "../constants";

function useWarehouseSales(filters) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [allDenominations, setAllDenominations] = useState([]);
  const [startingCash, setStartingCash] = useState(null);
  const { outlet } = useOutletById(WAREHHOUSE_ID);

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

  const fetchDenominations = useCallback(async () => {
    const response = await getOutletsCashHandover(filters);
    setAllDenominations(response.data);
  }, [filters]);

  const fetchStartingCash = async () => {
    const response = await getStartingCash(filters.from_date);

    if (response.code === 200) {
      if (response.data) {
        setStartingCash(parseFloat(response.data.starting_cash));
      } else {
        setStartingCash(null);
      }
    }
  };

  const init = useCallback(async () => {
    await fetchSales();
    await fetchDenominations();
  }, [filters]);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    fetchStartingCash();
  }, []);

  return {
    sales,
    loading,
    error,
    refetch: init,
    denominations: allDenominations,
    startingCash,
    presetOpeningCash: outlet?.opening_cash,
  };
}

export default useWarehouseSales;
