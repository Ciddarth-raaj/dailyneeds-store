import { Formik, Form } from "formik";
import { Flex, Container, ButtonGroup, Button } from "@chakra-ui/react";

import styles from "../../styles/create.module.css";

import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Create } from "../../util/validation";
import CustomInput from "../../components/customInput/customInput";
import React from "react";

const initialValue = {
    departmentName: "",
    status: "",
}
export default class CreateDepartment extends React.Component {
    constructor(props) {
        super(props);
        this.state = { loading: false }
    }

    render() {
        const { loading } = this.state;

        return <GlobalWrapper title="Department">
            <Head />
            <Formik
                initialValues={initialValue}
                onSubmit={values => {
                    console.log(values)
                }}
                validationSchema={Create}
            >
                {(formikProps) => {
                    const { handleSubmit } = formikProps;

                    return <Form>
                        <Container maxW="container.xl" className={styles.container} pb={"20px"} boxShadow="lg">
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
                                <ButtonGroup
                                    spacing="6"
                                    mt={10}
                                    style={{
                                        width: "100%",
                                        justifyContent: "flex-end",
                                    }}
                                >
                                    <Button>Cancel</Button>
                                    <Button
                                        isLoading={loading}
                                        loadingText="Submitting"
                                        colorScheme="purple"
                                        onClick={() =>
                                            handleSubmit()
                                        }
                                    >
                                        Create
                                    </Button>
                                </ButtonGroup>
                            </div>
                        </Container>
                    </Form>
                }}
            </Formik>
        </GlobalWrapper>
    }
}