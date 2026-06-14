import { useCallback, useEffect, useMemo } from "react";
import {
  buildProductsCacheKey,
  useProductsContext,
} from "../contexts/ProductsContext";

/**
 * Hook to fetch products with pagination and optional filtering.
 * Results are cached in ProductsContext keyed by query options so identical
 * requests reuse data and in-flight requests are deduplicated.
 *
 * @param {Object} options - Query options
 * @param {number} options.limit - Number of products to return (default: 10)
 * @param {number} options.offset - Number of products to skip (default: 0)
 * @param {string} options.filter - Optional search term to filter products
 * @param {boolean} options.enabled - Whether the query should run (default: true)
 * @param {boolean} options.fetchAll - If true, keep fetching until all products are loaded (default: false)
 * @param {boolean} options.fetchNonOnline - Include non-online products in fetch (default: false)
 */
export function useProducts(options = {}) {
  const {
    limit = 10,
    offset = 0,
    filter = null,
    enabled = true,
    fetchAll = false,
    fetchNonOnline = false,
  } = options;

  const {
    getCacheEntry,
    fetchProductsForOptions,
    setCacheProducts,
  } = useProductsContext();

  const normalizedOptions = useMemo(
    () => ({
      limit,
      offset,
      filter,
      enabled,
      fetchAll,
      fetchNonOnline,
    }),
    [limit, offset, filter, enabled, fetchAll, fetchNonOnline]
  );

  const cacheKey = useMemo(
    () => buildProductsCacheKey(normalizedOptions),
    [normalizedOptions]
  );

  const { products, loading, error } = getCacheEntry(cacheKey);

  useEffect(() => {
    if (!enabled) return;
    fetchProductsForOptions(normalizedOptions);
  }, [cacheKey, enabled, normalizedOptions, fetchProductsForOptions]);

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.product_id - b.product_id),
    [products]
  );

  const getMappedProducts = useCallback(() => {
    const mappedProducts = {};
    products.forEach((p) => {
      mappedProducts[p.product_id] = p;
    });
    return mappedProducts;
  }, [products]);

  const refetch = useCallback(
    (noRefresh = false) =>
      fetchProductsForOptions(normalizedOptions, { force: !noRefresh }),
    [normalizedOptions, fetchProductsForOptions]
  );

  const setProducts = useCallback(
    (updater) => setCacheProducts(cacheKey, updater),
    [cacheKey, setCacheProducts]
  );

  return {
    products: sortedProducts,
    setProducts,
    loading: enabled ? loading : false,
    error,
    refetch,
    getMappedProducts,
  };
}
