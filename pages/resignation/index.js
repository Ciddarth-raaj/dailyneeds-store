import { Formik, Form } from "formik";
import { Container, Flex, Button, ButtonGroup, Badge, Switch } from "@chakra-ui/react";
import styles from "../../styles/admin.module.css";
import Head from "../../util/head";
import React from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Validation } from "../../util/validation";
import Table from "../../components/table/table";
import ResignationHelper from "../../helper/resignation";
import Link from "next/link";
import exportCSVFile from "../../util/exportCSVFile";
import moment from "moment";


let valuesNew = [];
export default class viewResignation extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            employeeDet: [],
            hoverElement: false,
            resignation: []
        };
    }
    componentDidMount() {
        this.getResignationData();
    }



    getResignationData() {
        ResignationHelper.getResignation()
            .then((data) => {
                this.setState({ resignation: data });
            })
            .catch((err) => console.log(err));
    }

    getExportFile = () => {
        const TABLE_HEADER = {
            SNo: "SNo",
            employee_name: "Employee Name",
            reason: "Reason",
            resignation_date: "Resignation Date"
        };
        const formattedData = [];
        valuesNew.forEach((d, i) => {
            formattedData.push({
                SNo: i + 1,
                employee_name: d.employee_name,
                reason: d.reason,
                resignation_date: d.resignation_date
            });
        });

        exportCSVFile(
            TABLE_HEADER,
            formattedData,
            "resignation_details" + moment().format("DD-MMY-YYYY")
        );
    };

    render() {
        const { } = this.state;
        let permission_array = global.config.data;
        const initialValue = {
            dob_1: "",
            dob_2: "",
        };
        const table_title = {
            id: "SNo",
            employee_name: "Employee Name",
            reason_type: "Reason",
            resignation_date: "Resignation Date"
        };

        valuesNew = this.state.resignation.map((m) => (
            {
                id: m.id,
                employee_name: m.employee_name,
                reason_type: m.reason_type,
                resignation_date: m.resignation_date
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
                    <GlobalWrapper title="Resignation Details">
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
                                    {permission_array.length > 0 ?
                                        permission_array.map((m) => (
                                            <>
                                                {m.permission_key === 'add_resignation' && (
                                                    <div style={{ paddingRight: 10 }}>
                                                        <Link href="/resignation/create">
                                                            <Button colorScheme="purple">
                                                                {"Add"}
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                )}
                                            </>
                                        )) : (
                                            <div style={{ paddingRight: 10 }}>
                                                <Link href="/resignation/create">
                                                    <Button colorScheme="purple">
                                                        {"Add"}
                                                    </Button>
                                                </Link>
                                            </div>
                                        )}
                                </p>
                                <div style={{ paddingTop: 30 }}>
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
                                            onClick={() => this.getExportFile()}
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

