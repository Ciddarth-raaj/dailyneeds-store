import React, { useEffect, useRef, useState } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { Button } from "@chakra-ui/button";
import useEmployees from "../../customHooks/useEmployees";
import { Flex, Text } from "@chakra-ui/react";
import AgGrid from "../../components/AgGrid";
import moment from "moment";
import usePermissions from "../../customHooks/usePermissions";
import BulkExportImport from "../../components/Employee/BulkExportImport";

function EmployeeIndex() {
  const { employees, handleSync, refetch } = useEmployees();

  /*
   * BULK EXPORT / IMPORT lives behind `employee_edit` in the UI because that
   * is what the import half requires. It is a display decision only - the
   * server demands `view_employees` for the export and `view_employees` AND
   * `employee_edit` for the preview and the confirm, per request, whatever
   * this hook says. Hiding the button is a courtesy, not a control.
   */
  const canBulkUpdate = usePermissions(["employee_edit"]);
  const [bulkOpen, setBulkOpen] = useState(false);

  const colDefs = [
    {
      field: "employee_id",
      headerName: "ID",
      type: "id",
    },
    {
      field: "employee_name",
      headerName: "Name",
      type: "capitalized",
    },
    {
      field: "designation_name",
      headerName: "Designation",
      type: "capitalized",
    },
    {
      field: "primary_contact_number",
      headerName: "Mobile",
    },
    {
      field: "store_name",
      headerName: "Branch",
      type: "capitalized",
    },
    {
      field: "department_name",
      headerName: "Department",
      type: "capitalized",
    },
    {
      field: "shift_code",
      headerName: "Shift",
    },
    {
      field: "status",
      headerName: "Status",
      type: "badge-column",
      valueGetter: (props) =>
        props.data.status === 1
          ? { label: "Active", colorScheme: "green" }
          : { label: "Terminated", colorScheme: "red" },
    },
  ];

  const getLastSynced = () => {
    const sorted = employees.sort(
      (a, b) => new Date(b.updated_at) - new Date(a.updated_at)
    );

    if (sorted.length > 0) {
      return (
        <Text fontSize="sm" color="purple.700">{`Last Sync - ${moment(
          sorted[0].updated_at
        ).fromNow()}`}</Text>
      );
    }

    return "";
  };

  const gridRef = useRef(null);

  useEffect(() => {
    if (gridRef.current?.api && Array.isArray(employees)) {
      const existing = gridRef.current.api.getFilterModel();
      if (!existing || !existing.status) {
        gridRef.current.api.setFilterModel({
          status: { filterType: "number", type: "equals", filter: 1 },
        });
        gridRef.current.api.onFilterChanged();
      }
    }
  }, [employees]);

  return (
    <GlobalWrapper title="Employee">
      <CustomContainer
        title="Employee"
        filledHeader
        rightSection={
          <Flex gap="12px" alignItems="center">
            {getLastSynced()}

            {canBulkUpdate && (
              <Button
                colorScheme="whiteAlpha"
                size="sm"
                onClick={() => setBulkOpen(true)}
              >
                Bulk Export / Import
              </Button>
            )}

            <Button colorScheme="purple" size="sm" onClick={handleSync}>
              Sync
            </Button>
          </Flex>
        }
      >
        <AgGrid ref={gridRef} rowData={employees} columnDefs={colDefs} />
      </CustomContainer>

      <BulkExportImport
        isOpen={bulkOpen}
        onClose={() => setBulkOpen(false)}
        /*
         * The Employee Master list shows ACTIVE employees by default (the
         * grid filter set above), and the export follows it rather than
         * quietly widening to everybody. The server scopes the population
         * again by branch regardless.
         */
        filters={{ status: 1 }}
        onApplied={refetch}
      />
    </GlobalWrapper>
  );
}

export default EmployeeIndex;
