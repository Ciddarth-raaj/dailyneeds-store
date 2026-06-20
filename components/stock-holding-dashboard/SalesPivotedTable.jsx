import React, { useMemo } from "react";
import { Center, Flex, Spinner, Text } from "@chakra-ui/react";
import AgGrid from "../AgGrid";
import { getSalesPivotedColumnDefs } from "./salesItemsColumnDefs";

const PIVOTED_GRID_OPTIONS = {
  animateRows: false,
  suppressColumnMoveAnimation: true,
  defaultColDef: {
    filter: false,
  },
};

export default function SalesPivotedTable({
  rows = [],
  branches = [],
  loading = false,
  progress = null,
  emptyMessage = "No products match the current filters.",
  tableKey,
  showLoadingOverlay = false,
}) {
  const branchKey = useMemo(
    () => branches.map((branch) => `${branch.id}:${branch.name}`).join("|"),
    [branches]
  );

  const columnDefs = useMemo(
    () => getSalesPivotedColumnDefs({ branches }),
    [branchKey, branches]
  );

  const getRowId = useMemo(
    () => (params) => String(params.data?.product_id ?? params.rowIndex),
    []
  );

  const hasRows = rows.length > 0;
  const progressLabel =
    progress?.totalDays != null
      ? `Loading sales… ${progress.loadedDays ?? 0} / ${progress.totalDays} days`
      : null;

  if (loading && !hasRows) {
    return (
      <Center py={8} flexDirection="column" gap={2}>
        <Spinner size="md" color="purple.500" />
        <Text fontSize="sm" color="gray.600">
          {progressLabel ?? "Loading products…"}
        </Text>
      </Center>
    );
  }

  if (!hasRows) {
    return (
      <Text fontSize="sm" color="gray.600">
        {emptyMessage}
      </Text>
    );
  }

  return (
    <Flex direction="column" gap={3}>
      {showLoadingOverlay && loading ? (
        <Flex align="center" gap={2}>
          <Spinner size="sm" color="purple.500" />
          <Text fontSize="sm" color="gray.600">
            {progressLabel ?? "Loading products…"}
          </Text>
        </Flex>
      ) : null}
      <AgGrid
        tableKey={tableKey}
        rowData={rows}
        columnDefs={columnDefs}
        gridOptions={PIVOTED_GRID_OPTIONS}
        getRowId={getRowId}
        pagination={true}
        paginationPageSize={20}
      />
    </Flex>
  );
}
