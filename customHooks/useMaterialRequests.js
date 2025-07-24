import { useEffect, useState } from "react";
import materialHelper from "../helper/material";

function useMaterialRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await materialHelper.getAllMaterialRequests();
      if (data.status === 200) {
        setRequests(data.data);
      } else {
        setRequests([]);
        setError(data.message || "Failed to fetch material requests");
      }
    } catch (err) {
      setError(err.message || err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  return { requests, loading, error, refetch: fetchRequests };
}

export default useMaterialRequests;
