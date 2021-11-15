import { Formik, Form } from "formik";
import React from "react";
import { components } from "react-select";

import {
    Container,
    Flex,
    ButtonGroup,
    Button,
    Input,
    Select,
} from "@chakra-ui/react";

import { ProductPerPage } from "../../constants/values";
import { withRouter } from "next/router";
import { default as ReactSelect } from "react-select";
import { ChevronRightIcon, ChevronLeftIcon } from "@chakra-ui/icons";
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
            hoverElement: false,
            details: [],
            new_header: false,
            name: '',
            paginate_filter: false,
            filter: "",
            limit: 10,
            pages: [],
            filter_click: false,
            offset: 0,
            productToggle: false,
            filter_details: [],
            offsetToggle: false,
            filterOffsetToggle: false,
            splice: [0, 10],
        };
    }
    componentDidMount() {
        this.getProductData();
        this.getProductCount();
    }
    componentDidUpdate() {
        const { offsetToggle, filterOffsetToggle, name, filter_click, productToggle } = this.state;
        if (offsetToggle !== false) {
            this.getProductData();
            this.setState({ offsetToggle: false })
        }

        if (filter_click === true) {
            if (name !== '') {
                this.filterData();
                this.setState({ filter_click: false })
            }
        }
        if (productToggle === true) {
            if (name !== '') {
                this.filterData();
                this.setState({ productToggle: false })
            } 
            if(name === '') {
                this.getProductData();
                this.setState({ productToggle: false })
            }
        }
        if (filterOffsetToggle !== false) {
            this.filterData();
            this.setState({ filterOffsetToggle: false })
        }
    }
    getProductData() {
        const { offset, limit } = this.state;
        productHelper.getProduct(offset, limit)
            .then((data) => {
                this.setState({ details: data });
            })
            .catch((err) => console.log(err));
    }

    filterData() {
        const { name, offset, limit } = this.state;
        productHelper.getFilteredProduct(name, offset, limit)
            .then((data) => {
                this.setState({ filter_details: data });
            })
            .catch((err) => console.log(err));
    }
    getProductCount() {
        const tempArray = []
        var count = 0;
        productHelper.getProductCount()
            .then((data) => {
                count = parseInt(data[0].product_count) / 10;
                for (let i = 0; i <= count - 1; i++) {
                    tempArray.push(i);
                }
                this.setState({ pages: tempArray })
            })
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
    // filter(details) {
    //     const { name } = this.state;
    //     const columns = details[0] && Object.keys(details[0]);
    //     return details.filter((detail) =>
    //         columns.some(
    //             (column) => detail[column] === null ? "" : 
    //             detail[column].toString().toLowerCase().indexOf(name) > - 1
    //         )
    //     );
    // }
    handleOnChange = (e) => {
        this.setState({
            limit: e.target.value
        })
    }
    render() {
        const { loading,
            optionSelected,
            filter_details,
            paginate_filter,
            new_header,
            details,
            pages,
            name,
            splice,
        } = this.state;
        const onClick = (m) => {
            return (
                <Link href={`/products/${m.id}`}><a>{m.value}</a></Link>
            )
        };
        let new_table_title = {};
        let new_table_value = {};
        let table_title = {
            s_no: "S.No",
            product_id: "Product Id",
            gf_item_name: "Name",
            de_distrubutor: "Distributor",
            gf_manufacturer: "Manufacturer",
        }
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

        if (filter_details.length === 0) {
            valuesNew = details.map((m, i) => ({
                s_no: i + 1,
                product_id: m.product_id,
                gf_item_name: onClick({ value: m.gf_item_name !== null ? m.gf_item_name : m.de_display_name, id: m.product_id }),
                de_distrubutor: onClick({ value: m.de_distributor, id: m.product_id }),
                gf_manufacturer: onClick({ value: m.gf_manufacturer, id: m.product_id }),
            }));
        } else {
            valuesNew = filter_details.map((m, i) => ({
                s_no: i + 1,
                product_id: m.product_id,
                gf_item_name: onClick({ value: m.gf_item_name !== null ? m.gf_item_name : m.de_display_name, id: m.product_id }),
                de_distrubutor: onClick({ value: m.de_distributor, id: m.product_id }),
                gf_manufacturer: onClick({ value: m.gf_manufacturer, id: m.product_id }),
            }));
        }

        if (new_header === true) {
            if (filter_details.length === 0) {
                valuesNew = details.map((m, i) => (
                    optionSelected.map((n) => (
                        new_table_value[i] = m[n.value]
                    ))
                ))
            } else {
                valuesNew = filter_details.map((m, i) => (
                    optionSelected.map((n) => (
                        new_table_value[i] = m[n.value]
                    ))
                ))
            }
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
                                    <div style={{ marginBottom: "60px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                                        <div className={styles.subInputHolder}>
                                            <label htmlFor="searchbar"
                                                className={styles.infoLabel}>
                                                Search
                                            </label>
                                            <Input id="searchbar" onChange={(e) => this.setState({ name: e.target.value })} type="text" value={name === "" ? "" : `${name}`} onMouseEnter={() => this.setState({ hoverElement: false })}
                                                className={styles.dropbtn} />
                                        </div>
                                        <div className={styles.subButtonHolder}>
                                            <ButtonGroup
                                                type="submit"
                                            >
                                                <Button
                                                    isLoading={loading}
                                                    loadingText="Searching"
                                                    colorScheme="purple"
                                                    onClick={() => this.setState({ filter_click: true, paginate_filter: true })}
                                                >
                                                    {"Search"}
                                                </Button>
                                            </ButtonGroup>
                                        </div>
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
                                    <div style={{ marginBottom: "60px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                                        <div className={styles.subInputHolder}>
                                            <label
                                                className={styles.infoLabel}
                                            >
                                                Choose number of products to display
                                            </label>
                                            <Select placeholder="Select..." color={"blackAlpha.700"} height={"9"} borderColor={"gray.400"} onChange={this.handleOnChange}>
                                                {ProductPerPage.map((m) => (
                                                    <option>{m.value}</option>
                                                ))}
                                            </Select>
                                        </div>
                                        <div className={styles.subButtonHolder}>
                                            <ButtonGroup
                                                type="submit"
                                            >
                                                <Button
                                                    isLoading={loading}
                                                    loadingText="Loading"
                                                    colorScheme="purple"
                                                    onClick={() => this.setState({ productToggle: true })}
                                                >
                                                    {"Done"}
                                                </Button>
                                            </ButtonGroup>
                                        </div>
                                    </div>
                                    <Table
                                        heading={new_header === false ? table_title : new_table_title}
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
                                                            this.setState({ offsetToggle: true, offset: m * 10 })
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
                                                            this.setState({ filterOffsetToggle: true, offset: m * 10 })
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
                    </GlobalWrapper>
                </Form>
            </Formik>
        );
    }
}

export default withRouter(product);
