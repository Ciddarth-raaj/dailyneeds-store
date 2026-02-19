import { useMemo } from "react";
import { useProducts } from "./useProducts";

/**
 * Hook to get unique supplier names (gf_manufacturer) from the products list.
 * Useful for dropdowns that need to pick a supplier/manufacturer.
 *
 * @param {Object} options - Passed to useProducts (e.g. limit, fetchAll, enabled)
 * @returns {Object} { supplierOptions, suppliers, loading, error, refetch }
 *   - supplierOptions: Array of { id, value } for use with CustomInput method="switch"
 *   - suppliers: Array of unique supplier name strings (sorted)
 *   - loading, error, refetch: from useProducts
 */
export function useProductSuppliers(options = {}) {
  const { products, loading, error, refetch } = useProducts({
    limit: 10000,
    fetchAll: true,
    ...options,
  });

  const { supplierOptions, suppliers } = useMemo(() => {
    const manufacturers = (products || [])
      .map((p) => p.de_distributor)
      .filter((m) => m != null && String(m).trim() !== "");
    const unique = [...new Set(manufacturers)].sort((a, b) =>
      String(a).localeCompare(String(b))
    );
    const options = unique.map((m) => ({ id: m, value: m }));
    return { supplierOptions: options, suppliers: unique };
  }, [products]);

  return {
    supplierOptions,
    suppliers,
    loading,
    error,
    refetch,
  };
}
