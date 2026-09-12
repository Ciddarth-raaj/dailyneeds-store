import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useBreakpointValue,
} from "@chakra-ui/react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import useOutlets from "../../../customHooks/useOutlets";
import useDesignations from "../../../customHooks/useDesignations";
import useEmployeeDirectory from "../../../customHooks/useEmployeeDirectory";
import AttendanceV2Helper from "../../../helper/attendanceV2";
import {
  apiMessage,
  buildRecalcBody,
  displayDate,
  displayDateTime,
  isOk,
  recalcStatusLabel,
  runFilterLabel,
} from "../../../util/attendanceV2";
import { formatYYYYMMDD } from "../../../util/dateRange";

/**
 * Recalculate Attendance - HR/Admin, behind `recalculate_attendance`.
 *
 * FILTERS ON ONE LINE at desktop width: Date Range | Employee | Store |
 * Designation | Recalculate | Reset. The date range is required; the other
 * three are optional and combine freely. On a phone the same controls
 * stack. Only the filters actually chosen are sent.
 *
 * Every affected date is recalculated by the backend under the shift that
 * applied on THAT date - the dated assignment, the one-date override, the
 * configuration version in force, the break override and any approved
 * regularized punch. No punch is edited and no OT request is created;
 * candidate OT becomes OT Available.
 *
 * STATUS BAR. Ready -> Recalculating (an indeterminate bar: the backend
 * runs the batch in one request and reports at the end, so no percentage
 * is invented) -> Completed / Completed with errors / Failed, with the REAL
 * counts the backend returned. Recent runs are listed below from the run
 * audit. No salary figure appears anywhere on this screen.
 */
const EMPTY = { employee_id: "", store_id: "", designation_id: "" };

export default function RecalculateAttendancePage() {
  const isMobile = useBreakpointValue({ base: true, md: false });
  const { outlets } = useOutlets({ directory: true });
  const { designations } = useDesignations();
  const { employees } = useEmployeeDirectory();

  const today = formatYYYYMMDD(new Date());
  const [from, setFrom] = useState(today.slice(0, 8) + "01");
  const [to, setTo] = useState(today);
  const [filters, setFilters] = useState(EMPTY);
  const [state, setState] = useState("READY");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showErrors, setShowErrors] = useState(false);
  const [runs, setRuns] = useState([]);

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const reset = () => {
    setFilters(EMPTY);
    setError(null);
  };

  const loadRuns = useCallback(async () => {
    try {
      const res = await AttendanceV2Helper.getRecalculationRuns(20);
      setRuns(isOk(res) && Array.isArray(res.runs) ? res.runs : []);
    } catch (err) {
      setRuns([]);
    }
  }, []);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  const recalculate = async () => {
    setError(null);
    const built = buildRecalcBody({ from_date: from, to_date: to, ...filters });
    if (built.error) {
      setError(built.error);
      return;
    }
    setState("RUNNING");
    setResult(null);
    setShowErrors(false);
    try {
      const res = await AttendanceV2Helper.recalculateBulk(built.body);
      if (!isOk(res)) {
        setState("FAILED");
        setError(apiMessage(res, "The recalculation could not be started"));
        return;
      }
      setResult(res);
      setState(res.status || "COMPLETED");
    } catch (err) {
      setState("FAILED");
      setError("Could not reach the server. The run may not have started.");
    } finally {
      await loadRuns();
    }
  };

  const statusColor = { READY: "gray", RUNNING: "purple", COMPLETED: "green", COMPLETED_WITH_ERRORS: "orange", FAILED: "red" }[state] || "gray";

  return (
    <GlobalWrapper title="Recalculate Attendance" permissionKey={["recalculate_attendance"]}>
      <CustomContainer title="Recalculate Attendance" filledHeader>
        <Stack spacing={4}>
          <Flex direction={isMobile ? "column" : "row"} gap={3} align={isMobile ? "stretch" : "flex-end"} wrap="nowrap">
            <FormControl isRequired minW={isMobile ? undefined : "150px"} maxW={isMobile ? undefined : "170px"}>
              <FormLabel fontSize="sm">From</FormLabel>
              <Input type="date" size="sm" value={from} onChange={(e) => setFrom(e.target.value)} isDisabled={state === "RUNNING"} />
            </FormControl>
            <FormControl isRequired minW={isMobile ? undefined : "150px"} maxW={isMobile ? undefined : "170px"}>
              <FormLabel fontSize="sm">To</FormLabel>
              <Input type="date" size="sm" value={to} onChange={(e) => setTo(e.target.value)} isDisabled={state === "RUNNING"} />
            </FormControl>
            <FormControl flex={1} minW={isMobile ? undefined : "180px"}>
              <FormLabel fontSize="sm">Employee</FormLabel>
              <Select size="sm" placeholder="All employees" value={filters.employee_id} onChange={(e) => setFilter("employee_id", e.target.value)} isDisabled={state === "RUNNING"}>
                {employees.map((e) => (
                  <option key={e.employee_id} value={e.employee_id}>{e.employee_id} — {e.employee_name}</option>
                ))}
              </Select>
            </FormControl>
            <FormControl flex={1} minW={isMobile ? undefined : "150px"}>
              <FormLabel fontSize="sm">Store</FormLabel>
              <Select size="sm" placeholder="All stores" value={filters.store_id} onChange={(e) => setFilter("store_id", e.target.value)} isDisabled={state === "RUNNING"}>
                {outlets.map((o) => (
                  <option key={o.outlet_id} value={o.outlet_id}>{o.outlet_name}</option>
                ))}
              </Select>
            </FormControl>
            <FormControl flex={1} minW={isMobile ? undefined : "160px"}>
              <FormLabel fontSize="sm">Designation</FormLabel>
              <Select size="sm" placeholder="All designations" value={filters.designation_id} onChange={(e) => setFilter("designation_id", e.target.value)} isDisabled={state === "RUNNING"}>
                {designations.map((d) => (
                  <option key={d.designation_id} value={d.designation_id}>{d.designation_name}</option>
                ))}
              </Select>
            </FormControl>
            <Button size="sm" colorScheme="purple" onClick={recalculate} isLoading={state === "RUNNING"} loadingText="Recalculating" flexShrink={0}>
              Recalculate
            </Button>
            <Button size="sm" variant="outline" onClick={reset} isDisabled={state === "RUNNING"} flexShrink={0}>
              Reset
            </Button>
          </Flex>

          {/* ------------------------------------------------ status bar */}
          <Box borderWidth="1px" borderColor={`${statusColor}.200`} bg={`${statusColor}.50`} borderRadius="md" p={3}>
            <Flex align="center" gap={2} wrap="wrap">
              <Badge colorScheme={statusColor} fontSize="xs" px={2}>{recalcStatusLabel(state)}</Badge>
              {state === "READY" ? <Text fontSize="sm" color="gray.600">Choose a date range and any filters, then Recalculate.</Text> : null}
              {state === "RUNNING" ? <Text fontSize="sm" color="gray.700">Recalculating every affected date under the shift that applied on that date…</Text> : null}
            </Flex>
            {state === "RUNNING" ? <Progress mt={2} size="sm" colorScheme="purple" isIndeterminate borderRadius="md" /> : null}
            {result && state !== "RUNNING" ? (
              <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3} mt={2}>
                <Box><Text fontSize="10px" color="gray.500" textTransform="uppercase">Employees</Text><Text fontSize="sm" fontWeight="600">{result.employees_completed} / {result.employees_targeted}</Text></Box>
                <Box><Text fontSize="10px" color="gray.500" textTransform="uppercase">Attendance days processed</Text><Text fontSize="sm" fontWeight="600">{Number(result.attendance_days_processed || 0).toLocaleString("en-IN")}</Text></Box>
                <Box><Text fontSize="10px" color="gray.500" textTransform="uppercase">Failed</Text><Text fontSize="sm" fontWeight="600" color={result.employees_failed > 0 ? "red.600" : undefined}>{result.employees_failed}</Text></Box>
                <Box><Text fontSize="10px" color="gray.500" textTransform="uppercase">Range</Text><Text fontSize="sm" fontWeight="600">{displayDate(result.from_date)} – {displayDate(result.to_date)}</Text></Box>
              </SimpleGrid>
            ) : null}
            {result && Array.isArray(result.errors) && result.errors.length > 0 ? (
              <Box mt={2}>
                <Button size="xs" variant="link" colorScheme="red" onClick={() => setShowErrors((v) => !v)}>
                  {showErrors ? "Hide errors" : `View errors (${result.errors.length})`}
                </Button>
                {showErrors ? (
                  <Stack spacing={1} mt={1}>
                    {result.errors.map((e) => (
                      <Text key={e.employee_id} fontSize="xs" color="red.700">
                        {e.employee_name ? `${e.employee_name} (${e.employee_id})` : `Employee ${e.employee_id}`}: {e.message}
                      </Text>
                    ))}
                  </Stack>
                ) : null}
              </Box>
            ) : null}
            {error ? (
              <Alert status="error" fontSize="sm" borderRadius="md" mt={2}><AlertIcon />{error}</Alert>
            ) : null}
          </Box>

          <Text fontSize="xs" color="gray.500">
            Recalculation uses the shift that applied on each date, the single-date shift override, the break override and approved regularized punches. Biomax punches are never changed, and no OT request is created: candidate OT becomes OT Available for the employee to request.
          </Text>
        </Stack>
      </CustomContainer>

      <CustomContainer title="Recent Recalculations" filledHeader smallHeader style={{ marginTop: 16 }}>
        {runs.length === 0 ? (
          <Text fontSize="sm" color="gray.600">No recalculations yet.</Text>
        ) : (
          <Box overflowX="auto">
            <Table size="sm" variant="simple">
              <Thead bg="gray.50">
                <Tr>
                  <Th>Requested On</Th>
                  <Th>Date Range</Th>
                  <Th>Employee / Filter</Th>
                  <Th>Store</Th>
                  <Th>Designation</Th>
                  <Th isNumeric>Records Processed</Th>
                  <Th>Status</Th>
                  <Th>Requested By</Th>
                </Tr>
              </Thead>
              <Tbody>
                {runs.map((run) => (
                  <Tr key={run.attendance_recalculation_run_id}>
                    <Td fontSize="xs" whiteSpace="nowrap">{displayDateTime(run.started_at)}</Td>
                    <Td fontSize="xs" whiteSpace="nowrap">{displayDate(run.from_date)} – {displayDate(run.to_date)}</Td>
                    <Td fontSize="xs">{runFilterLabel(run)}</Td>
                    <Td fontSize="xs">{run.outlet_name || (run.store_id ? `Store ${run.store_id}` : "All")}</Td>
                    <Td fontSize="xs">{run.designation_name || (run.designation_id ? `Designation ${run.designation_id}` : "All")}</Td>
                    <Td fontSize="xs" isNumeric>{Number(run.days_processed || 0).toLocaleString("en-IN")} <Text as="span" color="gray.500">({run.employees_completed}/{run.employees_targeted})</Text></Td>
                    <Td>
                      <Badge fontSize="10px" colorScheme={{ RUNNING: "purple", COMPLETED: "green", COMPLETED_WITH_ERRORS: "orange", FAILED: "red" }[run.status] || "gray"}>
                        {recalcStatusLabel(run.status)}
                      </Badge>
                    </Td>
                    <Td fontSize="xs">{run.requested_by_name || run.requested_by_employee_id || "—"}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}
