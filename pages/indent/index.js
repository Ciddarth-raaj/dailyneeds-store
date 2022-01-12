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
import { Validation } from "../../util/validation";
import Table from "../../components/table/table";
import exportCSVFile from "../../util/exportCSVFile";
import moment from "moment";

class viewIndent extends React.Component {
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
            store_name: '',
            category_id: '',
            limit: 10,
            splice: [0, 10],
            offsetToggle: false,
            store_id: null,
            offset: 0,
            user_type: null,
        };
    }

    componentDidMount() {
        const store = global.config.store_id;
        this.setState({store_id: store.store_id});
        if(store !== null) {
            this.getStoreById(store);
        }
        this.getStore();
        this.getIndent();
        this.getIndentCount();
    }
    componentDidUpdate() {
        const { offsetToggle, indentToggle } = this.state;
        if (offsetToggle !== false) {
            this.getIndent();
            this.setState({ offsetToggle: false })
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
    getStoreById(store_id) {
        StoreHelper.getStoreById(store_id)
        .then((data) => {
            this.setState({ store_name: data})
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
    getIndent() {
        const { offset, limit } = this.state;
        IndentHelper.getIndent(offset, limit)
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
    createIndent = async (values) => {
        const { store_name } = this.state;
        if(store_name === "") {
            values.store_id = `${store_name[0].store_id}`
        }
        IndentHelper.createIndent(values)
            .then((data) => {
            if (data === 200) {
                toast.success("Successfully created Indent");
                this.getIndent();
            } else {
                toast.error("Error creating Account");
                throw `${data.msg}`;
            }
        })
        .catch((err) => console.log(err))
        .finally(() => this.setState({ loading: false }));
    }
    render() {
        const { details, pages, splice, paginate_filter, store_name, store_data } = this.state;
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
            status: "Delivery Status"
        };
        valuesNew = details.map((m, i) => ({
            sno: i + 1,
            indent_no: m.indent_number,
            from: m.from,
            to: m.to,
            bags: m.bags,
            boxes: m.boxes,
            crates: m.crates,
            taken_by: m.taken_by,
            checked_by: m.checked_by,
            status: m.delivery_status === 0 ? 'New Indent' : m.delivery_status === 1 ? 'Despatch Created' : m.delivery_status === 2 ? "Accepted Indent" : m.delivery_status === 5 ? "Issue" : ''
        }));


        return (
            <GlobalWrapper title="Create Indent">
            <Head />
            <Formik
                initialValues={{
                    indent_number: '',
                    store_id: '',
                    store_to: '',
                    bags: '',
                    boxes: '',
                    crates: '',
                    taken_by: '',
                    checked_by: ''
                }}
                onSubmit={(values) => {
                    this.createIndent(values);
                }}
                // validationSchema={Validation}
            >
                
                {(formikProps) => {
                    const { handleSubmit, resetForm, values } = formikProps;
                    return (
                        <Form onSubmit={formikProps.handleSubmit}>
                                <Flex templateColumns="repeat(3, 1fr)" flexDirection={"column"} gap={6} colSpan={2}>
                                    <Container className={styles.container} mb={5} boxShadow="lg">
                                        <p className={styles.buttoninputHolder}>
                                            <div>New Indent</div>
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
                                                        label="To Store"
                                                        values={store_data.map((m) => ({
                                                            id:  m.id,
                                                            value: m.value
                                                        }))}
                                                        name="store_to"
                                                        type="text"
                                                        method="switch"
                                                    />
                                                </div>
                                            </div>
                                            <div className={styles.indentHolder}>
                                                <div className={styles.subInputHolder}>
                                                <CustomInput
                                                        label="Taken By"
                                                        values={store_data.map((m) => ({
                                                            id: m.value,
                                                            value: m.value
                                                        }))}
                                                        name="taken_by"
                                                        type="text"
                                                        method="switch"
                                                    />
                                                </div>
                                                <div className={styles.subInputHolder}>
                                                <CustomInput
                                                        label="Checked By"
                                                        values={store_data.map((m) => ({
                                                            id: m.value,
                                                            value: m.value
                                                        }))}
                                                        name="checked_by"
                                                        type="text"
                                                        method="switch"
                                                    />
                                                </div>
                                            </div>
                                            <div className={styles.indentSubHolder} >
                                                <div style={{ width: "25%" }}> 
                                                    <CustomInput
                                                        placeholder="0"
                                                        name="indent_number"
                                                        type="tel"
                                                        children="Ind. No."
                                                        method="numberinput"
                                                    />
                                                </div>
                                                <div className={styles.indentNumberHolder}>
                                                <CustomInput
                                                    placeholder="0"
                                                    name="bags"
                                                    type="tel"
                                                    children="Bags"
                                                    method="numberinput"
                                                />
                                                </div>
                                                <div className={styles.indentNumberHolder}>
                                                <CustomInput
                                                    placeholder="0"
                                                    name="boxes"
                                                    type="tel"
                                                    children="Boxes"
                                                    method="numberinput"
                                                />
                                                </div>
                                                <div className={styles.indentNumberHolder}>
                                                <CustomInput
                                                    placeholder="0"
                                                    name="crates"
                                                    type="tel"
                                                    children="Crates"
                                                    method="numberinput"
                                                />
                                                </div>
                                            </div>
                                            <div className={styles.indentButtonHolder}>
                                                <Button
                                                    variant="outline"
                                                    colorScheme="purple"
                                                    onClick={() => { handleSubmit() }}
                                                >
                                                    {"Add Indent"}
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

export default viewIndent;
