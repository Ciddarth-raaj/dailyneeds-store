import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertIcon,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  Spinner,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import AgGrid from "../../../components/AgGrid";
import { DateRangeFilter } from "../../../components/DateRangeFilter";
import usePermissions from "../../../customHooks/usePermissions";
import useOutlets from "../../../customHooks/useOutlets";
import useDepartments from "../../../customHooks/useDepartments";
import useWorkShiftOptions from "../../../customHooks/useWorkShiftOptions";
import AttendanceMissingHelper from "../../../helper/attendanceMissing";
import {
  MISSING_ATTENDANCE_COLUMNS,
  buildQuery,
  flattenRow,
  windowNote,
} from "../../../util/attendanceMissing";

/**
 * MISSING ATTENDANCE REPORT.
 *
 * One row per employee per attendance date on which they recorded a
 * POSITIVE, ODD number of punches - one punch of a pair never arrived.
 *
 * WHAT IS NOT DECIDED HERE, AND MUST NEVER BE. The rule - eligible employee,
 * completed past attendance date, punch count greater than zero and odd - is
 * the SERVER'S, in `utils/attendance_missing.js`, and the SAME rule drives
 * the 06:00 Telegram alert. This screen sends filters and renders rows. It
 * does not re-test a punch count, does not decide who is employed on a date
 * and does not decide which branches may be seen; a browser that did any of
 * those would be a second definition, and the first thing it would do is
 * disagree with the message an employee was sent that morning.
 *
 * ZERO PUNCHES IS NOT ON THIS REPORT. That is absence, a different thing with
 * a different remedy, and it belongs to the Attendance Dashboard.
 *
 * TODAY IS NEVER ON THIS REPORT. Somebody who has clocked in and not yet out
 * has one punch, which is an odd count, and the day is correct by the
 * evening. The server clamps the window to completed dates and says so in
 * `meta`; the note under the filters repeats it, so an empty tail is never
 * read as "nobody missed a punch".
 *
 * PERMISSIONS. The page is behind `view_missing_attendance_report` and the
 * Export button behind `export_missing_attendance_report` - and BOTH are
 * re-checked by the server on every request. Hiding a button is presentation;
 * the route is what refuses. The caller's BRANCH scope is likewise the
 * server's decision: the Outlet filter below can only narrow what they were
 * already authorized to see.
 */
export default function MissingAttendanceReportPage() {
  const toast = useToast();
  const canView = usePermissions(["view_missing_attendance_report"]);
  const canExport = usePermissions(["export_missing_attendance_report"]);

  // `directory: true` is the two-column dropdown list, behind no permission -
  // a manager who may open this report should not also need `view_stores` to
  // be offered an outlet filter. It is a PICKER, not an authorization: the
  // server decides which branches this caller may actually read.
  const { outlets } = useOutlets({ directory: true });
  const { departments } = useDepartments();
  const { options: shifts } = useWorkShiftOptions(canView);

  const today = useMemo(() => new Date(), []);
  const defaults = useMemo(() => {
    // Opens on the last completed week, ending YESTERDAY - the latest date
    // this report can ever show. Never today: see the header.
    const end = new Date(today.getTime() - 24 * 3600 * 1000);
    const start = new Date(end.getTime() - 6 * 24 * 3600 * 1000);
    const iso = (d) => d.toISOString().slice(0, 10);
    return { from_date: iso(start), to_date: iso(end) };
  }, [today]);

  const [filters, setFilters] = useState({
    ...defaults,
    store_id: "",
    department_id: "",
    employee_id: "",
    work_shift_id: "",
    search: "",
  });
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const load = useCallback(async (next) => {
    setLoading(true);
    setError(null);
    try {
      const res = await AttendanceMissingHelper.getReport(buildQuery(next));
      if (res && res.code === 403) {
        setAccessDenied(true);
        setRows([]);
        setMeta(null);
        return;
      }
      if (!res || res.code !== 200) {
        throw new Error((res && res.msg) || "The report could not be loaded");
      }
      setAccessDenied(false);
      setRows(res.data || []);
      setMeta(res.meta || null);
    } catch (err) {
      setError(err.message || "The report could not be loaded");
      setRows([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canView) return;
    load(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  const apply = () => load(filters);

  const flat = useMemo(() => rows.map(flattenRow), [rows]);

  const colDefs = useMemo(
    () =>
      MISSING_ATTENDANCE_COLUMNS.map((c) => {
        if (c.key === "attendance_date") {
          return {
            field: "attendance_date_display",
            headerName: c.header,
            minWidth: c.minWidth,
            // Sorts on the ISO date, so the display format cannot reorder days.
            comparator: (a, b, nodeA, nodeB) =>
              String(nodeA.data.attendance_date).localeCompare(String(nodeB.data.attendance_date)),
          };
        }
        if (c.key === "punch_times") {
          return { field: "punch_times_text", headerName: c.header, minWidth: c.minWidth };
        }
        return { field: c.key, headerName: c.header, minWidth: c.minWidth };
      }),
    []
  );

  /**
   * THE EXPORT IS THE SAME QUERY. It sends the filters on screen, and the
   * server applies the same permission and the same branch scope to it, so
   * the spreadsheet can never contain a row the table does not.
   */
  const exportXlsx = async () => {
    setExporting(true);
    try {
      await AttendanceMissingHelper.exportXlsx(buildQuery(filters));
    } catch (err) {
      toast({ title: err.message || "Export failed", status: "error", duration: 5000 });
    } finally {
      setExporting(false);
    }
  };

  if (!canView) {
    return (
      <GlobalWrapper title="Missing Attendance Report">
        <CustomContainer title="Missing Attendance Report" filledHeader>
          <Alert status="warning" fontSize="sm">
            <AlertIcon />
            You do not have permission to view the Missing Attendance Report.
          </Alert>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  return (
    <GlobalWrapper title="Missing Attendance Report">
      <DateRangeFilter
        title="Missing Attendance Report"
        dateFrom={filters.from_date}
        dateTo={filters.to_date}
        onDateFromChange={(v) => setFilters((f) => ({ ...f, from_date: v }))}
        onDateToChange={(v) => setFilters((f) => ({ ...f, to_date: v }))}
      />
      <CustomContainer
        title="Days with a missing punch"
        subtitle="One row per employee per attendance date with an odd number of punches - one punch of a pair never arrived. A day with no punches at all is an absence and is not shown here, and the current attendance date is never shown because the day is still being punched."
        filledHeader
        rightSection={
          canExport ? (
            <Button
              size="sm"
              variant="outline"
              colorScheme="purple"
              isLoading={exporting}
              onClick={exportXlsx}
            >
              Export Excel
            </Button>
          ) : null
        }
      >
        {accessDenied ? (
          <Alert status="warning" fontSize="sm">
            <AlertIcon />
            You do not have permission to view the Missing Attendance Report.
          </Alert>
        ) : (
          <>
            <Stack
              direction={{ base: "column", md: "row" }}
              spacing={3}
              mb={4}
              align="flex-end"
              flexWrap="wrap"
            >
              <FormControl maxW="200px">
                <FormLabel fontSize="sm">Outlet</FormLabel>
                <Select
                  size="sm"
                  value={filters.store_id}
                  onChange={(e) => setFilters((f) => ({ ...f, store_id: e.target.value }))}
                >
                  <option value="">All</option>
                  {outlets.map((o) => (
                    <option key={o.outlet_id} value={o.outlet_id}>
                      {o.outlet_name}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl maxW="200px">
                <FormLabel fontSize="sm">Department</FormLabel>
                <Select
                  size="sm"
                  value={filters.department_id}
                  onChange={(e) => setFilters((f) => ({ ...f, department_id: e.target.value }))}
                >
                  <option value="">All</option>
                  {departments.map((d) => (
                    <option key={d.department_id} value={d.department_id}>
                      {d.department_name}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl maxW="200px">
                <FormLabel fontSize="sm">Shift</FormLabel>
                <Select
                  size="sm"
                  value={filters.work_shift_id}
                  onChange={(e) => setFilters((f) => ({ ...f, work_shift_id: e.target.value }))}
                >
                  <option value="">All</option>
                  {shifts.map((s) => (
                    <option key={s.work_shift_id} value={s.work_shift_id}>
                      {s.shift_name || s.shift_code}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl maxW="180px">
                <FormLabel fontSize="sm">Employee ID</FormLabel>
                <Input
                  size="sm"
                  placeholder="Employee ID"
                  value={filters.employee_id}
                  onChange={(e) => setFilters((f) => ({ ...f, employee_id: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") apply();
                  }}
                />
              </FormControl>
              <FormControl maxW="220px">
                <FormLabel fontSize="sm">Search</FormLabel>
                <Input
                  size="sm"
                  placeholder="Employee code or name"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") apply();
                  }}
                />
              </FormControl>
              <Button size="sm" colorScheme="purple" onClick={apply} isLoading={loading}>
                Apply
              </Button>
            </Stack>

            {meta ? (
              <Alert status="info" fontSize="sm" mb={3}>
                <AlertIcon />
                {windowNote(meta)}
              </Alert>
            ) : null}

            {error ? (
              <Alert status="error" fontSize="sm" mb={3}>
                <AlertIcon />
                {error}
              </Alert>
            ) : null}

            {loading ? (
              <Stack align="center" py={10}>
                <Spinner color="purple.500" />
              </Stack>
            ) : (
              <>
                <Text fontSize="xs" color="gray.500" mb={2}>
                  {meta
                    ? `${meta.row_count} row(s) across ${meta.employee_count} employee(s)`
                    : ""}
                </Text>
                <AgGrid
                  rowData={flat}
                  colDefs={colDefs}
                  tableKey="attendance-missing-report"
                  hideExport
                />
              </>
            )}
          </>
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}
