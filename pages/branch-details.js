import { Formik, Form } from "formik";
import { Container, Flex, Switch, ButtonGroup, Button } from "@chakra-ui/react";
import styles from "../styles/admin.module.css";
import React from "react";

// import BranchModal from "../components/branchModal/branchModal";
import BranchHelper from "../helper/outlets";
import { toast } from "react-toastify";
import Head from "../util/head";
import GlobalWrapper from "../components/globalWrapper/globalWrapper";
import Table from "../components/table/table";
import exportCSVFile from "../util/exportCSVFile";
import moment from "moment";
import Link from "next/link";

const table_title = {
    outlet_id: "Id",
    outlet_name: "Name",
    outlet_nickname: "Nickname",
    action: "Action",
};


export default class CreateShift extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            branchModalVisibility: false,
            selectedData: undefined,
            company: [],
            status: '',
            id: 0,
        };
    }
    updateStatus() {
        const { status, id } = this.state;
        if (status !== '') {
            BranchHelper.updateStatus({
                outlet_id: id,
                is_active: status
            })
                .then((data) => {
                    if (data.code === 200) {
                        toast.success("Successfully updated Status");
                        this.setState({ status: '' });
                    } else {
                        toast.error("Not Updated")
                    }
                })
                .catch((err) => console.log(err));
        }
    }
    sortCallback = (key, type) => {
        console.log(key, type);
    };
    componentDidUpdate() {
        if (this.state.status !== '') {
            this.updateStatus();
        }
    }
    componentDidMount() {
        this.getBranchData();
    }
    getBranchData() {
        BranchHelper.getOutlet()
            .then((data) => {
                this.setState({ company: data });
            })
            .catch((err) => console.log(err));
    }
    badge = (m) => (
        <Switch className={styles.switch} id="email-alerts" defaultChecked={m.value === 1} onChange={() => { this.setState({ status: m.value === 1 ? 0 : 1, id: m.id }) }} />
    )
    onClick = (m) => {
        return (
            <Link href={`/branchModal/${m.id}`}>{m.value}</Link>
        )}
    render() {
        const { branchModalVisibility, status, id, company, selectedData } = this.state;

        // const image = (
        //     <div style={{ display: "flex", justifyContent: "center" }}>
        //         <img
        //             src={"/assets/edit.png"}
        //             className={styles.icon}
        //             onClick={() =>
        //                 this.setState({
        //                     branchModalVisibility: true,
        //                 })
        //             }
        //         />
        //     </div>
        // );
        const valuesNew = company.map((m) => ({
            outlet_id: m.outlet_id,
            outlet_name: this.onClick({ value: m.outlet_name, id: m.outlet_id }),
            outlet_nickname: this.onClick({ value: m.outlet_nickname, id: m.outlet_id }),
            status: this.badge({ value: m.is_active, id: m.outlet_id }),
            action: (
                <div style={{ display: "flex", justifyContent: "center" }}>
                    <img
                        src={"/assets/edit.png"}
                        className={styles.icon}
                        onClick={() =>
                            this.setState({
                                branchModalVisibility: true,
                                selectedData: m,
                            })
                        }
                    />
                </div>
            ),
        }));

        const getExportFile = () => {
            const TABLE_HEADER = {
                SNo: "SNo",
                outlet_id: "Id",
                outlet_name: "Name",
                outlet_nickname: "Nickname",
            };
            const formattedData = [];
            valuesNew.forEach((d, i) => {
                formattedData.push({
                    SNo: i + 1,
                    outlet_id: d.outlet_id,
                    outlet_name: d.outlet_name,
                    outlet_nickname: d.outlet_nickname,
                });
            });
            exportCSVFile(
                TABLE_HEADER,
                formattedData,
                "branch_details" + moment().format("DD-MMY-YYYY")
            );
        };

        return (
            <Formik>
                <Form>
                    <GlobalWrapper title="Branch Details">
                        {/* {branchModalVisibility && (
                            <BranchModal
                                data={selectedData}
                                visibility={branchModalVisibility}
                                setVisibility={(v) =>
                                    this.setState({ branchModalVisibility: v })
                                }
                            />
                        )} */}
                        <Head />
                        <Flex
                            templateColumns="repeat(3, 1fr)"
                            gap={6}
                            colSpan={2}
                        >
                            <Container
                                className={styles.container}
                                boxShadow="lg"
                            >
                                <p className={styles.buttoninputHolder}>
                                    <div>Branch Details</div>
                                    <div style={{ paddingRight: 10 }}>
                                    <Link href="/branchModal/create">
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
}
