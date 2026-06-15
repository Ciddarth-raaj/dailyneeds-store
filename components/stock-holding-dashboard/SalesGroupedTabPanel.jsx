import React, { useMemo } from "react";
import { Center, Spinner, Text } from "@chakra-ui/react";
import CustomContainer from "../CustomContainer";
import AgGrid from "../AgGrid";
import {
  formatDateDisplay,
  computeSalesGroupedRows,
} from "../../util/salesDashboard";
import { getSalesGroupedColumnDefs } from "./salesItemsColumnDefs";

const GROUP_TAB_LABELS = {
  branch: "Branch",
  department: "Department",
  category: "Category",
  subcategory: "Subcategory",
  buyer: "Buyer",
  supplier: "Supplier",
};

export default function SalesGroupedTabPanel({
  groupBy,
  selectedDate,
  items = [],
  loading = false,
  hasReport = false,
  onViewProducts,
  emptyMessage,
  hasSourceItems = true,
}) {
  const rows = useMemo(
    () => computeSalesGroupedRows(items, groupBy),
    [items, groupBy]
  );

  const columnDefs = useMemo(
    () => getSalesGroupedColumnDefs({ onViewProducts }),
    [onViewProducts]
  );

  const label = GROUP_TAB_LABELS[groupBy] || "Group";
  const title = `Sales by ${label} on ${formatDateDisplay(selectedDate)}`;

  return (
    <CustomContainer title={title} filledHeader size="xs">
      {!hasReport && !hasSourceItems ? (
        <Text fontSize="sm" color="gray.600">
          No sales data found for the selected date.
        </Text>
      ) : loading ? (
        <Center py={8}>
          <Spinner size="md" color="purple.500" />
        </Center>
      ) : !rows.length ? (
        <Text fontSize="sm" color="gray.600">
          {emptyMessage ?? "No products match the current filters for this date."}
        </Text>
      ) : (
        <AgGrid
          tableKey={`sales-dashboard-grouped-${groupBy}`}
          rowData={rows}
          columnDefs={columnDefs}
          pagination={true}
          paginationPageSize={15}
        />
      )}
    </CustomContainer>
  );
}
