import { Formik, Form } from "formik";
import { Container, Flex, Button, ButtonGroup, Checkbox, Badge, Select, InputGroup, Input, InputLeftAddon } from "@chakra-ui/react";
import styles from "../../styles/acceptindent.module.css";
import React from "react";
import { toast } from "react-toastify";
import { ChevronRightIcon, ChevronLeftIcon } from "@chakra-ui/icons";

import Head from "../../util/head";
import CustomInput from "../../components/customInput/customInput";
import StoreHelper from "../../helper/store";
import IssueHelper from "../../helper/issue";
import IndentHelper from "../../helper/indent";
import DespatchHelper from "../../helper/despatch";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Validation } from "../../util/validation";
import Table from "../../components/table/table";
import exportCSVFile from "../../util/exportCSVFile";
import moment from "moment";
import { store_id } from "../../constants/variables";

class issueSent extends React.Component {
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
            issue_data: [],
            id: '',
            store_id: null,
            checkbox: [],
            selectedFile: null,
            category_id: '',
            limit: 10,
            delivery_status: 4,
            splice: [0, 10],
            offsetToggle: false,
            offset: 0,
            update_value: false
        };
    }

    componentDidMount() {
        this.getIssue();
        const store_id = localStorage.getItem('Store_id')
        if(this.state.update_value === false) {
            this.getIssueByStoreId(store_id)
            this.setState({update_value: true})
        }
    }

    // componentDidUpdate() {
    //     const { offsetToggle, indentToggle } = this.state;
    //     if (offsetToggle !== false) {
    //         this.getIndent();
    //         this.setState({ offsetToggle: false })
    //     }

    //     if (indentToggle === true) {
    //         this.getIndent()
    //         this.setState({ indentToggle: false })
    //     }
    // }
    getExportFile = () => {
        const TABLE_HEADER = {
            sno: "SNo",
            from: "From Store",
            to: "To Store",
            item_id: "Item id",
            item_name: "Item Name",
            sent: "Sent",
            received: "Received",
            difference: "Difference",
            status: "Delivery Status"
        };
        const formattedData = [];
        valuesNew.forEach((d, i) => {
            formattedData.push({
                sno: i + 1,
                from: d.from,
                to: d.to,
                item_id: d.product_id,
                item_name: d.de_name,
                sent: d.sent,
                received: d.received,
                difference: d.difference,
                status: d.delivery_status
            });
        });
        exportCSVFile(
            TABLE_HEADER,
            formattedData,
            "indent_details" + moment().format("DD-MMY-YYYY")
        );
    };
    getIssueByStoreId(store_id) {
        if(store_id !== 'null') {
        IssueHelper.getIssueFromStoreId(store_id)
        .then((data) => {
            this.setState({ issue_data: data })
        })
        .catch((err) => console.log(err))
    }
    }
    getIssue() {
        const id = localStorage.getItem('Store_id')
        if(id === 'null') {
        IssueHelper.getIssue()
        .then((data) => {
            this.setState({ issue_data: data })
        })
        .catch((err) => console.log(err))
        }
    }
    getStoreById(store_id) {
        StoreHelper.getStoreById(store_id)
        .then((data) => {
            this.setState({ store_name: data[0].store_name })
        })
        .catch((err) => console.log(err))
    }
    getIndentCount() {
        const tempArray = []
        var count = 1;
        IndentHelper.getIndentCount()
            .then((data) => {
                count = Math.ceil(parseInt(data[0].indentcount) / 10);
                for (let i = 1; i <= count; i++) {
                    tempArray.push(i);
                }
                this.setState({ pages: tempArray })
            })
    }
    getStore() {
        StoreHelper.getStore()
            .then((data) => {
                this.setState({ store_data: data })
            })
            .catch((err) => console.log(err))
    }
    getDespatchIndent() {
        const { offset, limit, delivery_status } = this.state;
        IndentHelper.getDespatchIndent(offset, limit, delivery_status)
            .then((data) => {
                this.setState({ details: data })
            })
            .catch((err) => console.log(err))
    }

    handleOnChange = (e) => {
        this.setState({
            limit: e.target.value
        })
    }
    action = (m) => (
        <div>
        <Button colorScheme="purple" w={'100%'}  onClick={() => this.acceptIndent()}>Accept</Button>
        <Button  colorScheme="red" w={'100%'}  onClick={() => this.acceptIndent()}>Issue</Button>
        </div>
    )
    render() {
        const { details, pages, splice, paginate_filter, issue_data,checkbox, id, selectedFile, store_data, image_url, loading } = this.state;
        // console.log({issue: issue_data})
        let valuesNew = [];
        const initialValue = {
            dob_1: "",
            dob_2: "",
        };

        const table_title = {
            sno: "SNo",
            from: "From Store",
            to: "To Store",
            item_id: "Item id",
            item_name: "Item Name",
            sent: "Sent",
            received: "Received",
            difference: "Difference",
            status: "Delivery Status"
        };
      
        valuesNew = issue_data.map((d, i) => ({
            sno: i + 1,
            from: d.from,
            to: d.to,
            item_id: d.product_id,
            item_name: d.de_name,
            sent: d.sent,
            received: d.received,
            difference: d.difference,
            status: d.delivery_status === 5 ? "Issue" : d.delivery_status
        }));

        return (
            <GlobalWrapper title="Indent issues List - Indent Sent">
             
            <Formik
                initialValues={{
                    store_id: '',
                    despatch: ''
                }}
                onSubmit={(values) => {
                    this.createDespatch(values);
                }}
                // validationSchema={Validation}
            >
                {(formikProps) => {
                    const { handleSubmit, resetForm } = formikProps;
                    return (
                        <Form onSubmit={formikProps.handleSubmit}>
                                <Flex templateColumns="repeat(3, 1fr)" flexDirection={"column"} gap={6} colSpan={2}>
                                    <Container className={styles.container} boxShadow="lg">
                                        <p className={styles.buttoninputHolder}>
                                            <div>Indent issues List - Indent Sent</div>
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

export default issueSent;
