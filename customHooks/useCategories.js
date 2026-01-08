import { useEffect, useState } from "react";
import categories from "../helper/categories";

export function useCategories() {
  const [categoriesList, setCategoriesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await categories.getCategories(0, 10000);
      const data = response?.data || response || [];
      setCategoriesList(
        data.map((c) => ({
          id: c.category_id,
          value: c.category_name,
        }))
      );
    } catch (err) {
      setError(err);
      console.error("Error fetching categories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return { categoriesList, loading, error, refetch: fetchCategories };
}

