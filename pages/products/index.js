import { Formik, Form } from "formik";
import React from "react";
import { components } from "react-select";

import {
    Container,
    Flex,
    ButtonGroup,
    Button,
    CheckboxGroup,
    VStack,
    Checkbox,
    Select,
    Grid,
} from "@chakra-ui/react";
import { withRouter } from "next/router";
import { default as ReactSelect } from "react-select";
import { DropDownOption } from "../../constants/values";
import styles from "../../styles/admin.module.css";
import CustomInput from "../../components/customInput/customInput";
import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import Table from "../../components/table/table";
import exportCSVFile from "../../util/exportCSVFile";
import moment from "moment";
import { m } from "framer-motion";

class product extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: false,
            optionSelected: null,
            new_header: false,
        };
    }

    Option = (props) => {
        return (
            <div>
                <components.Option {...props}>
                    <input
                        type="checkbox"
                        checked={props.isSelected}
                        onChange={() => null}
                    />{" "}
                    <label>{props.label}</label>
                </components.Option>
            </div>
        );
    };
    getExportFile = () => {
        const TABLE_HEADER = {
            SNo: "SNo",
            id: "Id",
            name: "Name",
            variants: "Variants",
        };
        const formattedData = [];
        valuesNew.forEach((d, i) => {
            formattedData.push({
                SNo: i + 1,
                id: d.id,
                name: d.name,
                variants: d.variants,

            });
        });
        exportCSVFile(
            TABLE_HEADER,
            formattedData,
            "product_details" + moment().format("DD-MMY-YYYY")
        );
    };
    handleChange = (selected) => {
        this.setState({
            optionSelected: selected
        });
    };

    render() {
        const { loading, optionSelected, new_header } = this.state;

        let new_table_title = {};
        let new_table_value = {};
        let table_title = {
            s_no: "S.No",
            id: "Id",
            name: "Name",
            department_name: "Department Name",
            action: "Action",
        }

        const image = (m) => (
            <div style={{ display: "flex", justifyContent: "center" }}>
                <img
                    src={"/assets/edit.png"}
                    onClick={() => (window.location = `/designation/${m}`)}
                    className={styles.icon}
                />
            </div>
        );

        if (new_header === true) {
            optionSelected.map((m, index) => (
                new_table_title[m.value] = m.label,
                new_table_value[index] = m.value
            ))
        }
        const details = [
            {
                s_no: "1",
                id: "19",
                name: "Noodles",
                display_name: "Gobi",
                brand_name: "Nestlé",
                combo_name: "Family Pack",
                department_name: "Food",
                category_name: "Noodles",
                subcategory_name: "Cup Noodles",
                distributor: "City Supermarket",
                distributor_name: "Ram",
                manufacturer_name: "Nestlé",
                flavours: "Medium Spicy",
                measure: "",
                measure_in: "22",
                packaging_type: "Box, Family Pack, Sachet",
                preparation_type: "1",
                cleaning: "",
                packing_type: "3",
                sticker: "",
                grinding: "",
                cover_type: "",
                cover_size: "70",
                tax_id: "",
                hsn_code: "190230",
                status: "Available",
                is_online_allowed: "",
                life_cycle: "5",
            },
            {
                s_no: "2",
                id: "19",
                name: "Noodles",
                display_name: "Maggi",
                brand_name: "Nestlé",
                combo_name: "Family Pack",
                department_name: "Food",
                category_name: "Noodles",
                subcategory_name: "Cup Noodles",
                distributor: "City Supermarket",
                distributor_name: "Ram",
                manufacturer_name: "Nestlé",
                flavours: "Medium Spicy",
                measure: "",
                measure_in: "22",
                packaging_type: "Box, Family Pack, Sachet",
                preparation_type: "1",
                cleaning: "",
                packing_type: "3",
                sticker: "",
                grinding: "",
                cover_type: "",
                cover_size: "70",
                tax_id: "",
                hsn_code: "190230",
                status: "Available",
                is_online_allowed: "",
                life_cycle: "5",
            },
            {
                s_no: "3",
                id: "19",
                name: "Noodles",
                display_name: "Maggi",
                brand_name: "Nestlé",
                combo_name: "Family Pack",
                department_name: "Food",
                category_name: "Noodles",
                subcategory_name: "Cup Noodles",
                distributor: "City Supermarket",
                distributor_name: "Ram",
                manufacturer_name: "Nestlé",
                flavours: "Medium Spicy",
                measure: "",
                measure_in: "22",
                packaging_type: "Box, Family Pack, Sachet",
                preparation_type: "1",
                cleaning: "",
                packing_type: "3",
                sticker: "",
                grinding: "",
                cover_type: "",
                cover_size: "70",
                tax_id: "",
                hsn_code: "190230",
                status: "Available",
                is_online_allowed: "",
                life_cycle: "5",
            },
        ];
        var valuesNew = {};
        valuesNew = details.map((m) => ({
            s_no: m.s_no,
            id: m.id,
            name: m.name,
            department_name: m.department_name,
            action: image(m.id),
        }));

        if(new_header === true) {
            valuesNew = details.map((m, i) => (
            optionSelected.map((n) => (
                    new_table_value[i] = m[n.value]
                ))
        ))
        }

        const sortCallback = (key, type) => {
            console.log(key, type);
        };
        return (
            <Formik>
                <Form>
                    <GlobalWrapper title="Products">
                        <Head />
                        <Flex templateColumns="repeat(3, 1fr)" gap={6} colSpan={2}>
                            <Container className={styles.container} boxShadow="lg">
                                <p className={styles.buttoninputHolder}>
                                    <div>Product Details</div>
                                </p>
                                <div>
                                    <div className={styles.personalInputHolder}>
                                        <CustomInput
                                            label="Search by Name or ID"
                                            name="search"
                                            type="text"
                                        />

                                        <ButtonGroup
                                            mt={5}
                                            style={{ justifyContent: "flex-end" }}
                                            type="submit"
                                        >
                                            <Button
                                                isLoading={loading}
                                                loadingText="Searching"
                                                colorScheme="purple"
                                            >
                                                {"Search"}
                                            </Button>
                                        </ButtonGroup>
                                    </div>
                                    <div style={{marginBottom: "60px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                                        <div className={styles.subInputHolder}>
                                        <label className={styles.infoLabel}>Choose Table Filter</label>
                                            <div>
                                                <ReactSelect
                                                    options={
                                                        DropDownOption
                                                    }
                                                    isMulti
                                                    theme={this.customTheme}
                                                    closeMenuOnSelect={false}
                                                    hideSelectedOptions={false}
                                                    isSearchable
                                                    components={this.Option}
                                                    onChange={this.handleChange}
                                                    allowSelectAll={true}
                                                    value={optionSelected}
                                                />
                                            </div>
                                        </div>
                                        <div className={styles.subButtonHolder}>
                                            <ButtonGroup
                                                type="submit"
                                            >
                                                <Button
                                                    isLoading={loading}
                                                    loadingText="Searching"
                                                    colorScheme="purple"
                                                    onClick={() => this.setState({ new_header: true })}
                                                >
                                                    {"Search"}
                                                </Button>
                                            </ButtonGroup>
                                        </div>
                                    </div>
                                    <CheckboxGroup colorScheme="purple">
                                        <Grid
                                            templateColumns="repeat(3, 1fr)"
                                            gap={6}
                                            mb={5}
                                            ml={2}
                                        >
                                            <Checkbox>W/O Images</Checkbox>
                                            <Checkbox>W/O Description</Checkbox>
                                            <Checkbox>New</Checkbox>
                                        </Grid>
                                    </CheckboxGroup>
                                    <Table
                                        heading={new_header === false ? table_title : new_table_title}
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

export default withRouter(product);
