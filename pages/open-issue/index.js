import { Formik, Form } from "formik";
import { Container, Flex, Button, ButtonGroup, Badge, Select, InputGroup, Input, InputLeftAddon } from "@chakra-ui/react";
import styles from "../../styles/indent.module.css";
import React from "react";
import { toast } from "react-toastify";
import { ChevronRightIcon, ChevronLeftIcon } from "@chakra-ui/icons";

import Head from "../../util/head";
import CustomInput from "../../components/customInput/customInput";
import StoreHelper from "../../helper/store";
import IndentHelper from "../../helper/indent";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { OpenIssueValidation } from "../../util/validation";
import Table from "../../components/table/table";
import exportCSVFile from "../../util/exportCSVFile";
import moment from "moment";

class openIssue extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: false,
            indentToggle: false,
            details: [],
            paginate_filter: false,
            pages: [],
            store_data: [],
            image_url: '',
            id: '',
            selectedFile: null,
            category_id: '',
            limit: 10,
            splice: [0, 10],
            offsetToggle: false,
            offset: 0,
        };
    }

    componentDidMount() {
        this.getStore();
    }

    getStore() {
        StoreHelper.getStore()
            .then((data) => {
                this.setState({ store_data: data })
            })
            .catch((err) => console.log(err))
    }
  
    getExportFile = () => {
        const TABLE_HEADER = {
            request_id: "Request Id",
            issue_title: "Issue Title",
            description: "Description",
            request_date: "Request Date",
            issued_store: "Issued Store",
            payment_status: "Payment Status",
        };
        const formattedData = [];
        valuesNew.forEach((d) => {
            formattedData.push({
                sno: d.id,
                request_id: request_id,
                issue_title: m.issue_title,
                description: m.description,
                request_date: m.request_date,
                issued_store: m.issued_store,
                payment_status: m.payment_status,
            });
        });
        exportCSVFile(
            TABLE_HEADER,
            formattedData,
            "open issue" + moment().format("DD-MMY-YYYY")
        );
    };
   
    render() {
        const { details, pages, splice, paginate_filter, id, selectedFile, store_data, image_url, loading } = this.state;
        let valuesNew = [];
        const initialValue = {
            dob_1: "",
            dob_2: "",
        };

        const table_title = {
            request_id: "Request Id",
            issue_title: "Issue Title",
            description: "Description",
            request_date: "Request Date",
            issued_store: "Issued Store",
            payment_status: "Payment Status",
            detail_update: "Detail Updates",
            status: "Status"
        };

        // after adding table detail unquote
        // ----> 
        // valuesNew = details.map((m, i) => ({
        //     request_id: request_id,
        //     issue_title: m.issue_title,
        //     description: m.description,
        //     request_date: m.request_date,
        //     issued_store: m.issued_store,
        //     payment_status: m.payment_status,
        //     detail_update: m.detail_update,
        //     status: m.status,
        // }));


        return (
            <GlobalWrapper title="Open Issue">
            <Head />
            <Formik
                initialValues={{
                    store_id: '',
                    from_date: '',
                    to_date: '',
                }}
                onSubmit={(values) => {
                    console.log(values);
                }}
                // validationSchema={OpenIssueValidation}
            >
                {(formikProps) => {
                    const { handleSubmit, resetForm } = formikProps;
                    return (
                        <Form onSubmit={formikProps.handleSubmit}>
                                <Flex templateColumns="repeat(3, 1fr)" flexDirection={"column"} gap={6} colSpan={2}>
                                    <Container className={styles.container} mb={5} boxShadow="lg">
                                        <p className={styles.buttoninputHolder}>
                                            <div>All Open Issues</div>
                                        </p>
                                        <div className={styles.generateIndent}>
                                            <div className={styles.indentHolder}>
                                                    <CustomInput
                                                        label="Please Select Store"
                                                        values={store_data.map((m) => ({
                                                            id: m.id,
                                                            value: m.value
                                                        }))}
                                                        name="store_id"
                                                        type="text"
                                                        method="switch"
                                                    />
                                            </div>
                                            <div className={styles.indentHolder}>
                                                <div className={styles.subInputHolder}>
                                                <CustomInput
														label="Date From"
														name="from_date"
														type="text"
														method="datepicker"
													/>
                                                </div>
                                                <div className={styles.subInputHolder}>
                                                <CustomInput
														label="Date To"
														name="to_date"
														type="text"
														method="datepicker"
													/>
                                                </div>
                                            </div>
                                            <div className={styles.indentButtonHolder}>
                                                <Button
                                                    variant="outline"
                                                    colorScheme="purple"
                                                    onClick={() => { handleSubmit() }}
                                                >
                                                    {"Search"}
                                                </Button>
                                                <Button
                                                    ml={"2%"}
                                                    variant="outline"
                                                    colorScheme="red"
                                                    onClick={() => resetForm()}
                                                >
                                                    {"Reset"}
                                                </Button>
                                            </div>
                                        </div>
                                    </Container>
                                    <Container className={styles.container} boxShadow="lg">
                                        <p className={styles.buttoninputHolder}>
                                            <div>View Details</div>
                                        </p>
                                        <div>
                                            <Table
                                                heading={table_title}
                                                rows={valuesNew}
                                                sortCallback={(key, type) =>
                                                    sortCallback(key, type)
                                                }
                                            />
                                            {paginate_filter !== true ? (
                                                <div className={styles.paginate}>
                                                    <div className={styles.paginateContent}>
                                                        <div
                                                            className={styles.arrow}
                                                            style={{ pointerEvents: this.state.splice[0] !== 0 ? "auto" : "none" }}
                                                            onClick={() =>
                                                                this.setState({
                                                                    splice: [this.state.splice[0] - 10, this.state.splice[1] - 10]
                                                                })}
                                                        >
                                                            <ChevronLeftIcon />
                                                        </div>
                                                        {pages.slice(splice[0], splice[1]).map((m) => (
                                                            <div
                                                                className={styles.paginateHolder}
                                                                onClick={() => {
                                                                    this.setState({ offsetToggle: true, offset: (m - 1) * 10 })
                                                                }}
                                                            >
                                                                {m}
                                                            </div>
                                                        ))}
                                                        <div
                                                            className={styles.arrow}
                                                            onClick={() =>
                                                                this.setState({
                                                                    splice: [this.state.splice[0] + 10, this.state.splice[1] + 10]
                                                                })}
                                                        >
                                                            <ChevronRightIcon />
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className={styles.paginate}>
                                                    <div className={styles.paginateContent}>
                                                        <div
                                                            className={styles.arrow}
                                                            style={{ pointerEvents: this.state.splice[0] !== 0 ? "auto" : "none" }}
                                                            onClick={() =>
                                                                this.setState({
                                                                    splice: [this.state.splice[0] - 10, this.state.splice[1] - 10]
                                                                })}
                                                        >
                                                            <ChevronLeftIcon />
                                                        </div>
                                                        {pages.slice(splice[0], splice[1]).map((m) => (
                                                            <div
                                                                className={styles.paginateHolder}
                                                                onClick={() => {
                                                                    this.setState({ filterOffsetToggle: true, offset: (m - 1) * 10 })
                                                                }}
                                                            >
                                                                {m}
                                                            </div>
                                                        ))}
                                                        <div
                                                            className={styles.arrow}
                                                            onClick={() =>
                                                                this.setState({
                                                                    splice: [this.state.splice[0] + 10, this.state.splice[1] + 10]
                                                                })}
                                                        >
                                                            <ChevronRightIcon />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
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
                        </Form>
                    );
                }}
            </Formik>
            </GlobalWrapper>
        );
    }
}

export default openIssue;
