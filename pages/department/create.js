import { Formik, Form } from "formik";
import 'react-dropzone-uploader/dist/styles.css';
import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Create } from "../../util/validation";
import styles from "../../styles/create.module.css";
import { Flex, Container } from "@chakra-ui/react";
import CustomInput from "../../components/customInput/customInput";



function Department() {
    const initialValue = {
        departmentName: "",
        status: "",
    }
    return (
        <Formik
            initialValues={initialValue}
            onSubmit={values => {
                console.log(values)
            }}
            validationSchema={Create}
        >
            <Form>
                <GlobalWrapper title="Add Department">
                    <Head />
                    <Flex templateColumns="repeat(1, 1fr)" gap={6} colSpan={1}>
                        <Container height="100%" maxW="container.xl" className={styles.container}>
                        <p>Add New Department</p>
                            <div className={styles.wrapper}>
                                <div className={styles.inputHolder}>
                                    <CustomInput
                                        label="Department Name"
                                        name="departmentName"
                                        type="text"
                                    />
                                    <CustomInput
                                        label="Status"
                                        values={[
                                            {
                                                id: 1,
                                                value: "Status 1"
                                            },
                                            {
                                                id: 2,
                                                value: "Status 2"
                                            },
                                            {
                                                id: 3,
                                                value: "Status 3"
                                            },
                                        ]}
                                        name="status"
                                        type="text"
                                        method="switch"
                                    />
                                </div>
                                <div className={styles.createHandler}>
                                    <div className={styles.buttonHolder}>
                                        <button className={`button ${styles.submitButton}`}>
                                            Submit
                                        </button>
                                        <button className={`button ${styles.declineButton}`}>
                                            Reset
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Container>
                        </Flex>
                </GlobalWrapper>
            </Form>
        </Formik>
    )
}

export default Department;