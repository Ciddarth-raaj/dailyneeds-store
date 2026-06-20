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
  Input,
  Spinner,
  Text,
} from "@chakra-ui/react";
import {
  filterSalesItemsBySoldStatus,
  formatDateDisplay,
  getDefaultSalesRangeDates,
  listDatesInRange,
  pivotSalesItemsToRows,
  enrichSalesItemsWithBuyerLabels,
} from "../../util/salesDashboard";
import CustomContainer from "../CustomContainer";
import SalesPivotedTable from "./SalesPivotedTable";
import { SALES_PIVOTED_RANGE_TABLE_KEY } from "./salesItemsColumnDefs";

export default function SalesRangeTabPanel({
  selectedDate,
  ensureItemsForDateRange,
  rangeItems = [],
  rangeLoading = false,
  rangeLoadProgress = null,
  activeRange = null,
  soldStatusFilter,
  emptyMessage,
  buyerOptions = [],
  isActive = false,
  rangeResetKey = 0,
  refreshing = false,
  filtersProcessing = false,
}) {
  const defaultRange = useMemo(
    () => getDefaultSalesRangeDates(selectedDate),
    [selectedDate]
  );
  const [fromDate, setFromDate] = useState(defaultRange.fromDate);
  const [toDate, setToDate] = useState(defaultRange.toDate);
  const [appliedRange, setAppliedRange] = useState(defaultRange);
  const [progress, setProgress] = useState(null);
  const [applyPending, setApplyPending] = useState(false);
  const ensureRef = useRef(ensureItemsForDateRange);
  const hasManualRangeRef = useRef(false);
  const skipNextLoadRef = useRef(false);

  useEffect(() => {
    ensureRef.current = ensureItemsForDateRange;
  }, [ensureItemsForDateRange]);

  useEffect(() => {
    if (!rangeResetKey) return;
    hasManualRangeRef.current = false;
    skipNextLoadRef.current = true;
    setFromDate(defaultRange.fromDate);
    setToDate(defaultRange.toDate);
    setAppliedRange(defaultRange);
    setApplyPending(false);
  }, [rangeResetKey, defaultRange.fromDate, defaultRange.toDate]);

  useEffect(() => {
    if (!rangeResetKey) return undefined;
    const timer = setTimeout(() => {
      skipNextLoadRef.current = false;
    }, 0);
    return () => clearTimeout(timer);
  }, [rangeResetKey]);

  useEffect(() => {
    hasManualRangeRef.current = false;
  }, [selectedDate]);

  useEffect(() => {
    if (hasManualRangeRef.current) return;
    setFromDate(defaultRange.fromDate);
    setToDate(defaultRange.toDate);
    setAppliedRange(defaultRange);
  }, [defaultRange.fromDate, defaultRange.toDate, selectedDate]);

  const isDraftValid = Boolean(fromDate && toDate && fromDate <= toDate);
  const isAppliedValid = Boolean(
    appliedRange.fromDate &&
      appliedRange.toDate &&
      appliedRange.fromDate <= appliedRange.toDate
  );
  const isRangeDataCurrent =
    activeRange?.fromDate === appliedRange.fromDate &&
    activeRange?.toDate === appliedRange.toDate;
  const hasPendingChanges =
    fromDate !== appliedRange.fromDate || toDate !== appliedRange.toDate;

  const loadAppliedRange = useCallback(() => {
    if (!isAppliedValid) return;
    const loadRange = ensureRef.current;
    if (typeof loadRange !== "function") return;
    setApplyPending(true);
    setProgress(null);
    loadRange(appliedRange.fromDate, appliedRange.toDate, {
      onProgress: setProgress,
    })
      .catch(() => {})
      .finally(() => {
        setApplyPending(false);
      });
  }, [appliedRange.fromDate, appliedRange.toDate, isAppliedValid]);

  useEffect(() => {
    if (!isActive || !isAppliedValid) {
      return undefined;
    }
    if (skipNextLoadRef.current) {
      skipNextLoadRef.current = false;
      return undefined;
    }
    loadAppliedRange();
  }, [
    isActive,
    isAppliedValid,
    appliedRange.fromDate,
    appliedRange.toDate,
    loadAppliedRange,
  ]);

  const handleFromDateChange = useCallback((event) => {
    setFromDate(event.target.value);
  }, []);

  const handleToDateChange = useCallback((event) => {
    setToDate(event.target.value);
  }, []);

  const handleApply = useCallback(() => {
    if (!isDraftValid) return;
    hasManualRangeRef.current = true;
    setApplyPending(true);
    setAppliedRange({ fromDate, toDate });
  }, [fromDate, toDate, isDraftValid]);

  const rangeItemsForDisplay = isRangeDataCurrent ? rangeItems : [];

  const filteredItems = useMemo(
    () => filterSalesItemsBySoldStatus(rangeItemsForDisplay, soldStatusFilter),
    [rangeItemsForDisplay, soldStatusFilter]
  );

  const itemsForPivot = useMemo(
    () => enrichSalesItemsWithBuyerLabels(filteredItems, buyerOptions),
    [filteredItems, buyerOptions]
  );

  const { rows, branches } = useMemo(
    () => pivotSalesItemsToRows(itemsForPivot),
    [itemsForPivot]
  );

  const title = isAppliedValid
    ? `Sales (${formatDateDisplay(appliedRange.fromDate)} – ${formatDateDisplay(
        appliedRange.toDate
      )})`
    : "Sales";

  const dayCount = isAppliedValid
    ? listDatesInRange(appliedRange.fromDate, appliedRange.toDate).length
    : 0;
  const isLoadingRange =
    refreshing ||
    filtersProcessing ||
    applyPending ||
    rangeLoading ||
    (isAppliedValid && !isRangeDataCurrent);
  const progressState = progress ?? rangeLoadProgress;
  const progressLabel = filtersProcessing
    ? "Updating sales data for the selected filters…"
    : progressState?.totalDays != null
      ? progressState.source === "indexeddb"
        ? `Loading cached sales… ${progressState.loadedDays ?? 0} / ${
            progressState.totalDays
          } days`
        : `Loading sales… ${progressState.loadedDays ?? 0} / ${
            progressState.totalDays
          } days`
      : "Loading sales data…";
  const applyDisabled =
    !isDraftValid ||
    (!hasPendingChanges && isRangeDataCurrent && !isLoadingRange);

  return (
    <CustomContainer title={title} filledHeader size="xs">
      <Flex direction="column" gap={4}>
        <Flex gap={4} align="flex-end" flexWrap="wrap">
          <Grid
            templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
            gap={4}
            flex="1"
            maxW={{ md: "480px" }}
          >
            <Box>
              <Text fontSize="sm" mb={1} color="gray.600">
                From
              </Text>
              <Input
                type="date"
                size="sm"
                value={fromDate}
                onChange={handleFromDateChange}
              />
            </Box>
            <Box>
              <Text fontSize="sm" mb={1} color="gray.600">
                To
              </Text>
              <Input
                type="date"
                size="sm"
                value={toDate}
                onChange={handleToDateChange}
              />
            </Box>
          </Grid>
          <Button
            size="sm"
            colorScheme="purple"
            onClick={handleApply}
            isDisabled={applyDisabled}
            isLoading={isLoadingRange}
            flexShrink={0}
          >
            Apply
          </Button>
        </Flex>

        {!isDraftValid ? (
          <Text fontSize="sm" color="red.500">
            From date must be on or before To date.
          </Text>
        ) : null}

        {isAppliedValid ? (
          isLoadingRange ? (
            <Center py={12} flexDirection="column" gap={3} minH="200px">
              <Spinner size="lg" color="purple.500" thickness="3px" />
              <Text fontSize="sm" color="gray.600">
                {progressLabel}
              </Text>
            </Center>
          ) : (
            <SalesPivotedTable
              rows={rows}
              branches={branches}
              loading={false}
              progress={progressState}
              tableKey={SALES_PIVOTED_RANGE_TABLE_KEY}
              emptyMessage={
                emptyMessage ??
                (dayCount > 0
                  ? "No products match the current filters for this date range."
                  : "Select a valid date range.")
              }
            />
          )
        ) : null}
      </Flex>
    </CustomContainer>
  );
}
