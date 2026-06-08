import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

const DEFAULT_STATUS_FILTER = [STOCK_HOLDING_STATUS_KEYS.ACTIVE];

const todayStr = () => new Date().toISOString().slice(0, 10);

const StockHoldingDashboardContext = createContext(null);

export function StockHoldingDashboardProvider({ children }) {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [loading, setLoading] = useState(true);
  const [fetchProgress, setFetchProgress] = useState(null);
  const [rawItems, setRawItems] = useState([]);
  const [lastSyncAt, setLastSyncAt] = useState(null);

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

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setFetchProgress(null);
        const response = await getLatestStockHoldingReportByDate(selectedDate, {
          signal: controller.signal,
          onProgress: ({ loaded, total }) => {
            if (!controller.signal.aborted) {
              setFetchProgress({ loaded, total });
            }
          },
        });
        if (controller.signal.aborted) return;
        const report = response?.data || {};
        setRawItems(Array.isArray(report?.items) ? report.items : []);
        setLastSyncAt(report?.created_at ?? null);
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err?.code === 404) {
          setRawItems([]);
          setLastSyncAt(null);
        } else {
          toast.error(
            err?.message || "Failed to load stock holding dashboard data."
          );
          setRawItems([]);
          setLastSyncAt(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setFetchProgress(null);
        }
      }
    })();

    return () => controller.abort();
  }, [selectedDate]);

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
      fetchProgress,
      lastSyncAt,
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
      fetchProgress,
      lastSyncAt,
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
