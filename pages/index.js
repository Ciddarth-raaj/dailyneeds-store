import React from "react";
import { Formik, Form } from "formik";
import { Container, Flex, Button } from "@chakra-ui/react";
import { Box, Badge, Image } from "@chakra-ui/react";
import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';

import styles from "../styles/index.module.css";

import EmployeeHelper from "../helper/employee";
import Head from "../util/head";
import GlobalWrapper from "../components/globalWrapper/globalWrapper";

export default class CreateShift extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            branchModalVisibility: false,
            selectedData: undefined,
            events: [
                {
                    start: moment().toDate(),
                    end: moment()
                        .toDate(),
                    title: "Birthday!"
                }
            ],
            headcount: "",
            newJoiner: "",
            resignedEmp: "",
            cards: [
                {
                    id: 1,
                    title: "Employee Head Count",
                    count: 0
                },
                {
                    id: 2,
                    title: "New Joiners",
                    count: 0
                },
                {
                    id: 3,
                    title: "Resigned Employee",
                    count: 0
                },
            ]
        };
    }

    eventStyleGetter() {
        var backgroundColor = "#dec6f8";
        var style = {
            backgroundColor: backgroundColor,
            color: 'black',
            // borderRadius: '0px',
            // opacity: 0.8,
            // border: '0px',
            // display: 'block'
        };
        return {
            style: style
        };
    };
    componentDidMount() {
        this.getHeadCount();
        this.getNewJoiner();
        this.getResignedEmp();
    }
    getHeadCount() {
        EmployeeHelper.getHeadCount()
            .then((data) => {
                this.setState({ headcount: data[0].head_count });
            })
            .catch((err) => console.log(err));
    }
    getResignedEmp() {
        EmployeeHelper.getResignedEmp()
            .then((data) => {
                this.setState({ resignedemp: data[0].Resigned_employee });
            })
            .catch((err) => console.log(err));
    }
    getNewJoiner() {
        EmployeeHelper.getNewJoiner()
            .then((data) => {
                this.setState({ newjoiner: data[0].new_joiners });
            })
            .catch((err) => console.log(err));
    }

    render() {
        const { events, resignedemp, newjoiner, headcount, cards } = this.state;
        const localizer = momentLocalizer(moment);
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
                            <Container className={styles.container}>
                                {
                                    cards.map(c => (
                                        <Box maxW="sm" className={styles.boxContainer} borderWidth="1px" borderWidth="1px" borderRadius="20px" overflow="hidden">
                                            <Box
                                                color="gray.500"
                                                fontWeight="semibold"
                                                // letterSpacing="wide"
                                                className={styles.count}
                                            >
                                                <p className={styles.countNumber}>{c.count}</p>
                                            </Box>
                                            <Box
                                                color="gray.500"
                                                fontWeight="semibold"
                                                letterSpacing="wide"
                                                className={styles.titleContent}
                                            >
                                                <p className={styles.title}>{c.title}</p>
                                            </Box>
                                            <Box p="5">
                                                <Box d="flex" alignItems="baseline">
                                                    <Box
                                                        fontWeight="semibold"
                                                        lineHeight="tight"
                                                        isTruncated
                                                        className={styles.actionHolder}
                                                    >
                                                        <Button className={styles.button} borderRadius="lg" fontSize="1.1em" fontWeight="medium" className={styles.badges} px="7" color="gray.600" background="#dec6f8" >
                                                            View Details
                                                            <ArrowForwardIcon ml="20px" className={styles.icon} />
                                                        </Button>
                                                    </Box>
                                                </Box>
                                            </Box>
                                        </Box>
                                    ))
                                }
                            </Container>
                        </Flex>
                        <div className={styles.calendarHolder}>
                            <Calendar
                                localizer={localizer}
                                defaultDate={new Date()}
                                defaultView="month"
                                events={events}
                                eventPropGetter={this.eventStyleGetter}
                                toolbar="true"
                                style={{ height: 500 }}
                                className={styles.calendar}
                            />
                        </div>
                    </GlobalWrapper>
                </Form>
            </Formik>
        );
    }
}
