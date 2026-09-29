import React, { useMemo, useCallback } from "react";
import { FormControl, FormLabel, HStack, Switch } from "@chakra-ui/react";
import MonthStatusCalendar from "../calendar/MonthStatusCalendar";

/**
 * Red = no STO on that date. Yellow = some transfers missing file_items.
 * Green = all transfers that day have file_items.
 */
function STOMonthCalendar({
  selectedDate,
  onSelectDate,
  days = {},
  viewingMonth,
  onViewingMonthChange,
  loading = false,
  showAll = true,
  onShowAllChange,
}) {
  /**
   * YYYY-MM-DD -> { total, unfilled } from the month summary
   * (`days`: YYYY-MM-DD -> { total, checked, unchecked }; unfilled = no file_items).
   * Show All OFF counts only checked transfers, as the checked-only list did.
   */
  const statsByDay = useMemo(() => {
    const map = {};
    Object.entries(days || {}).forEach(([d, day]) => {
      map[d] = showAll
        ? { total: day.total ?? 0, unfilled: day.unchecked ?? 0 }
        : { total: day.checked ?? 0, unfilled: 0 };
    });
    return map;
  }, [days, showAll]);

  const getDayVisual = useCallback(
    (date) => {
      const key = date.format("YYYY-MM-DD");
      const stats = statsByDay[key];
      const n = stats?.total ?? 0;
      if (n === 0) {
        return {
          bg: "red.50",
          border: "red.200",
          text: "red.600",
          primary: "0",
          secondary: "No transfers",
        };
      }
      const unfilled = stats?.unfilled ?? 0;
      if (unfilled > 0) {
        const done = n - unfilled;
        return {
          bg: "yellow.50",
          border: "yellow.300",
          text: "yellow.800",
          primary: `${done}/${n}`,
          secondary: "Files pending",
        };
      }
      return {
        bg: "green.50",
        border: "green.200",
        text: "green.600",
        primary: `${n}/${n}`,
        secondary: "Complete",
      };
    },
    [statsByDay]
  );

  const headerRight =
    typeof onShowAllChange === "function" ? (
      <FormControl
        display="flex"
        alignItems="center"
        w="auto"
        minW="min-content"
      >
        <HStack spacing={2}>
          <FormLabel
            htmlFor="sto-cal-show-all"
            mb={0}
            fontSize="xs"
            fontWeight="semibold"
            whiteSpace="nowrap"
          >
            Show All
          </FormLabel>
          <Switch
            id="sto-cal-show-all"
            isChecked={showAll}
            onChange={(e) => onShowAllChange(e.target.checked)}
            colorScheme="purple"
            size="sm"
          />
        </HStack>
      </FormControl>
    ) : null;

  return (
    <MonthStatusCalendar
      title="STO by date"
      selectedDate={selectedDate}
      onSelectDate={onSelectDate}
      viewingMonth={viewingMonth}
      onViewingMonthChange={onViewingMonthChange}
      loading={loading}
      getDayVisual={getDayVisual}
      headerRight={headerRight}
    />
  );
}

export default STOMonthCalendar;
