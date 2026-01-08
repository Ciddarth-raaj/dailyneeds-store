import { useEffect, useState } from "react";
import subcategories from "../helper/subcategories";

export function useSubcategories() {
  const [subcategoriesList, setSubcategoriesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSubcategories = async () => {
    try {
      setLoading(true);
      const response = await subcategories.getSubCategories(0, 10000);
      const data = response?.data || response || [];
      setSubcategoriesList(
        data.map((s) => ({
          id: s.subcategory_id,
          value: s.subcategory_name,
        }))
      );
    } catch (err) {
      setError(err);
      console.error("Error fetching subcategories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubcategories();
  }, []);

  return {
    subcategoriesList,
    loading,
    error,
    refetch: fetchSubcategories,
  };
}

