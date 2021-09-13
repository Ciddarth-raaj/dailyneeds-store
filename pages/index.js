import { Formik, Form } from "formik";
import { Container, Flex } from "@chakra-ui/react";
import styles from "../styles/index.module.css";
import React from "react";
import { Box, Badge, Image } from "@chakra-ui/react";
import { ArrowForwardIcon } from '@chakra-ui/icons'
import EmployeeHelper from "../helper/employee";
import Head from "../util/head";
import { Calendar, momentLocalizer } from 'react-big-calendar';
import "react-big-calendar/lib/css/react-big-calendar.css";
import moment from 'moment';
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
    componentDidMount(){
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
        const { events, resignedemp, newjoiner, headcount } = this.state;
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
                                        <p className={styles.countNumber}>{headcount}</p>
                                    </Box>
                                    <Box
                                        color="gray.500"
                                        fontWeight="semibold"
                                        letterSpacing="wide"
                                        className={styles.titleContent}
                                    >
                                        <p className={styles.title}>Employee Head Count</p>
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
                                        <p className={styles.countNumber}>{newjoiner}</p>
                                    </Box>
                                    <Box
                                        color="gray.500"
                                        fontWeight="semibold"
                                        letterSpacing="wide"
                                        className={styles.titleContent}
                                    >
                                        <p className={styles.title}>New Joiners</p>
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
                                        <p className={styles.countNumber}>{resignedemp}</p>
                                    </Box>
                                    <Box
                                        color="gray.500"
                                        fontWeight="semibold"
                                        letterSpacing="wide"
                                        className={styles.titleContent}
                                    >
                                        <p className={styles.title}>Resigned Employee</p>
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
