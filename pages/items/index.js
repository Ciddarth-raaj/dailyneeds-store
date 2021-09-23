import { Formik, Form } from "formik";
import { Container, Flex, Button } from "@chakra-ui/react";
import styles from "../../styles/admin.module.css";
import React, { useState, useEffect } from "react";

import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Validation } from "../../util/validation";
import Table from "../../components/table/table";
import Link from "next/link";

function items() {
    const initialValue = {
        dob_1: "",
        dob_2: "",
    };
    const image = (m) => (
        <div style={{ display: "flex", justifyContent: "center" }}>
            <img
                src={"/assets/edit.png"}
                //onClick={() => window.location = `/items/${m}`}
                className={styles.icon}
            />
        </div>
    );

    const table_title = {
        id: "Material Id",
        name: "Material Name",
        description: "Description",
        action: "Action",
    };

    const value = [
        {
            id: "1",
            name: "Pen",
            description: "Pen",
        },
        {
            id: "2",
            name: "Pencil",
            description: "Pencil Pen",
        },
    ];

    const [data, setData] = useState({
        items: [],
    });
    const valuesNew = value.map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        action: image(m.id),
    }));

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
                <GlobalWrapper title="Items Details">
                    <Head />
                    <Flex templateColumns="repeat(3, 1fr)" gap={6} colSpan={2}>
                        <Container className={styles.container} boxShadow="lg">
                            <p className={styles.buttoninputHolder}>
                                <div>View Items</div>
                                <div style={{ paddingRight: 10 }}>
                                    <Link href="/items/create">
                                        <Button colorScheme="purple">
                                            {"Add"}
                                        </Button>
                                    </Link>
                                </div>
                            </p>
                            <div>
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

export default items;
