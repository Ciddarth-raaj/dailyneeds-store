import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getAllEBMaster } from "../helper/eb_master";

function useEBMaster() {
  const [ebMasterList, setEbMasterList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await getAllEBMaster({ offset: 0, limit: 10000000 });
      if (response.machines) {
        setEbMasterList(response.machines);
      } else {
        throw response;
      }
    } catch (err) {
      toast.error("Error fetching EB master list!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { ebMasterList, loading };
}

export default useEBMaster;
