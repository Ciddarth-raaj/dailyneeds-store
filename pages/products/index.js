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
import productHelper from "../../helper/product";
import styles from "../../styles/admin.module.css";
import CustomInput from "../../components/customInput/customInput";
import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import Table from "../../components/table/table";
import exportCSVFile from "../../util/exportCSVFile";
import moment from "moment";
import Link from "next/link";
import { m } from "framer-motion";

let valuesNew = [];
class product extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: false,
            optionSelected: null,
            details: [],
            new_header: false,
        };
    }
    componentDidMount() {
        this.getProductData();
    }
  
    getProductData() {
        productHelper.getProduct()
            .then((data) => {
                this.setState({ details: data });
            })
            .catch((err) => console.log(err));
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
            s_no: "S.No",
            product_id: "Product Id",
            gf_item_name: "Item Name",
            variant: "Variant",
            variant_of: "Variant Of",
            brand_name: "Brand Name",
            department_name: "Department Name",
            category_name: "Category Name",
            subcategory_name: "Subcategory Name",
            de_distributor: "Distributor",
            keywords: "Keywords",
            gf_manufacturer: "Manufacturer",
            gf_food_type: "Food Type",
            gf_description: "Description",
            gf_detailed_description: "Detailed Description",
            gf_weight_grams: "Wight Grams",
            gf_item_product_type: "Product Type",
            measure: "Measure",
            measure_in: "Measure In",
            packaging_type: "Packaging Type",
            cleaning: "Cleaning",
            sticker: "Sticker",
            grinding: "Grinding",
            cover_type: "Cover Type",
            cover_sizes: "Cover Sizes",
            gf_tax_id: "Tax Id",
            return: "Return",
            gf_status: "Status",
            gf_applies_online: "Applies Online"
        };
        const formattedData = [];
        valuesNew.forEach((d, i) => {
            formattedData.push({
                SNo: i + 1,
                product_id: d.product_id,
                gf_item_name: d.gf_item_name,
                variant: d.variant,
                variant_of: d.variant_of,
                brand_name: d.brand_name,
                department_name: d.department_name,
                category_name: d.category_name,
                subcategory_name: d.subcategory_name,
                de_distributor: d.de_distributor,
                keywords: d.keywords,
                gf_manufacturer: d.gf_manufacturer,
                gf_food_type: d.gf_food_type,
                gf_description: d.gf_description,
                gf_detailed_description: d.gf_detailed_description,
                gf_weight_grams: d.gf_weight_grams,
                gf_item_product_type: d.gf_item_product_type,
                measure: d.measure,
                measure_in: d.measure_in,
                packaging_type: d.packaging_type,
                cleaning: d.cleaning,
                sticker: d.sticker,
                grinding: d.grinding,
                cover_type: d.cover_type,
                cover_sizes: d.cover_sizes,
                gf_tax_id: d.gf_tax_id,
                return: d.return,
                gf_status: d.gf_status,
                gf_applies_online: d.gf_applies_online
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
        const { loading, optionSelected, new_header, details } = this.state;

        let new_table_title = {};
        let new_table_value = {};
        let table_title = {
            s_no: "S.No",
            product_id: "Product Id",
            brand_name: "Name",
            category_name: "Category Name",
            subcategory_name: "Sub Category Name",
            department_name: "Department Name",
            // action: "Action"
        }

        const onClick = (m) => (
            <Link href={`/products/${m.id}`}>{m.value}</Link>
        );
        const image = (m) => (
            <div style={{ display: "flex", justifyContent: "center" }}>
                <img
                    src={"/assets/edit.png"}
                    onClick={() => (window.location = `/products/${m}`)}
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

        valuesNew = details.map((m, i) => (
            {
                s_no: i + 1,
                product_id: m.product_id,
                brand_name: onClick({value: m.brand_name !== "" ? m.brand_name : m.de_display_name, id: m.product_id}),
                category_name: onClick({value: m.category_name, id: m.product_id}),
                subcategory_name: onClick({value: m.subcategory_name, id: m.product_id}),
                department_name: onClick({value: m.department_name, id: m.product_id}),
                // action: image(m.product_id)
            }
        ));

        if (new_header === true) {
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
                                    <div style={{ marginBottom: "60px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
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
                                                    loadingText="Loading"
                                                    colorScheme="purple"
                                                    onClick={() => this.setState({ new_header: true })}
                                                >
                                                    {"Done"}
                                                </Button>
                                            </ButtonGroup>
                                        </div>
                                    </div>
                                    {/* <CheckboxGroup colorScheme="purple">
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
                                    </CheckboxGroup> */}
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
