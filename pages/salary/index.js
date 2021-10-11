import { Formik, Form } from "formik";
import { Container, Flex, Button, ButtonGroup, Badge, Switch } from "@chakra-ui/react";
import styles from "../../styles/admin.module.css";
import React, { useState, useEffect } from "react";
import { CheckIcon, CloseIcon, LockIcon } from '@chakra-ui/icons'
import { toast } from "react-toastify";
import Head from "../../util/head";
import FamilyHelper from "../../helper/family";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Validation } from "../../util/validation";
import Table from "../../components/table/table";
import EmployeeHelper from "../../helper/employee";
import Link from "next/link";
import exportCSVFile from "../../util/exportCSVFile";
import moment from "moment";
import SalaryHelper from "../../helper/salary";
import StoreHelper from "../../helper/store";

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
            store_name: "",
            name: '',
            salary: [],
            status: '',
            id: 0,
            store: [],
            paid_status: '',
            newId: 0,
        };
    }
    componentDidMount() {
        this.getSalaryData();
        this.getStoreData();
    }
    componentDidUpdate() {
        const { status, paid_status, store_name } = this.state;
        if(status !== '') {
            this.updateStatus();
        }
        this.state.status = '';
        this.state.id = 0;
        if(paid_status !== '') {
            this.updatePaidStatus();
        }
        this.state.paid_status = '';
        this.state.newId = 0;
        // if(store_name !== '') {
        //     this.getSalaryOnStore();
        // }
        // this.state.name = this.state.store_name;
        // this.state.store_name = '';
    }
    // getSalaryOnStore() {
    //     const { store_name } = this.state;
    //     FamilyHelper.getSalaryOnStore(
    //     store_name
    //     )
    //         .then((data) => {
    //             this.setState({ updatedSalary: data })
    //         })
    //         .catch((err) => console.log(err))
    // }
    updatePaidStatus() {
        const { newId, paid_status } = this.state;
        SalaryHelper.updatePaidStatus({
            payment_id: newId,
			paid_status: paid_status
        })
        .then((data) => {
			if (data.code === 200) {
				toast.success("Successfully Updated Salary Advance status!");
				router.push("/salary")
			} else {
				toast.error("Error Updating Salary Advance status!");
				throw `${data.msg}`;
			}
		})
		.catch((err) => console.log({err: err}))
		.finally(() => this.setState({ loading: false }));
	}
    updateStatus() {
        const { id, status } = this.state;
        SalaryHelper.updateStatus({
            payment_id: id,
			status: status
        })
        .then((data) => {
			if (data.code === 200) {
				toast.success("Successfully Updated Salary Advance status!");
				router.push("/salary")
			} else {
				toast.error("Error Updating Salary Advance status!");
				throw `${data.msg}`;
			}
		})
		.catch((err) => console.log({err: err}))
		.finally(() => this.setState({ loading: false }));
	}
    getSalaryData() {
        SalaryHelper.getSalary()
            .then((data) => {
                this.setState({ salary: data });
            })
            .catch((err) => console.log(err));
    }
    getStoreData() {
		StoreHelper.getStore()
			.then((data) => {
				this.setState({ store: data });
			})
			.catch((err) => console.log(err));
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

    badge = m => (
        <>
          <CheckIcon
            style={{ color: 'green' }}
            id='email-alerts'
            onClick={() => {
              this.setState({ id: m.id, status: '1' })
            }}
          />
          <CloseIcon
            style={{ color: 'red' }}
            className={styles.switch}
            id='email-alerts'
            onClick={() => {
              this.setState({ id: m.id, status: '-1' })
            }}
          />
        </>
      )
      verify = m => (
        <Link href={`/salary/${m.id}`}>
          <Badge
            colorScheme={
              m.value === 'new' ? '' : m.value === 'verified' ? 'green' : 'red'
            }
          >
            {m.value}
          </Badge>
        </Link>
      )

      storeName(n) {
		var storeName = "";
		this.state.store.map((m) => {
			if (m.id == n.value) {
				storeName = m.value;
			}
		})
		return <Link href={`/salary/${n.id}`}>{storeName}</Link>;
	}

    paid_status = (m) => (
        <Switch className={styles.switch} id="email-alerts" defaultChecked={m.value === 1} onChange={() => { this.setState({ paid_status: m.value === 1 ? 0 : 1, newId: m.id})}} />
    )
    render() {
        const { employeeDet, name, store, updatedFamily, salary, hoverElement, details } = this.state;
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

        valuesNew = salary.map((m) => (
        {
            id: m.payment_id,
            store_name: this.storeName({value: m.store_id, id: m.payment_id}),
            employee_name: m.employee,
            payment_date: moment(m.created_at).format("YYYY-MM-DD"),
            payment_amount: m.loan_amount,
            installments: m.installment_duration,
            approval_status: this.verify({
                value:
                  m.status === 0
                    ? 'new'
                    : m.status === 1
                    ? 'verified'
                    : 'denied',
                id: m.payment_id
              }),
            paid_status: this.paid_status({value: m.paid_status, id: m.payment_id}),
            action: this.badge({value: m.status, id: m.payment_id}),
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
                                {/* <div className={styles.dropdown}>
                                    <input placeholder="All Store" onChange={(e) => this.setState({ name: e.target.value  })} type="text" value={name === "" ? "" : `${name}`} onMouseEnter={() => this.setState({hoverElement: false})} 
                                     className={styles.dropbtn} />
                                    <div className={styles.dropdowncontent} style={hoverElement === false ? {color: "black"} : {display: "none"}}>
                                        {store.filter(({store_name}) => store_name.indexOf(name.toLowerCase()) > -1).map((m) => (
                                        <a onClick={() => (this.setState({ store_name: m.store_name, hoverElement: true}))}>
                                            {m.store_name}<br/>{`# ${m.store_id}`}</a>
                                        ))}
                                    </div>
                                </div> */}
                                <div style={{ paddingRight: 10 }}>
                                    <Link href="/salary/create">
                                        <Button colorScheme="purple">
                                            {"Add"}
                                        </Button>
                                    </Link>
                                </div>
                            </p>
                            <div style={{paddingTop: 30}}>
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
