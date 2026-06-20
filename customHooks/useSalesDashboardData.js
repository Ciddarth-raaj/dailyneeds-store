import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  getAllSalesDashboardItems,
  SALES_DASHBOARD_ITEMS_STREAM_PAGE_SIZE,
} from "../helper/salesReport";
import {
  buildSalesDashboardFiltersFromContext,
  buildSalesDashboardStats,
  buildSalesDashboardBundleFromRawDays,
  filterSalesItemsByDashboardFilters,
  formatDateDisplay,
  getDefaultSalesRangeDates,
  getRequiredBootstrapWindowDates,
  getStockHoldingDateForSalesDate,
  listDatesInRange,
  mergeSalesItemsWithUnsoldStock,
  resolveStockRowsForSalesDate,
  SALES_DASHBOARD_RAW_CACHE_DAYS,
  SALES_DASHBOARD_RETENTION_DAYS,
} from "../util/salesDashboard";
import {
  clearAllSalesDashboardCache,
  readSalesDashboardItemsForDate,
  runDailySalesCachePruneIfNeeded,
  writeSalesDashboardItemsForDate,
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

const DAY_FETCH_CONCURRENCY = 3;

async function fetchDatesWithConcurrency(
  dates,
  fetchDate,
  { signal, concurrency = DAY_FETCH_CONCURRENCY, onDayComplete } = {}
) {
  if (!dates.length) return;

  const queue = [...dates];
  const workerCount = Math.min(concurrency, queue.length);

  const worker = async () => {
    while (queue.length > 0) {
      if (signal?.aborted) return;
      const date = queue.shift();
      if (!date) return;
      await fetchDate(date);
      if (signal?.aborted) return;
      onDayComplete?.(date);
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
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
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [backgroundProgress, setBackgroundProgress] = useState(null);
  const [hydrateProgress, setHydrateProgress] = useState(null);
  const [bundle, setBundle] = useState(null);
  const [selectedDateItems, setSelectedDateItems] = useState([]);
  const [displayItems, setDisplayItems] = useState([]);
  const [displayItemsLoading, setDisplayItemsLoading] = useState(false);
  const [filtersProcessing, setFiltersProcessing] = useState(false);
  const [rangeLoadProgress, setRangeLoadProgress] = useState(null);
  const [rangeItems, setRangeItems] = useState([]);
  const [rangeItemsLoading, setRangeItemsLoading] = useState(false);
  const [activeRange, setActiveRange] = useState({ fromDate: "", toDate: "" });
  const [rangeResetKey, setRangeResetKey] = useState(0);

  const bootstrapAbortRef = useRef(null);
  const backgroundAbortRef = useRef(null);
  const rangeAbortRef = useRef(null);
  const bootstrapGenerationRef = useRef(0);
  const backgroundGenerationRef = useRef(0);
  const rangeGenerationRef = useRef(0);
  const filterProcessingGenerationRef = useRef(0);
  const pendingRangeKeyRef = useRef("");
  const ensureItemsForDateRangeRef = useRef(null);
  const activeRangeRef = useRef(activeRange);
  const rawItemsByDateRef = useRef(new Map());
  const filteredItemsByDateRef = useRef(new Map());
  const displayItemsRef = useRef([]);

  useEffect(() => {
    activeRangeRef.current = activeRange;
  }, [activeRange]);

  const salesFilters = useMemo(
    () => buildSalesDashboardFiltersFromContext(dashboardFilters),
    [dashboardFilters]
  );

  const abortBootstrap = useCallback(() => {
    if (bootstrapAbortRef.current) {
      bootstrapAbortRef.current.abort();
      bootstrapAbortRef.current = null;
    }
  }, []);

  const abortBackground = useCallback(() => {
    if (backgroundAbortRef.current) {
      backgroundAbortRef.current.abort();
      backgroundAbortRef.current = null;
    }
  }, []);

  const abortRangeFetch = useCallback(() => {
    if (rangeAbortRef.current) {
      rangeAbortRef.current.abort();
      rangeAbortRef.current = null;
    }
  }, []);

  const isDateInMemory = useCallback((date) => rawItemsByDateRef.current.has(date), []);

  const setRawItemsForDate = useCallback((date, items) => {
    rawItemsByDateRef.current.set(date, Array.isArray(items) ? items : []);
  }, []);

  const getRawItemsForDate = useCallback((date) => {
    return rawItemsByDateRef.current.get(date) ?? [];
  }, []);

  const getFilteredItemsForDate = useCallback(
    (date) => {
      if (filteredItemsByDateRef.current.has(date)) {
        return filteredItemsByDateRef.current.get(date);
      }
      const filtered = filterSalesItemsByDashboardFilters(
        getRawItemsForDate(date),
        salesFilters
      );
      filteredItemsByDateRef.current.set(date, filtered);
      return filtered;
    },
    [getRawItemsForDate, salesFilters]
  );

  const recomputeFilteredCache = useCallback(() => {
    filteredItemsByDateRef.current.clear();
    rawItemsByDateRef.current.forEach((_items, date) => {
      filteredItemsByDateRef.current.set(
        date,
        filterSalesItemsByDashboardFilters(
          rawItemsByDateRef.current.get(date) ?? [],
          salesFilters
        )
      );
    });
  }, [salesFilters]);

  const buildItemsByDateSnapshot = useCallback(() => {
    const snapshot = {};
    rawItemsByDateRef.current.forEach((items, date) => {
      snapshot[date] = items;
    });
    return snapshot;
  }, []);

  const applyDashboardProjection = useCallback(
    async ({ signal } = {}) => {
      const { bundle: nextBundle, filteredItemsByDate } =
        buildSalesDashboardBundleFromRawDays({
          selectedDate,
          itemsByDate: buildItemsByDateSnapshot(),
          salesFilters,
        });

      filteredItemsByDateRef.current = new Map(
        Object.entries(filteredItemsByDate)
      );
      setBundle(nextBundle);

      const selectedDateKey = String(selectedDate);
      const filteredSelectedItems = filteredItemsByDate[selectedDateKey] ?? [];
      setSelectedDateItems(filteredSelectedItems);

      if (!nextBundle.selected_date_has_report) {
        const stockRows = await resolveStockRowsForSalesDate(
          selectedDate,
          getStockRowsForDate,
          { signal }
        );
        if (signal?.aborted) return;
        const nextDisplayItems = mergeSalesItemsWithUnsoldStock([], stockRows);
        displayItemsRef.current = nextDisplayItems;
        setDisplayItems(nextDisplayItems);
        return;
      }

      const stockRows = await resolveStockRowsForSalesDate(
        selectedDate,
        getStockRowsForDate,
        { signal }
      );
      if (signal?.aborted) return;

      const soldItems = filteredSelectedItems.filter((item) => !item?.is_unsold);
      const nextDisplayItems = mergeSalesItemsWithUnsoldStock(soldItems, stockRows);
      displayItemsRef.current = nextDisplayItems;
      setDisplayItems(nextDisplayItems);
    },
    [
      selectedDate,
      salesFilters,
      buildItemsByDateSnapshot,
      getStockRowsForDate,
    ]
  );

  const fetchRawItemsForDate = useCallback(
    async (date, { signal, useCache = true } = {}) => {
      if (useCache && isDateInMemory(date)) {
        return getRawItemsForDate(date);
      }

      if (useCache) {
        const cachedItems = await readSalesDashboardItemsForDate(date);
        if (cachedItems !== undefined) {
          setRawItemsForDate(date, cachedItems);
          return cachedItems;
        }
      }

      const allItems = await getAllSalesDashboardItems(date, {}, {
        signal,
        pageSize: SALES_DASHBOARD_ITEMS_STREAM_PAGE_SIZE,
      });

      setRawItemsForDate(date, allItems);
      await writeSalesDashboardItemsForDate(date, allItems);
      return allItems;
    },
    [getRawItemsForDate, isDateInMemory, setRawItemsForDate]
  );

  const hydrateDatesFromIndexedDb = useCallback(
    async (dates, { onProgress } = {}) => {
      const uniqueDates = Array.from(new Set((dates || []).filter(Boolean)));
      if (!uniqueDates.length) {
        onProgress?.(null);
        return 0;
      }

      const datesToRead = uniqueDates.filter((date) => !isDateInMemory(date));
      let processedDays = uniqueDates.length - datesToRead.length;
      let hydratedCount = 0;

      onProgress?.({
        loadedDays: processedDays,
        totalDays: uniqueDates.length,
        source: "indexeddb",
      });

      if (!datesToRead.length) {
        onProgress?.(null);
        return 0;
      }

      await Promise.all(
        datesToRead.map(async (date) => {
          const items = await readSalesDashboardItemsForDate(date);
          processedDays += 1;
          if (items !== undefined) {
            setRawItemsForDate(date, items);
            hydratedCount += 1;
          }
          onProgress?.({
            loadedDays: processedDays,
            totalDays: uniqueDates.length,
            source: "indexeddb",
          });
        })
      );

      onProgress?.(null);
      return hydratedCount;
    },
    [isDateInMemory, setRawItemsForDate]
  );

  const collectFilteredSoldItemsForRange = useCallback(
    (fromDate, toDate) => {
      const dates = listDatesInRange(fromDate, toDate);
      const allItems = [];

      dates.forEach((date) => {
        getFilteredItemsForDate(date).forEach((item) => {
          if (!item?.is_unsold) {
            allItems.push(item);
          }
        });
      });

      return allItems;
    },
    [getFilteredItemsForDate]
  );

  const ensureBootstrapWindow = useCallback(
    async ({ forceRefresh = false, signal } = {}) => {
      const windowDates = getRequiredBootstrapWindowDates(selectedDate);
      if (!windowDates.length) return;

      if (forceRefresh) {
        rawItemsByDateRef.current.clear();
        filteredItemsByDateRef.current.clear();
      }

      setDisplayItemsLoading(true);
      await hydrateDatesFromIndexedDb(windowDates, {
        onProgress: setHydrateProgress,
      });

      const priorityDate = String(selectedDate);
      const priorityMissing =
        !isDateInMemory(priorityDate) ||
        (forceRefresh && !rawItemsByDateRef.current.has(priorityDate));

      if (priorityMissing) {
        await fetchRawItemsForDate(priorityDate, {
          signal,
          useCache: !forceRefresh,
        });
      }

      recomputeFilteredCache();
      await applyDashboardProjection({ signal });

      const remainingDates = windowDates.filter(
        (date) => date !== priorityDate && !isDateInMemory(date)
      );

      if (!remainingDates.length || signal?.aborted) return;

      const generation = ++backgroundGenerationRef.current;
      const bgController = new AbortController();
      backgroundAbortRef.current = bgController;

      const baseLoadedDays = windowDates.length - remainingDates.length;
      setBackgroundLoading(true);
      setBackgroundProgress({
        loadedDays: baseLoadedDays,
        totalDays: windowDates.length,
      });

      try {
        let loadedDays = baseLoadedDays;
        await fetchDatesWithConcurrency(
          remainingDates,
          async (date) => {
            await fetchRawItemsForDate(date, {
              signal: bgController.signal,
              useCache: !forceRefresh,
            });
          },
          {
            signal: bgController.signal,
            onDayComplete: async (date) => {
              if (backgroundGenerationRef.current !== generation) return;
              loadedDays += 1;
              setBackgroundProgress({
                loadedDays,
                totalDays: windowDates.length,
                currentDate: date,
              });
              recomputeFilteredCache();
              await applyDashboardProjection({ signal: bgController.signal });
            },
          }
        );
      } catch (err) {
        if (!bgController.signal.aborted && !isAbortError(err)) {
          const message = getSalesDashboardErrorMessage(
            err,
            "Failed to load sales data in the background."
          );
          if (message) toast.error(message);
        }
      } finally {
        if (backgroundGenerationRef.current === generation) {
          setBackgroundLoading(false);
          setBackgroundProgress(null);
        }
      }
    },
    [
      selectedDate,
      hydrateDatesFromIndexedDb,
      isDateInMemory,
      fetchRawItemsForDate,
      recomputeFilteredCache,
      applyDashboardProjection,
    ]
  );

  const cancelBackgroundLoad = useCallback(() => {
    abortBackground();
    setBackgroundLoading(false);
    setBackgroundProgress(null);
  }, [abortBackground]);

  useEffect(() => {
    if (!enabled || !selectedDate) {
      rawItemsByDateRef.current.clear();
      filteredItemsByDateRef.current.clear();
      displayItemsRef.current = [];
      setBundle(null);
      setSelectedDateItems([]);
      setDisplayItems([]);
      setLoading(false);
      setBackgroundLoading(false);
      setBackgroundProgress(null);
      setHydrateProgress(null);
      setRangeItems([]);
      setRangeItemsLoading(false);
      setRangeLoadProgress(null);
      setActiveRange({ fromDate: "", toDate: "" });
      return undefined;
    }

    abortBootstrap();
    abortBackground();
    const generation = ++bootstrapGenerationRef.current;
    const controller = new AbortController();
    bootstrapAbortRef.current = controller;

    setLoading(true);
    setDisplayItemsLoading(true);
    setBundle(null);
    setDisplayItems([]);
    setSelectedDateItems([]);
    setHydrateProgress(null);

    (async () => {
      try {
        await runDailySalesCachePruneIfNeeded({
          keepDays: SALES_DASHBOARD_RETENTION_DAYS,
          asOfDate: selectedDate,
        });

        if (
          bootstrapGenerationRef.current !== generation ||
          controller.signal.aborted
        ) {
          return;
        }

        await ensureBootstrapWindow({ signal: controller.signal });
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
      } finally {
        if (bootstrapGenerationRef.current === generation) {
          setLoading(false);
          setDisplayItemsLoading(false);
          setHydrateProgress(null);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [enabled, selectedDate, ensureBootstrapWindow, abortBootstrap, abortBackground]);

  useEffect(() => {
    if (!enabled || !selectedDate || rawItemsByDateRef.current.size === 0) {
      return undefined;
    }

    const controller = new AbortController();
    const generation = ++filterProcessingGenerationRef.current;
    setFiltersProcessing(true);
    setDisplayItemsLoading(true);

    (async () => {
      try {
        recomputeFilteredCache();
        await applyDashboardProjection({ signal: controller.signal });
        if (controller.signal.aborted) return;

        const { fromDate, toDate } = activeRangeRef.current ?? {};
        if (fromDate && toDate && fromDate <= toDate) {
          setRangeItems(collectFilteredSoldItemsForRange(fromDate, toDate));
        }
      } catch (err) {
        if (controller.signal.aborted || isAbortError(err)) return;
      } finally {
        if (filterProcessingGenerationRef.current === generation) {
          setFiltersProcessing(false);
          setDisplayItemsLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [
    enabled,
    selectedDate,
    salesFilters,
    recomputeFilteredCache,
    applyDashboardProjection,
    collectFilteredSoldItemsForRange,
  ]);

  const refreshData = useCallback(async () => {
    if (!enabled || !selectedDate) return;

    abortBootstrap();
    abortBackground();
    abortRangeFetch();
    pendingRangeKeyRef.current = "";

    const generation = ++bootstrapGenerationRef.current;
    const controller = new AbortController();
    bootstrapAbortRef.current = controller;

    setRefreshing(true);
    setLoading(true);
    setDisplayItemsLoading(true);
    setBundle(null);
    setDisplayItems([]);
    setSelectedDateItems([]);
    setHydrateProgress(null);
    rawItemsByDateRef.current.clear();
    filteredItemsByDateRef.current.clear();
    setRangeItems([]);
    setActiveRange({ fromDate: "", toDate: "" });
    setRangeItemsLoading(false);
    setRangeLoadProgress(null);
    clearSalesStockCache?.(getStockHoldingDateForSalesDate(selectedDate));
    clearSalesStockCache?.(selectedDate);

    try {
      await clearAllSalesDashboardCache();

      await ensureBootstrapWindow({
        forceRefresh: true,
        signal: controller.signal,
      });

      if (
        bootstrapGenerationRef.current !== generation ||
        controller.signal.aborted
      ) {
        return;
      }

      setRangeResetKey((key) => key + 1);
      const defaultRange = getDefaultSalesRangeDates(selectedDate);
      await ensureItemsForDateRangeRef.current?.(
        defaultRange.fromDate,
        defaultRange.toDate
      );

      toast.success("Sales dashboard data refreshed.");
    } catch (err) {
      if (controller.signal.aborted || isAbortError(err)) return;
      const message = getSalesDashboardErrorMessage(
        err,
        "Failed to refresh sales dashboard data."
      );
      if (message) toast.error(message);
    } finally {
      if (bootstrapGenerationRef.current === generation) {
        setRefreshing(false);
        setLoading(false);
        setDisplayItemsLoading(false);
        setHydrateProgress(null);
      }
    }
  }, [
    enabled,
    selectedDate,
    ensureBootstrapWindow,
    abortBootstrap,
    abortBackground,
    abortRangeFetch,
    clearSalesStockCache,
  ]);

  const loadItemsForModal = useCallback(
    async (date) => {
      try {
        if (!isDateInMemory(date)) {
          await fetchRawItemsForDate(date, { useCache: true });
          recomputeFilteredCache();
        }
        const items = getFilteredItemsForDate(date).filter(
          (item) => !item?.is_unsold
        );
        if (typeof getStockRowsForDate !== "function") {
          return items;
        }
        const stockRows = await resolveStockRowsForSalesDate(
          date,
          getStockRowsForDate
        );
        return mergeSalesItemsWithUnsoldStock(items, stockRows);
      } catch (err) {
        if (isAbortError(err)) throw err;
        toast.error(err?.message || "Failed to load sales items.");
        throw err;
      }
    },
    [
      fetchRawItemsForDate,
      getFilteredItemsForDate,
      getStockRowsForDate,
      isDateInMemory,
      recomputeFilteredCache,
    ]
  );

  const ensureItemsForDateRange = useCallback(
    async (fromDate, toDate, { onProgress } = {}) => {
      const rangeKey = `${fromDate}__${toDate}`;

      if (pendingRangeKeyRef.current && pendingRangeKeyRef.current !== rangeKey) {
        abortRangeFetch();
      }

      pendingRangeKeyRef.current = rangeKey;
      const generation = ++rangeGenerationRef.current;
      const controller = new AbortController();
      rangeAbortRef.current = controller;

      const dates = listDatesInRange(fromDate, toDate);
      if (!dates.length) {
        pendingRangeKeyRef.current = "";
        setActiveRange({ fromDate: "", toDate: "" });
        setRangeItems([]);
        setRangeItemsLoading(false);
        setRangeLoadProgress(null);
        return [];
      }

      setRangeItemsLoading(true);
      setActiveRange({ fromDate, toDate });
      setRangeItems([]);

      try {
        await hydrateDatesFromIndexedDb(dates, {
          onProgress: (progress) => {
            if (rangeGenerationRef.current !== generation) return;
            if (!progress) return;
            const nextProgress = { ...progress, source: "indexeddb" };
            onProgress?.(nextProgress);
            setRangeLoadProgress(nextProgress);
          },
        });

        if (
          rangeGenerationRef.current !== generation ||
          controller.signal.aborted
        ) {
          throw new DOMException("Aborted", "AbortError");
        }

        const missingDates = dates.filter((date) => !isDateInMemory(date));
        const totalDays = dates.length;
        let loadedDays = totalDays - missingDates.length;
        recomputeFilteredCache();
        let items = collectFilteredSoldItemsForRange(fromDate, toDate);

        const cacheCompleteProgress = {
          loadedDays,
          totalDays,
          source: "indexeddb",
        };
        onProgress?.(cacheCompleteProgress);
        setRangeLoadProgress(cacheCompleteProgress);
        if (rangeGenerationRef.current === generation) {
          setRangeItems(items);
        }

        if (missingDates.length) {
          setRangeLoadProgress({ loadedDays, totalDays, source: "server" });
          await fetchDatesWithConcurrency(
            missingDates,
            async (date) => {
              await fetchRawItemsForDate(date, {
                signal: controller.signal,
                useCache: false,
              });
            },
            {
              signal: controller.signal,
              onDayComplete: () => {
                if (rangeGenerationRef.current !== generation) return;
                loadedDays += 1;
                recomputeFilteredCache();
                const progress = {
                  loadedDays,
                  totalDays,
                  source: "server",
                };
                onProgress?.(progress);
                setRangeLoadProgress(progress);
                items = collectFilteredSoldItemsForRange(fromDate, toDate);
                if (rangeGenerationRef.current === generation) {
                  setRangeItems(items);
                }
              },
            }
          );
        }

        if (
          rangeGenerationRef.current !== generation ||
          controller.signal.aborted
        ) {
          throw new DOMException("Aborted", "AbortError");
        }

        recomputeFilteredCache();
        items = collectFilteredSoldItemsForRange(fromDate, toDate);
        if (rangeGenerationRef.current === generation) {
          setRangeItems(items);
        }
        return items;
      } catch (err) {
        if (controller.signal.aborted || isAbortError(err)) {
          throw err;
        }
        const message = getSalesDashboardErrorMessage(
          err,
          "Failed to load sales data for the selected range."
        );
        if (message) toast.error(message);
        throw err;
      } finally {
        if (rangeGenerationRef.current === generation) {
          pendingRangeKeyRef.current = "";
          setRangeItemsLoading(false);
          setRangeLoadProgress(null);
        }
      }
    },
    [
      abortRangeFetch,
      collectFilteredSoldItemsForRange,
      fetchRawItemsForDate,
      hydrateDatesFromIndexedDb,
      isDateInMemory,
      recomputeFilteredCache,
    ]
  );

  useEffect(() => {
    ensureItemsForDateRangeRef.current = ensureItemsForDateRange;
  }, [ensureItemsForDateRange]);

  const dailyTotals = bundle?.daily_totals ?? [];
  const filterOptions = bundle?.filter_options ?? null;

  const computedStats = useMemo(
    () => buildSalesDashboardStats(bundle, selectedDate, displayItems),
    [bundle, selectedDate, displayItems]
  );

  const todaySummary = useMemo(() => {
    const summary = computedStats.todaySummary;
    if (!summary) return null;
    return {
      ...summary,
      periodSubtitle: formatDateDisplay(selectedDate),
    };
  }, [computedStats.todaySummary, selectedDate]);

  return {
    loading,
    refreshing,
    backgroundLoading,
    backgroundProgress,
    hydrateProgress,
    cancelBackgroundLoad,
    refreshData,
    bundle,
    dailyTotals,
    window7: computedStats.window7,
    window15: computedStats.window15,
    window30: computedStats.window30,
    todaySummary,
    monthSummary: computedStats.monthSummary,
    soldUnsoldBarData: computedStats.soldUnsoldBarData,
    lineChartData: computedStats.lineChartData,
    cumulativeRows: computedStats.cumulativeRows,
    selectedDateItems,
    displayItems,
    displayItemsLoading,
    filtersProcessing,
    selectedDateHasReport: Boolean(bundle?.selected_date_has_report),
    filterOptions,
    loadItemsForModal,
    ensureItemsForDateRange,
    rangeItems,
    rangeItemsLoading,
    rangeLoadProgress,
    activeRange,
    rangeResetKey,
    rawCacheDays: SALES_DASHBOARD_RAW_CACHE_DAYS,
  };
};
