import { Formik, Form } from "formik";
import { Container, Flex, Button, ButtonGroup, Badge } from "@chakra-ui/react";
import styles from "../../styles/admin.module.css";
import { toast } from "react-toastify";
import React from "react";
import { ChevronRightIcon, ChevronLeftIcon } from "@chakra-ui/icons";

import Head from "../../util/head";
import FilesHelper from "../../helper/asset";
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
            image_url: '',
            id: '',
            selectedFile: null,
            subcategory_id: '',
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
            image: "Image"
        };
        const formattedData = [];
        valuesNew.forEach((d, i) => {
            formattedData.push({
                SNo: i + 1,
                id: d.category_id,
                subcategory_name: d.subcategory_name,
                category_name: d.category_name,
                image: d.image_url
            });
        });
        exportCSVFile(
            TABLE_HEADER,
            formattedData,
            "subcategory_details" + moment().format("DD-MMY-YYYY")
        );
    };
 
    imageUpload = async (m) => {
        const { selectedFile } = this.state;
        const Imagearray = [];
        var image_url = ''
        if (selectedFile.length !== 0) {
            Imagearray.push(await FilesHelper.upload(
                selectedFile,
                "uploadImage",
                "dashboard_file"
            ));
            image_url = Imagearray.length > 0 ? Imagearray[0].remoteUrl : "";
        }
        SubCategoryHelper.uploadSubCategoryImage({ image_url: image_url, subcategory_id: m })
            .then((data) => {
                if (data === 200) {
                    toast.success("Successfully uploaded image");
                    this.setState({ id: '' });
                    this.getSubCategoryData();
                } else {
                    toast.error("Error uploading image");
                }
            })
            .catch((err) => console.log(err))
    }

    onFileChange = (e) => {
        this.setState({ selectedFile: e.target.files[0] });
    };

    render() {
        const { details, paginate_filter, splice, pages, id ,selectedFile } = this.state;
        let valuesNew = [];
        const initialValue = {
            dob_1: "",
            dob_2: "",
        };

        const imageHolder = (m) => {      
            return (
                <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                    <img style={{ height: "60px", width: "70px", display: "flex", marginBottom: "20px", justifyContent: "center", alignItems: "center" }} src={m.value} />
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
            subcategory_id: "Sub Category Id",
            name: "Sub Category Name",
            category_name: "Category Name",
            image_url: "Image",
            save: "Upload"
        };
        valuesNew = details.map((m, i) => ({
            SNo: i + 1,
            id: m.subcategory_id,
            name: m.subcategory_name,
            category_name: m.category_name,
            image_url: imageHolder({ value: m.image_url, id: m.subcategory_id }),
            save: save({ id: m.subcategory_id })
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
