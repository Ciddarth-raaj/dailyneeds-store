import { Formik, Form } from "formik";
import { Container, Flex, Button, ButtonGroup } from "@chakra-ui/react";
import styles from "../../styles/admin.module.css";
import React, { useState, useEffect } from "react";

import Head from "../../util/head";
import FamilyHelper from "../../helper/family";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Validation } from "../../util/validation";
import Table from "../../components/table/table";
import EmployeeHelper from "../../helper/employee";
import Link from "next/link";
import exportCSVFile from "../../util/exportCSVFile";
import moment from "moment";

class viewFamily extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            employeeDet: [],
            hoverElement: false,
            employee_name: "",
            name: '',
            details: [],
            updatedFamily: [],
        };
    }

    componentDidMount() {
        this.getEmployeeDet();
        this.getFamilyData();
    }
    componentDidUpdate() {
        if (this.state.employee_name !== '') {
            this.getFamilyOnEmployee();
        }
        this.state.name = this.state.employee_name;
        this.state.employee_name = '';
    }

    onClick = (m) => (
        <Link href={`/family/${m.id}`}>{m.value}</Link>
    );

    getFamilyOnEmployee() {
        const { employee_name } = this.state;
        FamilyHelper.getFamilyOnEmployee(
            employee_name
        )
            .then((data) => {
                this.setState({ updatedFamily: data })
            })
            .catch((err) => console.log(err))
    }
    getEmployeeDet() {
        EmployeeHelper.getFamilyDet()
            .then((data) => {
                this.setState({ employeeDet: data })
            })
            .catch((err) => console.log(err))
    }

    getFamilyData() {
        FamilyHelper.getFamily()
            .then((data) => {
                this.setState({ details: data });
            })
            .catch((err) => console.log(err));
    }
    sortCallback = (key, type) => {
        console.log(key, type);
    };

    getExportFile = () => {
        const TABLE_HEADER = {
            SNo: "SNo",
            id: "Id",
            name: "Name",
            employee_name: "Employee Name",
            relation: "Relation",
        };
        const formattedData = [];
        valuesNew.forEach((d, i) => {
            formattedData.push({
                SNo: i + 1,
                id: d.family_id,
                name: d.name,
                relation: d.relation,
            });
        });
        exportCSVFile(
            TABLE_HEADER,
            formattedData,
            "family_details" + moment().format("DD-MMY-YYYY")
        );
    };
    render() {
        const { employeeDet, name, updatedFamily, hoverElement, details } = this.state;
        let permission_array = global.config.data;
        let valuesNew = [];
        const initialValue = {
            dob_1: "",
            dob_2: "",
        };
        const table_title = {
            id: "Id",
            name: "Name",
            employee_name: "Employee Name",
            relation: "Relation",
            // action: "Action"
        };
        if (updatedFamily.length === 0) {
            valuesNew = details.map((m) => ({
                id: m.family_id,
                name: this.onClick({ value: m.name, id: m.family_id }),
                employee_name: m.employee_name,
                relation: this.onClick({ value: m.relation, id: m.family_id }),
                // action: image(m.family_id),
            }));
        } else {
            valuesNew = updatedFamily.map((m) => ({
                id: m.family_id,
                name: this.onClick({ value: m.name, id: m.family_id }),
                employee_name: m.employee_name,
                relation: this.onClick({ value: m.relation, id: m.family_id }),
            }))
        }

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
                                    <div className={styles.dropdown}>
                                        <input style={{padding: "10px"}} placeholder="Employee Name" onChange={(e) => this.setState({ name: e.target.value })} type="text" value={name === "" ? "" : `${name}`} onMouseEnter={() => this.setState({ hoverElement: false })}
                                            className={styles.dropbtn} />
                                        <div className={styles.dropdowncontent} style={hoverElement === false ? { color: "black" } : { display: "none" }}>
                                            {employeeDet.filter(({ employee_name }) => employee_name.indexOf(name.toLowerCase()) > -1).map((m) => (
                                                <a onClick={() => (this.setState({ employee_name: m.employee_name, hoverElement: true }))}>
                                                    <img src={m.employee_image} width="30" height="25" className={styles.dropdownImg} />{m.employee_name}<br />{`# ${m.employee_id}`}</a>
                                            ))}
                                        </div>
                                    </div>
                                    {permission_array.length > 0 ?
                                        permission_array.map((m) => (
                                            <>
                                                {m.permission_key === 'add_family' && (
                                                    <div style={{ paddingRight: 10 }}>
                                                        <Link href="/family/create">
                                                            <Button colorScheme="purple">
                                                                {"Add"}
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                )}
                                            </>
                                        )) : (
                                            <div style={{ paddingRight: 10 }}>
                                                <Link href="/family/create">
                                                    <Button colorScheme="purple">
                                                        {"Add"}
                                                    </Button>
                                                </Link>
                                            </div>
                                        )}
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
}

export default viewFamily;
