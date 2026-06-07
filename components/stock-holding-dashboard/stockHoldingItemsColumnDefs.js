import {
  daysDisplayComparator,
  formatDaysDisplay,
  getChainBillLevelBadge,
  getPurchaseTypeBadge,
  getStatusBadge,
  getStockAvailabilityBadge,
} from "../../util/stockHoldingDashboard";

export const STOCK_HOLDING_ITEMS_TABLE_KEY = "stock-holding-dashboard-items";

function getGroupedNameColumnDef(groupField) {
  const col = { field: "group_name", headerName: "Name", flex: 1 };
  if (groupField === "purchase_type") {
    return {
      ...col,
      type: "badge-column",
      valueGetter: (params) => getPurchaseTypeBadge(params.data?.group_name),
    };
  }
  if (groupField === "status") {
    return {
      ...col,
      type: "badge-column",
      valueGetter: (params) => getStatusBadge(params.data?.group_name),
    };
  }
  if (groupField === "chain_bill_count_level") {
    return {
      ...col,
      type: "badge-column",
      valueGetter: (params) =>
        getChainBillLevelBadge(params.data?.group_name),
    };
  }
  return col;
}

export function getGroupedTableColDefs({
  groupField,
  openItemsModal,
  extraColumns = [],
  itemCountHeader = "Items",
} = {}) {
  return [
    getGroupedNameColumnDef(groupField),
    { field: "item_count", headerName: itemCountHeader, type: "number" },
    { field: "total_stock", headerName: "Stock", type: "number" },
    { field: "total_value", headerName: "Stock Value", type: "currency" },
    ...extraColumns,
    {
      field: "action",
      headerName: "Action",
      type: "action-column",
      valueGetter: (params) => [
        {
          label: "View Items",
          value: "view_items",
          onClick: () =>
            openItemsModal(
              `${params.data?.group_name} - Items`,
              params.data?.items
            ),
        },
      ],
    },
  ];
}

export function getStockHoldingItemsColumnDefs() {
  return [
    { field: "product_id", headerName: "P. ID", type: "id" },
    { field: "product_image", headerName: "Image", type: "image" },
    {
      field: "product_name",
      headerName: "Product",
      type: "capitalized",
      flex: 1,
    },
    {
      field: "department_label",
      headerName: "Department",
      type: "capitalized",
      flex: 1,
      hideByDefault: true,
    },
    {
      field: "category_label",
      headerName: "Category",
      type: "capitalized",
      flex: 1,
      hideByDefault: true,
    },
    {
      field: "subcategory_label",
      headerName: "Subcategory",
      type: "capitalized",
      flex: 1,
      hideByDefault: true,
    },
    {
      field: "branch_label",
      headerName: "Branch",
      type: "capitalized",
      flex: 1,
      hideByDefault: true,
    },
    {
      field: "supplier_label",
      headerName: "Supplier",
      type: "capitalized",
      flex: 1,
      hideByDefault: true,
    },
    {
      field: "distributor_label",
      headerName: "Distributor",
      type: "capitalized",
      flex: 1,
      hideByDefault: true,
    },
    {
      field: "buyer_label",
      headerName: "Buyer",
      type: "capitalized",
      flex: 1,
      hideByDefault: true,
    },
    {
      field: "purchase_type",
      headerName: "P. Type",
      type: "badge-column",
      valueGetter: (params) =>
        getPurchaseTypeBadge(
          params.data?.purchase_type ?? params.data?.purchase_type_label
        ),
    },
    { field: "stock_qty", headerName: "S. Qty", type: "number" },
    { field: "stock_value", headerName: "S. Value", type: "currency" },
    {
      field: "stock_duration",
      headerName: "S. Duration",
      valueGetter: (params) => formatDaysDisplay(params.data?.stock_duration),
      comparator: daysDisplayComparator,
    },
    {
      field: "per_day_stock",
      headerName: "Per Day Stock",
      type: "number",
      valueGetter: (params) => params.data?.per_day_stock,
    },
    {
      field: "holding_days",
      headerName: "H. Days",
      valueGetter: (params) => formatDaysDisplay(params.data?.holding_days),
      comparator: daysDisplayComparator,
    },
    {
      field: "stock_availability",
      headerName: "Availability",
      type: "badge-column",
      valueGetter: (params) => getStockAvailabilityBadge(params.data),
    },
    {
      field: "status",
      headerName: "Item Status",
      type: "badge-column",
      valueGetter: (params) => getStatusBadge(params.data?.status),
    },
    {
      field: "chain_bill_count_level",
      headerName: "C. Bill Level",
      type: "badge-column",
      valueGetter: (params) =>
        getChainBillLevelBadge(params.data?.chain_bill_count_level),
    },
  ];
}
