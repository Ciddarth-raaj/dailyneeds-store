import { Formik, Form } from "formik";
import { Container, Flex, Button, ButtonGroup, Checkbox, Badge, Select, InputGroup, Input, InputLeftAddon } from "@chakra-ui/react";
import styles from "../../styles/whatsapporder.module.css";
import React from "react";
import { toast } from "react-toastify";
import { ChevronRightIcon, ChevronLeftIcon } from "@chakra-ui/icons";

import Head from "../../util/head";
import CustomInput from "../../components/customInput/customInput";
import StoreHelper from "../../helper/store";
import ProductHelper from "../../helper/product";
import BranchHelper from "../../helper/outlets";
import { Order } from "../../constants/values";
import IssuePage from "../../components/issuePage/issue-page";
import IndentHelper from "../../helper/indent";
import DespatchHelper from "../../helper/despatch";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Validation } from "../../util/validation";
import Table from "../../components/table/table";
import exportCSVFile from "../../util/exportCSVFile";
import moment from "moment";
import Link from "next/link";

class whatsappOrder extends React.Component {
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
            issue_data: [],
            checkbox: [],
            selectedFile: null,
            store_trigger: false,
            despatch_details: [],
            store_name: '',
            final_data: [],
            store_id: null,
            issueVisibility: false,
            store_number: null,
            category_id: '',
            branch: [],
            limit: 10,
            delivery_status: 1,
            splice: [0, 10],
            offsetToggle: false,
            offset: 0,
            user_type: null,
        };
    }

    componentDidMount() {
        const store = global.config.store_id;
        this.getBranchData();
    }
    componentDidUpdate() {
        const { offsetToggle, indentToggle, store_trigger } = this.state;
        if (offsetToggle !== false) {
            this.getIndent();
            this.setState({ offsetToggle: false })
        }
        if (store_trigger === true) {
            this.getDespatchByStoreId();
            this.setState({ store_trigger: false })
        }
        if (indentToggle === true) {
            this.getIndent()
            this.setState({ indentToggle: false })
        }
    }
    getExportFile = () => {
        const TABLE_HEADER = {
            sno: "SNo",
            indent_no: "Indent No",
            from: "From",
            to: "To",
            bags: "Bags",
            boxes: "Boxes",
            crates: "Crates",
            taken_by: "Taken By",
            checked_by: "Checked By",
            status: "Delivery Status"
        };
        const formattedData = [];
        valuesNew.forEach((d) => {
            formattedData.push({
                sno: d.id,
                indent_no: d.indent_number,
                from: d.from,
                to: d.to,
                bags: d.bags,
                boxes: d.boxes,
                crates: d.crates,
                taken_by: d.taken_by,
                checked_by: d.checked_by,
                status: d.delivery_status
            });
        });
        exportCSVFile(
            TABLE_HEADER,
            formattedData,
            "indent_details" + moment().format("DD-MMY-YYYY")
        );
    };

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
    getBranchData() {
        BranchHelper.getOutlet()
            .then((data) => {
                this.setState({ branch: data });
            })
            .catch((err) => console.log(err));
    }

    getDespatch() {
        DespatchHelper.getDespatch()
            .then((data) => {
                this.setState({ despatch_details: data })
            })
            .catch((err) => console.log(err))
    }

    handleOnChange = (e) => {
        this.setState({
            limit: e.target.value
        })
    }
    getProductCount() {
        const tempArray = []
        var count = 1;
        ProductHelper.getProductCount()
            .then((data) => {
                count = Math.ceil(parseInt(data[0].prodcount) / 10);
                for (let i = 1; i <= count; i++) {
                    tempArray.push(i);
                }
                // console.log({tempArray: tempArray});
                this.setState({ pages: tempArray })
            })
    }
  
    action = (m) => (
        <div >
            <Button mb={'20px'} isDisabled={true} colorScheme="purple" w={'100%'} onClick={() => this.acceptIndent()}>Accept</Button>
            <Button colorScheme="red" w={'100%'} onClick={() => this.setState({ issue_data: m, issueVisibility: true })}>Issue</Button>
        </div>
    )
    render() {
        const { details, pages, splice, paginate_filter, branch, issue_data, issueVisibility, despatch_details, final_data, store_number, store_name, store_data } = this.state;
        // console.log({insiderender: despatch_details})
        let valuesNew = [];
        const initialValue = {
            dob_1: "",
            dob_2: "",
        };

        const table_title = {
            sno: "SNo",
            order_id: "Order ID",
            customer_name: "Customer Name",
            customer_mobile: "Customer Mobile",
            date_time: "Date and Time",
            store: "Store",
            bill_no: "bill_no",
            status: "Status",
        };

        valuesNew = final_data.map((m, i) => ({
                sno: i + 1,
                order_id: m.order_id,
                customer_name: m.customer_name,
                customer_mobile: m.customer_mobile,
                date_time: m.date_time,
                store: m.store,
                bill_no: m.bill_no,
                status: m.status,
            }));
        // console.log({state: this.state.store_number})
        return (
            <GlobalWrapper title="Whatsapp Orders">
                <Head />
                <Formik
                    initialValues={{
                        store_id: '',
                        order: '',
                        from_date: '',
                        to_date: '',
                    }}
                    onSubmit={(values) => {
                        this.getIndentByDespatch(values);
                    }}
                // validationSchema={Validation}
                >
                    {(formikProps) => {
                        const { handleSubmit, resetForm, values } = formikProps;
                        // console.log({values: values})
                        return (
                            <Form onSubmit={formikProps.handleSubmit}>
                                <Flex templateColumns="repeat(3, 1fr)" flexDirection={"column"} gap={6} colSpan={2}>
                                    <Container p={"0px"}>
                                        <Container className={styles.container} mb={5} boxShadow="lg">
                                            <p className={styles.buttoninputHolder}>
                                                <div>Filters</div>
                                            </p>
                                            <div className={styles.generateIndent}>
                                                <div className={styles.indentHolder}>
                                                    <div className={styles.subInputHolder}>
                                                        <CustomInput
                                                            label="Store"
                                                            values={branch.map((m) => ({
                                                                id: m.outlet_id,
                                                                value: m.outlet_name
                                                            }))}
                                                            name="store_id"
                                                            type="text"
                                                            method="switch"
                                                        />
                                                    </div>
                                                    <div className={styles.subInputHolder}>
                                                        <CustomInput
                                                            label="New Orders"
                                                            values={Order.map((m) => ({
                                                                id: m.id,
                                                                value: m.value
                                                            }))}
                                                            name="order"
                                                            type="text"
                                                            method="switch"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                <div className={styles.indentHolder}>
                                                    <div className={styles.subInputHolder}>
                                                        <CustomInput
                                                            label="From Date"
                                                            name="from_date"
                                                            type="text"
                                                            method="datepicker"
                                                        />
                                                    </div>
                                                    <div className={styles.subInputHolder}>
                                                        <CustomInput
                                                            label="To Date"
                                                            name="to_date"
                                                            type="text"
                                                            method="datepicker"
                                                        />
                                                    </div>
                                                    </div>
                                                </div>
                                                <div className={styles.indentButtonHolder}>
                                                    <Button
                                                        variant="outline"
                                                        colorScheme="purple"
                                                        onClick={() => { handleSubmit() }}
                                                    >
                                                        {"Get Details"}
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
                                                <div>Whatsapp Order</div>
                                                <div style={{ paddingRight: 20 }}>
                                            <Link href="/whatsapp/create">
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

export default whatsappOrder;
