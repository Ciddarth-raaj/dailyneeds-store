import { useEffect, useState, useCallback } from "react";
import product from "../helper/product";

/**
 * Hook to fetch a single product by ID and update it
 * @param {string|number} productId - The product ID to fetch
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether to fetch on mount (default: true). If false, use refetch() to load on demand.
 * @returns {Object} Query result with product, loading, error, refetch (returns product when called), and updateProduct
 */
export function useProductById(productId, options = {}) {
  const { enabled = true } = options;
  const [productData, setProductData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState(null);

  const fetchProduct = useCallback(
    async (noRefresh = false, force = false) => {
      const shouldFetch = force || (enabled && productId);
      if (!shouldFetch || !productId) {
        setLoading(false);
        return null;
      }

      try {
        if (!noRefresh) {
          setLoading(true);
          if (!force) setProductData(null);
        }

        const data = await product.getProductById(productId);
        // API returns array with single product, return the first item
        const resolved = Array.isArray(data) && data.length > 0 ? data[0] : data || null;
        setProductData(resolved);
        return resolved;
      } catch (err) {
        setError(err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [productId, enabled]
  );

  const refetch = useCallback(() => fetchProduct(false, true), [fetchProduct]);

  const updateProduct = useCallback(
    async (data) => {
      try {
        setUpdateLoading(true);
        setUpdateError(null);
        const response = await product.updateProductDetails({
          ...data,
          product_id: productId,
        });
        // Refetch product data after successful update
        if (response.code === 200) {
          await fetchProduct(true, true);
        }
        return response;
      } catch (err) {
        setUpdateError(err);
        throw err;
      } finally {
        setUpdateLoading(false);
      }
    },
    [productId, fetchProduct]
  );

  useEffect(() => {
    if (enabled && productId) {
      fetchProduct();
    } else {
      setLoading(false);
    }
  }, [enabled, productId, fetchProduct]);

  return {
    product: productData,
    setProduct: setProductData,
    loading,
    error,
    refetch,
    updateProduct,
    updateLoading,
    updateError,
  };
}
