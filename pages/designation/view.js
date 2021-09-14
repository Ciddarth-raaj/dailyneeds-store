import { Formik, Form } from "formik";
import { Container, Flex, Button } from "@chakra-ui/react";
import styles from "../../styles/admin.module.css";
import React, { useState, useEffect } from "react";
import DesignationHelper from "../../helper/designation";
import CustomInput from "../../components/customInput/customInput";
import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Validation } from "../../util/validation";
import Table from "../../components/table/table";
import Link from "next/link";

function designationView() {
    const initialValue = {
        dob_1: "",
        dob_2: "",
    };
    const image = (m) => (
        <div style={{ display: "flex", justifyContent: "center" }}>
            <img src={"/assets/edit.png"} onClick={() => window.location = `/designation/${m}`} className={styles.icon} />
        </div>
    );

    const table_title = {
        designation_id: "Designation Id",
        designation_name: "Designation Name",
        status: "Status",
        action: "Action",
    };

    const [
        data,
        setData
    ] = useState({
        designation: []
    })
    useEffect(() => getDesignationData(), [])

    function getDesignationData() {
        DesignationHelper.getDesignation()
            .then((data) => {
                setData({ designation: data });
            })
            .catch((err) => console.log(err));
    }

    const valuesNew = data.designation.map((m) => (
        {
            designation_id: m.id,
            designation_name: m.value,
            status: m.status ? "Active" : "In Active",
            action: image(m.id)
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
                <GlobalWrapper title="Designation Details">
                    <Head />
                    <Flex templateColumns="repeat(3, 1fr)" gap={6} colSpan={2}>
                        <Container className={styles.container} boxShadow="lg">
                            <p className={styles.buttoninputHolder}>
                                <div>View Designation</div>
                                <div style={{ paddingRight: 10 }}>
                                    <Link href="/designation/create">
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

export default designationView;
