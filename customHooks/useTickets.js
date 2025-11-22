import { useEffect, useState } from "react";
import { getAllTickets } from "../helper/tickets";

export function useTickets(filters) {
  const [tickets, setTickets] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = async () => {
    try {
      setLoading(true);
      const data = await getAllTickets(filters);
      if (!data.code) {
        setTickets(data.tickets);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, [filters]);

  return { tickets, loading, error, refetch: fetch };
}
