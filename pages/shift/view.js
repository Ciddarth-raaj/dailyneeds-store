import { Formik, Form } from "formik";
import { Container, Flex, Button } from "@chakra-ui/react";
import styles from "../../styles/admin.module.css";
import ShiftHelper from "../../helper/shift";
import React, { useState, useEffect } from "react";

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
    // const image = (m) => (
    //     <div style={{ display: "flex", justifyContent: "center" }}>
    //         <img src={"/assets/edit.png"} onClick={() => window.location = `/shift/${m}`} className={styles.icon} />
    //     </div>
    // );

    const onClick = (m) => (
        <Link href={`/shift/${m.id}`}>{m.value}</Link>
    );
   
    const table_title = {
        id: "Shift Id",
        name: "Shift Name",
        start_time: "Start Time",
        end_time: "End Time",       
        status: "Status",
        // action: "Action",
    };

    const [
        data,
        setData
    ] = useState({
        shift: []
    })
    useEffect(() => getShiftData(), [])

    function getShiftData() {
        ShiftHelper.getShift()
            .then((data) => {
                setData({ shift: data });
            })
            .catch((err) => console.log(err));
    }
    const valuesNew = data.shift.map((m) => (
        {
            id: m.id,
            name: onClick({value: m.value, id: m.id}),
            start_time: onClick({value: m.start_time, id: m.id}),
            end_time: onClick({value: m.end_time, id: m.id}),
            status: onClick({value: m.status ? "Active" : "In Active", id: m.id}),
            // action: image(m.id),
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
                <GlobalWrapper title="Shift Details">
                    <Head />
                    <Flex templateColumns="repeat(3, 1fr)" gap={6} colSpan={2}>
                        <Container className={styles.container} boxShadow="lg">
                            <p className={styles.buttoninputHolder}>
                                <div>View Shift</div>
                                <div style={{ paddingRight: 10 }}>
                                    <Link href="/shift/create">
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

export default shiftView;
