import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  checkIfSaved,
  getAllAccounts,
  getAllWarehouseSales,
  getOutletsCashHandover,
  getStartingCash,
  saveAccountSheet,
  unsaveAccountSheet,
} from "../helper/accounts";
import useOutletById from "./useOutletById";
import { WAREHHOUSE_ID } from "../constants";
import moment from "moment";

function useWarehouseSales(filters) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [allDenominations, setAllDenominations] = useState([]);
  const { outlet } = useOutletById(WAREHHOUSE_ID);
  const [isSaved, setIsSaved] = useState(false);

  const [startingCash, setStartingCash] = useState(null);
  const [isCarriedForward, setIsCarriedForward] = useState(false);

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
        setIsCarriedForward(response.data.can_carry_forward);
        setStartingCash(parseFloat(response.data.starting_cash));
      } else {
        setIsCarriedForward(false);
        setStartingCash(null);
      }
    }
  };

  const checkIfCarriedForward = async () => {
    const response = await getStartingCash(
      moment(filters.from_date).add(1, "day")
    );

    console.log("CIDD", response);

    if (response.code === 200) {
      if (response.data) {
        setIsCarriedForward(response.data.can_carry_forward);
      } else {
        setIsCarriedForward(false);
      }
    }
  };

  const init = useCallback(async () => {
    await checkSaved();
    await fetchSales();
    await fetchDenominations();
  }, [filters]);

  useEffect(() => {
    init();
  }, [init]);

  const checkSaved = async () => {
    const response = await checkIfSaved({
      date: filters.to_date.split("T")[0],
      store_id: WAREHHOUSE_ID,
    });

    if (response.code === 200) {
      setIsSaved(true);
    } else {
      setIsSaved(false);
    }
  };

  useEffect(() => {
    fetchStartingCash();
    checkIfCarriedForward();
  }, []);

  const saveSheet = async () => {
    try {
      const response = await saveAccountSheet({
        sheet_date: filters.to_date.split("T")[0],
        store_id: WAREHHOUSE_ID,
      });

      if (response.code === 200) {
        setIsSaved(true);
        return response;
      }
      throw new Error(response.message || "Failed to save sheet");
    } catch (err) {
      console.error("Error saving sheet:", err);
      throw err;
    }
  };

  const unsaveSheet = async () => {
    try {
      const response = await unsaveAccountSheet({
        sheet_date: filters.to_date.split("T")[0],
        store_id: WAREHHOUSE_ID,
      });

      if (response.code === 200) {
        setIsSaved(false);
        return response;
      }
      throw new Error(response.message || "Failed to unsave sheet");
    } catch (err) {
      console.error("Error unsaving sheet:", err);
      throw err;
    }
  };

  return {
    sales,
    loading,
    error,
    refetch: init,
    denominations: allDenominations,
    startingCash,
    presetOpeningCash: outlet?.opening_cash,
    saveSheet,
    unsaveSheet,
    isSaved,
    isCarriedForward,
    setIsCarriedForward,
  };
}

export default useWarehouseSales;
