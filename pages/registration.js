import { Formik, Form } from "formik";
import CustomInput from "../components/customInput/customInput";
import styles from "../styles/registration.module.css";
import Head from "../util/head";
import Dropzone from "react-dropzone-uploader";
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

                        <Container className={styles.container} boxShadow="lg">
                            <p>Personal Details</p>
                            <div>
                                <div className={styles.personalInputHolder}>
                                    <div className={styles.inputHolder}>
                                        <div className={styles.personalInputs}>
                                            <CustomInput
                                                label="Name"
                                                name="name"
                                                type="text"
                                            />
                                        </div>
                                        <div className={styles.personalInputs}>
                                            <CustomInput
                                                label="Father Name"
                                                name="fatherName"
                                                type="text"
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.inputHolder}>
                                        <div className={styles.personalInputs}>
                                            <CustomInput
                                                label="Date of Birth"
                                                name="dob"
                                                type="text"
                                            />
                                        </div>
                                        <div className={styles.personalInputs}>
                                            <CustomInput
                                                label="Gender"
                                                value1="Male"
                                                value2="Female"
                                                value3="Transgendar"
                                                name="gender"
                                                type="text"
                                                method="switch"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.textAreaHolder}>
                                    <div className={styles.personalInputs}>
                                        <CustomInput
                                            label="Permanent Address"
                                            name="permanentAddress"
                                            type="text"
                                            method="TextArea"
                                        />
                                    </div>
                                </div>
                                <div className={styles.personalInputHolder}>
                                    <div className={styles.inputHolder}>
                                        <div className={styles.personalInputs}>
                                            <CustomInput
                                                label="Primary Contact Number"
                                                name="contactNo"
                                                type="text"
                                            />
                                        </div>
                                        <div className={styles.personalInputs}>
                                            <CustomInput
                                                label="Alternate Number"
                                                name="alternateNo"
                                                type="text"
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.inputHolder}>
                                        <div className={styles.personalInputs}>
                                            <CustomInput
                                                label="Email Address"
                                                name="email"
                                                type="text" />
                                        </div>
                                        <div className={styles.personalInputs}>
                                            <CustomInput
                                                label="Blood Group"
                                                value1="Blood group A"
                                                value2="Blood group B"
                                                value3="Blood group O"
                                                name="blood_group_id"
                                                type="text"
                                                method="switch"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.textAreaHolder}>
                                    <div className={styles.personalInputs}>
                                        <CustomInput
                                            label="Permanent Address"
                                            name="permanentAddress"
                                            type="text"
                                            method="TextArea"
                                        />
                                    </div>
                                </div>
                                <div className={styles.personalInputHolder}>
                                    <div className={styles.inputHolder}>
                                        <div className={styles.personalInputs}>
                                            <CustomInput
                                                label="Educational Qualification"
                                                name="educationalQualification"
                                                type="text"
                                            />
                                        </div>
                                        <div className={styles.personalInputs}>
                                            <CustomInput
                                                label="Introducer's Name"
                                                name="introducerName"
                                                type="text"
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.inputHolder}>
                                        <div className={styles.personalInputs}>
                                            <CustomInput
                                                label="Salary / Month"
                                                name="salary"
                                                type="text"
                                            />
                                        </div>
                                        <div className={styles.personalInputs}>
                                            <CustomInput
                                                label="Employee Id"
                                                name="employeeId"
                                                type="text"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.textAreaHolder}>
                                    <div className={styles.personalInputs}>
                                        <CustomInput
                                            label="Introducer Details"
                                            name="introducerDetails"
                                            type="text"
                                            method="TextArea"
                                        />
                                    </div>
                                </div>
                            </div>
                        </Container>
                        <Container>
                            <Container className={styles.container} boxShadow="lg">
                                <p>Employee Details</p>
                                <div>
                                    <div className={styles.personalInputHolder}>
                                        <div className={styles.inputHolder}>
                                            <div className={styles.personalInputs}>
                                                <CustomInput
                                                    label="Previous Experience"
                                                    name="experience"
                                                    type="text"
                                                />
                                            </div>
                                            <div className={styles.personalInputs}>
                                                <CustomInput
                                                    label="Unifrom"
                                                    name="unifrom"
                                                    type="text"
                                                />
                                            </div>
                                        </div>
                                        <div className={styles.inputHolder}>
                                            <div className={styles.personalInputs}>
                                                <CustomInput
                                                    label="ID Card Type"
                                                    name="card_type_id"
                                                    type="text"
                                                />
                                            </div>
                                            <div className={styles.personalInputs}>
                                                <CustomInput
                                                    label="Shift Details"
                                                    name="shiftDetails"
                                                    type="text"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles.personalInputHolder}>
                                        <div className={styles.inputHolder}>
                                            <div className={styles.personalInputs}>
                                                <CustomInput
                                                    label="Select Designation"
                                                    value1="designation1"
                                                    value2="designation2"
                                                    value3="designation3"
                                                    name="designation_id"
                                                    type="text"
                                                    method="switch"
                                                />
                                            </div>
                                            <div className={styles.personalInputs}>
                                                <CustomInput
                                                    label="Date of Joining"
                                                    name="joiningDate"
                                                    type="text"
                                                />
                                            </div>
                                        </div>
                                        <div className={styles.inputHolder}>
                                            <div className={styles.personalInputs}>
                                                <CustomInput
                                                    label="Date of Resignation"
                                                    name="resignationDate"
                                                    type="text"
                                                />
                                            </div>
                                            <div className={styles.personalInputs}>
                                                <CustomInput
                                                    label="ID Card No"
                                                    name="idNo"
                                                    type="text"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles.personalInputHolder}>
                                        <div className={styles.inputHolder}>
                                            <div className={styles.personalInputs}>
                                                <CustomInput
                                                    label="Select Store"
                                                    value1="Store1"
                                                    value2="Store2"
                                                    value3="Store3"
                                                    name="store_id"
                                                    type="text"
                                                    method="switch"
                                                />
                                            </div>
                                        </div>
                                        <div className={styles.inputHolder}>
                                            <div className={styles.personalInputs}>
                                                <CustomInput
                                                    label="Select Department"
                                                    name="department_id"
                                                    type="text"
                                                    method="switch"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Container>
                            <Container
                                boxShadow="lg"
                                className={styles.container}
                                mt="20px"
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
                                        accept="image/*,audio/*,video/*"
                                        id="uploadImage"
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
                                        accept="image/*,audio/*,video/*"
                                        id="uploadID"
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