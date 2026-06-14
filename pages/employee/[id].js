//External Dependencies
import React from "react";
import { Formik, Form } from "formik";
import { Flex, ButtonGroup, Button } from "@chakra-ui/react";
import { toast } from "react-hot-toast";
import FormikErrorFocus from "formik-error-focus";
import { withRouter } from "next/router";
import * as Yup from "yup";

//Styles
import styles from "../../styles/registration.module.css";

//Helpers
import DocumentHelper from "../../helper/document";
import BranchHelper from "../../helper/outlets";
import ResignedUser from "../../components/resignedUser/resignedUser";
import EmployeeHelper from "../../helper/employee";
import ResignationHelper from "../../helper/resignation";
import DesignationHelper from "../../helper/designation";
import ShiftHelper from "../../helper/shift";
import DepartmentHelper from "../../helper/department";
import FilesHelper from "../../helper/asset";

//Internal Dependencies
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import moment from "moment";
import CustomContainer from "../../components/CustomContainer";
import PersonalDetails from "../../components/Employee/PersonalDetails";
import EducationDetails from "../../components/Employee/EducationDetails";
import CurrentPosition from "../../components/Employee/CurrentPosition";
import PFAndESI from "../../components/Employee/PFAndESI";
import SalaryDetails from "../../components/Employee/SalaryDetails";
import EmployeeInformation from "../../components/Employee/EmployeeInformation";
import EmployeeIdentification from "../../components/Employee/EmployeeIdentification";
import { BloodGroup } from "../../constants/values";

const validationSchema = Yup.object().shape({
  // Employee Information
  employee_id: Yup.string().nullable().required("Employee ID is required"),
  employee_name: Yup.string().nullable().required("Name is required"),
  gender: Yup.string()
    .nullable()
    .required("Gender is required")
    .oneOf(["Male", "Female", "Transgendar"]),
  email_id: Yup.string().nullable().email("Invalid email format"),
  primary_contact_number: Yup.string()
    .nullable()
    .required("Primary contact number is required"),
  alternate_contact_number: Yup.string().nullable(),
  date_of_joining: Yup.date()
    .nullable()
    .required("Date of joining is required"),
  telegram_username: Yup.string().nullable(),

  // Personal Details
  marital_status: Yup.string()
    .required("Marital status is required")
    .oneOf(["Married", "Un Married", "Widowed", "Divorced", "Separated"]),
  dob: Yup.date()
    .required("Date of birth is required")
    .max(new Date(), "Date of birth cannot be in the future"),
  marriage_date: Yup.date()
    .nullable()
    .when("marital_status", {
      is: "Married",
      then: Yup.date()
        .nullable()
        .max(new Date(), "Marriage date cannot be in the future")
        .min(Yup.ref("dob"), "Marriage date must be after date of birth"),
    }),
  permanent_address: Yup.string()
    .required("Permanent address is required")
    .min(10, "Address must be at least 10 characters")
    .max(200, "Address cannot exceed 200 characters"),
  residential_address: Yup.string()
    .required("Residential address is required")
    .min(10, "Address must be at least 10 characters")
    .max(200, "Address cannot exceed 200 characters"),
  father_name: Yup.string()
    .required("Father's name is required")
    .min(3, "Name must be at least 3 characters")
    .matches(/^[a-zA-Z\s]*$/, "Name can only contain letters"),
  spouse_name: Yup.string()
    .nullable()
    .when("marital_status", {
      is: "Married",
      then: Yup.string()
        .nullable()
        .min(3, "Name must be at least 3 characters")
        .matches(/^[a-zA-Z\s]*$/, "Name can only contain letters"),
    }),
  blood_group: Yup.string()
    .nullable()
    .oneOf([...BloodGroup.map((bg) => bg.id), null], "Invalid blood group"),

  // Current Position
  store_id: Yup.string().nullable().min(1, "Store is required"),
  department_id: Yup.string().nullable().min(1, "Department is required"),
  designation_id: Yup.string().nullable().min(1, "Designation is required"),
  shift_id: Yup.string().nullable().min(1, "Shift is required"),

  // Education Details
  qualification: Yup.string()
    .nullable()
    .min(2, "Qualification must be at least 2 characters"),
  previous_experience: Yup.string()
    .nullable()
    .min(3, "Experience details must be at least 3 characters"),
  additional_course: Yup.string()
    .nullable()
    .min(3, "Course details must be at least 3 characters"),

  // Employee Identification
  payment_type: Yup.string().required("Select Payment"),
  bank_name: Yup.string()
    .nullable()
    .when("payment_type", {
      is: (val) => val === "1",
      then: Yup.string().nullable().required("Bank Name is required"),
    }),
  ifsc: Yup.string()
    .nullable()
    .when("payment_type", {
      is: (val) => val === "1",
      then: Yup.string().nullable().required("IFSC is required"),
    }),
  account_no: Yup.string()
    .nullable()
    .when("payment_type", {
      is: (val) => val === "1",
      then: Yup.string().nullable().required("Account number is required"),
    }),
  aadhaar_card_no: Yup.string()
    .nullable()
    .required("Aadhaar card number is required"),
  aadhaar_card_name: Yup.string()
    .nullable()
    .required("Name in Aadhaar card is required"),

  // PF & ESI
  pan_no: Yup.string().nullable(),
  pf_number: Yup.string().nullable(),
  UAN: Yup.string().nullable(),
  esi_number: Yup.string().nullable(),

  // Salary Details
  salary: Yup.string().nullable().required("Salary is required"),
});

class Create extends React.Component {
  editViewMode = false;

  buildInitialValues(data) {
    const record = data[0] || {};
    return {
      employee_id: record?.employee_id,
      employee_name: record?.employee_name,
      gender: record?.gender,
      email_id: record?.email_id,
      primary_contact_number: record?.primary_contact_number,
      alternate_contact_number: record?.alternate_contact_number,
      date_of_joining: record?.date_of_joining,
      telegram_username: record?.telegram_username,
      employee_image: record?.employee_image,
      marital_status: record?.marital_status,
      dob: record?.dob,
      marriage_date: record?.marriage_date,
      permanent_address: record?.permanent_address,
      residential_address: record?.residential_address,
      father_name: record?.father_name,
      spouse_name: record?.spouse_name,
      blood_group: record?.blood_group,
      store_id: record?.store_id,
      department_id: record?.department_id,
      designation_id: record?.designation_id,
      shift_id: record?.shift_id,
      qualification: record?.qualification,
      previous_experience: record?.previous_experience,
      additional_course: record?.additional_course,
      payment_type: record?.payment_type,
      bank_name: record?.bank_name,
      ifsc: record?.ifsc,
      account_no: record?.account_no,
      aadhaar_card_no: record?.aadhaar_card_no,
      aadhaar_card_name: record?.aadhaar_card_name,
      aadhaar_card_image: record?.aadhaar_card_image,
      pan_no: record?.pan_no,
      pf_number: record?.pf_number,
      UAN: record?.uan,
      esi_number: record?.esi_number,
      salary: record?.salary,
      introducer_name: record?.introducer_name,
      introducer_details: record?.introducer_details,
      uniform_qty: record?.uniform_qty,
      online_portal: record?.online_portal,
      esi: record?.esi,
      pf: record?.pf,
      designation_name: record?.designation_name,
      store_name: record?.outlet_name,
      shift_name: record?.shift_name,
      department_name: record?.department_name,
      payment_name:
        record?.payment_type === "1"
          ? "Bank"
          : record?.payment_type === "2"
          ? "Cash"
          : "",
    };
  }

  constructor(props) {
    super(props);

    this.editViewMode = false;

    this.state = {
      card_name_change: false,
      card_number_change: false,
      imageContainer: false,
      idContainer: false,
      employee_image: null,
      loading: false,
      handlingSubmit: "",
      department: [],
      designation: [],
      shift: [],
      uploadImage: [],
      uploadId: [],
      permanent_trigger: false,
      error: "",
      subUploadId: [],
      licenseHolder: [],
      panHolder: [],
      modifiedImageHolder: [],
      modifiedAdhaarHolder: [],
      modifiedLicenseHolder: [],
      validationPayment: "",
      modifiedVoterHolder: [],
      modifiedPanHolder: [],
      resignationData: [],
      adhaarHolder: [],
      extension: [
        {
          one: "png",
        },
        {
          one: "jpg",
        },
        {
          three: "pdf",
        },
      ],
      voterHolder: [],
      subIdHolder: [],
      employee_name: "",
      imageHolder: [],
      adhaarChecker: [],
      employeeCards: false,
      subIdHolder2: [],
      branch: [],
      pfToggle: false,
      esiToggle: false,
      adhaarAlert: false,
      branchModalVisibility: false,

      editableEmpInfo: false,
      editablePerInfo: false,
      editablePosiInfo: false,
      editableEducaInfo: false,
      editableIdenInfo: false,
      editablePFInfo: false,
      editableSalInfo: false,
      editableOtherInfo: false,

      loadingEmpInfo: false,
      loadingPerInfo: false,
      loadingPosiInfo: false,
      loadingEducaInfo: false,
      loadingIdenInfo: false,
      loadingPFInfo: false,
      loadingSalInfo: false,
      loadingOtherInfo: false,
      data: [],
      id: null,
      dataLoaded: false,
    };

    this.initialValues = this.buildInitialValues([]);
  }

  componentDidMount() {
    this.fetchEmployee();
    this.getDesignation();
    this.getDepartment();
    this.getShift();
    this.getBranchData();
    this.getAdhaar();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.router.query.id !== this.props.router.query.id) {
      this.fetchEmployee();
    }

    const { employee_name, handlingSubmit } = this.state;
    if (employee_name !== "") {
      this.getResignation();
      this.setState({ employee_name: "" });
    }
    if (handlingSubmit === false) {
      this.handleSubmit();
      this.setState({ handlingSubmit: true });
    }
  }

  fetchEmployee() {
    const recordId = this.props.router.query.id;
    if (!recordId || recordId === "create") {
      this.editViewMode = false;
      this.initialValues = this.buildInitialValues([]);
      this.setState({ data: [], id: null, dataLoaded: true });
      return;
    }
    EmployeeHelper.getEmployeeByID(recordId)
      .then((data) => {
        this.editViewMode = true;
        this.initialValues = this.buildInitialValues(data);
        this.setState({
          data,
          id: data[0]?.employee_id ?? null,
          employee_image: data[0]?.employee_image,
          dataLoaded: true,
        });
      })
      .catch((err) => console.log(err));
  }

  getBranchData() {
    BranchHelper.getOutlet()
      .then((data) => {
        this.setState({ branch: data });
      })
      .catch((err) => console.log(err));
  }

  getResignation() {
    const { employee_name } = this.state;
    ResignationHelper.getResignationByName(employee_name)
      .then((data) => {
        this.setState({ resignationData: data, branchModalVisibility: true });
      })
      .catch((err) => console.log(err));
  }

  getShift() {
    ShiftHelper.getShift()
      .then((data) => {
        this.setState({ shift: data });
      })
      .catch((err) => console.log(err));
  }

  getDesignation() {
    DesignationHelper.getDesignation()
      .then((data) => {
        this.setState({ designation: data });
      })
      .catch((err) => console.log(err));
  }

  getAdhaar() {
    DocumentHelper.getAdhaar()
      .then((data) => {
        this.setState({ adhaarChecker: data });
      })
      .catch((err) => console.log(err));
  }

  getDepartment() {
    DepartmentHelper.getDepartment()
      .then((data) => {
        this.setState({ department: data });
      })
      .catch((err) => console.log(err));
  }

  createEmployee = async (values) => {
    try {
      const { permanent_trigger } = this.state;
      const { router } = this.props;

      let employeeImage = null;

      if (values.employee_image && typeof values.employee_image === "string") {
        values.employee_image = values.employee_image;
      } else if (
        values.employee_image &&
        typeof values.employee_image === "object"
      ) {
        employeeImage = await FilesHelper.upload(
          values.employee_image,
          `${values.employee_image.name}_${moment().format("YYYYMMDDHHmmss")}`,
          "dashboard_file"
        );
      }

      if (
        (employeeImage && employeeImage.code === 200) ||
        employeeImage == null
      ) {
        const tmpData = { ...values };
        delete tmpData.employee_image;

        values.employee_image = employeeImage?.remoteUrl || null;
      }

      values.department_name = values.department_id;
      values.designation_name = values.designation_id;
      values.date_of_joining = moment(values.date_of_joining).format(
        "YYYY-MM-DD"
      );
      values.dob = moment(values.dob).format("YYYY-MM-DD");
      values.marriage_date = moment(values.marriage_date).format("YYYY-MM-DD");
      values.store_name = values.store_id;
      values.shift_name = values.shift_id;

      if (permanent_trigger === true) {
        values.residential_address = values.permanent_address;
      }

      delete values.department_name;
      delete values.designation_name;
      delete values.store_name;
      delete values.shift_name;
      delete values.payment_name;
      delete values.docupdate;

      EmployeeHelper.register(values)
        .then((data) => {
          if (data === 200) {
            toast.success("Successfully created employee!");
            router.push("/employee");
          } else {
            toast.error("Error creating Account");
            throw `${data.msg}`;
          }
        })
        .catch((err) => console.log(err))
        .finally(() => this.setState({ loading: false }));
    } catch (err) {
      console.log(err);
      toast.error("Error saving user!");
    }
  };

  updateEmployeeLatest = async (values, setLoading) => {
    try {
      const { employee_id } = this.state.data[0];

      setLoading && setLoading(true);
      const res = await EmployeeHelper.updateEmployeeDetails({
        employee_id: employee_id,
        employee_details: values,
      });

      if (res.code === 200) {
        toast.success("Data updated!");
      } else {
        throw res;
      }
    } catch (err) {
      toast.error("Error Updating Data");
    } finally {
      setLoading && setLoading(false);
    }
  };

  render() {
    const {
      loading,
      designation,
      department,
      branch,
      shift,
      branchModalVisibility,
      resignationData,
      id,
      dataLoaded,
    } = this.state;

    if (!dataLoaded) {
      return (
        <GlobalWrapper title="New Employee">
          <div>Loading...</div>
        </GlobalWrapper>
      );
    }

    return (
      <GlobalWrapper title="New Employee">
        <Formik
          enableReinitialize
          key={String(id)}
          initialValues={this.initialValues}
          validationSchema={validationSchema}
          onSubmit={this.createEmployee}
        >
          {(formikProps) => {
            const { handleSubmit, values } = formikProps;
            return (
              <Form onSubmit={formikProps.handleSubmit}>
                <FormikErrorFocus
                  align={"middle"}
                  ease={"linear"}
                  duration={200}
                />
                <Flex className={styles.responsive} gap="12px">
                  <Flex p={"0px"} flexDirection={"column"} gap="12px" flex={1}>
                    {branchModalVisibility && (
                      <ResignedUser
                        data={resignationData}
                        visibility={branchModalVisibility}
                        setVisibility={(v) =>
                          this.setState({
                            branchModalVisibility: v,
                            handlingSubmit: v,
                          })
                        }
                      />
                    )}

                    <EmployeeInformation
                      formikProps={formikProps}
                      editViewMode={this.editViewMode}
                      updateEmployee={this.updateEmployeeLatest}
                      initialValues={{
                        employee_id: values.employee_id,
                        employee_name: values.employee_name,
                        gender: values.gender,
                        email_id: values.email_id,
                        primary_contact_number: values.primary_contact_number,
                        alternate_contact_number:
                          values.alternate_contact_number,
                        date_of_joining: values.date_of_joining,
                        telegram_username: values.telegram_username,
                        employee_image: values.employee_image,
                      }}
                    />

                    <PersonalDetails
                      formikProps={formikProps}
                      editViewMode={this.editViewMode}
                      updateEmployee={this.updateEmployeeLatest}
                      initialValues={{
                        marital_status: values.marital_status,
                        dob: values.dob,
                        marriage_date: values.marriage_date,
                        permanent_address: values.permanent_address,
                        residential_address: values.residential_address,
                        father_name: values.father_name,
                        spouse_name: values.spouse_name,
                        blood_group: values.blood_group,
                      }}
                      id={id}
                    />

                    <CurrentPosition
                      formikProps={formikProps}
                      editViewMode={this.editViewMode}
                      updateEmployee={this.updateEmployeeLatest}
                      initialValues={{
                        store_id: values.store_id,
                        department_id: values.department_id,
                        designation_id: values.designation_id,
                        shift_id: values.shift_id,
                      }}
                      department={department}
                      designation={designation}
                      branch={branch}
                      shift={shift}
                    />

                    <EducationDetails
                      formikProps={formikProps}
                      editViewMode={this.editViewMode}
                      updateEmployee={this.updateEmployeeLatest}
                      initialValues={{
                        qualification: values.qualification,
                        previous_experience: values.previous_experience,
                        additional_course: values.additional_course,
                      }}
                    />
                  </Flex>

                  <Flex flexDirection={"column"} gap="12px" flex={1}>
                    <EmployeeIdentification
                      formikProps={formikProps}
                      editViewMode={this.editViewMode}
                      updateEmployee={this.updateEmployeeLatest}
                      id={id}
                      initialValues={{
                        payment_type: values.payment_type,
                        bank_name: values.bank_name,
                        ifsc: values.ifsc,
                        account_no: values.account_no,
                        aadhaar_card_no: values.aadhaar_card_no,
                        aadhaar_card_name: values.aadhaar_card_name,
                        aadhaar_card_image: values.aadhaar_card_image,
                      }}
                    />

                    <PFAndESI
                      formikProps={formikProps}
                      editViewMode={this.editViewMode}
                      updateEmployee={this.updateEmployeeLatest}
                      initialValues={{
                        pan_no: values.pan_no,
                        pf_number: values.pf_number,
                        UAN: values.UAN,
                        esi_number: values.esi_number,
                      }}
                      id={id}
                    />

                    <SalaryDetails
                      formikProps={formikProps}
                      editViewMode={this.editViewMode}
                      updateEmployee={this.updateEmployeeLatest}
                      initialValues={{
                        salary: values.salary,
                      }}
                    />

                    {!this.editViewMode && (
                      <CustomContainer>
                        <ButtonGroup
                          spacing="12px"
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                          }}
                        >
                          <Button>Cancel</Button>
                          <Button
                            isLoading={loading}
                            loadingText="Submitting"
                            colorScheme="purple"
                            onClick={handleSubmit}
                          >
                            Create
                          </Button>
                        </ButtonGroup>
                      </CustomContainer>
                    )}
                  </Flex>
                </Flex>
              </Form>
            );
          }}
        </Formik>
      </GlobalWrapper>
    );
  }
}

export default withRouter(Create);
