import { Formik, Form } from "formik";
import { Container, Flex, Button, ButtonGroup, Select } from "@chakra-ui/react";
import styles from "../../styles/admin.module.css";
import React, { useState, useEffect } from "react";
import { ChevronRightIcon, ChevronLeftIcon } from "@chakra-ui/icons";

import Head from "../../util/head";
import BrandsHelper from "../../helper/brands";
import { ProductPerPage } from "../../constants/values";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Validation } from "../../util/validation";
import Table from "../../components/table/table";
import EmployeeHelper from "../../helper/employee";
import Link from "next/link";
import exportCSVFile from "../../util/exportCSVFile";
import moment from "moment";

class viewBrands extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: false,
            details: [],
            pages: [],
            paginate_filter: false,
            limit: 10,
            brandToggle: false,
            offset: 0,
            splice: [0, 10],
        };
    }

    componentDidMount() {
        this.getBrandsData();
        this.getBrandsCount();
    }
    componentDidUpdate() {
        const { offsetToggle, brandToggle } = this.state;
        if (offsetToggle !== false) {
            this.getBrandsData();
            this.setState({ offsetToggle: false })
        }

        if (brandToggle === true) {
                this.getBrandsData();
                this.setState({ brandToggle: false })
        }
    }
    getBrandsCount() {
        const tempArray = []
        var count = 0;
        BrandsHelper.getBrandsCount()
            .then((data) => {
                count = Math.ceil(parseInt(data[0].brand_count) / 10);
                for (let i = 1; i <= count; i++) {
                    tempArray.push(i);
                }
                this.setState({ pages: tempArray })
            })
    }

    getBrandsData() {
        const { offset, limit } = this.state;
        BrandsHelper.getBrands(offset, limit)
            .then((data) => {
                this.setState({ details: data });
            })
            .catch((err) => console.log(err));
    }
    sortCallback = (key, type) => {
        console.log(key, type);
    };

    getExportFile = () => {
        const TABLE_HEADER = {
            SNo: "SNo",
            id: "Id",
            name: "Name",
            category_name: "Category Name",
        };
        const formattedData = []; 
        valuesNew.forEach((d, i) => {
            formattedData.push({
                SNo: i + 1,
                id: d.brand_id,
                name: d.brand_name,
                category_name: d.category_name,
            });
        });
        exportCSVFile(
            TABLE_HEADER,
            formattedData,
            "category_details" + moment().format("DD-MMY-YYYY")
        );
    };
    handleOnChange = (e) => {
        this.setState({
            limit: e.target.value
        })
    }
    render() {
        const { details, paginate_filter, splice, pages, loading } = this.state;
        let valuesNew = [];
        const initialValue = {
            dob_1: "",
            dob_2: "",
        };
        const table_title = {
            id: "Id",
            brand_id: "Brand Id",
            name: "Brand Name",
        };
        valuesNew = details.map((m, i) => ({
            SNo: i + 1,
            id: m.brand_id,
            name: m.brand_name
        }));


    return (
        <Formik
            initialValues={initialValue}
            onSubmit={(values) => {
                console.log(values);
            }}
            validationSchema={Validation}
        >
            <Form>
                <GlobalWrapper title="Brand Details">
                     
                    <Flex templateColumns="repeat(3, 1fr)" gap={6} colSpan={2}>
                        <Container className={styles.container} boxShadow="lg">
                            <p className={styles.buttoninputHolder}>
                                <div>View Details</div>
                            </p>
                            <div>
                            <div style={{ marginBottom: "60px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                                        <div className={styles.subInputHolder}>
                                            <label
                                                className={styles.infoLabel}
                                            >
                                                Choose number of brands to display
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
                                                    onClick={() => this.setState({ brandToggle: true })}
                                                >
                                                    {"Done"}
                                                </Button>
                                            </ButtonGroup>
                                        </div>
                                    </div>
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
                </GlobalWrapper>
            </Form>
        </Formik>
    );
}
}

export default viewBrands;
