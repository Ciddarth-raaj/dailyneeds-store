import { Formik, Form } from "formik";
import { Container, Flex, Button, ButtonGroup, Badge, Select, InputGroup, Input, InputLeftAddon } from "@chakra-ui/react";
import styles from "../../styles/indent.module.css";
import React from "react";
import { toast } from "react-toastify";
import { ChevronRightIcon, ChevronLeftIcon } from "@chakra-ui/icons";

import Head from "../../util/head";
import CustomInput from "../../components/customInput/customInput";
import StoreHelper from "../../helper/store";
import IndentHelper from "../../helper/indent";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { allIssueValidation } from "../../util/validation";
import Table from "../../components/table/table";
import exportCSVFile from "../../util/exportCSVFile";
import moment from "moment";

class serviceProvider extends React.Component {
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

    componentDidMount() {
        this.getStore();
    }

    getStore() {
        StoreHelper.getStore()
            .then((data) => {
                this.setState({ store_data: data })
            })
            .catch((err) => console.log(err))
    }
  
    getExportFile = () => {
        const TABLE_HEADER = {
            id: "Id",
            name: "Name",
            primary_contact: "Primary Contact",
            secondary_contact: "Secondary Contact",
            email: "email",
            description: "Description",
        };
        const formattedData = [];
        valuesNew.forEach((d) => {
            formattedData.push({
            id: i + 1,
            name: m.name,
            primary_contact: m.primary_contact,
            secondary_contact: m.secondary_contact,
            email: m.email,
            description: m.description,
        });
        });
        exportCSVFile(
            TABLE_HEADER,
            formattedData,
            "all issue" + moment().format("DD-MMY-YYYY")
        );
    };
   
    render() {
        const { details, pages, splice, paginate_filter, id, selectedFile, store_data, image_url, loading } = this.state;
        let valuesNew = [];
        const initialValue = {
            dob_1: "",
            dob_2: "",
        };

        const table_title = {
            id: "Id",
            name: "Name",
            primary_contact: "Primary Contact",
            secondary_contact: "Secondary Contact",
            email: "email",
            description: "Description",
        };

        // after adding table detail unquote
        // ----> 
        // valuesNew = details.map((m, i) => ({
        //     id: i + 1,
        //     name: m.name,
        //     primary_contact: m.primary_contact,
        //     secondary_contact: m.secondary_contact,
        //     email: m.email,
        //     description: m.description,
        // }));


        return (
            <GlobalWrapper title="Service Provider List">
            <Head />
            <Formik
                initialValues={{
                    store_id: '',
                    from_date: '',
                    to_date: '',
                }}
                onSubmit={(values) => {
                    console.log(values);
                }}
                // validationSchema={OpenIssueValidation}
            >
                {(formikProps) => {
                    const { handleSubmit, resetForm } = formikProps;
                    return (
                        <Form onSubmit={formikProps.handleSubmit}>
                                <Flex templateColumns="repeat(3, 1fr)" flexDirection={"column"} gap={6} colSpan={2}>
                                    <Container className={styles.container} boxShadow="lg">
                                        <p className={styles.buttoninputHolder}>
                                        <div>Service Provider List</div>
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
                        </Form>
                    );
                }}
            </Formik>
            </GlobalWrapper>
        );
    }
}

export default serviceProvider;
