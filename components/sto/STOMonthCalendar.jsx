import React, { useMemo, useCallback } from "react";
import { FormControl, FormLabel, HStack, Switch } from "@chakra-ui/react";
import moment from "moment";
import MonthStatusCalendar from "../calendar/MonthStatusCalendar";

/**
 * Red = no STO on that date. Yellow = some transfers missing file_items.
 * Green = all transfers that day have file_items.
 */
function STOMonthCalendar({
  selectedDate,
  onSelectDate,
  transfersList = [],
  viewingMonth,
  onViewingMonthChange,
  loading = false,
  showAll = true,
  onShowAllChange,
}) {
  /** YYYY-MM-DD -> { total, unfilled } (unfilled = file_items.length === 0) */
  const statsByDay = useMemo(() => {
    const map = {};
    transfersList.forEach((t) => {
      if (!t?.DN_date) return;
      const d = moment(t.DN_date).format("YYYY-MM-DD");
      if (!map[d]) map[d] = { total: 0, unfilled: 0 };
      map[d].total += 1;
      const fi = t.file_items || [];
      if (fi.length === 0) map[d].unfilled += 1;
    });
    return map;
  }, [transfersList]);

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
