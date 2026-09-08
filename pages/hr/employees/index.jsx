import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, Input, Select, Stack, Text, Spinner, Alert, AlertIcon } from "@chakra-ui/react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import Table from "../../../components/table/table";
import { EmploymentBadge } from "../../../components/hr/StatusBadges";
import usePermissions from "../../../customHooks/usePermissions";
import useOutlets from "../../../customHooks/useOutlets";
import useDesignations from "../../../customHooks/useDesignations";
import EmployeeHelper from "../../../helper/employee";
import unwrapList from "../../../util/apiList";

/**
 * Stage 0C / C3 — the HR employee master list.
 *
 * The operational list HR works from: who is employed, where, and how to reach
 * them, with one click through to everything else about them.
 *
 * SOURCE: GET /employee/employees (`view_employees`), which already returns
 * name, outlet, designation, department, mobile, status and joining date, and
 * has B3 stripping salary, bank, PAN and Aadhaar for anyone without
 * `view_employee_sensitive`. There is deliberately no new backend endpoint.
 *
 * NOT SHOWN HERE, and this is a real gap rather than an oversight: Aadhaar and
 * bank status are per-employee reads (`/hr/employee/:id/aadhaar`,
 * `/hr/employee/:id/bank/verification`), so putting them in the list would be
 * 630 extra requests. They are on the profile, one click away. A bulk endpoint
 * would fix this and is reported as a backend gap rather than invented here.
 */
function HrEmployeeList() {
  const canView = usePermissions(["view_employees"]);
  const canCreate = usePermissions(["employee_create"]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState(false);

  const [search, setSearch] = useState("");
  const [outlet, setOutlet] = useState("");
  const [designation, setDesignation] = useState("");
  const [status, setStatus] = useState("active");

  const { outlets } = useOutlets({ directory: true });
  const { designations } = useDesignations();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const result = unwrapList(await EmployeeHelper.getEmployee());
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

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((e) => {
      if (status === "active" && Number(e.status) !== 1) return false;
      if (status === "inactive" && Number(e.status) === 1) return false;
      if (outlet && String(e.store_id) !== String(outlet)) return false;
      if (designation && String(e.designation_id) !== String(designation)) return false;
      if (!needle) return true;
      return (
        String(e.employee_id).includes(needle) ||
        String(e.employee_name || "").toLowerCase().includes(needle) ||
        String(e.primary_contact_number || "").includes(needle)
      );
    });
  }, [rows, search, outlet, designation, status]);

  const heading = {
    employee_id: "ID",
    employee_name: "Name",
    store_name: "Outlet",
    designation_name: "Designation",
    department_name: "Department",
    primary_contact_number: "Mobile",
    date_of_joining: "Joined",
    status: "Status",
    open: "",
  };

  const tableRows = filtered.map((e) => ({
    employee_id: e.employee_id,
    employee_name: e.employee_name,
    store_name: e.store_name || "—",
    designation_name: e.designation_name || "—",
    department_name: e.department_name || "—",
    primary_contact_number: e.primary_contact_number || "—",
    date_of_joining: e.date_of_joining || "—",
    status: <EmploymentBadge status={e.status} />,
    open: (
      <Link href={`/hr/employees/${e.employee_id}`} passHref>
        <Button size="xs" colorScheme="purple" variant="outline">
          Open
        </Button>
      </Link>
    ),
  }));

  return (
    <GlobalWrapper title="Employees">
      <CustomContainer
        title="Employees"
        filledHeader
        rightSection={
          canCreate ? (
            <Link href="/hr/employees/new" passHref>
              <Button colorScheme="purple" size="sm">
                Add Employee
              </Button>
            </Link>
          ) : null
        }
      >
        {!canView ? (
          <Alert status="warning" fontSize="sm">
            <AlertIcon />
            You do not have permission to view the employee list.
          </Alert>
        ) : (
          <>
            <Stack direction={{ base: "column", md: "row" }} spacing={3} mb={4}>
              <Input
                size="sm"
                placeholder="Search name, ID or mobile"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                maxW={{ base: "100%", md: "260px" }}
              />
              <Select size="sm" value={status} onChange={(e) => setStatus(e.target.value)} maxW={{ md: "160px" }}>
                <option value="active">Active</option>
                <option value="inactive">Resigned</option>
                <option value="all">All</option>
              </Select>
              <Select
                size="sm"
                placeholder="All outlets"
                value={outlet}
                onChange={(e) => setOutlet(e.target.value)}
                maxW={{ md: "200px" }}
              >
                {outlets.map((o) => (
                  <option key={o.outlet_id} value={o.outlet_id}>
                    {o.outlet_name}
                  </option>
                ))}
              </Select>
              <Select
                size="sm"
                placeholder="All designations"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                maxW={{ md: "200px" }}
              >
                {(designations || []).map((d) => (
                  <option key={d.designation_id} value={d.designation_id}>
                    {d.designation_name}
                  </option>
                ))}
              </Select>
            </Stack>

            {loading ? (
              <Stack align="center" py={8}>
                <Spinner />
              </Stack>
            ) : denied ? (
              <Alert status="warning" fontSize="sm">
                <AlertIcon />
                You do not have permission to view the employee list.
              </Alert>
            ) : error ? (
              <Alert status="error" fontSize="sm">
                <AlertIcon />
                The employee list could not be loaded. Try again.
              </Alert>
            ) : (
              <>
                <Text fontSize="sm" color="gray.600" mb={2}>
                  {filtered.length} employee{filtered.length === 1 ? "" : "s"}
                </Text>
                <Table heading={heading} rows={tableRows} showPagination defaultRowsPerPage={50} />
              </>
            )}
          </>
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default HrEmployeeList;
