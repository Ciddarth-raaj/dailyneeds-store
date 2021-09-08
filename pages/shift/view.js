import { Formik, Form } from "formik";
import { Container, Flex, Button } from "@chakra-ui/react";
import styles from "../../styles/admin.module.css";

import CustomInput from "../../components/customInput/customInput";
import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Validation } from "../../util/validation";
import Table from "../../components/table/table";
import Link from "next/link";

function shiftView() {
    const initialValue = {
        dob_1: "",
        dob_2: "",
    };
    const image = (
        <div style={{ display: "flex", justifyContent: "center" }}>
            <img src={"/assets/edit.png"} className={styles.icon} />
        </div>
    );

    const table_title = {
        employee_id: "Employee Id",
        name: "Name",
        action: "Action",
    };

    const valuesNew = [
        {
            id: "1",
            name: "Ciddarth",
            action: image,
        },
        {
            id: "2",
            name: "Keerthi",
            action: image,
        },
        {
            id: "3",
            name: "Saravana",
            action: image,
        },
        {
            id: "4",
            name: "Four",
            action: image,
        },
        {
            id: "5",
            name: "Five",
            action: image,
        },
    ];

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
                <GlobalWrapper title="Shift Details">
                    <Head />
                    <Flex templateColumns="repeat(3, 1fr)" gap={6} colSpan={2}>
                        <Container className={styles.container} boxShadow="lg">
                            <p className={styles.buttoninputHolder}>
                                <div>View Shift</div>
                                <div style={{ paddingRight: 10 }}>
                                    <Button colorScheme="purple">
                                        <Link href="/shift/create">
                                            {"Add"}
                                        </Link>
                                    </Button>
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

export default shiftView;
