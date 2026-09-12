import React from "react";
import {
  Button,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Select,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import { displayDate } from "../../../util/attendanceDashboard";

/**
 * The compact filter bar: Date | Outlet / Warehouse | Shift | Designation |
 * Employee Search, then Refresh and the last-updated label.
 *
 * ONE ROW ON THE DESKTOP, wrapping to a stack on a phone. Deliberately compact:
 * this bar is navigation, not content, and a tall filter block pushes the
 * numbers people came for below the fold.
 *
 * EVERY OPTION IS REAL MASTER DATA, handed over by the server's own
 * `/attendance/dashboard/filters`. The shift list is Shift Management's active
 * shifts - whatever is configured there is what this offers - so the selector
 * cannot name a shift that does not exist and this screen cannot introduce
 * one. There is no hardcoded Morning/General/Night list anywhere.
 *
 * THE OUTLET SELECTOR IS A FILTER, NOT A PERMISSION. The server intersects
 * whatever is chosen here with the caller's own scope, so this control can
 * narrow what is shown and never widen it. It offers only the outlets the
 * server listed, which are the ones inside that scope.
 *
 * REFRESH IS MANUAL, AND SAYS WHEN THE DATA WAS FETCHED. Nothing here polls
 * or streams: claiming live attendance from a feed that arrives in bursts
 * would be a promise the data cannot keep. The label is the response's own
 * `fetched_at` and is described as such - it is not a device sync time.
 */
export default function DashboardFilters({
  filters,
  options,
  onChange,
  onRefresh,
  loading,
  fetchedAt,
}) {
  const set = (key) => (event) => {
    const raw = event.target.value;
    onChange({ ...filters, [key]: raw === "" ? null : raw });
  };

  return (
    <Flex direction="column" gap={2}>
      <Flex gap={2} wrap="wrap" align="flex-end">
        <FormControl w={{ base: "100%", sm: "170px" }}>
          <FormLabel fontSize="xs" mb={1} color="gray.600">
            Attendance Date
          </FormLabel>
          <Input
            type="date"
            size="sm"
            aria-label="Attendance date"
            value={filters.attendance_date || ""}
            max={options.today || undefined}
            onChange={(e) => onChange({ ...filters, attendance_date: e.target.value })}
          />
        </FormControl>

        <FormControl w={{ base: "48%", sm: "180px" }}>
          <FormLabel fontSize="xs" mb={1} color="gray.600">
            Outlet / Warehouse
          </FormLabel>
          <Select
            size="sm"
            aria-label="Outlet or warehouse"
            placeholder="All locations"
            value={filters.store_id || ""}
            onChange={set("store_id")}
          >
            {(options.outlets || []).map((o) => (
              <option key={o.store_id} value={o.store_id}>
                {o.outlet_name}
              </option>
            ))}
          </Select>
        </FormControl>

        <FormControl w={{ base: "48%", sm: "150px" }}>
          <FormLabel fontSize="xs" mb={1} color="gray.600">
            Shift
          </FormLabel>
          <Select
            size="sm"
            aria-label="Shift"
            placeholder="All shifts"
            value={filters.work_shift_id || ""}
            onChange={set("work_shift_id")}
          >
            {(options.shifts || []).map((s) => (
              <option key={s.work_shift_id} value={s.work_shift_id}>
                {s.shift_code || s.shift_name}
              </option>
            ))}
          </Select>
        </FormControl>

        <FormControl w={{ base: "48%", sm: "170px" }}>
          <FormLabel fontSize="xs" mb={1} color="gray.600">
            Designation
          </FormLabel>
          <Select
            size="sm"
            aria-label="Designation"
            placeholder="All designations"
            value={filters.designation_id || ""}
            onChange={set("designation_id")}
          >
            {(options.designations || []).map((d) => (
              <option key={d.designation_id} value={d.designation_id}>
                {d.designation_name}
              </option>
            ))}
          </Select>
        </FormControl>

        <FormControl w={{ base: "48%", sm: "180px" }}>
          <FormLabel fontSize="xs" mb={1} color="gray.600">
            Employee Search
          </FormLabel>
          <Input
            size="sm"
            aria-label="Employee search"
            placeholder="Name or id"
            value={filters.search || ""}
            onChange={set("search")}
          />
        </FormControl>

        <Button
          size="sm"
          colorScheme="purple"
          variant="outline"
          onClick={onRefresh}
          isLoading={loading}
          loadingText="Refreshing"
        >
          Refresh
        </Button>
      </Flex>

      <Tooltip
        label="When this page last fetched the figures. This is NOT a device sync time - terminal freshness is shown in Recent Punches & Device Sync."
        hasArrow
        placement="bottom-start"
      >
        <Text fontSize="11px" color="gray.500" alignSelf="flex-start">
          {filters.attendance_date ? `Showing ${displayDate(filters.attendance_date)}` : "Choose a date"}
          {fetchedAt ? ` · fetched ${fetchedAt}` : ""}
        </Text>
      </Tooltip>
    </Flex>
  );
}
