import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getEBConsumptionById } from "../helper/eb_consumption";

function useEBConsumptions(id) {
  const [ebConsumption, setEBConsumption] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await getEBConsumptionById(id);
      if (response.code === 200) {
        setEBConsumption(response.data);
      } else {
        throw response;
      }
    } catch (err) {
      toast.error("Error fetching eb consumption!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  return { ebConsumption, loading };
}

export default useEBConsumptions;
