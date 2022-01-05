import React from "react";
import { Formik, Form } from "formik";
import { Grid, GridItem, Box, Button } from "@chakra-ui/react";
import { ArrowForwardIcon, WarningIcon, InfoOutlineIcon } from '@chakra-ui/icons'
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import LogIn from "../pages/login";
import { Bar, Doughnut } from 'react-chartjs-2';
import styles from "../styles/index.module.css";
import EmployeeHelper from "../helper/employee";
import StoreHelper from "../helper/store";
import Head from "../util/head";
import { MONTH } from "../constants/values";
import GlobalWrapper from "../components/globalWrapper/globalWrapper";

export default class CreateShift extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            branchModalVisibility: false,
            selectedData: undefined,
            hoverElement: false,
            employeeDet: [],
            loginVisibility: false,
            resp: false,
            one: false,
            store_data: [],
            store_name: '',
            store: '',
            final_store: [],
            store_id: 0,
            events: [
                {
                    start: moment().toDate(),
                    end: moment()
                        .toDate(),
                    title: "Birthday!"
                }
            ],
            store_count: {
                labels: [],
                datasets: [
                    {
                        label: 'Employee Head Count On Branch',
                        data: ['0', '1', '2'],
                        backgroundColor: "#8b74ff"
                    },
                ],
            },
            head_count: {
                labels: ['jan', 'feb', 'march'],
                datasets: [
                    {
                        label: 'Employee Head Count',
                        data: ['0', '1', '2'],
                        backgroundColor: "#8b74ff"
                    },
                ],
            },
            resigned_employee: {
                labels: ['', 'Resigned Employees'],
                datasets: [
                    {
                        label: 'Resigned employee Count',
                        data: ['100'],
                    },
                ],
            },
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
            ],
            headcount: [],
            newJoiner: [],
            resignedEmp: "",
            birthdays: [],
            anniversary: [],
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
        this.getStore();
        this.getHeadCount();
        this.getNewJoiner();
        this.getResignedEmp();
        this.getBirthday();
        this.getAnniversary();
        this.getEmployeeDet();
    }
    componentDidUpdate() {
        if (this.state.store_name !== '') {
            this.getEmployeeByStore();
        }
        this.state.store = this.state.store_name;
        this.state.store_name = '';
        this.state.store_id = 0;
    }
    getEmployeeByStore() {
        const { store_id } = this.state;
        EmployeeHelper.getStoreById(
            store_id
        )
            .then((data) => {
                let date = []
                let count = []
                let detailsMapper = {}
                let updatedCountArr = []
                data.map((detail) => {
                    detailsMapper[moment(detail.created_at).format("MMMM")] = detail.store_count;
                })
                MONTH.map((el1) => {
                    var temp = {}
                    if (el1 in detailsMapper) {
                        temp.date = el1;
                        temp.count = parseInt(detailsMapper[el1]);
                    } else {
                        temp.date = el1;
                        temp.count = 0;
                    }
                    updatedCountArr.push(temp);
                })
                for (const val of updatedCountArr) {
                    date.push(val.date);
                    count.push(val.count);
                    this.setState({
                        store_count: {
                            labels: date,
                            datasets: [
                                {
                                    label: "Store Head Count",
                                    data: count,
                                    backgroundColor: "#8b74ff"
                                },
                            ],
                        },
                    })
                }
            })
            .catch((err) => console.log(err))
    }
    getStore() {
        StoreHelper.getStore()
            .then((data) => {
                this.setState({ store_data: data })
            })
            .catch((err) => console.log(err))
    }
    getEmployeeDet() {
        EmployeeHelper.getFamilyDet()
            .then((data) => {
                this.setState({ employeeDet: data })
            })
            .catch((err) => console.log(err))
    }
    getHeadCount() {
        EmployeeHelper.getHeadCount()
            .then((data) => {
                let date = []
                let count = []
                let detailsMapper = {}
                let updatedCountArr = []
                data.map((detail) => {
                    detailsMapper[moment(detail.created_at).format("MMMM")] = detail.head_count;
                })
                MONTH.map((el1) => {
                    var temp = {}
                    if (el1 in detailsMapper) {
                        temp.date = el1;
                        temp.count = parseInt(detailsMapper[el1]);
                    } else {
                        temp.date = el1;
                        temp.count = 0;
                    }
                    updatedCountArr.push(temp);
                })
                for (const val of updatedCountArr) {
                    date.push(val.date);
                    count.push(val.count);
                    this.setState({
                        head_count: {
                            labels: date,
                            datasets: [
                                {
                                    label: "Employee Head Count",
                                    data: count,
                                    backgroundColor: "#8b74ff"
                                },
                            ],
                        },
                    })
                }
            })
            .catch((err) => console.log(err));
    }
    getResignedEmp() {
        EmployeeHelper.getResignedEmp()
            .then((data) => {
                this.setState({
                    resigned_employee: {
                        label: ['Resigned Employees'],
                        datasets: [
                            {
                                label: "Employee Head Count",
                                data: ['100', data[0].Resigned_employee],
                                backgroundColor: ["#8b74ff", "lightpink"],
                            },
                        ],
                    },
                });
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
    getAnniversary() {
        EmployeeHelper.getAnniversary()
            .then((data) => {
                this.setState({ anniversary: data });
            })
            .catch((err) => console.log(err));
    }
    getBirthday() {
        EmployeeHelper.getBirthday()
            .then((data) => {
                this.setState({ birthdays: data });
            })
            .catch((err) => console.log(err));
    }

    render() {
        const { newjoiner, birthdays, store_data, resp, employeeDet, loginVisibility, hoverElement, store, store_name, resigned_employee, store_count, head_count, anniversary } = this.state;
        return (
            <Formik>
                <Form>
                {loginVisibility !== true && (
                    <LogIn
                        visibility={loginVisibility}
                        setVisibility={(v) =>
                            this.setState({ loginVisibility: v, resp: true })
                        }
                    />
                )} 
                {loginVisibility === true && (
                    <GlobalWrapper title="DashBoard">
                        <Head />
                        <div className={styles.mainWrapper}>
                            <div className={styles.leftHolder}>
                                <Box boxShadow="lg" bg="white" padding="10px" borderRadius="20px" overflow="hidden">
                                    <div className={styles.dropdown}>
                                        <input placeholder="Store Name" onChange={(e) => this.setState({ store: e.target.value })} type="text" value={store === "" ? store : `${store}`} onMouseEnter={() => this.setState({ hoverElement: false })}
                                            className={styles.dropbtn} />
                                        <div className={styles.newDropdowncontent} style={hoverElement === false ? { color: "black" } : { display: "none" }}>
                                            {store_data.filter(({ value }) => value.indexOf(store.toLowerCase()) > -1).map((m) => (
                                                <a onClick={() => (this.setState({ store_name: m.value, store_id: m.id, hoverElement: true }))}>
                                                    {m.value}<br />{`# ${m.id}`}</a>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ width: "97%" }}>
                                        <Bar
                                            data={store_count.labels.length === 0 ? head_count : store_count}
                                            style={{ height: "240px", width: "20px" }}
                                            options={{ maintainAspectRatio: false }}
                                        />
                                    </div>
                                </Box>
                                <div className={styles.cardHolder}>
                                    <div>
                                        <p className={styles.fontMod}>New Joinee</p>
                                        <Box boxShadow="lg" bg="white" className={styles.boxContainer} borderRadius="20px" overflow="hidden">
                                            <Box
                                                color="gray.500"
                                                fontWeight="semibold"
                                                // letterSpacing="wide"
                                                className={styles.count}
                                            >
                                                <p className={styles.countNumber}>{newjoiner ? newjoiner : 0}</p>
                                            </Box>
                                            <Box
                                                color="gray.500"
                                                fontWeight="semibold"
                                                letterSpacing="wide"
                                                className={styles.titleContent}
                                            >
                                                <p className={styles.title}>New Joiner Count</p>
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
                                    </div>
                                    <div>
                                        <p className={styles.fontResigned}>Resigned Employee</p>
                                        <Box boxShadow="lg" bg="white" className={styles.boxContainer} borderRadius="20px" overflow="hidden">
                                            <Doughnut
                                                data={resigned_employee}
                                                options={{ maintainAspectRatio: false }}
                                            />
                                        </Box>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.rightHold}>
                                <Box boxShadow="lg" bg="white" borderRadius="20px" height="620px" padding="10px" overflow="hidden">
                                    <p className={styles.fontBirthday}>Birthday Week</p>
                                    <div className={styles.rightHolder}>
                                        <div className={styles.birthdayHolder}>
                                            {birthdays.length === 0 && (
                                                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", marginTop: "100px", alignItems: "center" }}>
                                                    <InfoOutlineIcon color="red.400" ml="5px" className={styles.infoIcon} />
                                                    <p className={styles.birthdayContent}>No Birthdays for this week</p>
                                                </div>
                                            )}
                                            {birthdays.length !== 0 && birthdays.map((m) => (
                                                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px", marginTop: "20px", alignItems: "center" }}>
                                                    <p className={styles.birthdayContent}><WarningIcon color="#78719c" ml="5px" className={styles.warningIcon} />{m.birthday}</p>
                                                    <p className={styles.birthdayContent}>{m.dob}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className={styles.anniversaryHolder}>
                                            <p className={styles.fontBirthday}>Anniversary Week</p>
                                            <div className={styles.anniversaryScroll}>
                                                {anniversary.length === 0 && (
                                                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", marginTop: "100px", alignItems: "center" }}>
                                                        <InfoOutlineIcon color="red.400" ml="5px" className={styles.infoIcon} />
                                                        <p className={styles.birthdayContent}>No Anniversary for this week</p>
                                                    </div>
                                                )}
                                                {anniversary.length !== 0 && anniversary.map((m) => (
                                                    <div className={styles.anniversaryContent}>
                                                        <p className={styles.birthdayContent}><WarningIcon color="#78719c" ml="5px" className={styles.warningIcon} />{m.anniversary}</p>
                                                        <p className={styles.birthdayContent}>{moment(m.dob).format("DD MMMM YYYY")}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </Box>
                            </div>
                        </div>
                    </GlobalWrapper>
                )}
                </Form>
            </Formik>
        );
    }
}
