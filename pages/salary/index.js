import { Formik, Form } from "formik";
import { Container, Flex, Button, ButtonGroup, Badge } from "@chakra-ui/react";
import styles from "../../styles/admin.module.css";
import React, { useState, useEffect } from "react";
import { CheckIcon, CloseIcon, LockIcon } from '@chakra-ui/icons'

import Head from "../../util/head";
import FamilyHelper from "../../helper/family";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Validation } from "../../util/validation";
import Table from "../../components/table/table";
import EmployeeHelper from "../../helper/employee";
import Link from "next/link";
import exportCSVFile from "../../util/exportCSVFile";
import moment from "moment";


const Details = [
    {
        id: "1",
        store_name: "nice store",
        employee_name: "scoob",
        payment_date: "2000/07/01",
        payment_amount: "2000",
        installments: "200",
        approval_status: <Badge colorScheme="green">approved</Badge>,
        paid_status: <Badge colorScheme="green">Paid</Badge>,
        action: [<CheckIcon style={{marginLeft: 10}} />, <LockIcon style={{marginLeft: 10}} />, <CloseIcon style={{marginLeft: 10}} />],
    },
    {
        id: "2",
        store_name: "nice store",
        employee_name: "scoob",
        payment_date: "2000/07/01",
        payment_amount: "2000",
        installments: "200",
        approval_status: <Badge colorScheme="green">approved</Badge>,
        paid_status: <Badge colorScheme="red">Not Paid</Badge>,
        action: [<CheckIcon style={{marginLeft: 10}} />, <LockIcon style={{marginLeft: 10}} />, <CloseIcon style={{marginLeft: 10}} />],
    },
    {
        id: "3",
        store_name: "nice store",
        employee_name: "scoob",
        payment_date: "2000/07/01",
        payment_amount: "2000",
        installments: "200",
        approval_status: <Badge colorScheme="green">approved</Badge>,
        paid_status: <Badge colorScheme="green">Paid</Badge>,
        action: [<CheckIcon style={{marginLeft: 10}} />, <LockIcon style={{marginLeft: 10}} />, <CloseIcon style={{marginLeft: 10}} />],
    }
];

export default class viewSalary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            employeeDet: [],
            hoverElement: false, 
            employee_name: "",
            name: '',
            updatedFamily : [],
        };
    }


    getExportFile = () => {
        const TABLE_HEADER = {
            SNo: "SNo",
            store_name: "Store Name",
            employee_name: "Employee Name",
            payment_date: "Payment Date",
            payment_amount: "Payment Amount",
            approval_status: "Approval Status",
            paid_status: "Paid Status",
            action: "Action",
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
            "salary_details" + moment().format("DD-MMY-YYYY")
        );
    };
    render() {
        const { employeeDet, name, updatedFamily ,hoverElement, details } = this.state;
        let valuesNew = [];
        const initialValue = {
            dob_1: "",
            dob_2: "",
        };
        const table_title = {
            SNo: "SNo",
            store_name: "Store Name",
            employee_name: "Employee Name",
            payment_date: "Payment Date",
            payment_amount: "Payment Amount",
            installments: "Installments",
            approval_status: "Approval Status",
            paid_status: "Paid Status",
            action: "Action",
        };

        valuesNew = Details.map((m) => (
        {
            id: m.id,
            store_name: m.store_name,
            employee_name: m.employee_name,
            payment_date: m.payment_date,
            payment_amount: m.payment_amount,
            installments: m.installments,
            approval_status: m.approval_status,
            paid_status: m.paid_status,
            action: m.action,
        }
        ));
  
    return (
        <Formik
            initialValues={initialValue}
            onSubmit={(values) => {
                console.log(values);
            }}
            validationSchema={Validation}
        >
            <Form>
                <GlobalWrapper title="All Employee Salary Advance">
                    <Head />
                    <Flex templateColumns="repeat(3, 1fr)" gap={6} colSpan={2}>
                        <Container className={styles.container} boxShadow="lg">
                            <p className={styles.salaryButtoninputHolder}>
                                <div>View Details</div>
                                <div className={styles.dropdown}>
                                    <input placeholder="All Store" onChange={(e) => this.setState({ name: e.target.value  })} type="text" value={name === "" ? "" : `${name}`} onMouseEnter={() => this.setState({hoverElement: false})} 
                                     className={styles.dropbtn} />
                                    <div className={styles.dropdowncontent} style={hoverElement === false ? {color: "black"} : {display: "none"}}>
                                        {employeeDet.filter(({employee_name}) => employee_name.indexOf(name.toLowerCase()) > -1).map((m) => (
                                        <a onClick={() => (this.setState({ employee_name: m.employee_name, hoverElement: true}))}>
                                            <img src={m.employee_image} width="30" height="25" className={styles.dropdownImg} />{m.employee_name}<br/>{`# ${m.employee_id}`}</a>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ paddingRight: 10 }}>
                                    <Link href="/salary/create">
                                        <Button colorScheme="purple">
                                            {"Add"}
                                        </Button>
                                    </Link>
                                </div>
                            </p>
                            <div style={{paddingTop: 80}}>
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

// export default viewSalary;
