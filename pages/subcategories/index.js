import { Formik, Form } from "formik";
import { Container, Flex, Button, ButtonGroup } from "@chakra-ui/react";
import styles from "../../styles/admin.module.css";
import React, { useState, useEffect } from "react";
import { ChevronRightIcon, ChevronLeftIcon } from "@chakra-ui/icons";

import Head from "../../util/head";
import SubCategoryHelper from "../../helper/subcategories";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Validation } from "../../util/validation";
import Table from "../../components/table/table";
import EmployeeHelper from "../../helper/employee";
import Link from "next/link";
import exportCSVFile from "../../util/exportCSVFile";
import moment from "moment";

class viewSubCategory extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            details: [],
            paginate_filter: false,
            pages: [],
            limit: 10,
            offsetToggle: false,
            offset: 0,
            splice: [0, 10],
        };
    }

    componentDidMount() {
        this.getSubCategoryData();
        this.getSubCategoryCount();
    }
    componentDidUpdate() {
        const { offsetToggle } = this.state;
        if (offsetToggle !== false) {
            this.getSubCategoryData();
            this.setState({ offsetToggle: false })
        }
    }
    getSubCategoryCount() {
        const tempArray = []
        var count = 0;
        SubCategoryHelper.getSubCategoryCount()
            .then((data) => {
                count = parseInt(data[0].subcat_count) / 10;
                for (let i = 0; i <= count - 1; i++) {
                    tempArray.push(i);
                }
                this.setState({ pages: tempArray })
            })
    }
    getSubCategoryData() {
        const { offset, limit } = this.state;
        SubCategoryHelper.getSubCategories(offset, limit)
            .then((data) => {
                this.setState({ details: data });
                console.log({data: data});
            })
            .catch((err) => console.log(err));
    }
    sortCallback = (key, type) => {
        console.log(key, type);
    };

    getExportFile = () => {
        const TABLE_HEADER = {
            id: "Id",
            subcategory_id: "Category Id",
            subcategory_name: "Sub Category Name",
            category_name: "Category Name",
            
        };
        const formattedData = []; 
        valuesNew.forEach((d, i) => {
            formattedData.push({
                SNo: i + 1,
                id: d.category_id,
                subcategory_name: d.subcategory_name,
                category_name: d.category_name,
            });
        });
        exportCSVFile(
            TABLE_HEADER,
            formattedData,
            "subcategory_details" + moment().format("DD-MMY-YYYY")
        );
    };
    render() {
        const { details, paginate_filter, splice, pages } = this.state;
        let valuesNew = [];
        const initialValue = {
            dob_1: "",
            dob_2: "",
        };
        const table_title = {
            id: "Id",
            subcategory_id: "Sub Category Id",
            name: "Sub Category Name",
            category_name: "Category Name",
        };
        valuesNew = details.map((m, i) => ({
            SNo: i + 1,
            id: m.subcategory_id,
            name: m.subcategory_name,
            category_name: m.category_name
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
                <GlobalWrapper title="Sub Category Details">
                    <Head />
                    <Flex templateColumns="repeat(3, 1fr)" gap={6} colSpan={2}>
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

export default viewSubCategory;
