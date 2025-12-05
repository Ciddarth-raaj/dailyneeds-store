import React, { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { getEBMasterById } from "../helper/eb_master";

function useEBMasterById(id) {
  const [ebMaster, setEbMaster] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const response = await getEBMasterById(id);
      if (response.eb_machine_id) {
        setEbMaster(response);
      } else {
        throw response;
      }
    } catch (err) {
      toast.error("Error fetching EB master!");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [id, fetchData]);

  return { ebMaster, loading };
}

export default useEBMasterById;
