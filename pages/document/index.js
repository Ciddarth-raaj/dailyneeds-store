//External Dependancies
import { Formik, Form } from "formik";
import { Container, Flex, Button, Badge, Switch } from "@chakra-ui/react";
import React, { useState, useEffect } from "react";

//Styles
import styles from "../../styles/admin.module.css";

//Helpers
import DocumentHelper from "../../helper/document";

//InternalDependancies
import { IdCardType } from "../../constants/values";
import { toast } from "react-toastify";
import CustomInput from "../../components/customInput/customInput";
import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Validation } from "../../util/validation";
import Table from "../../components/table/table";
import Link from "next/link";

function documentView() {
    const initialValue = {
        dob_1: "",
        dob_2: "",
    };
    // const image = (m) => (
    //     <div style={{ display: "flex", justifyContent: "center" }}>
    //         <img src={"/assets/edit.png"} onClick={() => window.location = `/department/${m}`} className={styles.icon} />
    //     </div>
    // );
    const onClick = (m) => (
        <Link href={`/document/${m.id}`}>{m.value}</Link>
    );
    const [
        status,
        setStatus
    ] = useState({
        id: 0,
        status: ''
    })
    useEffect(() => updateStatus(), [status])
    function getAllDocuments() {
        DocumentHelper.getAllDocuments()
            .then((data) => {
                setData({ document: data });
                console.log({dahj: data});
            })
            .catch((err) => console.log(err));
    }
    const badge = (m) => (
        <Switch className={styles.switch} id="email-alerts" defaultChecked={m.value === 1} onChange={() => { setStatus({ status: m.value === 1 ? 0 : 1, id: m.id})}} />
    )
    function updateStatus() {
    if(status.status !== '' ) {
        DocumentHelper.updateStatus({
            document_id: status.id,
            status: status.status
        })
            .then((data) => {
               if(data.code === 200) {
                   toast.success("Successfully updated Status");
               } else {
                   toast.error("Not Updated")
               }
            })
            .catch((err) => console.log(err));
        } else {
            console.log('clear');
        }
    }
    const verify = (m) => (
        <Link href={`/document/${m.id}`}>
        <Badge colorScheme={m.value === "new" ? "" : m.value === "verified" ? "green" : "red"}>{m.value}</Badge></Link>
    )
    const table_title = {
        employee_id: "Document Id",
        name: "Employee Name",
        card_type: "Card Type",
        card_no: "Card Number",
        card_name: "Card Name",
        verified: "Verification",
        status: "Status",
        // action: "Action",
    };

    const [
        data,
        setData
    ] = useState({
        document: []
    })
    useEffect(() => getAllDocuments(), [])

    function type(n) {
        var cardName = "";
        IdCardType.map((m) => {
            if(m.id == n.value) {
                cardName = m.value;
            }
        })
        return <Link href={`/document/${n.id}`}>{cardName}</Link>;
    }
    function getAllDocuments() {
        DocumentHelper.getAllDocuments()
            .then((data) => {
                setData({ document: data });
                console.log({dahj: data});
            })
            .catch((err) => console.log(err));
    }

    const valuesNew = data.document.map((m) => (
        {
            id: m.document_id,
            name: onClick({value: m.employee_name, id: m.document_id}),
            card_type: type({value: m.card_type, id: m.document_id}),
            card_no: onClick({value: m.card_no, id: m.document_id}),
            card_name: onClick({value: m.card_name, id: m.document_id}),
            verified: verify({value: m.is_verified === 0 ? "new" : m.is_verified === 1 ? "verified" : "denied", id: m.document_id}),
            status: badge({value: m.status , id: m.document_id}),
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
                <GlobalWrapper title="Document Details">
                    <Head />
                    <Flex templateColumns="repeat(3, 1fr)" gap={6} colSpan={2}>
                        <Container className={styles.container} boxShadow="lg">
                            <p className={styles.buttoninputHolder}>
                                <div>View Documents</div>
                                <div style={{ paddingRight: 10 }}>
                                    <Link href="/department/create">
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

export default documentView;
