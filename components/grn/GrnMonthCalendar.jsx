import React, { useMemo, useCallback } from "react";
import MonthStatusCalendar from "../calendar/MonthStatusCalendar";

/** YYYY-MM-DD -> GRN count for that MRC date */
function buildStatsByMrcDate(grnList = []) {
  const map = {};
  grnList.forEach((row) => {
    const raw = row?.mmh_mrc_dt;
    if (raw == null || raw === "") return;
    const d = String(raw).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
    if (!map[d]) map[d] = 0;
    map[d] += 1;
  });
  return map;
}

function GrnMonthCalendar({
  grnList = [],
  selectedDate,
  onSelectDate,
  viewingMonth,
  onViewingMonthChange,
  loading = false,
}) {
  const statsByDay = useMemo(() => buildStatsByMrcDate(grnList), [grnList]);

  const getDayVisual = useCallback(
    (date) => {
      const key = date.format("YYYY-MM-DD");
      const count = statsByDay[key] ?? 0;
      if (count === 0) {
        return {
          bg: "gray.50",
          border: "gray.200",
          text: "gray.500",
          primary: "0",
          secondary: "No GRN",
        };
      }
      return {
        bg: "green.50",
        border: "green.200",
        text: "green.700",
        primary: String(count),
        secondary: count === 1 ? "GRN" : "GRNs",
      };
    },
    [statsByDay]
  );

  return (
    <MonthStatusCalendar
      title="GRN by date"
      selectedDate={selectedDate}
      onSelectDate={onSelectDate}
      viewingMonth={viewingMonth}
      onViewingMonthChange={onViewingMonthChange}
      loading={loading}
      getDayVisual={getDayVisual}
    />
  );
}

export default GrnMonthCalendar;
