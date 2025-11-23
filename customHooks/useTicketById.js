import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getTicketById } from "../helper/tickets";

function useTicketById(id) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await getTicketById(id);
      if (response.id) {
        setTicket(response);
      } else {
        throw response;
      }
    } catch (err) {
      toast.error("Error fetching ticket!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  return { ticket, loading };
}

export default useTicketById;
