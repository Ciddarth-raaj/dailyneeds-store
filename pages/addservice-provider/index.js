import { Formik, Form } from "formik";
import { Container, Flex, Button, ButtonGroup, Badge, Select, InputGroup, Input, InputLeftAddon } from "@chakra-ui/react";
import styles from "../../styles/indent.module.css";
import React from "react";
import Head from "../../util/head";
import CustomInput from "../../components/customInput/customInput";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { IssueValidation } from "../../util/validation";

class addService extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: false,
            indentToggle: false,
            details: [],
            paginate_filter: false,
            pages: [],
            store_data: [],
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

    componentDidMount() { }
    render() {
        const { details, pages, splice, paginate_filter, id, selectedFile, store_data, image_url, loading } = this.state;
        console.log({ details: details })
        let valuesNew = [];
        return (
            <GlobalWrapper title="Add Service Provider">
                 
                <Formik
                    initialValues={{
                        name: '',
                        email: '',
                        primary_contact_no: '',
                        secondary_contact_no: '',
                        description: '',
                        address: '',
                    }}
					validationSchema={IssueValidation}
                    onSubmit={(values) => {
                        this.createIndent(values);
                    }}
                // validationSchema={Validation}
                >
                    {(formikProps) => {
                        const { handleSubmit, resetForm } = formikProps;
                        return (
                            <Form onSubmit={formikProps.handleSubmit}>
                                <Flex templateColumns="repeat(3, 1fr)" flexDirection={"column"} gap={6} colSpan={2}>
                                    <Container className={styles.container} mb={5} boxShadow="lg">
                                        <p className={styles.buttoninputHolder}>
                                            <div>Add New Service Provider</div>
                                        </p>
                                        <div className={styles.generateIndent}>
                                            <div className={styles.indentHolder}>
                                                <div className={styles.subInputHolder}>
                                                    <CustomInput
                                                        label="Name"
                                                        name="name"
                                                        type="text"
                                                    />
                                                </div>
                                                <div className={styles.subInputHolder}>
                                                    <CustomInput
                                                        label="Email"
                                                        name="email"
                                                        type="text"
                                                    />
                                                </div>
                                            </div>
                                            <div className={styles.indentHolder}>
                                                <CustomInput
                                                    label="Address"
                                                    name="address"
                                                    type="text"
                                                    method="TextArea"
                                                />
                                            </div>
                                            <div className={styles.indentHolder} >
                                                <div className={styles.subInputHolder}>
                                                    <CustomInput
                                                        label="Primary Phone Number"
                                                        name="primary_contact_no"
                                                        type="text"
                                                    />
                                                </div>
                                                <div className={styles.subInputHolder}>
                                                    <CustomInput
                                                        label="Secondary Phone Number"
                                                        name="secondary_contact_no"
                                                        type="text"
                                                    />
                                                </div>
                                            </div>
                                            <div className={styles.indentHolder}>
                                                <CustomInput
                                                    label="Description"
                                                    name="description"
                                                    type="text"
                                                    method="TextArea"
                                                />
                                            </div>
                                            <div className={styles.indentButtonHolder}>
                                                <Button
                                                    variant="outline"
                                                    colorScheme="purple"
                                                    onClick={() => { handleSubmit() }}
                                                >
                                                    {"Submit Button"}
                                                </Button>
                                                <Button
                                                    ml={"2%"}
                                                    variant="outline"
                                                    colorScheme="red"
                                                    onClick={() => resetForm()}
                                                >
                                                    {"Reset"}
                                                </Button>
                                            </div>
                                        </div>
                                    </Container>
                                </Flex>
                            </Form>
                        );
                    }}
                </Formik>
            </GlobalWrapper>
        );
    }
}

export default addService;
