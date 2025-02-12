import { Formik, Form } from "formik";
import {
  Container,
  Flex,
  Button,
  ButtonGroup,
  Badge,
  Select,
  InputGroup,
  Input,
  InputLeftAddon,
} from "@chakra-ui/react";
import styles from "../../styles/storebudget.module.css";
import React from "react";
import { toast } from "react-toastify";
import { ChevronRightIcon, ChevronLeftIcon } from "@chakra-ui/icons";

import DesignationHelper from "../../helper/designation";
import BudgetHelper from "../../helper/budget";
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
import CustomContainer from "../../components/CustomContainer";
import EmptyData from "../../components/EmptyData";

class viewBudget extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      indentToggle: false,
      details: [],
      paginate_filter: false,
      pages: [],
      store_data: [],
      image_url: "",
      id: "",
      selectedFile: null,
      store_name: "",
      category_id: "",
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
    this.getBranchData();
    this.getDesignationCount();
  }
  componentDidUpdate() {
    const { offsetToggle, indentToggle } = this.state;
    if (offsetToggle !== false) {
      this.getBudget();
      this.setState({ offsetToggle: false });
    }

    if (indentToggle === true) {
      this.getBudget();
      this.setState({ indentToggle: false });
    }
  }
  getExportFile = () => {
    const TABLE_HEADER = {
      sno: "SNo",
      indent_no: "Indent No",
      from: "From",
      to: "To",
      bags: "Bags",
      boxes: "Boxes",
      crates: "Crates",
      taken_by: "Taken By",
      checked_by: "Checked By",
      status: "Delivery Status",
    };
    const formattedData = [];
    valuesNew.forEach((d) => {
      formattedData.push({
        sno: d.id,
        indent_no: d.indent_number,
        from: d.from,
        to: d.to,
        bags: d.bags,
        boxes: d.boxes,
        crates: d.crates,
        taken_by: d.taken_by,
        checked_by: d.checked_by,
        status: d.delivery_status,
      });
    });
    exportCSVFile(
      TABLE_HEADER,
      formattedData,
      "indent_details" + moment().format("DD-MMY-YYYY")
    );
  };
  getBranchData() {
    BranchHelper.getOutlet()
      .then((data) => {
        this.setState({ branch: data });
      })
      .catch((err) => console.log(err));
  }
  getStoreById(store_id) {
    BranchHelper.getOutletById(store_id)
      .then((data) => {
        this.setState({ store_name: data });
      })
      .catch((err) => console.log(err));
  }
  getDesignationCount() {
    const tempArray = [];
    var count = 1;
    DesignationHelper.getDesignationCount().then((data) => {
      count = Math.ceil(parseInt(data[0].desigcount) / 10);
      for (let i = 1; i <= count; i++) {
        tempArray.push(i);
      }
      this.setState({ pages: tempArray });
    });
  }

  getBudget(values) {
    const { offset, limit } = this.state;
    this.setState({ store_id: values.store_id });
    BudgetHelper.getBudget(offset, limit, values.store_id)
      .then((data) => {
        this.setState({ details: data });
      })
      .catch((err) => console.log(err));
  }

  render() {
    const { details, pages, branch, splice, paginate_filter, store_id } =
      this.state;

    const table_title = {
      sno: "SNo",
      designation_name: "Designation",
      budget: "Allowed Employee Count",
      employee_count: "Total Employee Count",
      status: "Status",
    };

    const getStatus = (employee_count, budget) => {
      const intEmployeeCount = parseInt(employee_count, 10);
      const intBudget = parseInt(budget, 10);
      if (isNaN(intEmployeeCount) || isNaN(intBudget)) {
        return "";
      }

      if (intEmployeeCount > intBudget) {
        return <Badge colorScheme="red">Exceeded</Badge>;
      } else {
        return <Badge colorScheme="green">Within Count</Badge>;
      }
    };

    const valuesNew = details.map((m, i) => ({
      sno: i + 1,
      designation_name: m.designation_name,
      budget: m.budget,
      employee_count: m.employee_count,
      status: getStatus(m.employee_count, m.budget),
    }));

    return (
      <GlobalWrapper title="Employee Count">
        <Head />
        <Formik
          initialValues={{
            store_id: "",
          }}
          onSubmit={(values) => {
            this.getBudget(values);
          }}
          // validationSchema={Validation}
        >
          {(formikProps) => {
            const { handleSubmit, resetForm, values } = formikProps;
            return (
              <Form onSubmit={formikProps.handleSubmit}>
                <Flex
                  templateColumns="repeat(3, 1fr)"
                  flexDirection={"column"}
                  gap={6}
                  colSpan={2}
                >
                  <CustomContainer title="Employee Count" filledHeader>
                    <div className={styles.generateIndent}>
                      <CustomInput
                        label="Select Store"
                        values={branch.map((m) => ({
                          id: m.outlet_id,
                          value: m.outlet_name,
                        }))}
                        name="store_id"
                        type="text"
                        method="switch"
                      />

                      <div className={styles.indentButtonHolder}>
                        <Button
                          variant="outline"
                          colorScheme="red"
                          onClick={() => resetForm()}
                        >
                          {"Reset"}
                        </Button>

                        <Button
                          colorScheme="purple"
                          onClick={() => {
                            handleSubmit();
                          }}
                        >
                          {"Done"}
                        </Button>
                      </div>

                      {details.length === 0 && !store_id && (
                        <EmptyData message="Select a store to view data" />
                      )}

                      {details.length === 0 && store_id && (
                        <EmptyData message="No data found" />
                      )}

                      {details.length > 0 && (
                        <div style={{ marginTop: "20px" }}>
                          <Table
                            heading={table_title}
                            rows={valuesNew}
                            variant="plain"
                          />
                          {paginate_filter !== true ? (
                            <div className={styles.paginate}>
                              {details.length > 10 && (
                                <div className={styles.paginateContent}>
                                  <div
                                    className={styles.arrow}
                                    style={{
                                      pointerEvents:
                                        this.state.splice[0] !== 0
                                          ? "auto"
                                          : "none",
                                    }}
                                    onClick={() =>
                                      this.setState({
                                        splice: [
                                          this.state.splice[0] - 10,
                                          this.state.splice[1] - 10,
                                        ],
                                      })
                                    }
                                  >
                                    <ChevronLeftIcon />
                                  </div>
                                  {pages
                                    .slice(splice[0], splice[1])
                                    .map((m, index) => (
                                      <div
                                        key={index}
                                        className={styles.paginateHolder}
                                        onClick={() => {
                                          this.setState({
                                            offsetToggle: true,
                                            offset: (m - 1) * 10,
                                          });
                                        }}
                                      >
                                        {m}
                                      </div>
                                    ))}
                                  <div
                                    className={styles.arrow}
                                    onClick={() =>
                                      this.setState({
                                        splice: [
                                          this.state.splice[0] + 10,
                                          this.state.splice[1] + 10,
                                        ],
                                      })
                                    }
                                  >
                                    <ChevronRightIcon />
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className={styles.paginate}>
                              {details.length > 10 && (
                                <div className={styles.paginateContent}>
                                  <div
                                    className={styles.arrow}
                                    style={{
                                      pointerEvents:
                                        this.state.splice[0] !== 0
                                          ? "auto"
                                          : "none",
                                    }}
                                    onClick={() =>
                                      this.setState({
                                        splice: [
                                          this.state.splice[0] - 10,
                                          this.state.splice[1] - 10,
                                        ],
                                      })
                                    }
                                  >
                                    <ChevronLeftIcon />
                                  </div>
                                  {pages
                                    .slice(splice[0], splice[1])
                                    .map((m, index) => (
                                      <div
                                        key={index}
                                        className={styles.paginateHolder}
                                        onClick={() => {
                                          this.setState({
                                            filterOffsetToggle: true,
                                            offset: (m - 1) * 10,
                                          });
                                        }}
                                      >
                                        {m}
                                      </div>
                                    ))}
                                  <div
                                    className={styles.arrow}
                                    onClick={() =>
                                      this.setState({
                                        splice: [
                                          this.state.splice[0] + 10,
                                          this.state.splice[1] + 10,
                                        ],
                                      })
                                    }
                                  >
                                    <ChevronRightIcon />
                                  </div>
                                </div>
                              )}
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
                      )}
                    </div>
                  </CustomContainer>
                </Flex>
              </Form>
            );
          }}
        </Formik>
      </GlobalWrapper>
    );
  }
}

export default viewBudget;
