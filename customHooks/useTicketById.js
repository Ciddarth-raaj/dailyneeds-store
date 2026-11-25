import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getTicketById } from "../helper/tickets";

/**
 * Loads one work item with everything attached to it — images, checklist,
 * comments and activity — so a detail view needs a single request.
 */
function useTicketById(id) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));

  const fetchData = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await getTicketById(id);

      if (response && response.id) {
        setTicket(response);
      } else {
        throw response;
      }
    } catch (err) {
      toast.error("Could not load this item");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ticket, loading, refetch: fetchData, setTicket };
}

export default useTicketById;
