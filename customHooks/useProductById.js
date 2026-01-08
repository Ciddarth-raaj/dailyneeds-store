import { useEffect, useState, useCallback } from "react";
import product from "../helper/product";

/**
 * Hook to fetch a single product by ID and update it
 * @param {string|number} productId - The product ID to fetch
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether the query should run (default: true)
 * @returns {Object} Query result with product data, loading state, error, refetch function, and update function
 */
export function useProductById(productId, options = {}) {
  const { enabled = true } = options;
  const [productData, setProductData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState(null);

  const fetchProduct = useCallback(
    async (noRefresh = false) => {
      if (!enabled || !productId) {
        setLoading(false);
        return;
      }

      try {
        if (!noRefresh) {
          setLoading(true);
          setProductData(null);
        }

        const data = await product.getProductById(productId);
        // API returns array with single product, return the first item
        if (Array.isArray(data) && data.length > 0) {
          setProductData(data[0]);
        } else if (data) {
          setProductData(data);
        }
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    },
    [productId, enabled]
  );

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
          await fetchProduct(true);
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
    fetchProduct();
  }, [fetchProduct]);

  return {
    product: productData,
    setProduct: setProductData,
    loading,
    error,
    refetch: fetchProduct,
    updateProduct,
    updateLoading,
    updateError,
  };
}
