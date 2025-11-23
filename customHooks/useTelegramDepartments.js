import { useEffect, useState } from "react";
import { getAllTickets } from "../helper/tickets";
import { getAllTelegramDepartments } from "../helper/telegram_departments";

export function useTelegramDepartments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = async () => {
    try {
      setLoading(true);
      const data = await getAllTelegramDepartments();
      if (!data.code) {
        setDepartments(data.departments);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, []);

  return { departments, loading, error, refetch: fetch };
}
