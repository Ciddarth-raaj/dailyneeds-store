import { Formik, Form } from "formik";
import { Container, Flex, Button, ButtonGroup, Badge, Select, InputGroup, Input, InputLeftAddon } from "@chakra-ui/react";
import styles from "../../styles/indent.module.css";
import React from "react";
import { toast } from "react-toastify";
import { ChevronRightIcon, ChevronLeftIcon } from "@chakra-ui/icons";

import Head from "../../util/head";
import CustomInput from "../../components/customInput/customInput";
import StoreHelper from "../../helper/store";
import BranchHelper from "../../helper/outlets";
import IndentHelper from "../../helper/indent";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Validation } from "../../util/validation";
import Table from "../../components/table/table";
import exportCSVFile from "../../util/exportCSVFile";
import moment from "moment";
import Link from "next/link";
import MaterialHelper from "../../helper/materialsize";

class viewMaterialSize extends React.Component {
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
        this.getMaterialSize();
		this.getMaterialSizeCount();
    }
	componentDidUpdate() {
        const { offsetToggle } = this.state;
        if (offsetToggle !== false) {
            this.getMaterialSize();
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
            "materialSize_details" + moment().format("DD-MMY-YYYY")
        );
    };

    getMaterialSize() {
        const { offset, limit } = this.state;
        MaterialHelper.getMaterialSize(offset, limit)
            .then((data) => {
                this.setState({ details: data })
            })
            .catch((err) => console.log(err))
    }

	getMaterialSizeCount() {
        const tempArray = []
        var count = 1;
        MaterialHelper.getMaterialSizeCount()
            .then((data) => {
                count = Math.ceil(parseInt(data[0].sizecount) / 10);
                for (let i = 1; i <= count; i++) {
                    tempArray.push(i);
                }
                console.log({tempArray: tempArray});
                this.setState({ pages: tempArray })
            })
    }
	
    render() {
        const { details, pages, branch ,splice, paginate_filter, store_name, store_data } = this.state;
		// const { data } = this.props;
        let valuesNew = [];
		const onClick = (m) => {
			return (
				<Link href={`/packing-material-size/${m.id}`}><a>{m.value}</a></Link>
			)
		};
        const initialValue = {
            dob_1: "",
            dob_2: "",
        };

        const table_title = {
            // sno: "SNo",
            size_id: "Material Size No",
			material_size: "Material Size",
			weight: "Weight",
			cost: "Cost",
			// description: "Description"
        };
        valuesNew = details.map((m, i) => ({
            // sno: i + 1,
			size_id: onClick({value: m.size_id, id: m.size_id}),
			material_size: onClick({value: m.material_size, id: m.size_id}),
			weight: onClick({value: m.weight, id: m.size_id}),
			cost: onClick({value: m.cost, id: m.size_id}),
			// description: onClick({value: m.description, id: m.size_id})
        }));


        return (
            <GlobalWrapper title="View Pack Material Size">
            <Head />
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
                                            <div>View Details</div>
											<div style={{ paddingRight: 10 }}>
                                            <Link href="/packing-material-size/create">
                                                <Button colorScheme="purple">
                                                    {"Add"}
                                                </Button>
                                            </Link>
                                        </div>
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

export default viewMaterialSize;
