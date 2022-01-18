import { Formik, Form } from "formik";
import { Container, Flex, Button, ButtonGroup, Stack, Radio, RadioGroup , Checkbox, Badge, Select, InputGroup, Input, InputLeftAddon } from "@chakra-ui/react";
import styles from "../../styles/createdespatch.module.css";
import React from "react";
import { toast } from "react-toastify";
import { ChevronRightIcon, ChevronLeftIcon } from "@chakra-ui/icons";

import Head from "../../util/head";
import CustomInput from "../../components/customInput/customInput";
import VehicleHelper from "../../helper/vehicle";
import StoreHelper from "../../helper/store";
import BranchHelper from "../../helper/outlets";
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
            branch: [],
            store_data: [],
            image_url: '',
            vehicle_details: [],
            id: '',
            remove_value: false,
            checkbox: [],
            store_name: '',
            user_type: null,
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
        const store = global.config.store_id;
        const usertype = global.config.user_type;
        this.setState({store_id: store});
        this.setState({user_type: usertype});
        if(store !== "null") {
            this.getStoreById(store);
        }
        this.getBranchData();
        // this.getStore();
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
    getBranchData() {
        BranchHelper.getOutlet()
            .then((data) => {
                this.setState({ branch: data });
            })
            .catch((err) => console.log(err));
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
    getStoreById(store_id) {
        BranchHelper.getOutletById(store_id)
        .then((data) => {
            this.setState({ store_name: data})
        })
        .catch((err) => console.log(err))
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
        const { checkbox, store_name } = this.state;
        values.indent_id = `${checkbox}`;
        if(values.store_id === '') {
        values.store_id = `${store_name[0].outlet_id}`;
        }
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
   badge = (m) => 
   <Checkbox onChange={() => {
    let one = false;
    for(let i = 0; i <= this.state.checkbox.length; i++) {
            if(this.state.checkbox[i] === m.id) {
                this.state.checkbox.splice(this.state.checkbox.indexOf(this.state.checkbox[i]),1);
                one = true;
            }
    
        }
        if(one === false) {
        this.state.checkbox.push(m.id);
        }
        one = false;
    }}
    />

    render() {
        const { details, pages, splice, paginate_filter, branch, checkbox, id, vehicle_details, store_name, selectedFile, store_data, image_url, loading } = this.state;
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
                                                {store_name.length === 0 && (
                                                    <CustomInput
                                                        label="From Store"
                                                        values={branch.map((m) => ({
                                                            id: m.outlet_id,
                                                            value: m.outlet_name
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
                                                        value={store_name[0].outlet_name} 
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
                                                        values={branch.map((m) => ({
                                                            id: m.outlet_id,
                                                            value: m.outlet_name
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
                                                            value: `${m.vehicle_number} / ${m.vehicle_name} `
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
