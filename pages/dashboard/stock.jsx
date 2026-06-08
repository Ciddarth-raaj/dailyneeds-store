import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Box,
  Button,
  Center,
  Flex,
  Grid,
  IconButton,
  Select,
  Spinner,
  Tab,
  TabList,
  Tabs,
  Text,
} from "@chakra-ui/react";
import { DownloadIcon } from "@chakra-ui/icons";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import toast from "react-hot-toast";
import { downloadCsv } from "../../util/exportCSVFile";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import CustomModal from "../../components/CustomModal";
import AgGrid from "../../components/AgGrid";
import DashboardChartLegend from "../../components/Dashboard/CustomChartLegend";
import { useProducts } from "../../customHooks/useProducts";
import { useDeadStockItems } from "../../customHooks/useDeadStockItems";
import { useCategories } from "../../customHooks/useCategories";
import { useSubcategories } from "../../customHooks/useSubcategories";
import currencyFormatter from "../../util/currencyFormatter";
import { capitalize, formatShorthandNumber } from "../../util/string";
import {
  PIE_COLORS,
  buildDonutData,
  BUCKET_EXPORT_LABEL,
  buildBucketBranchExportRows,
  buildGroupedTableRows,
  buildSupplierGroupedTableRows,
  mapDeadStockItemToRow,
  numericValueOrNull,
  pickProductMeta,
  round2,
  sumQty,
  sumValue,
  toNum,
} from "../../util/stockDashboard";

const CHART_HEIGHT = 240;

const GROUPED_GRID_OPTIONS = {
  pagination: true,
  paginationPageSize: 10,
};

const DonutCard = React.memo(function DonutCard({
  title,
  data,
  filledHeader,
  onSliceClick,
}) {
  const legendItems = useMemo(
    () =>
      data.map((d, idx) => ({
        name: d.name,
        value: formatShorthandNumber(d.value),
        fill: PIE_COLORS[idx % PIE_COLORS.length],
      })),
    [data]
  );

  return (
    <CustomContainer title={title} filledHeader={filledHeader} size="xs">
      {data.length === 0 ? (
        <Center minH={`${CHART_HEIGHT}px`}>
          <Text color="gray.500" fontSize="sm">
            No data available
          </Text>
        </Center>
      ) : (
        <Box h={`${CHART_HEIGHT}px`} w="100%">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={48}
                outerRadius={78}
                paddingAngle={2}
                isAnimationActive={false}
              >
                {data.map((entry, idx) => (
                  <Cell
                    key={`${entry.name}-${idx}`}
                    fill={PIE_COLORS[idx % PIE_COLORS.length]}
                    onClick={() => onSliceClick?.(entry)}
                    style={onSliceClick ? { cursor: "pointer" } : undefined}
                  />
                ))}
              </Pie>
              <RechartsTooltip
                formatter={(value, name) => [
                  formatShorthandNumber(value),
                  name,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </Box>
      )}
      {legendItems.length > 0 && (
        <DashboardChartLegend
          items={legendItems}
          columns={2}
          truncateLabelOnly
        />
      )}
    </CustomContainer>
  );
});

const StockStatCard = React.memo(function StockStatCard({ title, value }) {
  return (
    <CustomContainer title={title} filledHeader size="xs">
      <Text
        fontSize="2xl"
        fontWeight="bold"
        color="purple.800"
        lineHeight="1.2"
      >
        {value}
      </Text>
    </CustomContainer>
  );
});

function StockDashboard() {
  const groupedTableRef = useRef(null);
  const { items, loading, error } = useDeadStockItems();
  const { products } = useProducts({
    limit: 10000,
    fetchAll: true,
    enabled: !loading && items.length > 0,
  });
  const { categoriesList } = useCategories();
  const { subcategoriesList } = useSubcategories();

  const [buyerFilter, setBuyerFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [subcategoryFilter, setSubcategoryFilter] = useState("");
  const [groupedTab, setGroupedTab] = useState(0);

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productModalTitle, setProductModalTitle] = useState("");
  const [productModalRows, setProductModalRows] = useState([]);
  const [showModalBranchFilter, setShowModalBranchFilter] = useState(true);
  const [modalBucketFilter, setModalBucketFilter] = useState(null);
  const [modalBranchFilter, setModalBranchFilter] = useState("");

  useEffect(() => {
    if (error) {
      toast.error(error?.message || "Failed to load stock dashboard data.");
    }
  }, [error]);

  const productById = useMemo(() => {
    const map = {};
    (products || []).forEach((p) => {
      const id = Number(p?.product_id);
      if (!Number.isNaN(id) && id > 0) map[id] = p;
    });
    return map;
  }, [products]);

  const categoryById = useMemo(() => {
    const map = {};
    (categoriesList || []).forEach((c) => {
      if (c?.id != null) map[c.id] = c.value;
    });
    return map;
  }, [categoriesList]);

  const subcategoryById = useMemo(() => {
    const map = {};
    (subcategoriesList || []).forEach((s) => {
      if (s?.id != null) map[s.id] = s.value;
    });
    return map;
  }, [subcategoriesList]);

  const enrichedRows = useMemo(() => {
    return (items || []).map((item) => {
      const row = mapDeadStockItemToRow(item);
      const mappedProduct = productById[row.product_id];
      const meta = pickProductMeta(row, mappedProduct, {
        categoryById,
        subcategoryById,
      });
      return {
        ...row,
        product_name: meta.product_name,
        product_image: meta.product_image,
        buyer: meta.buyer,
        supplier: meta.supplier,
        department: meta.department,
        category: meta.category,
        subcategory: meta.subcategory,
        total_stock: sumQty(row),
        total_value: sumValue(row),
      };
    });
  }, [items, productById, categoryById, subcategoryById]);

  const filterOptions = useMemo(() => {
    const buyers = new Set();
    const suppliers = new Set();
    const departments = new Set();
    const branches = new Set();
    const categories = new Set();
    const subcategories = new Set();
    enrichedRows.forEach((row) => {
      buyers.add(row.buyer);
      departments.add(row.department);
      branches.add(row.branch_name);
      categories.add(row.category);
      subcategories.add(row.subcategory);

      if (!buyerFilter || row.buyer === buyerFilter) {
        suppliers.add(row.supplier);
      }
    });

    return {
      buyerOptions: Array.from(buyers).sort(),
      supplierOptions: Array.from(suppliers).sort(),
      departmentOptions: Array.from(departments).sort(),
      branchOptions: Array.from(branches).sort(),
      categoryOptions: Array.from(categories).sort(),
      subcategoryOptions: Array.from(subcategories).sort(),
    };
  }, [enrichedRows, buyerFilter]);

  const {
    buyerOptions,
    supplierOptions,
    departmentOptions,
    branchOptions,
    categoryOptions,
    subcategoryOptions,
  } = filterOptions;

  const activeSupplierFilter = useMemo(() => {
    if (!supplierFilter) return "";
    return supplierOptions.includes(supplierFilter) ? supplierFilter : "";
  }, [supplierFilter, supplierOptions]);

  const filteredRows = useMemo(() => {
    return enrichedRows.filter((row) => {
      if (buyerFilter && row.buyer !== buyerFilter) return false;
      if (activeSupplierFilter && row.supplier !== activeSupplierFilter)
        return false;
      if (branchFilter && row.branch_name !== branchFilter) return false;
      if (departmentFilter && row.department !== departmentFilter) return false;
      if (categoryFilter && row.category !== categoryFilter) return false;
      if (subcategoryFilter && row.subcategory !== subcategoryFilter)
        return false;
      return true;
    });
  }, [
    enrichedRows,
    buyerFilter,
    activeSupplierFilter,
    branchFilter,
    departmentFilter,
    categoryFilter,
    subcategoryFilter,
  ]);

  const totalStockQty = useMemo(
    () =>
      round2(
        filteredRows.reduce((sum, row) => sum + toNum(row.total_stock), 0)
      ),
    [filteredRows]
  );
  const totalStockValue = useMemo(
    () =>
      round2(
        filteredRows.reduce((sum, row) => sum + toNum(row.total_value), 0)
      ),
    [filteredRows]
  );

  const deptQtyData = useMemo(
    () => buildDonutData(filteredRows, "department", "total_stock"),
    [filteredRows]
  );
  const deptValueData = useMemo(
    () => buildDonutData(filteredRows, "department", "total_value"),
    [filteredRows]
  );
  const buyerQtyData = useMemo(
    () => buildDonutData(filteredRows, "buyer", "total_stock"),
    [filteredRows]
  );
  const buyerValueData = useMemo(
    () => buildDonutData(filteredRows, "buyer", "total_value"),
    [filteredRows]
  );

  const scrollToGroupedTable = useCallback(() => {
    groupedTableRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  const applyBuyerFilterAndOpenTab = useCallback(
    (entry) => {
      setBuyerFilter(entry?.filterValue ?? "");
      setSupplierFilter("");
      setDepartmentFilter("");
      setCategoryFilter("");
      setSubcategoryFilter("");
      setGroupedTab(1);
      requestAnimationFrame(scrollToGroupedTable);
    },
    [scrollToGroupedTable]
  );

  const applyDepartmentFilterAndOpenTab = useCallback(
    (entry) => {
      setDepartmentFilter(entry?.filterValue ?? "");
      setBuyerFilter("");
      setSupplierFilter("");
      setCategoryFilter("");
      setSubcategoryFilter("");
      setGroupedTab(2);
      requestAnimationFrame(scrollToGroupedTable);
    },
    [scrollToGroupedTable]
  );

  const clearFilters = useCallback(() => {
    setBuyerFilter("");
    setSupplierFilter("");
    setBranchFilter("");
    setDepartmentFilter("");
    setCategoryFilter("");
    setSubcategoryFilter("");
  }, []);

  const openProductsModal = useCallback((title, rows, options = {}) => {
    const { showBranchFilter = true } = options;
    setProductModalTitle(title);
    setProductModalRows(rows || []);
    setShowModalBranchFilter(showBranchFilter);
    setModalBranchFilter("");
    setModalBucketFilter(null);
    setProductModalOpen(true);
  }, []);

  const closeProductsModal = () => {
    setProductModalOpen(false);
    setShowModalBranchFilter(true);
    setModalBranchFilter("");
    setModalBucketFilter(null);
  };

  const modalBranchOptions = useMemo(
    () =>
      Array.from(
        new Set((productModalRows || []).map((r) => r.branch_name || "Unknown"))
      ).sort(),
    [productModalRows]
  );

  const filteredProductModalRows = useMemo(() => {
    return (productModalRows || []).filter((row) => {
      if (
        modalBranchFilter &&
        (row.branch_name || "Unknown") !== modalBranchFilter
      )
        return false;

      if (modalBucketFilter) {
        if (modalBucketFilter === "30") {
          if (
            toNum(row["30_days_stock"]) <= 0 &&
            toNum(row["30_days_stock_value"]) <= 0
          )
            return false;
        } else if (modalBucketFilter === "90") {
          if (
            toNum(row["90_days_stock"]) <= 0 &&
            toNum(row["90_days_stock_value"]) <= 0
          )
            return false;
        } else if (modalBucketFilter === "120") {
          if (
            toNum(row["120_days_stock"]) <= 0 &&
            toNum(row["120_days_stock_value"]) <= 0
          )
            return false;
        } else if (modalBucketFilter === "gt120") {
          if (
            toNum(row.than_120_days_stock) <= 0 &&
            toNum(row.than_120_days_stock_value) <= 0
          )
            return false;
        }
      }
      return true;
    });
  }, [productModalRows, modalBranchFilter, modalBucketFilter]);

  const summaryProductModalRows = useMemo(() => {
    return (productModalRows || []).filter((row) => {
      if (
        modalBranchFilter &&
        (row.branch_name || "Unknown") !== modalBranchFilter
      )
        return false;
      return true;
    });
  }, [productModalRows, modalBranchFilter]);

  const groupedTableColDefs = useMemo(
    () => [
      { field: "group_name", headerName: "Name", flex: 1 },
      {
        field: "total_stock",
        headerName: "Total Stock",
        type: "number",
        valueGetter: numericValueOrNull("total_stock"),
      },
      {
        field: "total_value",
        headerName: "Total Value",
        type: "number",
        valueGetter: numericValueOrNull("total_value"),
      },
      {
        field: "30_days_stock_value",
        headerName: "30D Value",
        type: "number",
        valueGetter: numericValueOrNull("30_days_stock_value"),
      },
      {
        field: "90_days_stock_value",
        headerName: "90D Value",
        type: "number",
        valueGetter: numericValueOrNull("90_days_stock_value"),
      },
      {
        field: "120_days_stock_value",
        headerName: "120D Value",
        type: "number",
        valueGetter: numericValueOrNull("120_days_stock_value"),
      },
      {
        field: "than_120_days_stock_value",
        headerName: ">120D Value",
        type: "number",
        valueGetter: numericValueOrNull("than_120_days_stock_value"),
      },
      {
        field: "actions",
        headerName: "Actions",
        type: "action-icons",
        valueGetter: (params) => [
          {
            label: "View Products",
            iconType: "view",
            onClick: () =>
              openProductsModal(
                `${params.data?.group_name} - Products`,
                params.data?.products
              ),
          },
        ],
      },
    ],
    [openProductsModal]
  );

  const groupedBranchTableColDefs = useMemo(
    () => [
      { field: "group_name", headerName: "Name", flex: 1 },
      {
        field: "total_stock",
        headerName: "Total Stock",
        type: "number",
        valueGetter: numericValueOrNull("total_stock"),
      },
      {
        field: "total_value",
        headerName: "Total Value",
        type: "currency",
        valueGetter: numericValueOrNull("total_value"),
      },
      {
        field: "30_days_stock_value",
        headerName: "30D Value",
        type: "currency",
        valueGetter: numericValueOrNull("30_days_stock_value"),
      },
      {
        field: "90_days_stock_value",
        headerName: "90D Value",
        type: "currency",
        valueGetter: numericValueOrNull("90_days_stock_value"),
      },
      {
        field: "120_days_stock_value",
        headerName: "120D Value",
        type: "currency",
        valueGetter: numericValueOrNull("120_days_stock_value"),
      },
      {
        field: "than_120_days_stock_value",
        headerName: ">120D Value",
        type: "currency",
        valueGetter: numericValueOrNull("than_120_days_stock_value"),
      },
      {
        field: "actions",
        headerName: "Actions",
        type: "action-icons",
        valueGetter: (params) => [
          {
            label: "View Products",
            iconType: "view",
            onClick: () =>
              openProductsModal(
                `${params.data?.group_name} - Products`,
                params.data?.products,
                { showBranchFilter: false }
              ),
          },
        ],
      },
    ],
    [openProductsModal]
  );

  const productModalColDefs = useMemo(
    () => [
      { field: "product_id", headerName: "ID", type: "id", minWidth: 100 },
      {
        field: "product_image",
        headerName: "Image",
        type: "image",
        minWidth: 100,
      },
      {
        field: "product_name",
        headerName: "Product",
        flex: 3,
        minWidth: 320,
        type: "capitalized",
        valueGetter: (params) =>
          params.data?.product_name
            ? capitalize(String(params.data.product_name))
            : "-",
      },
      {
        field: "branch_name",
        headerName: "Branch",
        minWidth: 140,
        hideByDefault: true,
      },
      {
        field: "buyer",
        headerName: "Buyer",
        flex: 1,
        minWidth: 160,
        hideByDefault: true,
      },
      {
        field: "supplier",
        headerName: "Supplier",
        flex: 1,
        minWidth: 180,
        hideByDefault: true,
      },
      {
        field: "department",
        headerName: "Department",
        minWidth: 160,
        hideByDefault: true,
      },
      {
        field: "category",
        headerName: "Category",
        minWidth: 160,
        hideByDefault: true,
      },
      {
        field: "subcategory",
        headerName: "Subcategory",
        minWidth: 160,
        hideByDefault: true,
      },
      {
        field: "30_days_stock",
        headerName: "30D Stock",
        type: "number",
        minWidth: 110,
        valueGetter: numericValueOrNull("30_days_stock"),
      },
      {
        field: "30_days_stock_value",
        headerName: "30D Value",
        type: "currency",
        minWidth: 120,
        valueGetter: numericValueOrNull("30_days_stock_value"),
      },
      {
        field: "90_days_stock",
        headerName: "90D Stock",
        type: "number",
        minWidth: 110,
        valueGetter: numericValueOrNull("90_days_stock"),
      },
      {
        field: "90_days_stock_value",
        headerName: "90D Value",
        type: "currency",
        minWidth: 120,
        valueGetter: numericValueOrNull("90_days_stock_value"),
      },
      {
        field: "120_days_stock",
        headerName: "120D Stock",
        type: "number",
        minWidth: 110,
        valueGetter: numericValueOrNull("120_days_stock"),
      },
      {
        field: "120_days_stock_value",
        headerName: "120D Value",
        type: "currency",
        minWidth: 120,
        valueGetter: numericValueOrNull("120_days_stock_value"),
      },
      {
        field: "than_120_days_stock",
        headerName: ">120D Stock",
        type: "number",
        minWidth: 120,
        valueGetter: numericValueOrNull("than_120_days_stock"),
      },
      {
        field: "than_120_days_stock_value",
        headerName: ">120D Value",
        type: "currency",
        minWidth: 130,
        valueGetter: numericValueOrNull("than_120_days_stock_value"),
      },
      {
        field: "total_stock",
        headerName: "Total Stock",
        type: "number",
        minWidth: 120,
        valueGetter: numericValueOrNull("total_stock"),
      },
      {
        field: "total_value",
        headerName: "Total Value",
        type: "currency",
        minWidth: 130,
        valueGetter: numericValueOrNull("total_value"),
      },
    ],
    []
  );

  const activeGroupedTableRows = useMemo(() => {
    switch (groupedTab) {
      case 0:
        return buildSupplierGroupedTableRows(filteredRows);
      case 1:
        return buildGroupedTableRows(filteredRows, "buyer");
      case 2:
        return buildGroupedTableRows(filteredRows, "department");
      case 3:
        return buildGroupedTableRows(filteredRows, "branch_name");
      default:
        return [];
    }
  }, [groupedTab, filteredRows]);

  const activeGroupedColDefs =
    groupedTab === 3 ? groupedBranchTableColDefs : groupedTableColDefs;

  const activeGroupedTableKey =
    [
      "stock-dashboard-grouped-supplier",
      "stock-dashboard-grouped-buyer",
      "stock-dashboard-grouped-department",
      "stock-dashboard-grouped-branch",
    ][groupedTab] || "stock-dashboard-grouped-supplier";

  const productModalSummary = useMemo(() => {
    const totals = {
      30: { qty: 0, value: 0 },
      90: { qty: 0, value: 0 },
      120: { qty: 0, value: 0 },
      gt120: { qty: 0, value: 0 },
    };

    (summaryProductModalRows || []).forEach((row) => {
      totals["30"].qty = round2(totals["30"].qty + toNum(row["30_days_stock"]));
      totals["30"].value = round2(
        totals["30"].value + toNum(row["30_days_stock_value"])
      );
      totals["90"].qty = round2(totals["90"].qty + toNum(row["90_days_stock"]));
      totals["90"].value = round2(
        totals["90"].value + toNum(row["90_days_stock_value"])
      );
      totals["120"].qty = round2(
        totals["120"].qty + toNum(row["120_days_stock"])
      );
      totals["120"].value = round2(
        totals["120"].value + toNum(row["120_days_stock_value"])
      );
      totals.gt120.qty = round2(
        totals.gt120.qty + toNum(row.than_120_days_stock)
      );
      totals.gt120.value = round2(
        totals.gt120.value + toNum(row.than_120_days_stock_value)
      );
    });

    return totals;
  }, [summaryProductModalRows]);

  const exportBucketCsv = useCallback(
    (bucketKey, cardTitle) => {
      const { exportRows } = buildBucketBranchExportRows(
        summaryProductModalRows,
        bucketKey
      );
      if (!exportRows.length) {
        toast.error("No data to export for this bucket.");
        return;
      }

      const bucketLabel = BUCKET_EXPORT_LABEL[bucketKey] || bucketKey;
      const titleSlug = (productModalTitle || "products")
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .slice(0, 40);
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadCsv(
        exportRows,
        `stock-${bucketLabel}-${titleSlug}-${dateStr}.csv`
      );
      toast.success(`${cardTitle} exported.`);
    },
    [summaryProductModalRows, productModalTitle]
  );

  const productSummaryCards = useMemo(
    () => [
      {
        key: "30",
        title: "Total 30D",
        qty: productModalSummary["30"].qty,
        value: productModalSummary["30"].value,
        color: "blue",
      },
      {
        key: "90",
        title: "Total 90D",
        qty: productModalSummary["90"].qty,
        value: productModalSummary["90"].value,
        color: "green",
      },
      {
        key: "120",
        title: "Total 120D",
        qty: productModalSummary["120"].qty,
        value: productModalSummary["120"].value,
        color: "purple",
      },
      {
        key: "gt120",
        title: "Total >120D",
        qty: productModalSummary.gt120.qty,
        value: productModalSummary.gt120.value,
        color: "orange",
      },
    ],
    [productModalSummary]
  );

  if (loading) {
    return (
      <GlobalWrapper
        title="Stock Dashboard"
        permissionKey="view_stock_dashboard"
      >
        <Center minH="240px">
          <Spinner size="lg" color="purple.500" />
        </Center>
      </GlobalWrapper>
    );
  }

  return (
    <GlobalWrapper title="Stock Dashboard" permissionKey="view_stock_dashboard">
      <Flex flexDirection="column" gap="22px">
        <CustomContainer
          title="Filters"
          filledHeader
          size="xs"
          rightSection={
            <Button size="xs" variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          }
        >
          <Grid templateColumns={{ base: "1fr", md: "repeat(6, 1fr)" }} gap={3}>
            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>
                Branch
              </Text>
              <Select
                size="sm"
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
              >
                <option value="">All</option>
                {branchOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>
                Buyer
              </Text>
              <Select
                size="sm"
                value={buyerFilter}
                onChange={(e) => setBuyerFilter(e.target.value)}
              >
                <option value="">All</option>
                {buyerOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>
                Supplier
              </Text>
              <Select
                size="sm"
                value={activeSupplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
              >
                <option value="">All</option>
                {supplierOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>
                Department
              </Text>
              <Select
                size="sm"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <option value="">All</option>
                {departmentOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>
                Category
              </Text>
              <Select
                size="sm"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All</option>
                {categoryOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>
                Subcategory
              </Text>
              <Select
                size="sm"
                value={subcategoryFilter}
                onChange={(e) => setSubcategoryFilter(e.target.value)}
              >
                <option value="">All</option>
                {subcategoryOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            </Box>
          </Grid>
        </CustomContainer>

        <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap={4}>
          <StockStatCard
            title="Total Stock Qty"
            value={currencyFormatter(totalStockQty)}
          />
          <StockStatCard
            title="Total Stock Value"
            value={`₹ ${currencyFormatter(totalStockValue)}`}
          />
        </Grid>

        <Grid templateColumns={{ base: "1fr", lg: "repeat(4, 1fr)" }} gap={4}>
          <DonutCard
            title="Department - Qty"
            data={deptQtyData}
            filledHeader
            onSliceClick={applyDepartmentFilterAndOpenTab}
          />
          <DonutCard
            title="Department - Value"
            data={deptValueData}
            filledHeader
            onSliceClick={applyDepartmentFilterAndOpenTab}
          />
          <DonutCard
            title="Buyer - Qty"
            data={buyerQtyData}
            filledHeader
            onSliceClick={applyBuyerFilterAndOpenTab}
          />
          <DonutCard
            title="Buyer - Value"
            data={buyerValueData}
            filledHeader
            onSliceClick={applyBuyerFilterAndOpenTab}
          />
        </Grid>

        <Box ref={groupedTableRef}>
          <CustomContainer title="Grouped totals" filledHeader>
            <Tabs
              index={groupedTab}
              onChange={setGroupedTab}
              colorScheme="purple"
              variant="enclosed"
              size="sm"
            >
              <TabList>
                <Tab>Grouped by Supplier</Tab>
                <Tab>Grouped by Buyer</Tab>
                <Tab>Grouped by Department</Tab>
                <Tab>Grouped by Branch</Tab>
              </TabList>
            </Tabs>
            <Box pt={4}>
              <AgGrid
                key={activeGroupedTableKey}
                tableKey={activeGroupedTableKey}
                rowData={activeGroupedTableRows}
                columnDefs={activeGroupedColDefs}
                gridOptions={GROUPED_GRID_OPTIONS}
              />
            </Box>
          </CustomContainer>
        </Box>
      </Flex>

      <CustomModal
        isOpen={productModalOpen}
        onClose={closeProductsModal}
        title={productModalTitle || "Products"}
        size="full"
        scrollBehavior="inside"
        contentProps={{ maxW: "95vw", w: "95vw" }}
      >
        <Flex gap={4} align="center" mb={3}>
          {showModalBranchFilter && (
            <Box minW="200px">
              <Text fontSize="sm" color="gray.600" mb={1}>
                Branch
              </Text>
              <Select
                size="sm"
                value={modalBranchFilter}
                onChange={(e) => setModalBranchFilter(e.target.value)}
              >
                <option value="">All</option>
                {modalBranchOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            </Box>
          )}
        </Flex>

        <Grid
          templateColumns={{
            base: "1fr",
            md: "repeat(2, 1fr)",
            xl: "repeat(4, 1fr)",
          }}
          gap={4}
          mb={5}
        >
          {productSummaryCards.map((card) => (
            <Box
              key={card.key}
              position="relative"
              p={4}
              borderWidth="1px"
              borderRadius="12px"
              borderColor={
                modalBucketFilter === card.key
                  ? `${card.color}.500`
                  : `${card.color}.200`
              }
              borderTopWidth="4px"
              bg={`${card.color}.50`}
              minH="120px"
              cursor="pointer"
              onClick={() =>
                setModalBucketFilter((prev) =>
                  prev === card.key ? null : card.key
                )
              }
              boxShadow={modalBucketFilter === card.key ? "md" : "none"}
            >
              <Box position="absolute" top={2} right={2} zIndex={1}>
                <IconButton
                  icon={<DownloadIcon />}
                  size="xs"
                  variant="ghost"
                  colorScheme={card.color}
                  aria-label={`Export ${card.title} CSV`}
                  onClick={(e) => {
                    e.stopPropagation();
                    exportBucketCsv(card.key, card.title);
                  }}
                />
              </Box>
              <Text
                fontSize="sm"
                color={`${card.color}.700`}
                fontWeight="bold"
                mb={3}
              >
                {card.title}
              </Text>
              <Flex align="center" justify="space-between" mb={1}>
                <Text fontSize="xs" color="gray.600" fontWeight="medium">
                  Qty
                </Text>
                <Text fontSize="md" color="gray.900" fontWeight="semibold">
                  {currencyFormatter(card.qty)}
                </Text>
              </Flex>
              <Flex align="center" justify="space-between">
                <Text fontSize="xs" color="gray.600" fontWeight="medium">
                  Value
                </Text>
                <Text fontSize="md" color="gray.900" fontWeight="semibold">
                  ₹ {currencyFormatter(card.value)}
                </Text>
              </Flex>
            </Box>
          ))}
        </Grid>

        <AgGrid
          tableKey="stock-dashboard-group-products"
          rowData={filteredProductModalRows}
          columnDefs={productModalColDefs}
          gridOptions={{
            pagination: true,
            paginationPageSize: 10,
            getRowId: (params) =>
              `${params.data?.product_id}-${params.data?.outlet_id}`,
          }}
        />
      </CustomModal>
    </GlobalWrapper>
  );
}

export default StockDashboard;
