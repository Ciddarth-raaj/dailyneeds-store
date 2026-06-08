import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";
import { getLatestStockHoldingReportByDate } from "../helper/stockHoldingReport";
import {
  computeStockHoldingDashboardState,
  enrichStockHoldingItems,
  filterOptionsKey,
  filterStockHoldingRows,
  pruneMultiFilter,
  STOCK_HOLDING_STATUS_KEYS,
  toggleMultiFilterValue,
} from "../util/stockHoldingDashboard";
import {
  readCachedReport,
  shouldRefreshFromApi,
  writeCachedReport,
} from "../util/stockHoldingDashboardCache";

const DEFAULT_STATUS_FILTER = [STOCK_HOLDING_STATUS_KEYS.ACTIVE];

const todayStr = () => new Date().toISOString().slice(0, 10);

const StockHoldingDashboardContext = createContext(null);

export function StockHoldingDashboardProvider({ children }) {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchProgress, setFetchProgress] = useState(null);
  const [rawItems, setRawItems] = useState([]);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const fetchAbortRef = useRef(null);
  const fetchGenerationRef = useRef(0);

  const [branchFilter, setBranchFilter] = useState([]);
  const [buyerFilter, setBuyerFilter] = useState([]);
  const [supplierFilter, setSupplierFilter] = useState([]);
  const [distributorFilter, setDistributorFilter] = useState([]);
  const [departmentFilter, setDepartmentFilter] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState([]);
  const [subcategoryFilter, setSubcategoryFilter] = useState([]);
  const [purchaseTypeFilter, setPurchaseTypeFilter] = useState([]);
  const [chainLevelFilter, setChainLevelFilter] = useState([]);
  const [statusFilter, setStatusFilter] = useState(DEFAULT_STATUS_FILTER);
  const [stockAvailabilityFilter, setStockAvailabilityFilter] = useState([]);
  const [gridResetKey, setGridResetKey] = useState(0);

  const [itemsModalOpen, setItemsModalOpen] = useState(false);
  const [itemsModalTitle, setItemsModalTitle] = useState("");
  const [itemsModalRows, setItemsModalRows] = useState([]);
  const [enrichedRows, setEnrichedRows] = useState([]);
  const [enriching, setEnriching] = useState(false);

  const applyFilterUpdate = useCallback((updater) => {
    updater();
  }, []);

  const applyReportData = useCallback((report) => {
    setRawItems(Array.isArray(report?.items) ? report.items : []);
    setLastSyncAt(report?.created_at ?? null);
  }, []);

  const loadReport = useCallback(
    async (date, { forceRefresh = false, signal, cachedReport } = {}) => {
      if (!forceRefresh) {
        const cached =
          cachedReport === undefined ? await readCachedReport(date) : cachedReport;
        if (signal?.aborted) return null;
        if (cached && !shouldRefreshFromApi(cached)) {
          applyReportData(cached);
          return { fromCache: true };
        }
      }

      if (signal?.aborted) return null;

      const response = await getLatestStockHoldingReportByDate(date, {
        signal,
        onProgress: ({ loaded, total }) => {
          if (!signal?.aborted) {
            setFetchProgress({ loaded, total });
          }
        },
      });

      if (signal?.aborted) return null;

      if (response?.code === 404) {
        const emptyReport = { items: [], created_at: null };
        await writeCachedReport(date, emptyReport);
        if (signal?.aborted) return null;
        applyReportData(emptyReport);
        return response;
      }

      const report = response?.data || {};
      await writeCachedReport(date, report);
      if (signal?.aborted) return null;
      applyReportData(report);
      return response;
    },
    [applyReportData]
  );

  const resetFetchState = useCallback(() => {
    setLoading(false);
    setRefreshing(false);
    setFetchProgress(null);
  }, []);

  const isAbortError = useCallback((err) => {
    return (
      err?.name === "AbortError" ||
      err?.name === "CanceledError" ||
      err?.code === "ERR_CANCELED"
    );
  }, []);

  const cancelFetch = useCallback(() => {
    fetchGenerationRef.current += 1;
    fetchAbortRef.current?.abort();
    resetFetchState();
  }, [resetFetchState]);

  const abortActiveFetch = useCallback(() => {
    fetchGenerationRef.current += 1;
    fetchAbortRef.current?.abort();
  }, []);

  useEffect(() => {
    return () => {
      abortActiveFetch();
    };
  }, [abortActiveFetch]);

  useEffect(() => {
    abortActiveFetch();
    const generation = fetchGenerationRef.current;
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    (async () => {
      const cached = await readCachedReport(selectedDate);
      if (fetchGenerationRef.current !== generation) return;

      const hasFreshCache = cached && !shouldRefreshFromApi(cached);

      try {
        if (!hasFreshCache) {
          setLoading(true);
          setFetchProgress(null);
        }
        await loadReport(selectedDate, {
          signal: controller.signal,
          cachedReport: cached,
        });
      } catch (err) {
        if (controller.signal.aborted || isAbortError(err)) return;
        toast.error(
          err?.message || "Failed to load stock holding dashboard data."
        );
        applyReportData({ items: [], created_at: null });
      } finally {
        if (fetchGenerationRef.current === generation) {
          resetFetchState();
        }
      }
    })();

    return () => abortActiveFetch();
  }, [
    selectedDate,
    loadReport,
    applyReportData,
    isAbortError,
    resetFetchState,
    abortActiveFetch,
  ]);

  const refreshData = useCallback(async () => {
    abortActiveFetch();
    const generation = fetchGenerationRef.current;
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    try {
      setRefreshing(true);
      setFetchProgress(null);
      await loadReport(selectedDate, {
        forceRefresh: true,
        signal: controller.signal,
      });
      if (
        fetchGenerationRef.current === generation &&
        !controller.signal.aborted
      ) {
        toast.success("Dashboard data refreshed.");
      }
    } catch (err) {
      if (controller.signal.aborted || isAbortError(err)) return;
      toast.error(
        err?.message || "Failed to refresh stock holding dashboard data."
      );
    } finally {
      if (fetchGenerationRef.current === generation) {
        setRefreshing(false);
        setFetchProgress(null);
      }
    }
  }, [selectedDate, loadReport, isAbortError, abortActiveFetch]);

  useEffect(() => {
    if (!rawItems.length) {
      setEnrichedRows([]);
      setEnriching(false);
      return;
    }

    setEnriching(true);
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      const enriched = enrichStockHoldingItems(rawItems);
      if (cancelled) return;
      setEnrichedRows(enriched);
      setEnriching(false);
    });

    return () => {
      cancelled = true;
    };
  }, [rawItems]);

  const dashboardFilters = useMemo(
    () => ({
      branchFilter,
      buyerFilter,
      supplierFilter,
      distributorFilter,
      departmentFilter,
      categoryFilter,
      subcategoryFilter,
      purchaseTypeFilter,
      chainLevelFilter,
      statusFilter,
      stockAvailabilityFilter,
    }),
    [
      branchFilter,
      buyerFilter,
      supplierFilter,
      distributorFilter,
      departmentFilter,
      categoryFilter,
      subcategoryFilter,
      purchaseTypeFilter,
      chainLevelFilter,
      statusFilter,
      stockAvailabilityFilter,
    ]
  );

  const dashboard = useMemo(
    () => computeStockHoldingDashboardState(enrichedRows, dashboardFilters),
    [enrichedRows, dashboardFilters]
  );

  const {
    branchOptions,
    buyerOptions,
    supplierOptions,
    distributorOptions,
    departmentOptions,
    categoryOptions,
    subcategoryOptions,
    purchaseTypeOptions,
    chainLevelOptions,
    statusOptions,
    stockAvailabilityOptions,
  } = dashboard;

  const cascadeOptionsKey = useMemo(
    () =>
      filterOptionsKey(
        branchOptions,
        buyerOptions,
        supplierOptions,
        distributorOptions,
        departmentOptions,
        categoryOptions,
        subcategoryOptions,
        purchaseTypeOptions,
        chainLevelOptions,
        statusOptions,
        stockAvailabilityOptions
      ),
    [
      branchOptions,
      buyerOptions,
      supplierOptions,
      distributorOptions,
      departmentOptions,
      categoryOptions,
      subcategoryOptions,
      purchaseTypeOptions,
      chainLevelOptions,
      statusOptions,
      stockAvailabilityOptions,
    ]
  );

  useEffect(() => {
    setBranchFilter((prev) => pruneMultiFilter(prev, branchOptions));
    setBuyerFilter((prev) => pruneMultiFilter(prev, buyerOptions));
    setSupplierFilter((prev) => pruneMultiFilter(prev, supplierOptions));
    setDistributorFilter((prev) => pruneMultiFilter(prev, distributorOptions));
    setDepartmentFilter((prev) => pruneMultiFilter(prev, departmentOptions));
    setCategoryFilter((prev) => pruneMultiFilter(prev, categoryOptions));
    setSubcategoryFilter((prev) => pruneMultiFilter(prev, subcategoryOptions));
    setPurchaseTypeFilter((prev) =>
      pruneMultiFilter(prev, purchaseTypeOptions)
    );
    setChainLevelFilter((prev) => pruneMultiFilter(prev, chainLevelOptions));
    setStatusFilter((prev) => pruneMultiFilter(prev, statusOptions));
    setStockAvailabilityFilter((prev) =>
      pruneMultiFilter(prev, stockAvailabilityOptions)
    );
  }, [cascadeOptionsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredModalRows = useMemo(() => {
    if (!itemsModalOpen || !itemsModalRows.length) return [];
    return filterStockHoldingRows(itemsModalRows, dashboardFilters);
  }, [itemsModalOpen, itemsModalRows, dashboardFilters]);

  const toggleChartFilter = useCallback(
    (setter, filterValue) => {
      if (filterValue == null || filterValue === "") return;
      applyFilterUpdate(() => {
        setter((prev) => toggleMultiFilterValue(prev, filterValue));
      });
    },
    [applyFilterUpdate]
  );

  const clearFilters = useCallback(() => {
    applyFilterUpdate(() => {
      setBranchFilter([]);
      setBuyerFilter([]);
      setSupplierFilter([]);
      setDistributorFilter([]);
      setDepartmentFilter([]);
      setCategoryFilter([]);
      setSubcategoryFilter([]);
      setPurchaseTypeFilter([]);
      setChainLevelFilter([]);
      setStatusFilter([]);
      setStockAvailabilityFilter([]);
      setGridResetKey((prev) => prev + 1);
    });
  }, [applyFilterUpdate]);

  const openItemsModal = useCallback((title, rows) => {
    setItemsModalTitle(title);
    setItemsModalRows(rows || []);
    setItemsModalOpen(true);
  }, []);

  const value = useMemo(
    () => ({
      selectedDate,
      setSelectedDate,
      loading,
      refreshing,
      fetchProgress,
      lastSyncAt,
      refreshData,
      cancelFetch,
      rawItems,
      enrichedRows,
      enriching,
      dashboard,
      dashboardFilters,
      applyFilterUpdate,
      branchFilter,
      setBranchFilter,
      buyerFilter,
      setBuyerFilter,
      supplierFilter,
      setSupplierFilter,
      distributorFilter,
      setDistributorFilter,
      departmentFilter,
      setDepartmentFilter,
      categoryFilter,
      setCategoryFilter,
      subcategoryFilter,
      setSubcategoryFilter,
      purchaseTypeFilter,
      setPurchaseTypeFilter,
      chainLevelFilter,
      setChainLevelFilter,
      statusFilter,
      setStatusFilter,
      stockAvailabilityFilter,
      setStockAvailabilityFilter,
      gridResetKey,
      clearFilters,
      toggleChartFilter,
      itemsModalOpen,
      setItemsModalOpen,
      itemsModalTitle,
      filteredModalRows,
      openItemsModal,
    }),
    [
      selectedDate,
      loading,
      refreshing,
      fetchProgress,
      lastSyncAt,
      refreshData,
      cancelFetch,
      rawItems,
      enrichedRows,
      enriching,
      dashboard,
      dashboardFilters,
      applyFilterUpdate,
      branchFilter,
      buyerFilter,
      supplierFilter,
      distributorFilter,
      departmentFilter,
      categoryFilter,
      subcategoryFilter,
      purchaseTypeFilter,
      chainLevelFilter,
      statusFilter,
      stockAvailabilityFilter,
      gridResetKey,
      clearFilters,
      toggleChartFilter,
      itemsModalOpen,
      itemsModalTitle,
      filteredModalRows,
      openItemsModal,
    ]
  );

  return (
    <StockHoldingDashboardContext.Provider value={value}>
      {children}
    </StockHoldingDashboardContext.Provider>
  );
}

export function useStockHoldingDashboard() {
  const ctx = useContext(StockHoldingDashboardContext);
  if (!ctx) {
    throw new Error(
      "useStockHoldingDashboard must be used within StockHoldingDashboardProvider"
    );
  }
  return ctx;
}
