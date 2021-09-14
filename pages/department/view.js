//External Dependancies
import { Formik, Form } from "formik";
import { Container, Flex, Button } from "@chakra-ui/react";
import React, { useState, useEffect } from "react";

//Styles
import styles from "../../styles/admin.module.css";

//Helpers
import DepartmentHelper from "../../helper/department";

//InternalDependancies
import CustomInput from "../../components/customInput/customInput";
import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Validation } from "../../util/validation";
import Table from "../../components/table/table";
import Link from "next/link";

function departmentView() {
    const initialValue = {
        dob_1: "",
        dob_2: "",
    };
    const image = (m) => (
        <div style={{ display: "flex", justifyContent: "center" }}>
            <img src={"/assets/edit.png"} onClick={() => window.location = `/department/${m}`} className={styles.icon} />
        </div>
    );

    const table_title = {
        employee_id: "Employee Id",
        name: "Name",
        status: "Status",
        action: "Action",
    };

    const [
        data,
        setData
    ] = useState({
        department: []
    })
    useEffect(() => getDepartmentData(), [])

    function getDepartmentData() {
        DepartmentHelper.getDepartment()
            .then((data) => {
                setData({ department: data });
            })
            .catch((err) => console.log(err));
    }

    const valuesNew = data.department.map((m) => (
        {
            id: m.id,
            name: m.value,
            status: m.status ? "Active" : "In Active",
            action: image(m.id),
        }
    ));

    const sortCallback = (key, type) => {
        console.log(key, type);
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
                <GlobalWrapper title="Department Details">
                    <Head />
                    <Flex templateColumns="repeat(3, 1fr)" gap={6} colSpan={2}>
                        <Container className={styles.container} boxShadow="lg">
                            <p className={styles.buttoninputHolder}>
                                <div>View Department</div>
                                <div style={{ paddingRight: 10 }}>
                                    <Link href="/department/create">
                                        <Button colorScheme="purple">
                                            {"Add"}
                                        </Button>
                                    </Link>
                                </div>
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
                            </div>
                        </Container>
                    </Flex>
                </GlobalWrapper>
            </Form>
        </Formik>
    );
}

export default departmentView;
