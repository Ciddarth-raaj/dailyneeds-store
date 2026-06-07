import React, { useMemo } from "react";
import { Box, Flex, Grid, Text } from "@chakra-ui/react";
import CustomModal from "../CustomModal";
import AgGrid from "../AgGrid";
import { computeAvailabilitySummary } from "../../util/stockHoldingDashboard";
import {
  getStockHoldingItemsColumnDefs,
  STOCK_HOLDING_ITEMS_TABLE_KEY,
} from "./stockHoldingItemsColumnDefs";

const formatFullNumber = (value) => Number(value ?? 0).toLocaleString();

function TotalStat({ count }) {
  return (
    <Flex
      direction="column"
      gap={1}
      p={3}
      borderWidth="1px"
      borderColor="blue.200"
      borderRadius="8px"
      bg="blue.50"
      minW={0}
    >
      <Text fontSize="xs" fontWeight="semibold" color="blue.700">
        Total
      </Text>
      <Text fontSize="lg" fontWeight="bold" color="blue.800" lineHeight="1">
        {formatFullNumber(count)}
      </Text>
      <Text fontSize="xs" color="blue.600">
        items
      </Text>
    </Flex>
  );
}

function SummaryStat({ label, pct, count, color = "gray" }) {
  return (
    <Flex
      direction="column"
      gap={1}
      p={3}
      borderWidth="1px"
      borderColor={`${color}.200`}
      borderRadius="8px"
      bg={`${color}.50`}
      minW={0}
    >
      <Text fontSize="xs" fontWeight="semibold" color={`${color}.700`}>
        {label}
      </Text>
      <Text fontSize="lg" fontWeight="bold" color={`${color}.800`} lineHeight="1">
        {pct}%
      </Text>
      <Text fontSize="xs" color={`${color}.600`}>
        {formatFullNumber(count)} items
      </Text>
    </Flex>
  );
}

export default function ViewItemsModal({
  isOpen,
  onClose,
  title,
  rows = [],
  showAvailabilitySummary = false,
}) {
  const summary = useMemo(
    () =>
      showAvailabilitySummary ? computeAvailabilitySummary(rows) : null,
    [rows, showAvailabilitySummary]
  );

  const columnDefs = useMemo(() => getStockHoldingItemsColumnDefs(), []);

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="6xl"
      colorScheme="purple"
    >
      {summary ? (
        <Grid
          templateColumns={{
            base: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
          }}
          gap={3}
          mb={4}
        >
          <TotalStat count={summary.total} />
          <SummaryStat
            label="Available"
            pct={summary.available_pct}
            count={summary.available_count}
            color="green"
          />
          <SummaryStat
            label="Out Of Stock"
            pct={summary.out_of_stock_pct}
            count={summary.out_of_stock_count}
            color="red"
          />
        </Grid>
      ) : null}

      <Box minH="400px">
        <AgGrid
          tableKey={`${STOCK_HOLDING_ITEMS_TABLE_KEY}-modal`}
          rowData={rows}
          columnDefs={columnDefs}
          gridOptions={{ pagination: true, paginationPageSize: 15 }}
        />
      </Box>
    </CustomModal>
  );
}
