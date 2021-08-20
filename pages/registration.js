import { Formik, Form } from "formik";
import CustomInput from "../components/customInput/customInput";
import styles from "../styles/registration.module.css";
import 'react-dropzone-uploader/dist/styles.css';
import Dropzone from 'react-dropzone-uploader';
import Head from "../util/head";
import { Container, Flex } from "@chakra-ui/react";
import GlobalWrapper from "../components/globalWrapper/globalWrapper";
import { Validation } from "../util/validation";


function Registration() {
    const getUploadParams = ({ meta }) => {
        return { url: "https://httpbin.org/post" };
    };

    const handleChangeStatus = ({ meta, file }, status) => {
        console.log(status, meta, file);
    };

    const handleSubmit = (files) => {
        console.log(files.map((f) => f.meta));
    };
    const initialValue = {
        name: "",
        fatherName: "",
        dob: "",
        permanentAddress: "",
        residentialAddress: "",
        contactNo: "",
        alternateNo: "",
        email: "",
        educationalQualification: "",
        introducerName: "",
        introducerDetails: "",
        employeeId: "",
        salary: "",
        unifrom: "",
        experience: "",
        joiningDate: "",
        resignationDate: "",
        idNo: "",
    }
    return (
        <Formik
            initialValues={initialValue}
            onSubmit={values => {
                console.log(values)
            }}
            validationSchema={Validation}
        >
            <Form>
                <GlobalWrapper title="New Employee">
                    <Head />
                    <Flex templateColumns="repeat(3, 1fr)" gap={6} colSpan={2}>

                        <Container height="100%" className={styles.container} boxShadow="lg">
                            <p>Personal Details</p>
                            <div>
                                <div className={styles.personalInputHolder}>
                                    <div className={styles.inputHolder}>
                                        <CustomInput
                                            label="Name"
                                            name="name"
                                            type="text"
                                        />

                                        <CustomInput
                                            label="Father Name"
                                            name="fatherName"
                                            type="text"
                                        />

                                    </div>
                                    <div className={styles.inputHolder}>
                                        <CustomInput
                                            label="Date of Birth"
                                            name="dob"
                                            type="text"
                                        />
                                        <CustomInput
                                            label="Gender"
                                            values={[
                                                {
                                                    id: 1,
                                                    value: "Male"
                                                },
                                                {
                                                    id: 2,
                                                    value: "Female"
                                                },
                                                {
                                                    id: 3,
                                                    value: "Transgendar"
                                                },
                                            ]}
                                            name="gender"
                                            type="text"
                                            method="switch"
                                        />

                                    </div>
                                </div>
                                <div className={styles.textAreaHolder}>
                                    <CustomInput
                                        label="Permanent Address"
                                        name="permanentAddress"
                                        type="text"
                                        method="TextArea"
                                    />
                                </div>
                                <div className={styles.personalInputHolder}>
                                    <div className={styles.inputHolder}>
                                        <CustomInput
                                            label="Primary Contact Number"
                                            name="contactNo"
                                            type="text"
                                        />
                                        <CustomInput
                                            label="Alternate Number"
                                            name="alternateNo"
                                            type="text"
                                        />
                                    </div>
                                    <div className={styles.inputHolder}>
                                        <CustomInput
                                            label="Email Address"
                                            name="email"
                                            type="text" />

                                        <CustomInput
                                            label="Blood Group"
                                            values={[
                                                {
                                                    id: 1,
                                                    value: "Blood group A"
                                                },
                                                {
                                                    id: 2,
                                                    value: "Blood group B"
                                                },
                                                {
                                                    id: 3,
                                                    value: "Blood group O"
                                                }
                                            ]}
                                            name="blood_group_id"
                                            type="text"
                                            method="switch"
                                        />
                                    </div>
                                </div>
                                <div className={styles.textAreaHolder}>
                                    <CustomInput
                                        label="Permanent Address"
                                        name="permanentAddress"
                                        type="text"
                                        method="TextArea"
                                    />
                                </div>
                                <div className={styles.personalInputHolder}>
                                    <div className={styles.inputHolder}>
                                        <CustomInput
                                            label="Educational Qualification"
                                            name="educationalQualification"
                                            type="text"
                                        />
                                        <CustomInput
                                            label="Introducer's Name"
                                            name="introducerName"
                                            type="text"
                                        />

                                    </div>
                                    <div className={styles.inputHolder}>
                                        <CustomInput
                                            label="Salary / Month"
                                            name="salary"
                                            type="text"
                                        />
                                        <CustomInput
                                            label="Employee Id"
                                            name="employeeId"
                                            type="text"
                                        />
                                    </div>
                                </div>
                                <div className={styles.textAreaHolder}>
                                    <CustomInput
                                        label="Introducer Details"
                                        name="introducerDetails"
                                        type="text"
                                        method="TextArea"
                                    />

                                </div>
                            </div>
                        </Container>
                        <Container>
                            <Container className={styles.container} height="50%" boxShadow="lg">
                                <p>Employee Details</p>
                                <div>
                                    <div className={styles.personalInputHolder}>
                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="Previous Experience"
                                                name="experience"
                                                type="text"
                                            />
                                            <CustomInput
                                                label="Unifrom"
                                                name="unifrom"
                                                type="text"
                                            />

                                        </div>
                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="ID Card Type"
                                                name="card_type_id"
                                                type="text"
                                            />

                                            <CustomInput
                                                label="Shift Details"
                                                name="shiftDetails"
                                                type="text"
                                            />

                                        </div>
                                    </div>
                                    <div className={styles.personalInputHolder}>
                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="Select Designation"
                                                values={[
                                                    {
                                                        id: 1,
                                                        value: "designation1"
                                                    },
                                                    {
                                                        id: 2,
                                                        value: "designation2"
                                                    },
                                                    {
                                                        id: 3,
                                                        value: "designation3"
                                                    }
                                                ]}
                                                name="designation_id"
                                                type="text"
                                                method="switch"
                                            />
                                            <CustomInput
                                                label="Date of Joining"
                                                name="joiningDate"
                                                type="text"
                                            />

                                        </div>
                                        <div className={styles.inputHolder}>
                                            <CustomInput
                                                label="Select Store"
                                                values={[
                                                    {
                                                        id: 1,
                                                        value: "Store1"
                                                    },
                                                    {
                                                        id: 2,
                                                        value: "Store2"
                                                    },
                                                    {
                                                        id: 3,
                                                        value: "Store3"
                                                    }
                                                ]}
                                                name="store_id"
                                                type="text"
                                                method="switch"
                                            />
                                            <CustomInput
                                                label="Select Department"
                                                values={[
                                                    {
                                                        id: 1,
                                                        value: "Department1"
                                                    },
                                                    {
                                                        id: 2,
                                                        value: "Department2"
                                                    },
                                                    {
                                                        id: 3,
                                                        value: "Department3"
                                                    }
                                                ]}
                                                name="department_id"
                                                type="text"
                                                method="switch"
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.personalInputHolder}>
                                        <CustomInput
                                            label="Date of Resignation"
                                            name="resignationDate"
                                            type="text"
                                        />
                                        <CustomInput
                                            label="ID Card No"
                                            name="idNo"
                                            type="text"
                                        />

                                    </div>

                                </div>
                            </Container>
                            <Container
                                boxShadow="lg"
                                className={styles.container}
                                mt="20px"
                                // height="100%"
                                pb="20px"
                            >
                                <p>File Uploads</p>
                                <div className={styles.uploadHolder}>
                                    <label
                                        className={styles.uploaderTitle}
                                        for="uploadImage"
                                    >
                                        Upload Image :
                                    </label>
                                    <Dropzone
                                        getUploadParams={getUploadParams}
                                        onChangeStatus={handleChangeStatus}
                                        onSubmit={handleSubmit}
                                        styles={{
                                            dropzone: { overflow: 'auto', border: '1px solid #999', background: '#f5f5f5' },
                                            inputLabelWithFiles: { margin: '20px 3%' }
                                        }}
                                        canRemove={false}
                                        multiple={false}
                                        maxFiles={1}
                                        accept="image/*"
                                    />
                                </div>

                                <div className={styles.uploadHolder}>
                                    <label
                                        className={styles.uploaderTitle}
                                        for="uploadID"
                                    >
                                        Upload ID :
                                    </label>
                                    <Dropzone
                                        getUploadParams={getUploadParams}
                                        onChangeStatus={handleChangeStatus}
                                        onSubmit={handleSubmit}
                                        styles={{
                                            dropzone: { overflow: 'auto', border: '1px solid #999', background: '#f5f5f5' },
                                            inputLabelWithFiles: { margin: '20px 3%' }
                                        }}
                                        canRemove={false}
                                        multiple={false}
                                        maxFiles={1}
                                        accept="image/*"
                                    />
                                </div>
                                <div className={styles.buttonHolder}>
                                    <button
                                        className={`button ${styles.button}`}
                                    >
                                        {"Submit"}
                                    </button>
                                </div>
                            </Container>
                        </Container>
                    </Flex>
                </GlobalWrapper>
            </Form>
        </Formik>
    )
}

export default Registration;