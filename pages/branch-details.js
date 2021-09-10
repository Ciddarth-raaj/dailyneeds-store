import { Formik, Form } from "formik";
import { Container, Flex } from "@chakra-ui/react";
import styles from "../styles/admin.module.css";
import React from "react";

import BranchModal from "../components/branchModal/branchModal";
import Head from "../util/head";
import GlobalWrapper from "../components/globalWrapper/globalWrapper";
import Table from "../components/table/table";

const table_title = {
    id: "Id",
    name: "Name",
    nick_name: "Nickname",
    action: "Action",
};
const details = [
    {
        id: "1",
        name: "Keerthika",
        nick_name: "Keerthi",
    },
    {
        id: "2",
        name: "Sindhu",
        nick_name: "Priya",
    },
];

export default class CreateShift extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            branchModalVisibility: false,
            selectedData: undefined,
        };
    }

    sortCallback = (key, type) => {
        console.log(key, type);
    };

    render() {
        const { branchModalVisibility, selectedData } = this.state;

        const image = (
            <div style={{ display: "flex", justifyContent: "center" }}>
                <img
                    src={"/assets/edit.png"}
                    className={styles.icon}
                    onClick={() =>
                        this.setState({
                            branchModalVisibility: true,
                        })
                    }
                />
            </div>
        );
        const valuesNew = details.map((m) => ({
            id: m.id,
            name: m.name,
            nick_name: m.nick_name,
            action: (
                <div style={{ display: "flex", justifyContent: "center" }}>
                    <img
                        src={"/assets/edit.png"}
                        className={styles.icon}
                        onClick={() =>
                            this.setState({
                                branchModalVisibility: true,
                                selectedData: m,
                            })
                        }
                    />
                </div>
            ),
        }));
        return (
            <Formik>
                <Form>
                    <GlobalWrapper title="Branch Details">
                        {branchModalVisibility && (
                            <BranchModal
                                data={selectedData}
                                visibility={branchModalVisibility}
                                setVisibility={(v) =>
                                    this.setState({ branchModalVisibility: v })
                                }
                            />
                        )}
                        <Head />
                        <Flex
                            templateColumns="repeat(3, 1fr)"
                            gap={6}
                            colSpan={2}
                        >
                            <Container
                                className={styles.container}
                                boxShadow="lg"
                            >
                                <p className={styles.buttoninputHolder}>
                                    <div>Branch Details</div>
                                </p>
                                <div>
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
}
