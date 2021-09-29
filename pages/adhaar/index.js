//External Dependancies
import { Formik, Form } from "formik";
import { Container, Flex, Button } from "@chakra-ui/react";
import React, { useState, useEffect } from "react";

//Styles
import styles from "../../styles/admin.module.css";

//Helpers
import DocumentHelper from "../../helper/document";

//InternalDependancies
import CustomInput from "../../components/customInput/customInput";
import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Validation } from "../../util/validation";
import Table from "../../components/table/table";

function adhaarView() {
    const initialValue = {};
    const table_title = {
        sno: "Sno",
        employee_id: "Employee Id",
        name: "Employee Name",
        adhaar_number: "Adhaar No",
        adhaar_name: "Name as per Adhaar Card",
    };

    const [
        data,
        setData
    ] = useState({
        adhaar: []
    })
    useEffect(() => getAdhaarData(), [])

    function getAdhaarData() {
        DocumentHelper.getAdhaar()
            .then((data) => {
                setData({ adhaar: data });
            })
            .catch((err) => console.log(err));
    }

    const valuesNew = data.adhaar.map((m, n) => (
        {
            sno: n + 1,   
            employee_id: m.employee_id,
            name: m.employee_name,
            adhaar_number: m.card_number,
            adhaar_name: m.card_name,
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
                <GlobalWrapper title="Adhaar Card Details">
                    <Head />
                    <Flex templateColumns="repeat(3, 1fr)" gap={6} colSpan={2}>
                        <Container className={styles.container} boxShadow="lg">
                            <p className={styles.buttoninputHolder}>
                                <div>View Adhaar</div>
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

export default adhaarView;
