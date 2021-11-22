//External Dependancies
import { Formik, Form } from "formik";
import { Container, Flex, Button, ButtonGroup, Switch, Badge } from "@chakra-ui/react";
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";

//Styles
import styles from "../../styles/admin.module.css";

//Helpers
import DepartmentHelper from "../../helper/department";
import FilesHelper from "../../helper/asset";

//InternalDependancies
import CustomInput from "../../components/customInput/customInput";
import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Validation } from "../../util/validation";
import Table from "../../components/table/table";
import Link from "next/link";
import exportCSVFile from "../../util/exportCSVFile";
import moment from "moment";
import { render } from "react-dom";

class productdepartmentView extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            department_id: 0,
            image_url: '',
            status: '',
            image_url: '',
            id: '',
            selectedFile: null,
            subcategory_id: '',
            department: []
        };
    }
    componentDidMount() {
        this.getDepartmentData();
    }
    componentDidUpdate() {
        const { department_id } = this.state;
        if(department_id !== 0) {
            this.updateStatus();
        }
    }
    
    badge = (m) => (
        <Switch className={styles.switch} id="email-alerts" defaultChecked={m.value === 1} onChange={() => { this.setState({ status: m.value === 1 ? 0 : 1, department_id: m.id }) }} />
    )
    updateStatus() {
        const { status, department_id } = this.state;
        if (status !== '') {
            DepartmentHelper.updateProductDepartmentStatus({
                department_id: department_id,
                status: status
            })
                .then((data) => {
                    if (data.code === 200) {
                        toast.success("Successfully updated Status");
                    } else {
                        toast.error("Not Updated")
                    }
                })
                .catch((err) => console.log(err));
        } else {
            console.log('clear');
        }
    }


    imageUpload = async (m) => {
        const { image_url } = this.state;

        DepartmentHelper.uploadDepartmentImage({ image_url: image_url, department_id: m })
            .then((data) => {
                if (data === 200) {
                    toast.success("Successfully uploaded image");
                    this.setState({ id: '' });
                    this.getDepartmentData();
                } else {
                    toast.error("Error uploading image");
                }
            })
            .catch((err) => console.log(err))
    }

    getDepartmentData() {
        DepartmentHelper.getProductDepartment()
            .then((data) => {
                this.setState({ department: data });
            })
            .catch((err) => console.log(err));
    }

    sortCallback = (key, type) => {
        console.log(key, type);
    };

    getExportFile = () => {
        const TABLE_HEADER = {
            SNo: "SNo",
            id: "Employee ID",
            name: "Name",
            status: "Status",
        };
        const formattedData = [];
        valuesNew.forEach((d, i) => {
            formattedData.push({
                SNo: i + 1,
                id: d.id,
                name: d.value,
                status: d.status,
            });
        });
        exportCSVFile(
            TABLE_HEADER,
            formattedData,
            "department_details" + moment().format("DD-MMY-YYYY")
        );
    };
    onFileChange = async (e) => {
        const Imagearray = [];
        var image_url = '';
        var uploadedFile = e.target.files[0]; 
        this.setState({ selectedFile: e.target.files[0] });
            Imagearray.push(await FilesHelper.upload (
                uploadedFile,
                "uploadImage",
                "dashboard_file"
            ));
                image_url = Imagearray.length > 0 ? Imagearray[0].remoteUrl : "";
        this.setState({ image_url: image_url });
    };
    render() {
        const { department, id, image_url } = this.state;
        const onClick = (m) => {
            return ( 
                <Link href={`/department/${m.id}`}><a>{m.value}</a></Link>
            )
        };
        let valuesNew = [];
        const initialValue = {
            dob_1: "",
            dob_2: "",
        }; 
        const imageHolder = (m) => {
            return (
                <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                    <img style={{ height: "100px", width: "100px", objectFit: "contain", display: "flex", marginBottom: "20px", justifyContent: "center", alignItems: "center" }} src={id === m.id && image_url !== '' ? image_url : m.value} />
                    <label htmlFor='upload-button'>
                        <div className={styles.chooseFile}>
                            <Badge variant="subtle" style={{ cursor: "pointer", width: "70px", height: "20px" }} onClick={() => { this.setState({ id: m.id }) }} colorScheme="purple">Upload</Badge>
                        </div>
                    </label>
                    <input type="file" id='upload-button' style={{ marginBottom: "20px", marginLeft: "60px", display: "none" }} onChange={this.onFileChange} />
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
            employee_id: "Employee Id",
            name: "Name",
            status: "Status",
            image_url: "Image",
            save: "Upload"
            // action: "Action",
        };

        valuesNew = department.map((m) => (
            {
                id: m.id,
                name: onClick({ value: m.value, id: m.id }),
                status: this.badge({ value: m.status, id: m.id }),
                image_url: imageHolder({ value: m.image_url, id: m.id }),
                save: save({ id: m.id })
                // action: image(m.id),
            }
        ));
        return (
            <Formik
                initialValues={initialValue}
                onSubmit={(values) => {
                    console.log(values);
                }}
                validationSchema={Validation}
            >
                <Form>
                    <GlobalWrapper title="Product Department Details">
                        <Head />
                        <Flex templateColumns="repeat(3, 1fr)" gap={6} colSpan={2}>
                            <Container className={styles.container} boxShadow="lg">
                                <p className={styles.buttoninputHolder}>
                                    <div>View Department</div>
                                    {/* <div style={{ paddingRight: 10 }}>
                                        <Link href="/department/create">
                                            <Button colorScheme="purple">
                                                {"Add"}
                                            </Button>
                                        </Link>
                                    </div> */}
                                </p>
                                <div>
                                    <div className={styles.personalInputHolder}>
                                        {/* <CustomInput label="Store" name="stores" type="text" method="switch" />
                                        <CustomInput label="Designation" name="designation" type="text" method="switch" /> */}
                                        {/* <CustomInput label="Joining Date" name="dob_1" type="text" /> */}
                                        {/* <CustomInput label="Resignation Date" name="dob_2" type="text" /> */}
                                        {/* <CustomInput label="Current Employees" name="employee" type="text" method="switch" /> */}
                                    </div>
                                    <Table
                                        heading={table_title}
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


export default productdepartmentView;
