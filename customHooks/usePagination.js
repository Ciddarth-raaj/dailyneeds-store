import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildPageCacheKey,
  usePaginationCache,
} from "../contexts/PaginationCacheContext";

export function usePagination({
  cacheKey,
  fetchPage,
  fetchAll: fetchAllFn,
  defaultPageSize = 20,
  defaultSort = { field: "moh_offer_id", dir: "desc" },
  defaultFilters = { status: "active", columnFilters: {} },
  enabled = true,
}) {
  const { getCachedPage, setCachedPage, invalidateCache } = usePaginationCache();

  const [page, setPageState] = useState(0);
  const [pageSize, setPageSizeState] = useState(defaultPageSize);
  const [sort, setSortState] = useState(defaultSort);
  const [filters, setFiltersState] = useState(defaultFilters);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const fetchPageRef = useRef(fetchPage);
  const fetchAllRef = useRef(fetchAllFn);
  fetchPageRef.current = fetchPage;
  fetchAllRef.current = fetchAllFn;

  const queryKey = buildPageCacheKey({
    page,
    pageSize,
    sort: sort ?? defaultSort,
    filters,
  });

  const resolveSort = (value) => value ?? defaultSort;

  const loadPage = useCallback(
    async ({ nextPage, nextPageSize, nextSort, nextFilters, force = false }) => {
      if (!enabled) return;

      const effectivePage = nextPage ?? page;
      const effectivePageSize = nextPageSize ?? pageSize;
      const effectiveSort = resolveSort(nextSort ?? sort);
      const effectiveFilters = nextFilters ?? filters;
      const pageKey = buildPageCacheKey({
        page: effectivePage,
        pageSize: effectivePageSize,
        sort: effectiveSort,
        filters: effectiveFilters,
      });

      if (!force) {
        const cached = getCachedPage(cacheKey, pageKey);
        if (cached) {
          setRows(cached.data);
          setTotal(cached.total);
          return;
        }
      }

      setLoading(true);
      try {
        const offset = effectivePage * effectivePageSize;
        const result = await fetchPageRef.current({
          limit: effectivePageSize,
          offset,
          sort: effectiveSort,
          filters: effectiveFilters,
        });
        const data = result?.data ?? [];
        const totalCount = Number(result?.total) || 0;
        setCachedPage(cacheKey, pageKey, { data, total: totalCount });
        setRows(data);
        setTotal(totalCount);
      } finally {
        setLoading(false);
      }
    },
    [
      cacheKey,
      enabled,
      filters,
      getCachedPage,
      page,
      pageSize,
      setCachedPage,
      sort,
    ]
  );

  useEffect(() => {
    loadPage({});
  }, [queryKey, enabled, loadPage]);

  const setPage = useCallback((nextPage) => {
    setPageState(nextPage);
  }, []);

  const setPageSize = useCallback((nextPageSize) => {
    setPageSizeState(nextPageSize);
    setPageState(0);
  }, []);

  const setSort = useCallback((nextSort) => {
    setSortState(nextSort);
    setPageState(0);
    invalidateCache(cacheKey);
  }, [cacheKey, invalidateCache]);

  const setFilters = useCallback(
    (nextFilters) => {
      setFiltersState((prev) => ({ ...prev, ...nextFilters }));
      setPageState(0);
      invalidateCache(cacheKey);
    },
    [cacheKey, invalidateCache]
  );

  const setColumnFilters = useCallback(
    (columnFilters) => {
      setFiltersState((prev) => ({ ...prev, columnFilters: columnFilters || {} }));
      setPageState(0);
      invalidateCache(cacheKey);
    },
    [cacheKey, invalidateCache]
  );

  const refetch = useCallback(() => {
    invalidateCache(cacheKey);
    return loadPage({ force: true });
  }, [cacheKey, invalidateCache, loadPage]);

  const fetchAll = useCallback(async () => {
    if (!fetchAllRef.current) return [];
    setExportLoading(true);
    try {
      const result = await fetchAllRef.current({
        sort: resolveSort(sort),
        filters,
      });
      return result?.data ?? [];
    } finally {
      setExportLoading(false);
    }
  }, [filters, sort]);

  return {
    rows,
    total,
    loading,
    exportLoading,
    page,
    pageSize,
    sort,
    filters,
    setPage,
    setPageSize,
    setSort,
    setFilters,
    setColumnFilters,
    refetch,
    fetchAll,
  };
}
