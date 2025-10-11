import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getAllEBConsumption } from "../helper/eb_consumption";

function useEBConsumptions() {
  const [ebConsumptions, setEBConsumptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await getAllEBConsumption();
      if (response.code === 200) {
        setEBConsumptions(response.data);
      } else {
        throw response;
      }
    } catch (err) {
      toast.error("Error fetching eb consumptions!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { ebConsumptions, loading };
}

export default useEBConsumptions;
