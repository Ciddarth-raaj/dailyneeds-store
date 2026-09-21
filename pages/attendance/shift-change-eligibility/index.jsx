import React, { useCallback, useEffect, useMemo, useState } from "react";
import NextLink from "next/link";
import {
  Alert,
  AlertIcon,
  Button,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Link,
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
import useDesignations from "../../../customHooks/useDesignations";
import AttendanceShiftChangeEligibilityHelper from "../../../helper/attendanceShiftChangeEligibility";
import {
  SHIFT_CHANGE_ELIGIBILITY_COLUMNS,
  REQUEST_STATUS_OPTIONS,
  YES_NO_OPTIONS,
  actionLinks,
  actionableView,
  buildQuery,
  clearedView,
  defaultRange,
  flattenRow,
  viewNote,
} from "../../../util/attendanceShiftChangeEligibility";

/**
 * SHIFT CHANGE ELIGIBILITY REPORT.
 *
 * One row per employee per attendance date, answering three questions that
 * are kept apart because they are not the same question:
 *
 *   Can Raise Shift Change?             would the backend ACCEPT a shift
 *                                       change request for this date?
 *   Worked Longer Than Assigned Shift?  did the punches run past the
 *                                       permanent shift's normal hours?
 *   Request Status                      Not Raised | Pending | Approved |
 *                                       Rejected, from the approval workflow.
 *
 * WHAT IS NOT DECIDED HERE, AND MUST NEVER BE. Eligibility is the SERVER'S,
 * in `utils/shift_change_eligibility.js`, and it is the SAME function that
 * accepts or refuses the employee's own request on the Telegram Mini App.
 * This screen sends filters and renders rows. It does not compare two shifts'
 * hours, does not test a date against the backdating window, does not decide
 * who is employed on a date and does not decide which branches may be seen; a
 * browser that did any of those would be a second definition, and the first
 * thing it would do is tell HR to chase somebody the backend then refuses.
 *
 * A LONG DAY IS NOT A PERMISSION. "Worked Longer" comes from the attendance
 * engine's own minutes and is shown beside eligibility, never folded into it:
 * somebody can have worked twelve hours and still be unable to raise a
 * request, because a shift change only ever moves an employee to a LONGER
 * shift that exists on the master - it can never be used to reduce their
 * scheduled hours.
 *
 * THE SCREEN OPENS ON HR'S QUESTION and hides nothing permanently. The
 * default filters are Can Raise = Yes, Worked Longer = Yes and Request Status
 * = Not Raised, which is the actionable list. "Show all records" clears them
 * in one click, and every dropdown is free to be set to anything.
 *
 * IT IS READ-ONLY. There is no control on this page that writes: it cannot
 * raise a request, approve or reject one, edit a shift or recalculate a date.
 * The Action column links to the ordinary attendance and approval screens,
 * each behind its own permission and re-checked there - a link is not an
 * authorization.
 *
 * PERMISSIONS. The page is behind `view_shift_change_eligibility_report` and
 * the Export button behind `export_shift_change_eligibility_report` - and
 * BOTH are re-checked by the server on every request. Hiding a button is
 * presentation; the route is what refuses. The caller's BRANCH scope is
 * likewise the server's decision: the Outlet filter can only narrow what they
 * were already authorized to see.
 */
export default function ShiftChangeEligibilityReportPage() {
  const toast = useToast();
  const canView = usePermissions(["view_shift_change_eligibility_report"]);
  const canExport = usePermissions(["export_shift_change_eligibility_report"]);

  // `directory: true` is the two-column dropdown list, behind no permission -
  // a manager who may open this report should not also need `view_stores` to
  // be offered an outlet filter. It is a PICKER, not an authorization: the
  // server decides which branches this caller may actually read.
  const { outlets } = useOutlets({ directory: true });
  const { designations } = useDesignations();

  // The last seven COMPLETED attendance dates, ending yesterday. Derived from
  // the shared IST business date and never from `toISOString()`, which would
  // open the screen a day early for every India user between midnight and
  // 05:30 - see `util/attendanceShiftChangeEligibility.js#defaultRange`.
  const defaults = useMemo(() => defaultRange(), []);

  const [filters, setFilters] = useState({
    ...defaults,
    store_id: "",
    designation_id: "",
    employee_id: "",
    search: "",
    // HR'S OPENING QUESTION: who can raise one, looks like they need to, and
    // has not. One click clears it.
    ...actionableView(),
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
      const res = await AttendanceShiftChangeEligibilityHelper.getReport(buildQuery(next));
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

  /** Clear the three view filters and reload. Nothing else is touched. */
  const showAll = () => {
    const next = { ...filters, ...clearedView() };
    setFilters(next);
    load(next);
  };

  const flat = useMemo(() => rows.map(flattenRow), [rows]);

  const colDefs = useMemo(
    () =>
      SHIFT_CHANGE_ELIGIBILITY_COLUMNS.map((c) => {
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
        if (c.key === "action") {
          return {
            field: "action",
            headerName: c.header,
            minWidth: c.minWidth,
            sortable: false,
            filter: false,
            cellRenderer: (props) => (
              <HStack spacing={3}>
                {actionLinks(props.data).map((link) => (
                  <NextLink key={link.key} href={link.href} passHref>
                    <Link color="purple.500" fontSize="sm">
                      {link.label}
                    </Link>
                  </NextLink>
                ))}
              </HStack>
            ),
          };
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
      await AttendanceShiftChangeEligibilityHelper.exportXlsx(buildQuery(filters));
    } catch (err) {
      toast({ title: err.message || "Export failed", status: "error", duration: 5000 });
    } finally {
      setExporting(false);
    }
  };

  if (!canView) {
    return (
      <GlobalWrapper title="Shift Change Eligibility">
        <CustomContainer title="Shift Change Eligibility" filledHeader>
          <Alert status="warning" fontSize="sm">
            <AlertIcon />
            You do not have permission to view the Shift Change Eligibility Report.
          </Alert>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  return (
    <GlobalWrapper title="Shift Change Eligibility">
      <DateRangeFilter
        title="Shift Change Eligibility"
        dateFrom={filters.from_date}
        dateTo={filters.to_date}
        onDateFromChange={(v) => setFilters((f) => ({ ...f, from_date: v }))}
        onDateToChange={(v) => setFilters((f) => ({ ...f, to_date: v }))}
      />
      <CustomContainer
        title="Who can raise a shift change request"
        subtitle="A shift change regularises a day that ran LONGER than the assigned shift - it can never be used to reduce scheduled hours. 'Can Raise Shift Change?' is the same rule the employee's own request is accepted or refused by; 'Worked Longer Than Assigned Shift?' is measured separately from the punches and grants nothing on its own."
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
            You do not have permission to view the Shift Change Eligibility Report.
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
                <FormLabel fontSize="sm">Designation</FormLabel>
                <Select
                  size="sm"
                  value={filters.designation_id}
                  onChange={(e) => setFilters((f) => ({ ...f, designation_id: e.target.value }))}
                >
                  <option value="">All</option>
                  {designations.map((d) => (
                    <option key={d.designation_id} value={d.designation_id}>
                      {d.designation_name}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl maxW="180px">
                <FormLabel fontSize="sm">Can Raise?</FormLabel>
                <Select
                  size="sm"
                  value={filters.can_raise}
                  onChange={(e) => setFilters((f) => ({ ...f, can_raise: e.target.value }))}
                >
                  {YES_NO_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl maxW="200px">
                <FormLabel fontSize="sm">Worked Longer?</FormLabel>
                <Select
                  size="sm"
                  value={filters.worked_longer}
                  onChange={(e) => setFilters((f) => ({ ...f, worked_longer: e.target.value }))}
                >
                  {YES_NO_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl maxW="200px">
                <FormLabel fontSize="sm">Request Status</FormLabel>
                <Select
                  size="sm"
                  value={filters.request_status}
                  onChange={(e) => setFilters((f) => ({ ...f, request_status: e.target.value }))}
                >
                  {REQUEST_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
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
              <Button size="sm" variant="ghost" colorScheme="purple" onClick={showAll}>
                Show all records
              </Button>
            </Stack>

            <Alert status="info" fontSize="sm" mb={3}>
              <AlertIcon />
              {viewNote(meta, filters)}
            </Alert>

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
                  {meta ? `${meta.row_count} row(s) across ${meta.employee_count} employee(s)` : ""}
                </Text>
                <AgGrid
                  rowData={flat}
                  colDefs={colDefs}
                  tableKey="attendance-shift-change-eligibility"
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
