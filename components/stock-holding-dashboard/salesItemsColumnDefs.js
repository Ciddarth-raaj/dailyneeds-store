export const SALES_ITEMS_TABLE_KEY = "sales-dashboard-items";

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
    {
      field: "sold_qty",
      headerName: "Net Sales Qty",
      type: "number",
    },
    {
      field: "sold_value",
      headerName: "Net Sales Amt",
      type: "number",
    },
    {
      field: "sold_profit",
      headerName: "Profit",
      type: "number",
    },
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
    { field: "sold_qty", headerName: "Net Sales Qty", type: "number" },
    { field: "sold_value", headerName: "Net Sales Amt", type: "number" },
    { field: "sold_profit", headerName: "Profit", type: "number" },
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
    {
      field: "sold_qty",
      headerName: "Daily Qty",
      type: "number",
    },
    {
      field: "sold_value",
      headerName: "Daily Value",
      type: "number",
    },
    {
      field: "sold_profit",
      headerName: "Daily Profit",
      type: "number",
    },
    {
      field: "cumulative_qty",
      headerName: "Cumulative Qty",
      type: "number",
    },
    {
      field: "cumulative_value",
      headerName: "Cumulative Value",
      type: "number",
    },
    {
      field: "cumulative_profit",
      headerName: "Cumulative Profit",
      type: "number",
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
