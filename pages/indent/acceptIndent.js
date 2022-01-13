import { Formik, Form } from "formik";
import { Container, Flex, Button, ButtonGroup, Checkbox, Badge, Select, InputGroup, Input, InputLeftAddon } from "@chakra-ui/react";
import styles from "../../styles/acceptindent.module.css";
import React from "react";
import { toast } from "react-toastify";
import { ChevronRightIcon, ChevronLeftIcon } from "@chakra-ui/icons";

import Head from "../../util/head";
import CustomInput from "../../components/customInput/customInput";
import StoreHelper from "../../helper/store";
import ProductHelper from "../../helper/product";
import IssuePage from "../../components/issuePage/issue-page";
import IndentHelper from "../../helper/indent";
import DespatchHelper from "../../helper/despatch";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Validation } from "../../util/validation";
import Table from "../../components/table/table";
import exportCSVFile from "../../util/exportCSVFile";
import moment from "moment";

class acceptIndent extends React.Component {
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
            store_number: '',
            category_id: '',
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
        this.setState({ store_id: store.store_id !== null ? store.store_id : '' });
        if (store !== "null") {
            this.getStoreById(store);
        }
        this.getStore();
        // this.getDespatchIndent();
        this.getDespatch();
        this.getIndentCount();
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
    getDespatchByStoreId() {
        const { store_number } = this.state;
        const store_id = store_number;
        DespatchHelper.getDespatchByStoreId(store_id)
            .then((data) => {
                this.setState({ despatch_details: data })
            })
            .catch((err) => console.log(err))
    }
    getStoreById(store_id) {
        StoreHelper.getStoreById(store_id)
            .then((data) => {
                this.setState({ store_name: data })
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
    // getDespatchIndent() {
    //     const { offset, limit, delivery_status } = this.state;
    //     IndentHelper.getDespatchIndent(offset, limit, delivery_status)
    //         .then((data) => {
    //             this.setState({ details: data })
    //         })
    //         .catch((err) => console.log(err))
    // }
    getIndentByDespatch(values) {
        delete values.store_id;
        DespatchHelper.getIndentByDespatch(values.despatch_id)
            .then((data) => {
                this.setState({ final_data: data })
            })
            .catch((err) => console.log(err))
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
                console.log({tempArray: tempArray});
                this.setState({ pages: tempArray })
            })
    }
    createDespatch = async (values) => {
        const { checkbox } = this.state;
        values.indent_id = `${checkbox}`;
        if (values.store_id === '') {
            values.store_id = `${store_name[0].store_id}`
        }
        // console.log({ value: values });
        DespatchHelper.createDespatch(values)
            .then((data) => {
                if (data === 200) {
                    toast.success("Successfully Added Despatch");
                    this.getDespatchIndent();
                } else {
                    toast.error("Error Adding Account");
                    throw `${data.msg}`;
                }
            })
            .catch((err) => console.log(err))
            .finally(() => this.setState({ loading: false }));
    }
    badge = (m) => <Checkbox onChange={() => {
        for (let i = 0; i <= this.state.checkbox.length; i++) {
            if (this.state.checkbox[i] === m.id) {
                this.state.checkbox.splice(this.state.checkbox.indexOf(this.state.checkbox[i]), 1);
                break;
            }
            if (this.state.checkbox[i] !== m.id) {
                this.state.checkbox.push(m.id);
                break;
            }
        }
    }}
    />
    action = (m) => (
        <div >
            <Button mb={'20px'} isDisabled={true} colorScheme="purple" w={'100%'} onClick={() => this.acceptIndent()}>Accept</Button>
            <Button colorScheme="red" w={'100%'} onClick={() => this.setState({ issue_data: m, issueVisibility: true })}>Issue</Button>
        </div>
    )
    render() {
        const { details, pages, splice, paginate_filter, issue_data, issueVisibility, despatch_details, final_data, store_number, store_name, store_data } = this.state;

        let valuesNew = [];
        const initialValue = {
            dob_1: "",
            dob_2: "",
        };

        const table_title = {
            sno: "SNo",
            indent_no: "Indent No",
            from: "From",
            to: "To",
            bags: "Bags",
            boxes: "Boxes",
            crates: "Crates",
            taken_by: "Taken By",
            checked_by: "Checked By",
            action: "Action"
        };
        valuesNew = final_data.map((m, i) => ({
            sno: i + 1,
            indent_no: m.indent_number,
            from: m.from,
            to: m.to,
            bags: m.bags,
            boxes: m.boxes,
            crates: m.crates,
            taken_by: m.taken_by,
            checked_by: m.checked_by,
            action: this.action({ id: m.indent_id })
        }));
        return (
            <GlobalWrapper title="Accept Indents">
                <Head />
                <Formik
                    initialValues={{
                        store_id: '',
                        despatch_id: ''
                    }}
                    onSubmit={(values) => {
                        this.getIndentByDespatch(values);
                    }}
                // validationSchema={Validation}
                >
                    {(formikProps) => {
                        const { handleSubmit, resetForm, values } = formikProps;
                        if (values.store_id !== this.state.store_number) {
                            this.setState({ store_number: values.store_id })
                            this.setState({ store_trigger: true })
                        }
                        return (
                            <Form onSubmit={formikProps.handleSubmit}>
                                <Flex templateColumns="repeat(3, 1fr)" flexDirection={"column"} gap={6} colSpan={2}>
                                    <Container p={"0px"}>
                                        {issueVisibility && (
                                            <IssuePage
                                                data={issue_data}
                                                visibility={issueVisibility}
                                                setVisibility={(v) =>
                                                    this.setState({ issueVisibility: v })
                                                }
                                            />
                                        )}
                                        <Container className={styles.container} mb={5} boxShadow="lg">
                                            <p className={styles.buttoninputHolder}>
                                                <div>Accept Indent</div>
                                            </p>
                                            <div className={styles.generateIndent}>
                                                <div className={styles.indentHolder}>
                                                    <div className={styles.subInputHolder}>
                                                        {store_name.length === 0 && (
                                                            <CustomInput
                                                                label="From Store"
                                                                values={store_data.map((m) => ({
                                                                    id: m.id,
                                                                    value: m.value
                                                                }))}
                                                                name="store_id"
                                                                type="text"
                                                                method="switch"
                                                            />
                                                        )}
                                                        {store_name.length !== 0 && (
                                                            <>
                                                                <div className={styles.personalInputStore}>
                                                                    <label
                                                                        htmlFor={"From Store"}
                                                                        className={styles.infoLabel}
                                                                    >From Store</label>
                                                                    <Input
                                                                        value={store_name[0].store_name}
                                                                        isDisabled={true}
                                                                        isReadOnly={true}
                                                                    />
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className={styles.subInputHolder}>
                                                        <CustomInput
                                                            label="Despatch Details"
                                                            values={despatch_details.length !== 0 && despatch_details.map((m) => ({
                                                                id: m.despatch_id,
                                                                value: ` ${m.despatch_id} / ${m.driver} /  ${m.vehicle} `
                                                            }))}
                                                            name="despatch_id"
                                                            type="text"
                                                            method="switch"
                                                        />
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
                                                <div>Indents in Despatch</div>
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

export default acceptIndent;
