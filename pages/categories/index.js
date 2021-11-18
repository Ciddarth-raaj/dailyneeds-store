import { Formik, Form } from "formik";
import { Container, Flex, Button, ButtonGroup, Badge } from "@chakra-ui/react";
import styles from "../../styles/admin.module.css";
import { toast } from "react-toastify";
import React, { useState, useEffect } from "react";
import { ChevronRightIcon, ChevronLeftIcon } from "@chakra-ui/icons";

import Head from "../../util/head";
import FilesHelper from "../../helper/asset";
import CategoryHelper from "../../helper/categories";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Validation } from "../../util/validation";
import Table from "../../components/table/table";
import EmployeeHelper from "../../helper/employee";
import Link from "next/link";
import exportCSVFile from "../../util/exportCSVFile";
import moment from "moment";

class viewCategory extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            details: [],
            paginate_filter: false,
            pages: [],
            image_url: '',
            id: '',
            selectedFile: null,
            category_id: '',
            limit: 10,
            splice: [0, 10],
            offsetToggle: false,
            offset: 0,
        };
    }

    componentDidMount() {
        this.getCategoryData();
        this.getCategoryCount();
    }
    componentDidUpdate() {
        const { offsetToggle } = this.state;
        if (offsetToggle !== false) {
            this.getCategoryData();
            this.setState({ offsetToggle: false })
        }
    }
    getCategoryCount() {
        const tempArray = []
        var count = 0;
        CategoryHelper.getCategoryCount()
            .then((data) => {
                count = parseInt(data[0].catcount) / 10;
                for (let i = 0; i <= count - 1; i++) {
                    tempArray.push(i);
                }
                this.setState({ pages: tempArray })
            })
    }

    getCategoryData() {
        const { offset, limit } = this.state;
        CategoryHelper.getCategories(offset, limit)
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
            id: "Id",
            category_id: "Category Id",
            category_name: "Category Name",
            department_name: "Department Name"
        };
        const formattedData = []; 
        valuesNew.forEach((d, i) => {
            formattedData.push({
                SNo: i + 1,
                id: d.category_id,
                category_name: d.category_name,
                department_name: d.department_name
            });
        });
        exportCSVFile(
            TABLE_HEADER,
            formattedData,
            "category_details" + moment().format("DD-MMY-YYYY")
        );
    };

    imageUpload = async (m) => {
        const { image_url } = this.state;
        CategoryHelper.uploadCategoryImage({ image_url: image_url, category_id: m })
            .then((data) => {
                if (data === 200) {
                    toast.success("Successfully uploaded image");
                    this.setState({ id: '' });
                    this.getCategoryData();
                } else {
                    toast.error("Error uploading image");
                }
            })
            .catch((err) => console.log(err))
    }

    onFileChange = async(e) => {
        const Imagearray = [];
        var image_url = ''
        var uploadedFile = e.target.files[0];
            Imagearray.push(await FilesHelper.upload(
                uploadedFile,
                "uploadImage",
                "dashboard_file"
            ));
            image_url = Imagearray.length > 0 ? Imagearray[0].remoteUrl : "";
            this.setState({ image_url: image_url });
    };

    render() {
        const { details, pages, splice, paginate_filter, id, selectedFile, image_url } = this.state;
        let valuesNew = [];
        const initialValue = {
            dob_1: "",
            dob_2: "",
        };

        const imageHolder = (m) => {      
            return (
                <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                    <img style={{ height: "60px", width: "70px", display: "flex", marginBottom: "20px", justifyContent: "center", alignItems: "center" }} src={id === m.id && image_url !== '' ? image_url : m.value} />
                    <label htmlFor='upload-button'>
                        <div className={styles.chooseFile}>
                            <Badge variant="subtle" style={{cursor: "pointer", width: "70px", height: "20px"}} onClick={() => {this.setState({ id: m.id })}} colorScheme="purple">Upload</Badge>
                        </div>
                        <div>
                            {id === m.id && selectedFile !== null ? selectedFile.name : ''}
                        </div>
                    </label>
                    <input type="file" id='upload-button' style={{marginBottom: "20px", marginLeft: "60px", display: "none"}} onChange={this.onFileChange} />
                </div>
            )
        }
        const save = (m) => {
            return (
                <div>
                    <Button
                        variant="outline"
                        colorScheme="purple"
                        onClick={() => this.imageUpload(m.id)}
                    >
                        {"Save"}
                    </Button>
                </div>
            )
        }

        const table_title = {
            id: "Id",
            category_id: "Category Id",
            name: "Category Name",
            department_name: "Department Name",
            image_url: "Image",
            save: "Upload"
        };
        valuesNew = details.map((m, i) => ({
            SNo: i + 1,
            id: m.category_id,
            name: m.category_name,
            department_name: m.department_name,
            image_url: imageHolder({ value: m.image_url, id: m.category_id }),
            save: save({ id: m.category_id })
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
                <GlobalWrapper title="Category Details">
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

export default viewCategory;
