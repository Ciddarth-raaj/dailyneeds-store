import { Formik, Form } from "formik";
import { Container, Flex, Button, ButtonGroup, Checkbox, Badge, Select, InputGroup, Input, InputLeftAddon } from "@chakra-ui/react";
import styles from "../../styles/createdespatch.module.css";
import React from "react";
import { toast } from "react-toastify";
import { ChevronRightIcon, ChevronLeftIcon } from "@chakra-ui/icons";

import Head from "../../util/head";
import CustomInput from "../../components/customInput/customInput";
import VehicleHelper from "../../helper/vehicle";
import StoreHelper from "../../helper/store";
import IndentHelper from "../../helper/indent";
import DespatchHelper from "../../helper/despatch";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Validation } from "../../util/validation";
import Table from "../../components/table/table";
import exportCSVFile from "../../util/exportCSVFile";
import moment from "moment";

class viewDespatch extends React.Component {
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
            vehicle_details: [],
            id: '',
            checkbox: [],
            selectedFile: null,
            category_id: '',
            limit: 10,
            splice: [0, 10],
            offsetToggle: false,
            delivery_status: 0,
            offset: 0,
        };
    }

    componentDidMount() {
        this.getStore();
        this.getVehicle();
        this.getDespatchIndent();
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
    getVehicle() {
        VehicleHelper.getVehicle()
            .then((data) => {
                this.setState({ vehicle_details: data })
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
    createDespatch = async (values) => {
        const { checkbox } = this.state;
        values.indent_id =  `${checkbox}`;
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
        for(let i = 0; i <= this.state.checkbox.length; i++) {
            if(this.state.checkbox[i] === m.id) {
                this.state.checkbox.splice(this.state.checkbox.indexOf(this.state.checkbox[i]),1);
                break;
            }
            if(this.state.checkbox[i] !== m.id) {
            this.state.checkbox.push(m.id);
            break;
            }
        }
    }} 
    />

    render() {
        const { details, pages, splice, paginate_filter, checkbox, id, vehicle_details,selectedFile, store_data, image_url, loading } = this.state;
        console.log({ details: checkbox })
        for(let i = 0; i < checkbox.length; i++) {
        console.log({ details2: i })
        }
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
            status: "Delivery Status",
            addespatch: "Add To Despatch"
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
            status: m.delivery_status,
            addespatch: this.badge({ id: m.indent_id }),
        }));


        return (
            <GlobalWrapper title="Create Despatch">
            <Head />
            <Formik
                initialValues={{
                    store_id: '',
                    store_to: '',
                    vehicle: '',
                    driver: '',
                    indent_id: ''
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
                                    <Container className={styles.container} mb={5} boxShadow="lg">
                                        <p className={styles.buttoninputHolder}>
                                            <div>Vehicle {'&'} Driver Details</div>
                                        </p>
                                        <div className={styles.generateIndent}>
                                            <div className={styles.indentHolder}>
                                                <div className={styles.subInputHolder}>
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
                                                </div>
                                                <div className={styles.subInputHolder}>
                                                <CustomInput
                                                        label="To Store"
                                                        values={store_data.map((m) => ({
                                                            id: m.id,
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
                                                        label="Vehicle"
                                                        values={vehicle_details.map((m) => ({
                                                            id: m.vehicle_number,
                                                            value: `${m.vehicle_number} / ${m.engine_number} / ${m.chasis_number} `
                                                        }))}
                                                        name="vehicle"
                                                        type="text"
                                                        method="switch"
                                                    />
                                                </div>
                                                <div className={styles.subInputHolder}>
                                                <CustomInput
                                                        label="Driver"
                                                        values={store_data.map((m) => ({
                                                            id: m.value,
                                                            value: m.value
                                                        }))}
                                                        name="driver"
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
                                                    {"Add To Despatch"}
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

export default viewDespatch;
