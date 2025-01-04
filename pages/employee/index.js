import { Formik, Form } from "formik";
import {
  Container,
  Flex,
  Button,
  ButtonGroup,
  Switch,
  Input,
} from "@chakra-ui/react";
import styles from "../../styles/admin.module.css";
import EmployeeHelper from "../../helper/employee";
import DesignationHelper from "../../helper/designation";
import OutletsHelper from "../../helper/outlets";
import StoreHelper from "../../helper/store";

import React, { useState, useEffect } from "react";
import { DropDownOptionEmployee } from "../../constants/values";
import { default as ReactSelect } from "react-select";

import CustomInput from "../../components/customInput/customInput";
import Head from "../../util/head";
import { toast } from "react-toastify";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Validation } from "../../util/validation";
import Table from "../../components/table/table";
import Link from "next/link";
import exportCSVFile from "../../util/exportCSVFile";
import moment from "moment";
let valuesNew = [];

class Registration extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      employee: [],
      designation: [],
      store: [],
      name: "",
      hoverElement: false,
      filter_click: false,
      paginate_filter: false,
      id: 0,
      optionSelected: null,
      filter_details: [],
      new_header: false,
      status: "",
      permission_array: [],
    };
  }
  componentDidMount() {
    let arr = global.config.data;
    if (arr.length > 0) {
      this.setState({ permission_array: global.config.data });
      arr = null;
    }
    this.getEmployeeData();
    this.getDesignationData();
    this.getStoreData();
  }
  componentDidUpdate() {
    const { filter_click, name } = this.state;
    if (filter_click === true) {
      if (name !== "") {
        this.filterData();
        this.setState({ filter_click: false });
      }
    }
  }
  filterData() {
    const { name, offset, limit } = this.state;
    EmployeeHelper.getFilteredEmployee(name)
      .then((data) => {
        for (let i = 0; i <= data.length - 1; i++) {
          data[i].dob = moment(data[i].dob).format("DD/MM/YYYY");
        }
        this.setState({ filter_details: data });
      })
      .catch((err) => console.log(err));
  }
  getEmployeeData() {
    EmployeeHelper.getEmployee()
      .then((data) => {
        if (data.code != 500) {
          for (let i = 0; i <= data.length - 1; i++) {
            data[i].dob = moment(data[i].dob).format("DD/MM/YYYY");
            data[i].date_of_joining = moment(data[i].date_of_joining).format(
              "DD/MM/YYYY"
            );
            data[i].marriage_date = moment(data[i].marriage_date).format(
              "DD/MM/YYYY"
            );
          }
          this.setState({ employee: data });
        }
      })
      .catch((err) => console.log(err));
  }

  getDesignationData() {
    DesignationHelper.getDesignation()
      .then((data) => {
        this.setState({ designation: data });
      })
      .catch((err) => console.log(err));
  }
  getStoreData() {
    OutletsHelper.getOutlet()
      .then((data) => {
        this.setState({ store: data });
      })
      .catch((err) => console.log(err));
  }

  updateStatus() {
    const { status, id } = this.state;
    if (status !== "") {
      EmployeeHelper.updateStatus({
        employee_id: id,
        status: status,
      })
        .then((data) => {
          if (data.code === 200) {
            toast.success("Successfully updated Status");
          } else {
            toast.error("Not Updated");
          }
        })
        .catch((err) => console.log(err));
    } else {
      console.log("clear");
    }
  }
  Option = (props) => {
    return (
      <div>
        <components.Option {...props}>
          <input
            type="checkbox"
            checked={props.isSelected}
            onChange={() => null}
          />{" "}
          <label>{props.label}</label>
        </components.Option>
      </div>
    );
  };
  handleChange = (selected) => {
    this.setState({
      optionSelected: selected,
    });
  };
  getExportFile = () => {
    const TABLE_HEADER = {
      SNo: "SNo",
      id: "Employee Id",
      name: "Name",
      store_name: "Store Name",
      designation: "Designation",
      status: "Status",
    };
    const formattedData = [];
    valuesNew.forEach((d, i) => {
      formattedData.push({
        SNo: i + 1,
        id: d.employee_id,
        name: d.employee_name,
        store_name: d.store_id,
        designation: d.designation_id,
        status: d.status,
      });
    });
    exportCSVFile(
      TABLE_HEADER,
      formattedData,
      "employee_details" + moment().format("DD-MMY-YYYY")
    );
  };

  sortCallback = (key, type) => {
    const { employee, filter_details } = this.state;
    const dataToSort = filter_details.length === 0 ? employee : filter_details;

    let sortedData;
    if (type === null) {
      // Reset to original order
      sortedData = [...dataToSort];
    } else {
      sortedData = [...dataToSort].sort((a, b) => {
        let aValue = a[key];
        let bValue = b[key];

        // Handle special cases for nested values
        if (key === "store_name") {
          aValue = a.store_name || "";
          bValue = b.store_name || "";
        } else if (key === "designation") {
          aValue = a.designation_name || "";
          bValue = b.designation_name || "";
        } else if (key === "name") {
          aValue = a.employee_name || "";
          bValue = b.employee_name || "";
        } else if (key === "employee_id") {
          aValue = parseInt(a.employee_id) || "";
          bValue = parseInt(b.employee_id) || "";
        }

        // Convert to strings for comparison
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();

        if (type === "asc") {
          return aValue.localeCompare(bValue);
        } else {
          return bValue.localeCompare(aValue);
        }
      });
    }

    // Update the appropriate state based on whether we're filtering or not
    if (filter_details.length === 0) {
      this.setState({ employee: sortedData });
    } else {
      this.setState({ filter_details: sortedData });
    }
  };

  // Add custom theme for ReactSelect
  customSelectStyles = {
    control: (base, state) => ({
      ...base,
      borderColor: state.isFocused ? "rgb(106, 0, 148)" : "#e2e8f0",
      boxShadow: state.isFocused ? "0 0 0 1px rgb(106, 0, 148)" : "none",
      "&:hover": {
        borderColor: "rgb(106, 0, 148)",
      },
      borderRadius: "8px",
      padding: "2px",
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? "rgba(106, 0, 148, 0.1)"
        : state.isFocused
        ? "rgba(106, 0, 148, 0.05)"
        : "transparent",
      color: state.isSelected ? "rgb(106, 0, 148)" : "#333",
      "&:hover": {
        backgroundColor: "rgba(106, 0, 148, 0.05)",
      },
      padding: "8px 12px",
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: "rgba(106, 0, 148, 0.1)",
      borderRadius: "4px",
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: "rgb(106, 0, 148)",
      fontWeight: 500,
      padding: "2px 6px",
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: "rgb(106, 0, 148)",
      "&:hover": {
        backgroundColor: "rgba(106, 0, 148, 0.2)",
        color: "rgb(106, 0, 148)",
      },
    }),
    menu: (base) => ({
      ...base,
      borderRadius: "8px",
      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
    }),
  };

  render() {
    const {
      employee,
      designation,
      optionSelected,
      filter_details,
      new_header,
      name,
      store,
      id,
      status,
      permission_array,
    } = this.state;
    let new_table_title = {};
    let new_table_value = {};
    const onClick = (m) => (
      <Link href={`/employee/${m.id}`}>
        <a>{m.value}</a>
      </Link>
    );

    const badge = (m) => (
      <Switch
        className={styles.switch}
        id="email-alerts"
        defaultChecked={m.value === 1}
        onChange={() => {
          this.setState({ status: m.value === 1 ? 0 : 1, id: m.id });
        }}
      />
    );
    const designationName = (n) => {
      var name = "";
      designation.map((m) => {
        if (m.id == n.value) {
          name = m.value;
        }
      });
      return <Link href={`/employee/${n.id}`}>{name}</Link>;
    };
    const storeName = (n) => {
      var storeName = "";
      store.map((m) => {
        if (m.outlet_id == n.value) {
          storeName = m.value;
        }
      });
      return <Link href={`/employee/${n.id}`}>{storeName}</Link>;
    };
    const initialValue = {
      dob_1: "",
      dob_2: "",
    };
    // const image = (m) => (
    // 	<div style={{ display: "flex", justifyContent: "center" }}>
    // 		<img src={"/assets/edit.png"} onClick={() => window.location = `/employee/${m}`} className={styles.icon} />
    // 	</div>
    // );
    let table_title = {
      employee_id: "Employee Id",
      name: "Employee Name",
      store_name: "Store Name",
      designation: "Designation",

      // status: "Status",
      // action: "Action",
    };
    if (new_header === true) {
      optionSelected.map(
        (m, index) => (
          (new_table_title[m.value] = m.label),
          (new_table_value[index] = m.value)
        )
      );
    }

    if (new_header !== true) {
      if (filter_details.length === 0) {
        valuesNew = employee.map((m, i) => ({
          // s_no: i + 1,
          id: m.employee_id,
          name: onClick({ value: m.employee_name, id: m.employee_id }),
          store_name: onClick({ value: m.store_name, id: m.employee_id }),
          designation: onClick({
            value: m.designation_name,
            id: m.employee_id,
          }),
          // dob: onClick({ value: m.dob, id: m.employee_id }),
          // gender: onClick({value: m.gender, id: m.employee_id}),
          // status: badge({ value: m.status, id: m.employee_id }),
        }));
      } else {
        valuesNew = filter_details.map((m, i) => ({
          id: m.employee_id,
          name: onClick({ value: m.employee_name, id: m.employee_id }),
          store_name: onClick({ value: m.store_name, id: m.employee_id }),
          designation: onClick({
            value: m.designation_name,
            id: m.employee_id,
          }),
          // dob: onClick({ value: m.dob, id: m.employee_id }),
          // gender: onClick({value: m.gender, id: m.employee_id}),

          // status: badge({ value: m.status, id: m.employee_id }),
        }));
      }
    }
    let arr1 = [];
    let arr = {};
    let temp = {};
    if (new_header === true) {
      if (filter_details.length === 0) {
        employee.map((detail, id) => {
          temp = {};
          arr[id] = optionSelected.map((option) => {
            temp[option.value] = onClick({
              value: detail[option.value],
              id: detail["employee_id"],
            });
            return temp;
          });
          arr1.push(temp);
        });
      } else {
        valuesNew = filter_details.map((m, i) =>
          optionSelected.map((n) => (new_table_value[i] = m[n.value]))
        );
      }
    }
    // const valuesNew = employee.map((m) => (
    // 	{
    // 		id: m.employee_id,
    // 		name: onClick({ value: m.employee_name, id: m.employee_id }),
    // 		// store_name: storeName({value: m.store_id, id: m.employee_id}),
    // 		designation: designationName({ value: m.designation_id, id: m.employee_id }),
    // 		status: badge({ value: m.status, id: m.employee_id }),
    // 		// action: image(m.employee_id),
    // 	}
    // ));

    return (
      <Formik
        initialValues={initialValue}
        onSubmit={(values) => {
          console.log(values);
        }}
        validationSchema={Validation}
      >
        <Form>
          <GlobalWrapper title="Employee Details">
            <Head />
            <Flex templateColumns="repeat(3, 1fr)" gap={6} colSpan={2}>
              <Container className={styles.container} boxShadow="lg">
                <p className={styles.buttoninputHolder}>
                  <div>Employee</div>
                  {permission_array.length > 0 ? (
                    permission_array.map((m) => (
                      <>
                        {m.permission_key === "add_employees" && (
                          <div style={{ paddingRight: 10 }}>
                            <Link href="/employee/create">
                              <Button colorScheme="purple">{"Add"}</Button>
                            </Link>
                          </div>
                        )}
                      </>
                    ))
                  ) : (
                    <div style={{ paddingRight: 10 }}>
                      <Link href="/employee/create">
                        <Button colorScheme="purple">{"Add"}</Button>
                      </Link>
                    </div>
                  )}
                </p>
                <div
                  style={{
                    marginBottom: "60px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                  }}
                >
                  <div className={styles.subInputHolder}>
                    <label htmlFor="searchbar" className={styles.infoLabel}>
                      Search
                    </label>
                    <Input
                      id="searchbar"
                      onChange={(e) => this.setState({ name: e.target.value })}
                      type="text"
                      defaultValue={name === "" ? "" : `${name}`}
                      onMouseEnter={() =>
                        this.setState({ hoverElement: false })
                      }
                      className={styles.dropbtn}
                    />
                  </div>
                  <div className={styles.subButtonHolder}>
                    <ButtonGroup type="submit">
                      <Button
                        loadingText="Searching"
                        colorScheme="purple"
                        onClick={() =>
                          this.setState({
                            filter_click: true,
                            paginate_filter: true,
                          })
                        }
                      >
                        {"Search"}
                      </Button>
                    </ButtonGroup>
                  </div>
                </div>
                <div
                  style={{
                    marginBottom: "60px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                  }}
                >
                  <div className={styles.subInputHolder}>
                    <label className={styles.infoLabel}>
                      Choose Table Filter
                    </label>
                    <div>
                      <ReactSelect
                        options={DropDownOptionEmployee}
                        isMulti
                        styles={this.customSelectStyles}
                        defaultValue={[
                          DropDownOptionEmployee[0],
                          DropDownOptionEmployee[1],
                          DropDownOptionEmployee[2],
                          DropDownOptionEmployee[3],
                        ]}
                        closeMenuOnSelect={false}
                        hideSelectedOptions={false}
                        isSearchable
                        components={this.Option}
                        onChange={this.handleChange}
                        allowSelectAll={true}
                        className="basic-multi-select"
                        classNamePrefix="select"
                        placeholder="Select filters..."
                      />
                    </div>
                  </div>

                  <div className={styles.subButtonHolder}>
                    <ButtonGroup type="submit">
                      <Button
                        loadingText="Loading"
                        colorScheme="purple"
                        onClick={() =>
                          this.state.optionSelected !== null
                            ? this.setState({ new_header: true })
                            : ""
                        }
                      >
                        {"Done"}
                      </Button>
                    </ButtonGroup>
                  </div>
                </div>

                <div className={styles.tableContainer}>
                  <Table
                    heading={
                      new_header === false ? table_title : new_table_title
                    }
                    rows={arr1.length === 0 ? valuesNew : arr1}
                    sortCallback={this.sortCallback}
                  />
                </div>

                <div>
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
          </GlobalWrapper>
        </Form>
      </Formik>
    );
  }
}

export default Registration;
