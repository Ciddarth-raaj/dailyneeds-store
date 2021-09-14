import { Formik, Form } from "formik";
import {
    Container,
    Flex,
    ButtonGroup,
    Button,
    CheckboxGroup,
    Checkbox,
    Grid,
} from "@chakra-ui/react";
import styles from "../../styles/admin.module.css";
import CustomInput from "../../components/customInput/customInput";
import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import Table from "../../components/table/table";

function product() {
    const loading = false;

    const image = (m) => (
        <div style={{ display: "flex", justifyContent: "center" }}>
            <img
                src={"/assets/edit.png"}
                onClick={() => (window.location = `/designation/${m}`)}
                className={styles.icon}
            />
        </div>
    );
    const table_title = {
        s_no: "S.No",
        id: "Id",
        name: "Name",
        variants: "Variants",
        action: "Action",
    };
    const details = [
        {
            s_no: "1",
            id: "23",
            name: "Maggi",
            variants: "6",
        },
        {
            s_no: "2",
            id: "15",
            name: "Horlicks",
            variants: "2",
        },
        {
            s_no: "3",
            id: "10",
            name: "Top Ramen",
            variants: "10",
        },
    ];

    const valuesNew = details.map((m) => ({
        s_no: m.s_no,
        id: m.id,
        name: m.name,
        variants: m.variants,
        action: image(m.id),
    }));

    const sortCallback = (key, type) => {
        console.log(key, type);
    };

    return (
        <Formik>
            <Form>
                <GlobalWrapper title="Products">
                    <Head />
                    <Flex templateColumns="repeat(3, 1fr)" gap={6} colSpan={2}>
                        <Container className={styles.container} boxShadow="lg">
                            <p className={styles.buttoninputHolder}>
                                <div>Product Details</div>
                            </p>
                            <div>
                                <div className={styles.personalInputHolder}>
                                    <CustomInput
                                        label="Search by Name or ID"
                                        name="search"
                                        type="text"
                                    />
                                    <ButtonGroup
                                        mt={5}
                                        style={{ justifyContent: "flex-end" }}
                                        type="submit"
                                    >
                                        <Button
                                            isLoading={loading}
                                            loadingText="Searching"
                                            colorScheme="purple"
                                        >
                                            {"Search"}
                                        </Button>
                                    </ButtonGroup>
                                </div>
                                <CheckboxGroup colorScheme="purple">
                                    <Grid
                                        templateColumns="repeat(3, 1fr)"
                                        gap={6}
                                        mb={5}
                                        ml={2}
                                    >
                                        <Checkbox>W/O Images</Checkbox>
                                        <Checkbox>W/O Description</Checkbox>
                                        <Checkbox>New</Checkbox>
                                    </Grid>
                                </CheckboxGroup>
                                <Table
                                    heading={table_title}
                                    rows={valuesNew}
                                    sortCallback={(key, type) =>
                                        sortCallback(key, type)
                                    }
                                />
                            </div>
                        </Container>
                    </Flex>
                </GlobalWrapper>
            </Form>
        </Formik>
    );
}

export default product;
