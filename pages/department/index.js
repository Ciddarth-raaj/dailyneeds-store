//External Dependancies
import { Formik, Form } from "formik";
import {
  Container,
  Flex,
  Button,
  ButtonGroup,
  Switch,
  Badge,
} from "@chakra-ui/react";
import React, { useState, useEffect } from "react";

//Styles
import styles from "../../styles/admin.module.css";

//Helpers
import DepartmentHelper from "../../helper/department";

//InternalDependancies
import CustomInput from "../../components/customInput/customInput";
import Head from "../../util/head";
import { toast } from "react-toastify";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Validation } from "../../util/validation";
import Table from "../../components/table/table";
import Link from "next/link";
import exportCSVFile from "../../util/exportCSVFile";
import moment from "moment";

function departmentView() {
  const initialValue = {
    dob_1: "",
    dob_2: "",
  };
  // const image = (m) => (
  //     <div style={{ display: "flex", justifyContent: "center" }}>
  //         <img src={"/assets/edit.png"} onClick={() => window.location = `/department/${m}`} className={styles.icon} />
  //     </div>
  // );
  const onClick = (m) => {
    return <Link href={`/department/${m.id}`}>{m.value}</Link>;
  };
  const [status, setStatus] = useState({
    id: 0,
    status: "",
  });
  useEffect(() => updateStatus(), [status]);
  const badge = (m) => (
    <Switch
      className={styles.switch}
      id="email-alerts"
      defaultChecked={m.value === 1}
      onChange={() => {
        setStatus({ status: m.value === 1 ? 0 : 1, id: m.id });
      }}
    />
  );
  function updateStatus() {
    if (status.status !== "") {
      DepartmentHelper.updateStatus({
        department_id: status.id,
        status: status.status,
      })
        .then((data) => {
          if (data.code === 200) {
            toast.success("Successfully updated Status");
          } else {
            toast.error("Not Updated");
          }
        })
        .catch((err) => console.log(err));
    } else {
      console.log("clear");
    }
  }
  const table_title = {
    sNo: "SNo",
    // employee_id: "Employee Id",
    name: "Name",
    status: "Status",
    // action: "Action",
  };

  const [data, setData] = useState({
    department: [],
  });
  useEffect(() => getDepartmentData(), []);

  function getDepartmentData() {
    DepartmentHelper.getDepartment()
      .then((data) => {
        setData({ department: data });
      })
      .catch((err) => console.log(err));
  }

  const valuesNew = data.department.map((m, i) => ({
    sNo: i + 1,
    // id: m.id,
    name: onClick({ value: m.value, id: m.id }),
    status: badge({ value: m.status, id: m.id }),
    // action: image(m.id),
  }));

  const sortCallback = (key, type) => {
    console.log(key, type);
  };

  const getExportFile = () => {
    const TABLE_HEADER = {
      sNo: "SNo",
      id: "Employee ID",
      name: "Name",
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
      "department_details" + moment().format("DD-MMY-YYYY")
    );
  };
  const [permission, setPermission] = useState({
    permission_array: [],
  });
  useEffect(() => {
    setPermission({ permission_array: global.config.permissions });
  }, [global.config.permissions]);

  return (
    <Formik
      initialValues={initialValue}
      onSubmit={(values) => {
        console.log(values);
      }}
      validationSchema={Validation}
    >
      <Form>
        <GlobalWrapper title="Department Details">
           
          <Flex templateColumns="repeat(3, 1fr)" gap={6} colSpan={2}>
            <Container className={styles.container} boxShadow="lg">
              <p className={styles.buttoninputHolder}>
                <div>View Department</div>
                {permission.permission_array.length > 0 ? (
                  permission.permission_array.map((m) => (
                    <>
                      {m.permission_key === "add_department" && (
                        <div style={{ paddingRight: 10 }}>
                          <Link href="/department/create">
                            <Button colorScheme="purple">{"Add"}</Button>
                          </Link>
                        </div>
                      )}
                    </>
                  ))
                ) : (
                  <div style={{ paddingRight: 10 }}>
                    <Link href="/department/create">
                      <Button colorScheme="purple">{"Add"}</Button>
                    </Link>
                  </div>
                )}
              </p>
              <div>
                <div className={styles.personalInputHolder}>
                  {/* <CustomInput label="Store" name="stores" type="text" method="switch" />
                                        <CustomInput label="Designation" name="designation" type="text" method="switch" /> */}
                  {/* <CustomInput label="Joining Date" name="dob_1" type="text" /> */}
                  {/* <CustomInput label="Resignation Date" name="dob_2" type="text" /> */}
                  {/* <CustomInput label="Current Employees" name="employee" type="text" method="switch" /> */}
                </div>
                <Table
                  heading={table_title}
                  rows={valuesNew}
                  sortCallback={(key, type) => sortCallback(key, type)}
                />
                <ButtonGroup
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    paddingBottom: 15,
                  }}
                >
                  <Button colorScheme="purple" onClick={() => getExportFile()}>
                    {"Export"}
                  </Button>
                </ButtonGroup>
              </div>
            </Container>
          </Flex>
        </GlobalWrapper>
      </Form>
    </Formik>
  );
}

export default departmentView;
