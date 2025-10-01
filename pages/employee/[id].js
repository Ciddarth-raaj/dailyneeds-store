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
  constructor(props) {
    super(props);

    this.editViewMode = props.id !== null;

    this.state = {
      card_name_change: false,
      card_number_change: false,
      imageContainer: false,
      idContainer: false,
      employee_image: props.data[0]?.employee_image,
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
      id: props.id,
    };

    this.initialValues = {
      // Employee Information
      employee_id: this.props.data[0]?.employee_id,
      employee_name: this.props.data[0]?.employee_name,
      gender: this.props.data[0]?.gender,
      email_id: this.props.data[0]?.email_id,
      primary_contact_number: this.props.data[0]?.primary_contact_number,
      alternate_contact_number: this.props.data[0]?.alternate_contact_number,
      date_of_joining: this.props.data[0]?.date_of_joining,
      telegram_username: this.props.data[0]?.telegram_username,
      employee_image: this.props.data[0]?.employee_image,

      // Personal Details
      marital_status: this.props.data[0]?.marital_status,
      dob: this.props.data[0]?.dob,
      marriage_date: this.props.data[0]?.marriage_date,
      permanent_address: this.props.data[0]?.permanent_address,
      residential_address: this.props.data[0]?.residential_address,
      father_name: this.props.data[0]?.father_name,
      spouse_name: this.props.data[0]?.spouse_name,
      blood_group: this.props.data[0]?.blood_group,

      // Current Position
      store_id: this.props.data[0]?.store_id,
      department_id: this.props.data[0]?.department_id,
      designation_id: this.props.data[0]?.designation_id,
      shift_id: this.props.data[0]?.shift_id,

      // Education Details
      qualification: this.props.data[0]?.qualification,
      previous_experience: this.props.data[0]?.previous_experience,
      additional_course: this.props.data[0]?.additional_course,

      // Employee Identification
      payment_type: this.props.data[0]?.payment_type,
      bank_name: this.props.data[0]?.bank_name,
      ifsc: this.props.data[0]?.ifsc,
      account_no: this.props.data[0]?.account_no,
      aadhaar_card_no: this.props.data[0]?.aadhaar_card_no,
      aadhaar_card_name: this.props.data[0]?.aadhaar_card_name,
      aadhaar_card_image: this.props.data[0]?.aadhaar_card_image,

      // PF & ESI
      pan_no: this.props.data[0]?.pan_no,
      pf_number: this.props.data[0]?.pf_number,
      UAN: this.props.data[0]?.uan,
      esi_number: this.props.data[0]?.esi_number,

      // Salary Details
      salary: this.props.data[0]?.salary,

      // Additional fields for compatibility
      introducer_name: this.props.data[0]?.introducer_name,
      introducer_details: this.props.data[0]?.introducer_details,
      uniform_qty: this.props.data[0]?.uniform_qty,
      online_portal: this.props.data[0]?.online_portal,
      esi: this.props.data[0]?.esi,
      pf: this.props.data[0]?.pf,
      designation_name: this.props.data[0]?.designation_name,
      store_name: this.props.data[0]?.outlet_name,
      shift_name: this.props.data[0]?.shift_name,
      department_name: this.props.data[0]?.department_name,
      payment_name:
        this.props.data[0]?.payment_type === "1"
          ? "Bank"
          : this.props.data[0]?.payment_type === "2"
          ? "Cash"
          : "",
    };
  }

  componentDidMount() {
    this.getDesignation();
    this.getDepartment();
    this.getShift();
    this.getBranchData();
    this.getAdhaar();
  }

  componentDidUpdate() {
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
      const { employee_id } = this.props.data[0];

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
    } = this.state;

    return (
      <GlobalWrapper title="New Employee">
        <Formik
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

export async function getServerSideProps(context) {
  var data = [];
  if (context.query.id !== "create") {
    data = await EmployeeHelper.getEmployeeByID(context.query.id);
  }
  const id = context.query.id != "create" ? data[0].employee_id : null;
  let doc = [];
  doc =
    context.query.id == "create" ? null : await DocumentHelper.getDocType(id);
  return {
    props: { data, id, doc },
  };
}

export default withRouter(Create);
