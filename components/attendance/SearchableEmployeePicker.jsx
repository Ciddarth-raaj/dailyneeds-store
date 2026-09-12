import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  FormControl,
  FormLabel,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import ReactSelect from "react-select";
import EmployeeHelper from "../../helper/employee";
import unwrapList from "../../util/apiList";
import useOutlets from "../../customHooks/useOutlets";

/**
 * ONE searchable employee control, for the Attendance screens.
 *
 * THE SELECTION AND THE SEARCH ARE THE SAME CONTROL. The Payroll picker
 * (components/payroll/EmployeePicker.jsx) is Search | Outlet | Select
 * Employee - three fields where typing `1952` on the left still leaves you
 * to find `1952 — Priyanga P` on the right. Attendance is a daily operational
 * screen, so here typing IS choosing: one combobox, searched by employee id
 * or by name, and picking a result is the selection.
 *
 * IT IS A SEPARATE COMPONENT ON PURPOSE. Payroll's Salary Revision uses the
 * picker above and is out of scope for this change, so this does not
 * refactor a shared component out from under it. Nothing here is a second
 * employee master: the list is the same `GET /employee/employees`, the same
 * `view_employees` key and the same fields, fetched exactly as Payroll
 * fetches it.
 *
 * OUTLET IS A FILTER, NOT A SECOND SELECTOR. It narrows the combobox's
 * results, and it clears the chosen employee only when that employee is no
 * longer one of them - changing the filter must not silently drop a valid
 * selection.
 *
 * `trailingControl` is the third cell of the filter row, so the screen can
 * put Month beside Employee and Outlet instead of opening a second filter
 * area somewhere else.
 *
 * A REFUSAL IS NOT AN EMPTY LIST - `unwrapList` keeps ok / accessDenied /
 * error apart, so "you may not see the staff list" never renders as "there
 * is nobody here".
 */

/** `1952 — Priyanga P`, with `Warehouse · HR Executive` under it. */
function optionLabel(employee) {
  return `${employee.employee_id} — ${employee.employee_name}`;
}

function optionDetail(employee) {
  return [employee.store_name, employee.designation_name].filter(Boolean).join(" · ");
}

/** Searched by id or by name, so `1952` and `priyanga` both find the row. */
function matchesNeedle(employee, needle) {
  if (!needle) return true;
  const n = needle.trim().toLowerCase();
  if (!n) return true;
  return (
    String(employee.employee_name || "").toLowerCase().includes(n) ||
    String(employee.employee_id || "").toLowerCase().includes(n)
  );
}

/* The combobox wears the Chakra scale rather than react-select's, so it sits
   level with the Outlet and Month controls on the same row. */
const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: "32px",
    fontSize: "14px",
    borderColor: state.isFocused ? "#805AD5" : "#E2E8F0",
    boxShadow: state.isFocused ? "0 0 0 1px #805AD5" : "none",
    "&:hover": { borderColor: "#805AD5" },
  }),
  valueContainer: (base) => ({ ...base, padding: "0 8px" }),
  dropdownIndicator: (base) => ({ ...base, padding: "4px" }),
  clearIndicator: (base) => ({ ...base, padding: "4px" }),
  indicatorSeparator: () => ({ display: "none" }),
  menu: (base) => ({ ...base, fontSize: "14px", zIndex: 20 }),
  option: (base, state) => ({
    ...base,
    padding: "6px 10px",
    backgroundColor: state.isSelected ? "#805AD5" : state.isFocused ? "#FAF5FF" : "white",
    color: state.isSelected ? "white" : "#1A202C",
  }),
};

function EmployeeOption({ employee }) {
  const detail = optionDetail(employee);
  return (
    <Box>
      <Text fontSize="sm" fontWeight="600" lineHeight="short">
        {optionLabel(employee)}
      </Text>
      {detail ? (
        <Text fontSize="xs" color="gray.500" lineHeight="short">
          {detail}
        </Text>
      ) : null}
    </Box>
  );
}

function SearchableEmployeePicker({ selectedId, onSelect, disabled = false, trailingControl = null }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState(false);
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

  const inOutlet = useMemo(
    () => rows.filter((e) => !outlet || String(e.store_id) === String(outlet)),
    [rows, outlet]
  );

  const options = useMemo(
    () =>
      inOutlet.map((e) => ({
        value: String(e.employee_id),
        label: optionLabel(e),
        detail: optionDetail(e),
        employee: e,
      })),
    [inOutlet]
  );

  const selected = rows.find((e) => String(e.employee_id) === String(selectedId)) || null;
  const selectedOption = options.find((o) => o.value === String(selectedId)) || null;

  /* THE OUTLET FILTER DOES NOT CLEAR A VALID SELECTION. It clears the chosen
     employee only once that employee is no longer in the filtered list -
     never merely because the filter moved. The list is only consulted after
     it has loaded, so the first render does not drop a preselected id. */
  useEffect(() => {
    if (loading || !selectedId) return;
    const stillValid = inOutlet.some((e) => String(e.employee_id) === String(selectedId));
    if (!stillValid) onSelect(null);
  }, [inOutlet, selectedId, loading, onSelect]);

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
      <SimpleGrid columns={{ base: 1, md: trailingControl ? 4 : 3 }} spacing={3} alignItems="flex-end">
        {/* Employee is the widest field: it carries the id, the name and the
            search all at once. */}
        <Box gridColumn={{ base: "auto", md: "span 2" }}>
          <FormControl>
            <FormLabel fontSize="sm" mb={1}>
              Employee
            </FormLabel>
            <ReactSelect
              inputId="attendance-employee-select"
              aria-label="Employee"
              placeholder="Search by employee ID or name"
              isClearable
              isDisabled={disabled || loading}
              isLoading={loading}
              options={options}
              value={selectedOption}
              onChange={(option) => onSelect(option ? option.value : null)}
              filterOption={(option, input) => matchesNeedle(option.data.employee, input)}
              formatOptionLabel={(option) => <EmployeeOption employee={option.employee} />}
              noOptionsMessage={() => "No employee matches that search."}
              styles={selectStyles}
            />
          </FormControl>
        </Box>

        <FormControl>
          <FormLabel fontSize="sm" mb={1}>
            Outlet
          </FormLabel>
          <Select
            size="sm"
            aria-label="Outlet"
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
        </FormControl>

        {trailingControl}
      </SimpleGrid>

      {loading ? (
        <Stack direction="row" align="center" spacing={2}>
          <Spinner size="sm" color="purple.500" />
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

      {/* The selected employee, one compact row. */}
      {selected ? (
        <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" bg="gray.50" px={3} py={1.5}>
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

export default SearchableEmployeePicker;
