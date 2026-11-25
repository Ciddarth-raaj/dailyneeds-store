import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getAdvanceRequestById } from "../helper/advanceRequest";

/**
 * Loads one advance request with its documents and activity attached, so the
 * stage form needs a single request to render every stage that has run.
 */
function useAdvanceRequestById(id) {
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));

  const fetchData = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await getAdvanceRequestById(id);

      if (response && response.advance_request_id) {
        setRequest(response);
      } else {
        throw response;
      }
    } catch (err) {
      toast.error("Could not load this advance request");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { request, loading, refetch: fetchData, setRequest };
}

export default useAdvanceRequestById;
