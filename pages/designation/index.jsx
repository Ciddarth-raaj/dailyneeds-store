import { Formik, Form } from "formik";
import {
  Container,
  Flex,
  Button,
  ButtonGroup,
  Switch,
  Badge,
  Text,
} from "@chakra-ui/react";
import styles from "../../styles/admin.module.css";
import React, { useState, useEffect } from "react";
import DesignationHelper from "../../helper/designation";
import CustomInput from "../../components/customInput/customInput";
import Head from "../../util/head";
import { toast } from "react-toastify";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Validation } from "../../util/validation";
import Table from "../../components/table/table";
import Link from "next/link";
import exportCSVFile from "../../util/exportCSVFile";
import moment from "moment";
import CustomContainer from "../../components/CustomContainer";
import AgGrid from "../../components/AgGrid";
import { capitalize } from "../../util/string";
import CustomMenu from "../../components/CustomMenu";
import { useRouter } from "next/router";

function DesignationView() {
  const router = useRouter();
  const [designations, setDesignations] = useState([]);

  function getDesignationData() {
    DesignationHelper.getDesignation()
      .then((data) => {
        setDesignations(data);
      })
      .catch((err) => console.log(err));
  }

  useEffect(() => {
    getDesignationData();
  }, []);

  const colDefs = [
    {
      field: "designation_id",
      headerName: "ID",
      maxWidth: 120,
      resizable: false,
    },
    {
      field: "designation_name",
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
    {
      field: "designation_id",
      headerName: "Action",
      resizable: false,
      maxWidth: 100,
      filter: false,
      cellRenderer: (props) => {
        return (
          <Flex justifyContent="center" alignItems="center" height={"100%"}>
            <CustomMenu
              items={[
                {
                  label: "View",
                  onClick: () => router.push(`/designation/${props.value}`),
                },
              ]}
            />
          </Flex>
        );
      },
    },
  ];

  const getExportFile = () => {
    const TABLE_HEADER = {
      SNo: "SNo",
      id: "Designation ID",
      name: "Designation Name",
      status: "Status",
    };
    const formattedData = [];
    valuesNew.forEach((d, i) => {
      formattedData.push({
        SNo: i + 1,
        id: d.id,
        name: d.value,
        status: d.status,
      });
    });
    exportCSVFile(
      TABLE_HEADER,
      formattedData,
      "designation_details" + moment().format("DD-MMY-YYYY")
    );
  };

  return (
    <GlobalWrapper title="Designation Details">
      <CustomContainer title="Designations" filledHeader>
        <AgGrid rowData={designations} colDefs={colDefs} />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default DesignationView;
