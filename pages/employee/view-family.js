import { Formik, Form } from "formik";
import { Container, Flex, Button } from "@chakra-ui/react";
import styles from "../../styles/admin.module.css";
import React, { useState, useEffect } from "react";

import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Validation } from "../../util/validation";
import Table from "../../components/table/table";
import Link from "next/link";

function viewFamily() {
    const initialValue = {
        dob_1: "",
        dob_2: "",
    };
    const onClick = (m) => (
        <div style={{ display: "flex", justifyContent: "center" }}>
            <Link href="/employee/family">{m.name}</Link>
        </div>
    );

    const table_title = {
        id: "Id",
        name: "Name",
        relation: "Relation",
    };

    const details = [
        {
            id: "1",
            name: "Keerthi",
            relation: "Sister",
        },
        {
            id: "2",
            name: "Sindhu",
            relation: "Sister",
        },
        {
            id: "3",
            name: "Naveen",
            relation: "Brother",
        },
    ];

    const valuesNew = details.map((m) => ({
        id: m.id,
        name: onClick(m),
        relation: m.relation,
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
                <GlobalWrapper title="Employee Family Details">
                    <Head />
                    <Flex templateColumns="repeat(3, 1fr)" gap={6} colSpan={2}>
                        <Container className={styles.container} boxShadow="lg">
                            <p className={styles.buttoninputHolder}>
                                <div>View Details</div>
                                <div style={{ paddingRight: 10 }}>
                                    <Link href="/employee/family">
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

export default viewFamily;
