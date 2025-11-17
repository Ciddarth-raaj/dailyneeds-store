import React, { useMemo, useState } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import Head from "../../util/head";
import CustomContainer from "../../components/CustomContainer";
import Link from "next/link";
import { Button, IconButton } from "@chakra-ui/button";
import Table from "../../components/table/table";
import useEmployees from "../../customHooks/useEmployees";
import { background, Badge, Flex, Input, Text } from "@chakra-ui/react";
import ReactSelect from "react-select";
import { DropDownOptionEmployee } from "../../constants/values";
import { components } from "react-select";
import { Menu, MenuItem } from "@szhsin/react-menu";
import { getSelectStyles } from "../../util/selectStyles";
import { advanceSearch } from "../../util/array";
import { downloadCsv } from "../../util/exportCSVFile";
import AgGrid from "../../components/AgGrid";
import { capitalize } from "../../util/string";

const HEADINGS = {
  employee_id: "ID",
  employee_name: "Name",
  store_name: "Store Name",
  designation_name: "Designation",
};

function EmployeeIndex() {
  const { employees } = useEmployees();

  const handleExport = () => {
    downloadCsv(employees, "employee.csv");
  };

  const colDefs = [
    {
      field: "employee_id",
      headerName: "ID",
      maxWidth: 120,
      resizable: false,
    },
    {
      field: "employee_name",
      headerName: "Name",
      resizable: true,
      cellRenderer: (props) => capitalize(props.value),
    },
    {
      field: "designation_name",
      headerName: "Designation",
      resizable: true,
      cellRenderer: (props) => (props.value ? capitalize(props.value) : "-"),
    },
    {
      field: "primary_contact_number",
      headerName: "Mobile",
      resizable: true,
      cellRenderer: (props) => (props.value ? props.value : "-"),
    },
    {
      field: "store_name",
      headerName: "Branch",
      resizable: true,
      cellRenderer: (props) => props.value ?? "-",
    },
    {
      field: "department_name",
      headerName: "Department",
      resizable: true,
      cellRenderer: (props) => (props.value ? capitalize(props.value) : "-"),
    },
    {
      field: "status",
      headerName: "Status",
      resizable: true,
      maxWidth: 150,
      filter: "agNumberColumnFilter",
      cellRenderer: (props) => {
        const isActive = props.value === 1;
        return (
          <Flex justifyContent="center" alignItems="center">
            <Text color={isActive ? "green" : "red"}>
              {isActive ? "Active" : "Terminated"}
            </Text>
          </Flex>
        );
      },
    },
  ];

  return (
    <GlobalWrapper title="Employee">
      <CustomContainer
        title="Employee"
        filledHeader
        rightSection={
          <Flex gap="12px">
            <Button colorScheme="whiteAlpha" onClick={handleExport}>
              Export
            </Button>
          </Flex>
        }
      >
        <AgGrid rowData={employees} columnDefs={colDefs} />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default EmployeeIndex;
