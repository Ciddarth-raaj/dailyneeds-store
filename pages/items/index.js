import { Formik, Form } from "formik";
import { Container, Flex, Button, Switch, ButtonGroup } from "@chakra-ui/react";
import styles from "../../styles/admin.module.css";
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import Head from "../../util/head";
import MaterialHelper from "../../helper/material";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Validation } from "../../util/validation";
import Table from "../../components/table/table";
import Link from "next/link";
import exportCSVFile from "../../util/exportCSVFile";
import moment from "moment";

function items() {

    const initialValue = {
        dob_1: "",
        dob_2: "",
    };
    // const image = (m) => (
    //     <div style={{ display: "flex", justifyContent: "center" }}>
    //         <img
    //             src={"/assets/edit.png"}
    //             //onClick={() => window.location = `/items/${m}`}
    //             className={styles.icon}
    //         />
    //     </div>
    // );

    const onClick = (m) => (
        <Link href={`/items/${m.id}`}>{m.value}</Link>
    );

    const [
        status,
        setStatus
    ] = useState({
        id: 0,
        status: ''
    })
    useEffect(() => updateStatus(), [status])

    const badge = (m) => (
        <Switch className={styles.switch} id="email-alerts" defaultChecked={m.value === 1} onChange={() => { setStatus({ status: m.value === 1 ? 0 : 1, id: m.id})}} />
    )
    function updateStatus() {
        if(status.status !== '' ) {
            MaterialHelper.updateStatus({
                material_id: status.id,
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

    const table_title = {
        id: "Material Id",
        name: "Material Name",
        description: "Description",
        status: "Status",
    };

    const [
        data, 
        setData
    ] = useState({
        material: [],
    });

    useEffect(() => getMaterials(), [])

    function getMaterials() {
        MaterialHelper.getMaterial()
            .then((data) => {
                setData({ material: data });
                console.log(data);
            })
            .catch((err) => console.log(err));
    }

    const valuesNew = data.material.map((m) => ({
        id: m.material_id,
        name: onClick({value: m.material_name, id: m.material_id}),
        description: onClick({value: m.description !== '' ? m.description : "NULL", id: m.material_id}),
        status: badge({value: m.status, id: m.material_id})
    }));

    const sortCallback = (key, type) => {
        console.log(key, type);
    };

    const getExportFile = () => {
        const TABLE_HEADER = {
            SNo: "SNo",
            id: "Material ID",
            name: "Material Name",
            description: "Description",
        };
        const formattedData = [];
        valuesNew.forEach((d, i) => {
            formattedData.push({
                SNo: i + 1,
                id: d.id,
                name: d.name,
                description: d.description,
            });
        });
        exportCSVFile(
            TABLE_HEADER,
            formattedData,
            "product_details" + moment().format("DD-MMY-YYYY")
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

export default items;
