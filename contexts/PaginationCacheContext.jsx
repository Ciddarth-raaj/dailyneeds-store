import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";

const PaginationCacheContext = createContext(null);

function getNamespace(store, cacheKey) {
  if (!store.current[cacheKey]) {
    store.current[cacheKey] = new Map();
  }
  return store.current[cacheKey];
}

export function PaginationCacheProvider({ children }) {
  const storeRef = useRef({});

  const getCachedPage = useCallback((cacheKey, pageKey) => {
    const ns = storeRef.current[cacheKey];
    if (!ns) return null;
    return ns.get(pageKey) ?? null;
  }, []);

  const setCachedPage = useCallback((cacheKey, pageKey, payload) => {
    const ns = getNamespace(storeRef, cacheKey);
    ns.set(pageKey, payload);
  }, []);

  const invalidateCache = useCallback((cacheKey) => {
    if (cacheKey) {
      delete storeRef.current[cacheKey];
      return;
    }
    storeRef.current = {};
  }, []);

  const value = useMemo(
    () => ({
      getCachedPage,
      setCachedPage,
      invalidateCache,
    }),
    [getCachedPage, setCachedPage, invalidateCache]
  );

  return (
    <PaginationCacheContext.Provider value={value}>
      {children}
    </PaginationCacheContext.Provider>
  );
}

export function usePaginationCache() {
  const ctx = useContext(PaginationCacheContext);
  if (!ctx) {
    throw new Error(
      "usePaginationCache must be used within PaginationCacheProvider"
    );
  }
  return ctx;
}

export function buildPageCacheKey({ page, pageSize, sort, filters }) {
  return JSON.stringify({
    page,
    pageSize,
    sort,
    filters,
  });
}
