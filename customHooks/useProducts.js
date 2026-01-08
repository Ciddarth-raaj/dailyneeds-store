import { useEffect, useState, useCallback, useMemo } from "react";
import product from "../helper/product";

/**
 * Hook to fetch products with pagination and optional filtering
 * @param {Object} options - Query options
 * @param {number} options.limit - Number of products to return (default: 10)
 * @param {number} options.offset - Number of products to skip (default: 0)
 * @param {string} options.filter - Optional search term to filter products
 * @param {boolean} options.enabled - Whether the query should run (default: true)
 * @param {boolean} options.fetchAll - If true, keep fetching until all products are loaded (default: false)
 * @returns {Object} Query result with products data, loading state, error, and refetch function
 */
export function useProducts(options = {}) {
  const {
    limit = 10,
    offset = 0,
    filter = null,
    enabled = true,
    fetchAll = false,
  } = options;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProducts = useCallback(
    async (noRefresh = false) => {
      if (!enabled) {
        setLoading(false);
        return;
      }

      try {
        if (!noRefresh) {
          setLoading(true);
          setProducts([]);
        }

        if (fetchAll) {
          // Fetch all products by paginating until empty
          let allProducts = [];
          let currentOffset = offset;
          let hasMore = true;

          while (hasMore) {
            let data;
            if (filter) {
              data = await product.getFilteredProduct(
                filter,
                limit,
                currentOffset
              );
            } else {
              data = await product.getProduct(limit, currentOffset);
            }

            if (Array.isArray(data) && data.length > 0) {
              allProducts = [...allProducts, ...data];
              currentOffset += limit;

              // If we got fewer products than the limit, we've reached the end
              if (data.length < limit) {
                hasMore = false;
              }
            } else {
              // Empty array means no more products
              hasMore = false;
            }
          }

          setProducts(allProducts);
        } else {
          // Normal pagination - fetch single page
          let data;
          if (filter) {
            data = await product.getFilteredProduct(filter, limit, offset);
          } else {
            data = await product.getProduct(limit, offset);
          }

          if (Array.isArray(data)) {
            setProducts(data);
          }
        }
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    },
    [limit, offset, filter, enabled, fetchAll]
  );

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const sortedProducts = useMemo(() => {
    return products.sort((a, b) => a.product_id - b.product_id);
  }, [products]);

  return {
    products: sortedProducts,
    setProducts,
    loading,
    error,
    refetch: fetchProducts,
  };
}
