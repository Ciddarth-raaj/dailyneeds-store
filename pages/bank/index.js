//External Dependancies
import { Formik, Form } from "formik";
import { Container, Flex, Button, ButtonGroup } from "@chakra-ui/react";
import React, { useState, useEffect } from "react";

//Styles
import styles from "../../styles/admin.module.css";

//Helpers
import EmployeeHelper from "../../helper/employee";

//InternalDependancies
import CustomInput from "../../components/customInput/customInput";
import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Validation } from "../../util/validation";
import Table from "../../components/table/table";
import exportCSVFile from "../../util/exportCSVFile";
import moment from "moment";

function BankView() {
    const initialValue = {};
    const table_title = {
        sno: "Sno",
        employee_id: "Employee Id",
        name: "Employee Name",
    };

    const [
        data,
        setData
    ] = useState({
        bank: []
    })
    useEffect(() => getBankData(), [])

    function getBankData() {
        EmployeeHelper.getBank()
            .then((data) => {
                setData({ bank: data });
            })
            .catch((err) => console.log(err));
    }

    const valuesNew = data.bank.map((m, n) => (
        {
            sno: n + 1,   
            employee_id: m.employee_id,
            name: m.employee_name,
        }
    ));

    const sortCallback = (key, type) => {
        console.log(key, type);
    };

    const getExportFile = () => {
        const TABLE_HEADER = {
            SNo: "SNo",
            id: "Employee ID",
            name: "Employee Name",
        };
        const formattedData = [];
        valuesNew.forEach((d, i) => {
            formattedData.push({
                SNo: i + 1,
                id: d.employee_id,
                name: d.employee_name,
            });
        });
        exportCSVFile(
            TABLE_HEADER,
            formattedData,
            "employeeWithoutBank" + moment().format("DD-MMY-YYYY")
        );
    };

    return (
        <Formik
            initialValues={initialValue}
            onSubmit={(values) => {
                console.log(values);
            }}
            validationSchema={Validation}
        >
            <Form>
                <GlobalWrapper title="View Details">
                     
                    <Flex templateColumns="repeat(3, 1fr)" gap={6} colSpan={2}>
                        <Container className={styles.container} boxShadow="lg">
                            <p className={styles.buttoninputHolder}>
                                <div>Users Without Bank Details</div>
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
                                    sortCallback={(key, type) =>
                                        sortCallback(key, type)
                                    }
                                />
                                <ButtonGroup
                                    style={{
                                        display: "flex",
                                        justifyContent: "flex-end",
                                        paddingBottom: 15,
                                    }}
                                >
                                    <Button
                                        colorScheme="purple"
                                        onClick={() => getExportFile()}
                                    >
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

export default BankView;
