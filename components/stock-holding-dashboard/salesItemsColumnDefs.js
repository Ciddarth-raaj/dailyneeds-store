import {
  computeProfitPct,
  formatSalesCurrency,
  formatSalesQtyDisplay,
} from "../../util/salesDashboard";

export const SALES_ITEMS_TABLE_KEY = "sales-dashboard-items";

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
  return {
    field: "sold_profit_pct",
    headerName: "Profit %",
    type: "number",
    valueGetter: (params) =>
      params.data?.sold_profit_pct ??
      computeProfitPct(params.data?.sold_profit, params.data?.sold_value),
    valueFormatter: (params) =>
      params.value == null ? "—" : `${Number(params.value).toFixed(2)}%`,
    ...overrides,
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
