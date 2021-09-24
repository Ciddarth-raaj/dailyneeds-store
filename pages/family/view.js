import { Formik, Form } from "formik";
import { Container, Flex, Button } from "@chakra-ui/react";
import styles from "../../styles/admin.module.css";
import React, { useState, useEffect } from "react";

import Head from "../../util/head";
import FamilyHelper from "../../helper/family";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Validation } from "../../util/validation";
import Table from "../../components/table/table";
import Link from "next/link";

function viewFamily() {
    const initialValue = {
        dob_1: "",
        dob_2: "",
    };

    // const image = (m) => (
    //     <div style={{ display: "flex", justifyContent: "center" }}>
    //         <img src={"/assets/edit.png"} onClick={() => window.location = `/family/${m}`} className={styles.icon} />
    //     </div>
    // );
    const onClick = (m) => (
        <Link href={`/family/${m.id}`}>{m.value}</Link>
    );
    const table_title = {
        id: "Id",
        name: "Name",
        relation: "Relation",
        // action: "Action"
    };

    const [
        data,
        setData
    ] = useState({
        details: []
    })
    useEffect(() => getFamilyData(), [])

    function getFamilyData() {
        FamilyHelper.getFamily()
            .then((data) => {
                setData({ details: data });
            })
            .catch((err) => console.log(err));
    }

    const valuesNew = data.details.map((m) => ({
        id: m.family_id,
        name: onClick({value: m.name, id: m.family_id}),
        relation: onClick({value: m.relation, id: m.family_id}),
        // action: image(m.family_id),
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
                                    <Link href="/family/create">
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
