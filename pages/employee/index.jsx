import React, { useEffect, useRef } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { Button } from "@chakra-ui/button";
import useEmployees from "../../customHooks/useEmployees";
import { Flex, Text } from "@chakra-ui/react";
import AgGrid from "../../components/AgGrid";
import moment from "moment";

function EmployeeIndex() {
  const { employees, handleSync } = useEmployees();

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
            {/* <Button colorScheme="whiteAlpha" onClick={handleExport}>
              Export
            </Button> */}

            {getLastSynced()}

            <Button colorScheme="purple" size="sm" onClick={handleSync}>
              Sync
            </Button>
          </Flex>
        }
      >
        <AgGrid ref={gridRef} rowData={employees} columnDefs={colDefs} />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default EmployeeIndex;
