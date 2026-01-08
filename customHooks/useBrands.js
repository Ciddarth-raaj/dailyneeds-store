import { useEffect, useState } from "react";
import brands from "../helper/brands";

export function useBrands() {
  const [brandsList, setBrandsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const response = await brands.getBrands(0, 10000);
      const data = response?.data || response || [];
      setBrandsList(
        data.map((b) => ({
          id: b.brand_id,
          value: b.brand_name,
        }))
      );
    } catch (err) {
      setError(err);
      console.error("Error fetching brands:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  return { brandsList, loading, error, refetch: fetchBrands };
}

