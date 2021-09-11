import { Formik, Form } from "formik";
import { Container, Flex } from "@chakra-ui/react";
import styles from "../styles/index.module.css";
import React from "react";
import { Box, Badge, Image } from "@chakra-ui/react";
import { ArrowForwardIcon } from '@chakra-ui/icons'
import Head from "../util/head";
import GlobalWrapper from "../components/globalWrapper/globalWrapper";

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

    render() {
        return (
            <Formik>
                <Form>
                    <GlobalWrapper title="DashBoard">
                        <Head />
                        <Flex
                            templateColumns="repeat(3, 1fr)"
                            gap={6}
                            colSpan={2}
                        >
                            <Container
                                className={styles.container}
                                // boxShadow="lg"
                            >
                                <Box maxW="sm" className={styles.boxContainer} borderWidth="1px" boxShadow="lg" borderRadius="20px" overflow="hidden">
                                    {/* <Image src={property.imageUrl} alt={property.imageAlt} /> */}
                                    <Box
                                        color="gray.500"
                                        fontWeight="semibold"
                                        letterSpacing="wide"
                                        className={styles.count}
                                    >
                                        <p className={styles.countNumber}>0</p>
                                    </Box>
                                    <Box
                                        color="gray.500"
                                        fontWeight="semibold"
                                        letterSpacing="wide"
                                        className={styles.titleContent}
                                    >
                                        <p className={styles.title}>Salary Advance</p>
                                    </Box>
                                    <Box p="6">
                                        <Box d="flex" alignItems="baseline">
                                            <Box
                                                mt="1"
                                                fontWeight="semibold"
                                                as="h4"
                                                lineHeight="tight"
                                                isTruncated
                                                className={styles.actionHolder}
                                            >
                                                <Badge borderRadius="lg" fontSize="1.1em" fontWeight="medium" className={styles.badges} px="7"color="gray.600" background="#dec6f8" >
                                                    View Details
                                                </Badge>
                                                <ArrowForwardIcon className={styles.icon} />
                                            </Box>
                                        </Box>
                                    </Box>
                                </Box>
                                <Box maxW="sm" className={styles.boxContainer} borderWidth="1px" boxShadow="lg" borderRadius="20px" overflow="hidden">
                                    {/* <Image src={property.imageUrl} alt={property.imageAlt} /> */}
                                    <Box
                                        color="gray.500"
                                        fontWeight="semibold"
                                        letterSpacing="wide"
                                        className={styles.count}
                                    >
                                        <p className={styles.countNumber}>0</p>
                                    </Box>
                                    <Box
                                        color="gray.500"
                                        fontWeight="semibold"
                                        letterSpacing="wide"
                                        className={styles.titleContent}
                                    >
                                        <p className={styles.title}>Material Requests</p>
                                    </Box>
                                    <Box p="6">
                                        <Box d="flex" alignItems="baseline">
                                            <Box
                                                mt="1"
                                                fontWeight="semibold"
                                                as="h4"
                                                lineHeight="tight"
                                                isTruncated
                                                className={styles.actionHolder}
                                            >
                                                <Badge borderRadius="lg" fontSize="1.1em" fontWeight="medium" className={styles.badges} px="7"color="gray.600" background="#dec6f8" >
                                                    View Details
                                                </Badge>
                                                <ArrowForwardIcon className={styles.icon} />
                                            </Box>
                                        </Box>
                                    </Box>
                                </Box>
                                <Box maxW="sm" className={styles.boxContainer} borderWidth="1px" boxShadow="lg" borderRadius="20px" overflow="hidden">
                                    {/* <Image src={property.imageUrl} alt={property.imageAlt} /> */}
                                    <Box
                                        color="gray.500"
                                        fontWeight="semibold"
                                        letterSpacing="wide"
                                        className={styles.count}
                                    >
                                        <p className={styles.countNumber}>0</p>
                                    </Box>
                                    <Box
                                        color="gray.500"
                                        fontWeight="semibold"
                                        letterSpacing="wide"
                                        className={styles.titleContent}
                                    >
                                        <p className={styles.title}>Open Issues</p>
                                    </Box>
                                    <Box p="6">
                                        <Box d="flex" alignItems="baseline">
                                            <Box
                                                mt="1"
                                                fontWeight="semibold"
                                                as="h4"
                                                lineHeight="tight"
                                                isTruncated
                                                className={styles.actionHolder}
                                            >
                                                <Badge borderRadius="lg" fontSize="1.1em" fontWeight="medium" className={styles.badges} px="7"color="gray.600" background="#dec6f8" >
                                                    View Details
                                                </Badge>
                                                <ArrowForwardIcon className={styles.icon} />
                                            </Box>
                                        </Box>
                                    </Box>
                                </Box>
                            </Container>
                        </Flex>
                    </GlobalWrapper>
                </Form>
            </Formik>
        );
    }
}
