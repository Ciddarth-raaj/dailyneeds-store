import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Input,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import EmployeeHelper from "../../helper/employee";
import unwrapList from "../../util/apiList";
import useOutlets from "../../customHooks/useOutlets";

/**
 * M4 — choosing whose salary this is.
 *
 * IT CREATES NO SECOND EMPLOYEE MASTER. The list is
 * `GET /employee/employees` - the same endpoint, the same `view_employees`
 * key and the same fields the HR directory at /hr/employees renders, fetched
 * once and searched in the browser exactly as that screen does. A Payroll-only
 * employee list would be a second answer to "who works here", and the two
 * would drift the first time somebody joined.
 *
 * IT READS NOTHING SENSITIVE, and does not need to: name, outlet, designation
 * and id are what identifying somebody for a pay revision takes. B3 strips
 * salary, bank, PAN and Aadhaar out of this response for anybody without
 * `view_employee_sensitive` anyway, and nothing here goes looking for them.
 *
 * A REFUSAL IS NOT AN EMPTY LIST. `unwrapList` keeps the three outcomes apart -
 * ok, accessDenied, error - so "you may not see the staff list" never renders
 * as "there is nobody here".
 *
 * ACTIVE EMPLOYEES ONLY, BY DEFAULT. A salary revision is for somebody who
 * works here; the filter can be widened, because a correction to a leaver's
 * final structure is a real thing to need.
 */
function EmployeePicker({ selectedId, onSelect, disabled = false }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState(false);

  const [search, setSearch] = useState("");
  const [outlet, setOutlet] = useState("");

  const { outlets } = useOutlets({ directory: true });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const result = unwrapList(await EmployeeHelper.getEmployee({ status: 1 }));
        if (cancelled) return;
        setRows(result.items);
        setDenied(result.accessDenied);
        setError(result.error);
      } catch (err) {
        if (!cancelled) {
          setRows([]);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const matches = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows
      .filter((e) => !outlet || String(e.store_id) === String(outlet))
      .filter((e) => {
        if (!needle) return true;
        return (
          String(e.employee_name || "").toLowerCase().includes(needle) ||
          String(e.employee_id || "").toLowerCase().includes(needle)
        );
      })
      .slice(0, 200);
  }, [rows, search, outlet]);

  const selected = rows.find((e) => String(e.employee_id) === String(selectedId)) || null;

  if (denied) {
    return (
      <Alert status="info" fontSize="sm">
        <AlertIcon />
        You do not have permission to view the employee list.
      </Alert>
    );
  }

  return (
    <Stack spacing={3}>
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
        <Input
          size="sm"
          placeholder="Search by name or employee ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          isDisabled={disabled}
        />
        <Select
          size="sm"
          placeholder="All outlets"
          value={outlet}
          onChange={(e) => setOutlet(e.target.value)}
          isDisabled={disabled}
        >
          {outlets.map((o) => (
            <option key={o.outlet_id} value={o.outlet_id}>
              {o.outlet_name}
            </option>
          ))}
        </Select>
        <Select
          size="sm"
          placeholder="Select employee"
          value={selectedId || ""}
          onChange={(e) => onSelect(e.target.value || null)}
          isDisabled={disabled || loading}
        >
          {matches.map((e) => (
            <option key={e.employee_id} value={e.employee_id}>
              {e.employee_id} — {e.employee_name}
            </option>
          ))}
        </Select>
      </SimpleGrid>

      {loading ? (
        <Stack direction="row" align="center" spacing={2}>
          <Spinner size="sm" />
          <Text fontSize="sm" color="gray.600">
            Loading employees…
          </Text>
        </Stack>
      ) : null}

      {/* AN API FAILURE IS NOT AN EMPTY LIST. Said as a failure, so nobody
          concludes the person they are looking for has left. */}
      {error ? (
        <Alert status="error" fontSize="sm">
          <AlertIcon />
          The employee list could not be loaded. This is a problem reading it — it does not mean
          there are no employees. Please try again.
        </Alert>
      ) : null}

      {!loading && !error && matches.length === 0 ? (
        <Text fontSize="sm" color="gray.600">
          No employee matches that search.
        </Text>
      ) : null}

      {selected ? (
        <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" bg="gray.50" px={3} py={2}>
          <Stack direction="row" align="center" spacing={2} flexWrap="wrap">
            <Badge colorScheme="purple" fontSize="10px">
              {selected.employee_id}
            </Badge>
            <Text fontSize="sm" fontWeight="bold">
              {selected.employee_name}
            </Text>
            <Text fontSize="xs" color="gray.600">
              {selected.store_name || "Outlet not recorded"}
              {" · "}
              {selected.designation_name || "Designation not recorded"}
            </Text>
          </Stack>
        </Box>
      ) : null}
    </Stack>
  );
}

export default EmployeePicker;
