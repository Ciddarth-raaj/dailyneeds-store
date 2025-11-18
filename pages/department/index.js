//External Dependancies
import { Flex, Text } from "@chakra-ui/react";
import React, { useState, useEffect } from "react";

//Helpers
import DepartmentHelper from "../../helper/department";

//InternalDependancies
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import AgGrid from "../../components/AgGrid";
import CustomMenu from "../../components/CustomMenu";
import { capitalize } from "../../util/string";
import { useRouter } from "next/router";

function DepartmentView() {
  const router = useRouter();
  const [department, setDepartment] = useState([]);

  useEffect(() => getDepartmentData(), []);

  function getDepartmentData() {
    DepartmentHelper.getDepartment()
      .then((data) => {
        console.log("CIDD", data);
        setDepartment(data);
      })
      .catch((err) => console.log(err));
  }

  const colDefs = [
    {
      field: "department_id",
      headerName: "ID",
      maxWidth: 120,
      resizable: false,
    },
    {
      field: "department_name",
      headerName: "Name",
      resizable: true,
      cellRenderer: (props) => capitalize(props.value),
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
    // {
    //   field: "department_id",
    //   headerName: "Action",
    //   resizable: false,
    //   maxWidth: 100,
    //   filter: false,
    //   cellRenderer: (props) => {
    //     return (
    //       <Flex justifyContent="center" alignItems="center" height={"100%"}>
    //         <CustomMenu
    //           items={[
    //             {
    //               label: "View",
    //               onClick: () => router.push(`/department/${props.value}`),
    //             },
    //           ]}
    //         />
    //       </Flex>
    //     );
    //   },
    // },
  ];

  return (
    <GlobalWrapper title="Department Details">
      <CustomContainer title="Department" filledHeader>
        <AgGrid rowData={department} colDefs={colDefs} />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default DepartmentView;
