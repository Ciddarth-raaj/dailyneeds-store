import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import product from "../helper/product";

const EMPTY_ENTRY = {
  products: [],
  loading: false,
  error: null,
  fetched: false,
  fetchProgress: null,
};

const ProductsContext = createContext(null);

export function buildProductsCacheKey(options = {}) {
  const {
    limit = 10,
    offset = 0,
    filter = null,
    fetchAll = false,
    fetchNonOnline = false,
  } = options;

  return JSON.stringify({
    limit,
    offset,
    filter: filter ?? null,
    fetchAll: Boolean(fetchAll),
    fetchNonOnline: Boolean(fetchNonOnline),
  });
}

async function loadProducts(
  { limit, offset, filter, fetchAll, fetchNonOnline },
  onProgress
) {
  if (fetchAll) {
    let allProducts = [];
    let currentOffset = offset;
    let hasMore = true;
    let page = 0;

    onProgress?.({ loaded: 0, total: null, page: 0 });

    while (hasMore) {
      let data;
      if (filter) {
        data = await product.getFilteredProduct(filter, limit, currentOffset);
      } else {
        data = await product.getProduct(limit, currentOffset, fetchNonOnline);
      }

      if (Array.isArray(data) && data.length > 0) {
        allProducts = [...allProducts, ...data];
        page += 1;
        currentOffset += limit;
        onProgress?.({
          loaded: allProducts.length,
          total: null,
          page,
        });
        if (data.length < limit) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    onProgress?.({
      loaded: allProducts.length,
      total: allProducts.length,
      page,
    });
    return allProducts;
  }

  onProgress?.({ loaded: 0, total: null, page: 0 });

  let data;
  if (filter) {
    data = await product.getFilteredProduct(filter, limit, offset);
  } else {
    data = await product.getProduct(limit, offset, fetchNonOnline);
  }

  const products = Array.isArray(data) ? data : [];
  onProgress?.({
    loaded: products.length,
    total: products.length,
    page: 1,
  });
  return products;
}

export function ProductsProvider({ children }) {
  const [cache, setCache] = useState({});
  const cacheRef = useRef(cache);
  const inflightRef = useRef({});

  cacheRef.current = cache;

  const setCacheEntry = useCallback((key, patch) => {
    setCache((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || EMPTY_ENTRY), ...patch },
    }));
  }, []);

  const getCacheEntry = useCallback(
    (key) => cache[key] || EMPTY_ENTRY,
    [cache]
  );

  const fetchProductsForOptions = useCallback(
    async (options, { force = false } = {}) => {
      const { enabled = true } = options;
      if (!enabled) return [];

      const key = buildProductsCacheKey(options);

      if (!force) {
        const existing = cacheRef.current[key];
        if (existing?.fetched && !existing.loading) {
          return existing.products;
        }
        if (inflightRef.current[key]) {
          return inflightRef.current[key];
        }
      } else {
        delete inflightRef.current[key];
      }

      setCacheEntry(key, {
        loading: true,
        error: null,
        fetchProgress: { loaded: 0, total: null, page: 0 },
        ...(force ? { products: [], fetched: false } : {}),
      });

      const promise = (async () => {
        try {
          const products = await loadProducts(options, (progress) => {
            setCacheEntry(key, { fetchProgress: progress });
          });
          setCacheEntry(key, {
            products,
            loading: false,
            error: null,
            fetched: true,
            fetchProgress: null,
          });
          return products;
        } catch (err) {
          setCacheEntry(key, {
            loading: false,
            error: err,
            fetched: false,
            fetchProgress: null,
          });
          throw err;
        } finally {
          delete inflightRef.current[key];
        }
      })();

      inflightRef.current[key] = promise;
      return promise;
    },
    [setCacheEntry]
  );

  const setCacheProducts = useCallback(
    (key, updater) => {
      setCache((prev) => {
        const current = prev[key] || EMPTY_ENTRY;
        const nextProducts =
          typeof updater === "function" ? updater(current.products) : updater;

        return {
          ...prev,
          [key]: {
            ...current,
            products: Array.isArray(nextProducts) ? nextProducts : [],
            fetched: true,
          },
        };
      });
    },
    []
  );

  const invalidateCache = useCallback((key) => {
    if (key) {
      delete inflightRef.current[key];
      setCache((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }

    inflightRef.current = {};
    setCache({});
  }, []);

  const value = {
    getCacheEntry,
    fetchProductsForOptions,
    setCacheProducts,
    invalidateCache,
    buildProductsCacheKey,
  };

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProductsContext() {
  const context = useContext(ProductsContext);
  if (!context) {
    throw new Error("useProductsContext must be used within a ProductsProvider");
  }
  return context;
}
