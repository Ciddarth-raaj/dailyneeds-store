import React, { useMemo, useState } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import Head from "../../util/head";
import CustomContainer from "../../components/CustomContainer";
import Link from "next/link";
import { Button, IconButton } from "@chakra-ui/button";
import Table from "../../components/table/table";
import useEmployees from "../../customHooks/useEmployees";
import { background, Flex, Input } from "@chakra-ui/react";
import ReactSelect from "react-select";
import { DropDownOptionEmployee } from "../../constants/values";
import { components } from "react-select";
import { Menu, MenuItem } from "@szhsin/react-menu";
import { getSelectStyles } from "../../util/selectStyles";
import { advanceSearch } from "../../util/array";
import { downloadCsv } from "../../util/exportCSVFile";

const HEADINGS = {
  employee_id: "ID",
  employee_name: "Name",
  store_name: "Store Name",
  designation_name: "Designation",
};

function EmployeeIndex() {
  const { employees } = useEmployees();
  const [search, setSearch] = useState("");
  const [selectedFilters, setSelectedFilters] = useState([
    DropDownOptionEmployee[0],
    DropDownOptionEmployee[1],
    DropDownOptionEmployee[2],
    DropDownOptionEmployee[3],
  ]);

  const HEADINGS = () => {
    const heading = {};

    selectedFilters.forEach((filter) => {
      heading[filter.value] = filter.label;
    });

    heading["action"] = "Action";

    return heading;
  };

  const modifiedEmployees = useMemo(() => {
    return advanceSearch(employees, search).map((employee) => ({
      ...employee,
      action: (
        <Menu
          align="end"
          gap={5}
          menuButton={
            <IconButton
              variant="ghost"
              colorScheme="purple"
              icon={<i className={`fa fa-ellipsis-v`} />}
            />
          }
          transition
        >
          <Link href={`/employee/${employee.employee_id}`} passHref>
            <a target="_blank" rel="noopener noreferrer">
              <MenuItem>View</MenuItem>
            </a>
          </Link>
        </Menu>
      ),
    }));
  }, [employees, search]);

  const handleExport = () => {
    const filteredList = modifiedEmployees.map((employee) => {
      const item = {};

      selectedFilters.forEach((filter) => {
        item[filter.label] = employee[filter.value];
      });

      return item;
    });

    downloadCsv(filteredList, "employee.csv");
  };

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

            <Link href="/employee/create" passHref>
              <Button colorScheme="whiteAlpha">Add</Button>
            </Link>
          </Flex>
        }
      >
        <CustomContainer
          style={{
            marginBottom: "22px",
            zIndex: 1000,
            overflow: "visible",
          }}
        >
          <Input
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            mb="22px"
          />

          <Flex direction="column" gap="8px">
            <label
              style={{
                fontSize: "14px",
                color: "var(--chakra-colors-gray-500)",
                fontWeight: "500",
              }}
            >
              Choose Table Filters
            </label>
            <ReactSelect
              options={DropDownOptionEmployee}
              isMulti
              value={selectedFilters}
              closeMenuOnSelect={false}
              hideSelectedOptions={false}
              isSearchable
              onChange={setSelectedFilters}
              styles={getSelectStyles("purple")}
              className="basic-multi-select"
              classNamePrefix="select"
              placeholder="Select filters..."
            />
          </Flex>
        </CustomContainer>

        <Table heading={HEADINGS()} rows={modifiedEmployees} size="sm" />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default EmployeeIndex;
