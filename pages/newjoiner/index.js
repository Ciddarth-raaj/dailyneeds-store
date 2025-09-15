import { Formik, Form } from "formik";
import { Container, Flex, Button, ButtonGroup, Badge, Select, InputGroup, Input, InputLeftAddon } from "@chakra-ui/react";
import styles from "../../styles/indent.module.css";
import React from "react";
import { toast } from "react-toastify";
import { ChevronRightIcon, ChevronLeftIcon } from "@chakra-ui/icons";

import Head from "../../util/head";
import VehicleHelper from "../../helper/vehicle";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Validation } from "../../util/validation";
import Table from "../../components/table/table";
import exportCSVFile from "../../util/exportCSVFile";
import moment from "moment";
import Link from "next/link";
import EmployeeHelper from "../../helper/employee";

class viewNewJoinee extends React.Component {
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
            store_name: '',
            category_id: '',
            limit: 10,
            branch: [],
            splice: [0, 10],
            offsetToggle: false,
            store_id: null,
            offset: 0,
            user_type: null,
        };
    }

    componentDidMount() {
        this.getNewJoinee();
        this.getVehicleCount();
		// this.getMaterialSizeCount();
    }
	componentDidUpdate() {
        const { offsetToggle } = this.state;
        if (offsetToggle !== false) {
            this.getNewJoinee();
            this.setState({ offsetToggle: false })
        }
	}
    getExportFile = () => {
        const TABLE_HEADER = {
			size_id: "Material Size No",
			material_size: "Material Size",
			weight: "Weight",
			cost: "Cost",
			description: "Description"
        };
        const formattedData = [];
        valuesNew.forEach((d, i) => {
            formattedData.push({
                sno: i + 1,
				size_id: m.size_id,
				material_size: m.material_size,
				weight: m.weight,
				cost: m.cost,
				description: m.description
            });
        });
        exportCSVFile(
            TABLE_HEADER,
            formattedData,
            "newjoinee_details" + moment().format("DD-MMY-YYYY")
        );
    };

    getNewJoinee() {
        const { offset, limit } = this.state;
        EmployeeHelper.getNewJoinee(offset, limit)
            .then((data) => {
                this.setState({ details: data })
            })
            .catch((err) => console.log(err))
    }

	getVehicleCount() {
        const tempArray = []
        var count = 1;
        EmployeeHelper.getNewJoiner()
            .then((data) => {
                count = Math.ceil(parseInt(data[0].new_joiners) / 10);
                for (let i = 1; i <= count; i++) {
                    tempArray.push(i);
                }
                this.setState({ pages: tempArray })
            })
    }
	
    render() {
        const { details, pages, branch ,splice, paginate_filter, store_name, store_data } = this.state;
		// const { data } = this.props;
        let valuesNew = [];
        const initialValue = {
            dob_1: "",
            dob_2: "",
        };

        const table_title = {
            // sno: "SNo",
            employee_id: "Employee_id",
            employee_name: "Vehicle Name",
			date_of_joining: "Joining Date",
        };
        valuesNew = details.map((m, i) => ({
            employee_id: m.employee_id,
			employee_name: m.employee_name,
            date_of_joining: moment(m.date_of_joining).format("DD/MM/YYYY"),
        }));


        return (
            <GlobalWrapper title="View New Joinee Details">
             
            <Formik
                initialValues={{}}
                onSubmit={(values) => {console.log(values)}}
                // validationSchema={Validation}
            >
                
                {(formikProps) => {
                    const { handleSubmit, resetForm, values } = formikProps;
                    return (
                        <Form onSubmit={formikProps.handleSubmit}>
                                <Flex templateColumns="repeat(3, 1fr)" flexDirection={"column"} gap={6} colSpan={2}>
                                    <Container className={styles.container} boxShadow="lg">
                                        <p className={styles.buttoninputHolder}>
                                            <div>New Joinee Details</div>
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
                                                    {pages.length > 10 && (
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
                                                    )}
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
                                                        {pages.length > 10 && (
                                                        <div
                                                            className={styles.arrow}
                                                            onClick={() =>
                                                                this.setState({
                                                                    splice: [this.state.splice[0] + 10, this.state.splice[1] + 10]
                                                                })}
                                                        >
                                                            <ChevronRightIcon />
                                                        </div>
                                                        )}
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

export default viewNewJoinee;
