import {
  computeProfitPct,
  formatSalesCurrency,
  formatSalesQtyDisplay,
  getSalesBranchFieldKey,
} from "../../util/salesDashboard";

export const SALES_ITEMS_TABLE_KEY = "sales-dashboard-items";
export const SALES_PIVOTED_DAILY_TABLE_KEY = "sales-dashboard-pivoted-daily";
export const SALES_PIVOTED_RANGE_TABLE_KEY = "sales-dashboard-pivoted-range";

function salesQtyColumn(overrides = {}) {
  return {
    field: "sold_qty",
    headerName: "Net Sales Qty",
    type: "number",
    valueFormatter: (params) => formatSalesQtyDisplay(params.value),
    ...overrides,
  };
}

function salesAmountColumn(overrides = {}) {
  return {
    field: "sold_value",
    headerName: "Net Sales Amt",
    type: "number",
    valueFormatter: (params) => formatSalesCurrency(params.value),
    ...overrides,
  };
}

function salesProfitColumn(overrides = {}) {
  return {
    field: "sold_profit",
    headerName: "Profit",
    type: "number",
    valueFormatter: (params) => formatSalesCurrency(params.value),
    ...overrides,
  };
}

function salesProfitPctColumn(overrides = {}) {
  const {
    field = "sold_profit_pct",
    profitField = "sold_profit",
    amountField = "sold_value",
    valueGetter,
    ...rest
  } = overrides;

  return {
    field,
    headerName: "Profit %",
    type: "number",
    valueGetter:
      valueGetter ??
      ((params) =>
        params.data?.[field] ??
        computeProfitPct(
          params.data?.[profitField],
          params.data?.[amountField]
        )),
    valueFormatter: (params) =>
      params.value == null ? "—" : `${Number(params.value).toFixed(2)}%`,
    ...rest,
  };
}

export function getSalesItemsColumnDefs() {
  return [
    { field: "product_id", headerName: "Item Code", type: "id" },
    { field: "product_image", headerName: "Image", type: "image" },
    {
      field: "product_name",
      headerName: "Product",
      flex: 1,
      valueGetter: (params) => params.data?.product_name || "—",
    },
    {
      field: "branch_name",
      headerName: "Outlet",
      flex: 1,
      valueGetter: (params) => params.data?.branch_name || "—",
    },
    {
      field: "buyer_name",
      headerName: "Buyer",
      flex: 1,
      valueGetter: (params) => params.data?.buyer_name || "—",
    },
    salesQtyColumn(),
    salesAmountColumn(),
    salesProfitColumn(),
    salesProfitPctColumn(),
    {
      field: "department_name",
      headerName: "Department",
      hideByDefault: true,
      valueGetter: (params) => params.data?.department_name || "—",
    },
    {
      field: "category_name",
      headerName: "Category",
      hideByDefault: true,
      valueGetter: (params) => params.data?.category_name || "—",
    },
    {
      field: "supplier_name",
      headerName: "Supplier",
      hideByDefault: true,
      valueGetter: (params) => params.data?.supplier_name || "—",
    },
    {
      field: "distributor_name",
      headerName: "Distributor",
      hideByDefault: true,
      valueGetter: (params) => params.data?.distributor_name || "—",
    },
  ];
}

export function getSalesPivotedColumnDefs({ branches = [] } = {}) {
  const metricCol = { flex: 0, filter: false, sortable: true };
  const qtyCol = { width: 100, minWidth: 95, ...metricCol };
  const amtCol = { width: 115, minWidth: 110, ...metricCol };
  const profitCol = { width: 110, minWidth: 105, ...metricCol };
  const pctCol = { width: 90, minWidth: 85, ...metricCol };

  const productColumns = [
    {
      field: "product_id",
      headerName: "ID",
      type: "id",
      flex: 0,
      width: 90,
      minWidth: 85,
      filter: false,
    },
    {
      field: "product_image",
      headerName: "Image",
      type: "image",
      flex: 0,
      width: 72,
      minWidth: 68,
      autoHeight: false,
      filter: false,
      sortable: false,
    },
    {
      field: "product_name",
      headerName: "Product",
      flex: 0,
      width: 180,
      minWidth: 160,
      filter: false,
      valueGetter: (params) => params.data?.product_name || "—",
    },
    {
      field: "buyer_names",
      headerName: "Buyer",
      flex: 0,
      width: 140,
      minWidth: 130,
      filter: false,
      sortable: true,
      autoHeight: true,
      valueGetter: (params) => {
        const names = params.data?.buyer_names;
        if (!Array.isArray(names) || !names.length) return null;
        return names.join("\n");
      },
      comparator: (_valueA, _valueB, nodeA, nodeB) => {
        const left = Array.isArray(nodeA?.data?.buyer_names)
          ? nodeA.data.buyer_names.join(", ")
          : "";
        const right = Array.isArray(nodeB?.data?.buyer_names)
          ? nodeB.data.buyer_names.join(", ")
          : "";
        return left.localeCompare(right);
      },
      cellStyle: {
        whiteSpace: "pre-line",
        lineHeight: "1.4",
        paddingTop: "6px",
        paddingBottom: "6px",
      },
    },
  ];

  const metadataColumns = [
    {
      field: "department_name",
      headerName: "Department",
      hideByDefault: true,
      flex: 0,
      width: 140,
      minWidth: 130,
      filter: false,
      valueGetter: (params) => params.data?.department_name || "—",
    },
    {
      field: "category_name",
      headerName: "Category",
      hideByDefault: true,
      flex: 0,
      width: 140,
      minWidth: 130,
      filter: false,
      valueGetter: (params) => params.data?.category_name || "—",
    },
    {
      field: "supplier_name",
      headerName: "Supplier",
      hideByDefault: true,
      flex: 0,
      width: 140,
      minWidth: 130,
      filter: false,
      valueGetter: (params) => params.data?.supplier_name || "—",
    },
    {
      field: "distributor_name",
      headerName: "Distributor",
      hideByDefault: true,
      flex: 0,
      width: 140,
      minWidth: 130,
      filter: false,
      valueGetter: (params) => params.data?.distributor_name || "—",
    },
  ];

  const totalColumns = [
    salesQtyColumn({
      field: "total_qty",
      headerName: "Tot Qty",
      ...qtyCol,
    }),
    salesAmountColumn({
      field: "total_amt",
      headerName: "Tot Amt",
      ...amtCol,
    }),
    salesProfitColumn({
      field: "total_profit",
      headerName: "Tot Profit",
      ...profitCol,
    }),
    salesProfitPctColumn({
      field: "total_profit_pct",
      profitField: "total_profit",
      amountField: "total_amt",
      ...pctCol,
    }),
  ];

  const branchColumns = (branches || []).map((branch) => ({
    headerName: branch?.name || String(branch?.id ?? ""),
    children: [
      salesQtyColumn({
        field: getSalesBranchFieldKey(branch.id, "qty"),
        headerName: "Qty",
        ...qtyCol,
      }),
      salesAmountColumn({
        field: getSalesBranchFieldKey(branch.id, "amt"),
        headerName: "Amt",
        ...amtCol,
      }),
      salesProfitColumn({
        field: getSalesBranchFieldKey(branch.id, "profit"),
        headerName: "Profit",
        ...profitCol,
      }),
      salesProfitPctColumn({
        field: getSalesBranchFieldKey(branch.id, "profit_pct"),
        profitField: getSalesBranchFieldKey(branch.id, "profit"),
        amountField: getSalesBranchFieldKey(branch.id, "amt"),
        ...pctCol,
      }),
    ],
  }));

  return [
    ...productColumns,
    ...metadataColumns,
    ...branchColumns,
    ...totalColumns,
  ];
}

export function getSalesGroupedColumnDefs({ onViewProducts }) {
  return [
    { field: "group_name", headerName: "Name", flex: 1 },
    { field: "item_count", headerName: "Products", type: "number" },
    salesQtyColumn(),
    salesAmountColumn(),
    salesProfitColumn(),
    salesProfitPctColumn(),
    {
      field: "action",
      headerName: "Action",
      type: "action-column",
      valueGetter: (params) => [
        {
          label: "View Products",
          value: "view_products",
          onClick: () =>
            onViewProducts?.(
              params.data?.group_name,
              params.data?.items ?? []
            ),
        },
      ],
    },
  ];
}

export function getSalesCumulativeColumnDefs({ onViewDay }) {
  return [
    {
      field: "date",
      headerName: "Date",
      valueGetter: (params) => {
        const value = params.data?.date;
        if (!value) return "—";
        const dt = new Date(`${value}T12:00:00`);
        return Number.isNaN(dt.getTime())
          ? value
          : dt.toLocaleDateString("en-GB");
      },
    },
    salesQtyColumn({ field: "sold_qty", headerName: "Daily Qty" }),
    salesAmountColumn({ field: "sold_value", headerName: "Daily Value" }),
    salesProfitColumn({ field: "sold_profit", headerName: "Daily Profit" }),
    salesProfitPctColumn({ field: "sold_profit_pct", headerName: "Daily Profit %" }),
    salesQtyColumn({ field: "cumulative_qty", headerName: "Cumulative Qty" }),
    salesAmountColumn({
      field: "cumulative_value",
      headerName: "Cumulative Value",
    }),
    salesProfitColumn({
      field: "cumulative_profit",
      headerName: "Cumulative Profit",
    }),
    {
      field: "cumulative_profit_pct",
      headerName: "Cumulative Profit %",
      type: "number",
      valueGetter: (params) =>
        params.data?.cumulative_profit_pct ??
        computeProfitPct(
          params.data?.cumulative_profit,
          params.data?.cumulative_value
        ),
      valueFormatter: (params) =>
        params.value == null ? "—" : `${Number(params.value).toFixed(2)}%`,
    },
    {
      field: "action",
      headerName: "Action",
      type: "action-column",
      valueGetter: (params) => [
        {
          label: "View",
          value: "view",
          onClick: () => onViewDay?.(params.data?.date),
        },
      ],
    },
  ];
}
