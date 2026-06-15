import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  getAllSalesDashboardItems,
  streamSalesDashboardMeta,
  streamSalesDashboardFilterOptions,
  SALES_DASHBOARD_ITEMS_STREAM_PAGE_SIZE,
} from "../helper/salesReport";
import {
  buildSalesDashboardCacheId,
  buildSalesDashboardFiltersFromContext,
  buildSalesDashboardStats,
  buildSalesFilterCacheKey,
  buildSalesStockFilterCacheKey,
  buildSalesFilterParams,
  computeSoldUnsoldBarData,
  emptySalesFilterOptions,
  formatDateDisplay,
  getStockHoldingDateForSalesDate,
  mergeSalesItemsWithUnsoldStock,
  resolveStockRowsForSalesDate,
  SALES_DASHBOARD_FETCH_DAYS,
  SALES_DASHBOARD_CHUNK_DAYS,
  getSalesDashboardChunkCount,
} from "../util/salesDashboard";
import {
  buildSalesDashboardCacheEntry,
  clearSalesDashboardCacheForDate,
  purgeSalesDashboardCacheExceptDate,
  readSalesDashboardCache,
  writeSalesDashboardCache,
} from "../util/salesDashboardCache";

function isAbortError(err) {
  return (
    err?.name === "AbortError" ||
    err?.name === "CanceledError" ||
    err?.code === "ERR_CANCELED"
  );
}

function getSalesDashboardErrorMessage(err, fallback) {
  if (isAbortError(err)) return null;
  if (err?.code === "ECONNABORTED" || /timeout/i.test(String(err?.message ?? ""))) {
    return "Sales dashboard request timed out. Try Refresh or narrow your filters.";
  }
  if (err?.code === 404) {
    return "Sales dashboard request failed (not found). With large datasets this often means the server timed out — try Refresh or narrow your filters.";
  }
  return err?.message || fallback;
}

function buildBundleFromMeta(meta, dailyTotals = []) {
  return {
    as_of_date: meta?.as_of_date ?? null,
    daily_totals: dailyTotals,
    window_summaries: {},
    selected_date_has_report: Boolean(meta?.selected_date_has_report),
    filter_options: meta?.filter_options ?? null,
  };
}

function hydrateFromCache(cached, { itemsCacheRef, selectedDate, filterCacheKey }) {
  const items = Array.isArray(cached?.items) ? cached.items : [];
  itemsCacheRef.current.set(`${selectedDate}__${filterCacheKey}`, items);

  return {
    bundle: cached?.bundle ?? null,
    items,
    displayItems: Array.isArray(cached?.displayItems) ? cached.displayItems : [],
    stats: cached?.stats ?? null,
  };
}

export default function useSalesDashboardData({
  selectedDate,
  dashboardFilters,
  enabled = true,
  getStockRowsForDate,
  clearSalesStockCache,
}) {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [summaryStreaming, setSummaryStreaming] = useState(false);
  const [summaryStreamProgress, setSummaryStreamProgress] = useState(null);
  const [loadedFromCache, setLoadedFromCache] = useState(false);
  const [bundle, setBundle] = useState(null);
  const [selectedDateItems, setSelectedDateItems] = useState([]);
  const [selectedDateItemsLoading, setSelectedDateItemsLoading] =
    useState(false);
  const [displayItems, setDisplayItems] = useState([]);
  const [displayItemsLoading, setDisplayItemsLoading] = useState(false);
  const [itemsFetchProgress, setItemsFetchProgress] = useState(null);
  const [cachedStats, setCachedStats] = useState(null);

  const fetchAbortRef = useRef(null);
  const fetchGenerationRef = useRef(0);
  const itemsCacheRef = useRef(new Map());
  const displayItemsRef = useRef([]);

  const salesFilters = useMemo(
    () => buildSalesDashboardFiltersFromContext(dashboardFilters),
    [dashboardFilters]
  );

  const filterParams = useMemo(
    () => buildSalesFilterParams(salesFilters),
    [salesFilters]
  );

  const filterCacheKey = useMemo(
    () => buildSalesFilterCacheKey(salesFilters),
    [salesFilters]
  );

  const stockFilterCacheKey = useMemo(
    () => buildSalesStockFilterCacheKey(dashboardFilters),
    [dashboardFilters]
  );

  const cacheId = useMemo(
    () => buildSalesDashboardCacheId(selectedDate, dashboardFilters),
    [selectedDate, filterCacheKey, stockFilterCacheKey]
  );

  const abortActiveFetch = useCallback(() => {
    if (fetchAbortRef.current) {
      fetchAbortRef.current.abort();
      fetchAbortRef.current = null;
    }
  }, []);

  const applyItemsChunk = useCallback(({ items, displayItems: nextDisplayItems }) => {
    displayItemsRef.current = nextDisplayItems;
    setSelectedDateItems(items);
    setDisplayItems(nextDisplayItems);
    setDisplayItemsLoading(false);
    setSelectedDateItemsLoading(false);
  }, []);

  const applyBundleUpdate = useCallback(
    (nextBundle, displayItemsForStats) => {
      const statsItems =
        displayItemsForStats ?? displayItemsRef.current ?? [];
      setBundle(nextBundle);
      setCachedStats(
        buildSalesDashboardStats(nextBundle, selectedDate, statsItems)
      );
    },
    [selectedDate]
  );

  const fetchItemsForDate = useCallback(
    async (date, { signal, useCache = true, onProgress, onChunk } = {}) => {
      const memoryKey = `${date}__${filterCacheKey}`;
      if (useCache && itemsCacheRef.current.has(memoryKey)) {
        return itemsCacheRef.current.get(memoryKey);
      }

      const allItems = await getAllSalesDashboardItems(date, filterParams, {
        signal,
        pageSize: SALES_DASHBOARD_ITEMS_STREAM_PAGE_SIZE,
        onProgress: (progress) => {
          onProgress?.(progress);
          setItemsFetchProgress(progress);
        },
        onChunk: ({ items, progress }) => {
          onChunk?.({ items, progress });
        },
      });

      itemsCacheRef.current.set(memoryKey, allItems);
      return allItems;
    },
    [filterCacheKey, filterParams]
  );

  const mergeWithStock = useCallback(
    async (date, items, { signal } = {}) => {
      if (typeof getStockRowsForDate !== "function") {
        return items;
      }
      const stockRows = await resolveStockRowsForSalesDate(
        date,
        getStockRowsForDate,
        { signal }
      );
      if (signal?.aborted) return items;
      return mergeSalesItemsWithUnsoldStock(items, stockRows);
    },
    [getStockRowsForDate]
  );

  const loadStockRowsForSalesDate = useCallback(
    async ({ signal } = {}) =>
      resolveStockRowsForSalesDate(selectedDate, getStockRowsForDate, {
        signal,
      }),
    [selectedDate, getStockRowsForDate]
  );

  const persistToCache = useCallback(
    async (nextBundle, items, nextDisplayItems) => {
      const entry = buildSalesDashboardCacheEntry({
        salesDate: selectedDate,
        dashboardFilters,
        bundle: nextBundle,
        items,
        displayItems: nextDisplayItems,
      });
      await writeSalesDashboardCache(entry);
      await purgeSalesDashboardCacheExceptDate(selectedDate);
      setCachedStats(entry.stats);
    },
    [selectedDate, dashboardFilters]
  );

  const loadProductItems = useCallback(
    async (meta, { signal, onItemsChunk } = {}) => {
      const stockRows = await loadStockRowsForSalesDate({ signal });
      if (signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }

      if (!meta?.selected_date_has_report) {
        const displayItems = mergeSalesItemsWithUnsoldStock([], stockRows);
        onItemsChunk?.({ items: [], displayItems });
        return { items: [], displayItems };
      }

      const items = await fetchItemsForDate(selectedDate, {
        signal,
        useCache: false,
        onChunk: ({ items: nextItems }) => {
          const nextDisplayItems = mergeSalesItemsWithUnsoldStock(
            nextItems,
            stockRows
          );
          onItemsChunk?.({ items: nextItems, displayItems: nextDisplayItems });
        },
      });

      if (signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }

      return {
        items,
        displayItems: mergeSalesItemsWithUnsoldStock(items, stockRows),
      };
    },
    [selectedDate, fetchItemsForDate, loadStockRowsForSalesDate]
  );

  const loadFromNetwork = useCallback(
    async ({
      signal,
      skipCacheWrite = false,
      onMeta,
      onSummaryProgress,
      onSummaryChunk,
      onItemsChunk,
    } = {}) => {
      let meta = {
        as_of_date: selectedDate,
        selected_date_has_report: false,
        filter_options: emptySalesFilterOptions(),
      };
      let currentDailyTotals = [];
      let nextBundle = buildBundleFromMeta(meta, currentDailyTotals);

      setSummaryStreaming(true);
      setSummaryStreamProgress({
        loadedDays: 0,
        totalDays: SALES_DASHBOARD_FETCH_DAYS,
        chunkIndex: 0,
        totalChunks: getSalesDashboardChunkCount(),
        complete: false,
      });

      let metaDispatched = false;
      let resolveMetaReady;
      const metaReady = new Promise((resolve) => {
        resolveMetaReady = resolve;
      });

      const metaPromise = streamSalesDashboardMeta(selectedDate, filterParams, {
        signal,
        chunkDays: SALES_DASHBOARD_CHUNK_DAYS,
        onProgress: (progress) => {
          setSummaryStreamProgress(progress);
          onSummaryProgress?.(progress);
        },
        onChunk: ({ meta: batchMeta, dailyTotals, progress }) => {
          meta = {
            ...meta,
            as_of_date: batchMeta?.as_of_date ?? meta.as_of_date,
            selected_date_has_report: Boolean(
              batchMeta?.selected_date_has_report
            ),
          };
          currentDailyTotals = dailyTotals;
          nextBundle = buildBundleFromMeta(meta, dailyTotals);
          applyBundleUpdate(nextBundle);
          onSummaryChunk?.({ bundle: nextBundle, progress });

          if (!metaDispatched) {
            metaDispatched = true;
            resolveMetaReady();
            onMeta?.(meta);
          }
        },
      }).finally(() => {
        setSummaryStreaming(false);
        setSummaryStreamProgress(null);
      });

      const filterOptionsPromise = streamSalesDashboardFilterOptions(
        selectedDate,
        filterParams,
        {
          signal,
          chunkDays: SALES_DASHBOARD_CHUNK_DAYS,
          onChunk: ({ filterOptions }) => {
            meta = {
              ...meta,
              filter_options: filterOptions,
            };
            nextBundle = buildBundleFromMeta(meta, currentDailyTotals);
            applyBundleUpdate(nextBundle);
          },
        }
      );

      const itemsPromise = metaReady.then(() =>
        loadProductItems(meta, {
          signal,
          onItemsChunk,
        })
      );

      const [{ meta: finalMeta, dailyTotals }, finalFilterOptions, itemsResult] =
        await Promise.all([metaPromise, filterOptionsPromise, itemsPromise]);

      meta = {
        ...finalMeta,
        filter_options: finalFilterOptions,
      };
      nextBundle = buildBundleFromMeta(meta, dailyTotals);
      applyBundleUpdate(nextBundle);
      onMeta?.(meta);

      const { items, displayItems: nextDisplayItems } = itemsResult;

      if (!skipCacheWrite) {
        await persistToCache(nextBundle, items, nextDisplayItems);
      }

      return { bundle: nextBundle, items, displayItems: nextDisplayItems };
    },
    [
      selectedDate,
      filterParams,
      applyBundleUpdate,
      loadProductItems,
      persistToCache,
    ]
  );

  useEffect(() => {
    if (!enabled || !selectedDate || !cacheId) {
      displayItemsRef.current = [];
      setBundle(null);
      setSelectedDateItems([]);
      setDisplayItems([]);
      setCachedStats(null);
      setLoadedFromCache(false);
      setLoading(false);
      setSummaryStreaming(false);
      setSummaryStreamProgress(null);
      setSelectedDateItemsLoading(false);
      setDisplayItemsLoading(false);
      setItemsFetchProgress(null);
      return undefined;
    }

    abortActiveFetch();
    const generation = ++fetchGenerationRef.current;
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    setSelectedDateItemsLoading(true);
    setDisplayItemsLoading(true);
    setItemsFetchProgress(null);
    setSummaryStreamProgress(null);
    setSummaryStreaming(false);

    (async () => {
      try {
        const cached = await readSalesDashboardCache(cacheId);
        if (
          fetchGenerationRef.current !== generation ||
          controller.signal.aborted
        ) {
          return;
        }

        if (cached) {
          const hydrated = hydrateFromCache(cached, {
            itemsCacheRef,
            selectedDate,
            filterCacheKey,
          });
          displayItemsRef.current = hydrated.displayItems;
          setBundle(hydrated.bundle);
          setSelectedDateItems(hydrated.items);
          setDisplayItems(hydrated.displayItems);
          setCachedStats(hydrated.stats);
          setLoadedFromCache(true);
          setLoading(false);
          setSummaryStreaming(false);
          setSelectedDateItemsLoading(false);
          setDisplayItemsLoading(false);
          setItemsFetchProgress(null);
          return;
        }

        setLoadedFromCache(false);
        setCachedStats(null);
        setLoading(true);

        const result = await loadFromNetwork({
          signal: controller.signal,
          onMeta: () => {
            if (
              fetchGenerationRef.current !== generation ||
              controller.signal.aborted
            ) {
              return;
            }
            setLoading(false);
          },
          onItemsChunk: (chunk) => {
            if (
              fetchGenerationRef.current !== generation ||
              controller.signal.aborted
            ) {
              return;
            }
            applyItemsChunk(chunk);
          },
        });

        if (
          fetchGenerationRef.current !== generation ||
          controller.signal.aborted
        ) {
          return;
        }

        setBundle(result.bundle);
        displayItemsRef.current = result.displayItems;
        setSelectedDateItems(result.items);
        setDisplayItems(result.displayItems);
        setLoadedFromCache(false);
      } catch (err) {
        if (controller.signal.aborted || isAbortError(err)) return;
        const message = getSalesDashboardErrorMessage(
          err,
          "Failed to load sales dashboard data."
        );
        if (message) toast.error(message);
        setBundle(null);
        setSelectedDateItems([]);
        setDisplayItems([]);
        setCachedStats(null);
        setLoadedFromCache(false);
      } finally {
        if (fetchGenerationRef.current === generation) {
          setLoading(false);
          setSummaryStreaming(false);
          setSummaryStreamProgress(null);
          setSelectedDateItemsLoading(false);
          setDisplayItemsLoading(false);
          setItemsFetchProgress(null);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [
    enabled,
    selectedDate,
    cacheId,
    filterCacheKey,
    abortActiveFetch,
    loadFromNetwork,
    applyItemsChunk,
  ]);

  const refreshData = useCallback(async () => {
    if (!enabled || !selectedDate) return;

    abortActiveFetch();
    const generation = ++fetchGenerationRef.current;
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    setRefreshing(true);
    setLoadedFromCache(false);
    setSummaryStreaming(false);
    setSummaryStreamProgress(null);
    itemsCacheRef.current.clear();
    clearSalesStockCache?.(getStockHoldingDateForSalesDate(selectedDate));
    clearSalesStockCache?.(selectedDate);

    try {
      await purgeSalesDashboardCacheExceptDate(selectedDate);
      await clearSalesDashboardCacheForDate(selectedDate);

      const result = await loadFromNetwork({
        signal: controller.signal,
        skipCacheWrite: false,
        onMeta: () => {
          if (
            fetchGenerationRef.current !== generation ||
            controller.signal.aborted
          ) {
            return;
          }
          setRefreshing(false);
        },
        onItemsChunk: (chunk) => {
          if (
            fetchGenerationRef.current !== generation ||
            controller.signal.aborted
          ) {
            return;
          }
          applyItemsChunk(chunk);
        },
      });

      if (
        fetchGenerationRef.current !== generation ||
        controller.signal.aborted
      ) {
        return;
      }

      setBundle(result.bundle);
      displayItemsRef.current = result.displayItems;
      setSelectedDateItems(result.items);
      setDisplayItems(result.displayItems);
      toast.success("Sales dashboard data refreshed.");
    } catch (err) {
      if (controller.signal.aborted || isAbortError(err)) return;
      const message = getSalesDashboardErrorMessage(
        err,
        "Failed to refresh sales dashboard data."
      );
      if (message) toast.error(message);
    } finally {
      if (fetchGenerationRef.current === generation) {
        setRefreshing(false);
        setSummaryStreaming(false);
        setSummaryStreamProgress(null);
        setItemsFetchProgress(null);
      }
    }
  }, [
    enabled,
    selectedDate,
    loadFromNetwork,
    abortActiveFetch,
    clearSalesStockCache,
  ]);

  const loadItemsForModal = useCallback(
    async (date) => {
      try {
        const items = await fetchItemsForDate(date, { useCache: true });
        return mergeWithStock(date, items);
      } catch (err) {
        if (isAbortError(err)) throw err;
        toast.error(err?.message || "Failed to load sales items.");
        throw err;
      }
    },
    [fetchItemsForDate, mergeWithStock]
  );

  const dailyTotals = bundle?.daily_totals ?? [];
  const windowSummaries = bundle?.window_summaries ?? {};
  const filterOptions = bundle?.filter_options ?? null;

  const computedStats = useMemo(
    () => buildSalesDashboardStats(bundle, selectedDate),
    [bundle, selectedDate]
  );

  const lineChartData =
    cachedStats?.lineChartData ?? computedStats.lineChartData;
  const cumulativeRows =
    cachedStats?.cumulativeRows ?? computedStats.cumulativeRows;
  const window7 = cachedStats?.window7 ?? computedStats.window7;
  const window15 = cachedStats?.window15 ?? computedStats.window15;
  const window30 = cachedStats?.window30 ?? computedStats.window30;
  const todaySummary = useMemo(() => {
    const summary = cachedStats?.todaySummary ?? computedStats.todaySummary;
    if (!summary) return null;
    return {
      ...summary,
      periodSubtitle: formatDateDisplay(selectedDate),
    };
  }, [cachedStats?.todaySummary, computedStats.todaySummary, selectedDate]);
  const monthSummary = cachedStats?.monthSummary ?? computedStats.monthSummary;

  const soldUnsoldBarData = useMemo(() => {
    if (displayItems.length > 0) {
      return computeSoldUnsoldBarData(displayItems);
    }
    if (cachedStats?.soldUnsoldBarData) {
      return cachedStats.soldUnsoldBarData;
    }
    return computeSoldUnsoldBarData(displayItems);
  }, [cachedStats?.soldUnsoldBarData, displayItems]);

  return {
    loading,
    refreshing,
    summaryStreaming,
    summaryStreamProgress,
    loadedFromCache,
    refreshData,
    bundle,
    dailyTotals,
    windowSummaries,
    window7,
    window15,
    window30,
    todaySummary,
    monthSummary,
    soldUnsoldBarData,
    lineChartData,
    cumulativeRows,
    selectedDateItems,
    selectedDateItemsLoading,
    displayItems,
    displayItemsLoading,
    itemsFetchProgress,
    selectedDateHasReport: Boolean(bundle?.selected_date_has_report),
    filterOptions,
    loadItemsForModal,
  };
};
