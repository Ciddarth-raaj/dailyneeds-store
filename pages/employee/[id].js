//External Dependencies
import React from "react";
import { Formik, Form } from "formik";
import { Flex, ButtonGroup, Button } from "@chakra-ui/react";
import { toast } from "react-hot-toast";
import FormikErrorFocus from "formik-error-focus";
import { withRouter } from "next/router";

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
import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Validation } from "../../util/validation";
import moment from "moment";
import CustomContainer from "../../components/CustomContainer";
import PersonalDetails from "../../components/Employee/PersonalDetails";
import EducationDetails from "../../components/Employee/EducationDetails";
import CurrentPosition from "../../components/Employee/CurrentPosition";
import PFAndESI from "../../components/Employee/PFAndESI";
import SalaryDetails from "../../components/Employee/SalaryDetails";
import EmployeeInformation from "../../components/Employee/EmployeeInformation";
import EmployeeIdentification from "../../components/Employee/EmployeeIdentification";

class Create extends React.Component {
  editViewMode = false;
  constructor(props) {
    super(props);
    this.onDrop = (imageHolder) => {
      this.setState({ imageHolder });
    };
    this.onAdhaarDrop = (adhaarHolder) => {
      this.setState({ adhaarHolder });
    };
    this.onLicenseDrop = (licenseHolder) => {
      this.setState({ licenseHolder });
    };
    this.onVoterDrop = (voterHolder) => {
      this.setState({ voterHolder });
    };
    this.onPanDrop = (panHolder) => {
      this.setState({ panHolder });
    };
    this.onImageModifyDrop = (modifiedImageHolder) => {
      this.setState({ modifiedImageHolder });
    };
    this.onAdhaarModifyDrop = (modifiedAdhaarHolder) => {
      this.setState({ modifiedAdhaarHolder });
    };
    this.onLicenseModifyDrop = (modifiedLicenseHolder) => {
      this.setState({ modifiedLicenseHolder });
    };
    this.onVoterModifyDrop = (modifiedVoterHolder) => {
      this.setState({ modifiedVoterHolder });
    };
    this.onPanModifyDrop = (modifiedPanHolder) => {
      this.setState({ modifiedPanHolder });
    };
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
    const { permanent_trigger } = this.state;
    const { router } = this.props;

    if (this.state.licenseHolder.length !== 0) {
      const Idarray = [];
      Idarray.push(
        await FilesHelper.upload(
          this.state.licenseHolder[0],
          "licenseUpload",
          "dashboard_file"
        )
      );
      // console.log({idarr: Idarray})
      for (let i = 0; i <= values.files.length - 1; i++) {
        if (values.files[i].id_card === "2") {
          values.files[i].file = Idarray.length > 0 ? Idarray[0].remoteUrl : "";
        }
      }
    }
    if (this.state.adhaarHolder.length !== 0) {
      const Adhaararray = [];
      Adhaararray.push(
        await FilesHelper.upload(
          this.state.adhaarHolder[0],
          "adhaarUpload",
          "dashboard_file"
        )
      );
      for (let i = 0; i <= values.files.length - 1; i++) {
        if (values.files[i].id_card === "1") {
          values.files[i].file =
            Adhaararray.length > 0 ? Adhaararray[0].remoteUrl : "";
        }
      }
    }

    if (this.state.voterHolder.length !== 0) {
      const Subarray = [];
      Subarray.push(
        await FilesHelper.upload(
          this.state.voterHolder[0],
          "voterIdUpload",
          "dashboard_file"
        )
      );
      for (let i = 0; i < values.files.length - 1; i++) {
        if (values.files[i].id_card === "3") {
          values.files[i].file =
            Subarray.length > 0 ? Subarray[0].remoteUrl : "";
        }
      }
    }

    if (this.state.panHolder.length !== 0) {
      const Panarray = [];
      Panarray.push(
        await FilesHelper.upload(
          this.state.panHolder[0],
          "panUpload",
          "dashboard_file"
        )
      );
      for (let i = 0; i <= values.files.length - 1; i++) {
        if (values.files[i].id_card === "4") {
          values.files[i].file =
            Panarray.length > 0 ? Panarray[0].remoteUrl : "";
        }
      }
    }

    const Imagearray = [];
    Imagearray.push(
      await FilesHelper.upload(
        this.state.imageHolder[0],
        "uploadImage",
        "dashboard_file"
      )
    );
    values.employee_image =
      Imagearray.length > 0 ? Imagearray[0].remoteUrl : "";

    // console.log({ valuesssssssssssssssssss: values })
    values.department_name = values.department_id;
    values.designation_name = values.designation_id;
    values.date_of_joining = moment(values.date_of_joining).format(
      "YYYY-MM-DD"
    );
    values.dob = moment(values.dob).format("YYYY-MM-DD");
    values.marriage_date = moment(values.marriage_date).format("YYYY-MM-DD");
    values.store_name = values.store_id;
    values.shift_name = values.shift_id;
    // console.log({ valuesssssssssssssss: values });
    if (permanent_trigger === true) {
      values.residential_address = values.permanent_address;
    }
    delete values.department_name;
    delete values.designation_name;
    delete values.store_name;
    delete values.shift_name;
    delete values.modified_employee_image;
    delete values.payment_name;
    delete values.docupdate;
    EmployeeHelper.register(values)
      .then((data) => {
        if (data === 200) {
          toast.success("Successfully created Account");
          values.department_name = this.props.data[0].department_name;
          values.designation_name = this.props.data[0].designation_name;
          values.store_name = this.props.data[0].outlet_name;
          values.shift_name = this.props.data[0].shift_name;
          router.push("/employee");
        } else {
          toast.error("Error creating Account");
          throw `${data.msg}`;
        }
      })
      .catch((err) => console.log(err))
      .finally(() => this.setState({ loading: false }));
  };

  updateEmployee = async (values) => {
    try {
      if (this.state.modifiedImageHolder.length !== 0) {
        const Modifiedarray = [];
        Modifiedarray.push(
          await FilesHelper.upload(
            this.state.modifiedImageHolder[0],
            "modifiedUploadImage",
            "dashboard_file"
          )
        );
        values.modified_employee_image =
          Modifiedarray.length > 0 ? Modifiedarray[0].remoteUrl : "";
      }
      if (this.state.modifiedAdhaarHolder.length !== 0) {
        const ModifiedAdhaararray = [];
        ModifiedAdhaararray.push(
          await FilesHelper.upload(
            this.state.modifiedAdhaarHolder[0],
            "modifiedAdhaarImage",
            "dashboard_file"
          )
        );
        values.docupdate[0].file =
          ModifiedAdhaararray.length > 0
            ? ModifiedAdhaararray[0].remoteUrl
            : "";
      }
      if (this.state.modifiedLicenseHolder.length !== 0) {
        const ModifiedLicensearray = [];
        ModifiedLicensearray.push(
          await FilesHelper.upload(
            this.state.modifiedLicenseHolder[0],
            "modifiedLicenseImage",
            "dashboard_file"
          )
        );
        values.docupdate[1].file =
          ModifiedLicensearray.length > 0
            ? ModifiedLicensearray[0].remoteUrl
            : "";
      }
      if (this.state.modifiedVoterHolder.length !== 0) {
        const ModifiedVoterarray = [];
        ModifiedVoterarray.push(
          await FilesHelper.upload(
            this.state.modifiedVoterHolder[0],
            "modifiedVoterImage",
            "dashboard_file"
          )
        );
        values.docupdate[2].file =
          ModifiedVoterarray.length > 0 ? ModifiedVoterarray[0].remoteUrl : "";
      }
      if (this.state.modifiedPanHolder.length !== 0) {
        const ModifiedPanarray = [];
        ModifiedPanarray.push(
          await FilesHelper.upload(
            this.state.modifiedPanHolder[0],
            "modifiedPanImage",
            "dashboard_file"
          )
        );
        values.docupdate[3].file =
          ModifiedPanarray.length > 0 ? ModifiedPanarray[0].remoteUrl : "";
      }

      if (this.state.licenseHolder.length !== 0) {
        const Idarray = [];
        Idarray.push(
          await FilesHelper.upload(
            this.state.licenseHolder[0],
            "licenseUpload",
            "dashboard_file"
          )
        );
        for (let i = 0; i < values.files.length; i++) {
          if (values.files[i].id_card === "2") {
            values.files[i].file =
              Idarray.length > 0 ? Idarray[0].remoteUrl : "";
          }
        }
      }
      if (this.state.voterHolder.length !== 0) {
        const Subarray = [];
        Subarray.push(
          await FilesHelper.upload(
            this.state.voterHolder[0],
            "voterIdUpload",
            "dashboard_file"
          )
        );
        for (let i = 0; i < values.files.length; i++) {
          if (values.files[i].id_card === "3") {
            values.files[i].file =
              Subarray.length > 0 ? Subarray[0].remoteUrl : "";
          }
        }
      }

      if (this.state.adhaarHolder.length !== 0) {
        const Adhaararray = [];
        Adhaararray.push(
          await FilesHelper.upload(
            this.state.adhaarHolder[0],
            "adhaarUpload",
            "dashboard_file"
          )
        );
        for (let i = 0; i <= values.files.length; i++) {
          if (values.files[i].id_card === "1") {
            values.files[i].file =
              Adhaararray.length > 0 ? Adhaararray[0].remoteUrl : "";
          }
        }
      }
    } catch (err) {
      console.log(err);
    }
    const { employee_id } = this.props.data[0];
    const { router } = this.props;
    values.dob = moment(values.dob).format("YYYY-MM-DD");
    values.date_of_joining = moment(values.date_of_joining).format(
      "YYYY-MM-DD"
    );
    // values.expiry_date = moment(values.expiry_date).format("YYYY-MM-DD")
    values.marriage_date = moment(values.marriage_date).format("YYYY-MM-DD");
    delete values.department_name;
    delete values.designation_name;
    delete values.store_name;
    delete values.shift_name;
    delete values.payment_name;
    delete values.employee_image;
    EmployeeHelper.updateEmployeeDetails({
      employee_id: employee_id,
      employee_details: values,
    })
      .then((data) => {
        if (data.code == 200) {
          toast.success("Employee details Updated!");
          values.payment_name =
            this.props.data[0]?.payment_type === "1" ? "Bank" : "Cash";
          values.department_name = this.props.data[0].department_name;
          values.designation_name = this.props.data[0].designation_name;
          values.store_name = this.props.data[0].outlet_name;
          values.shift_name = this.props.data[0].shift_name;
          router.push("/employee");
        } else if (data.code == 422) {
          toast.error("Card Number Must Be a Number");
        }
      })
      .catch((err) => {
        console.log(err);
        toast.error("Error Updating Employee details!");
      })
      .finally(() => this.setState({ loading: false }));
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

  getImageUploadParams = ({ meta }) => {
    const { imageHolder } = this.state;
    return { url: imageHolder };
  };

  getModifyImageUploadParams = ({ meta }) => {
    // console.log({ meta: meta })
    const { modifiedImageHolder } = this.state;

    return { url: modifiedImageHolder };
  };
  getModifyAdhaarUploadParams = ({ meta }) => {
    const { modifiedAdhaarHolder } = this.state;
    return { url: modifiedAdhaarHolder };
  };
  getModifyLicenseUploadParams = ({ meta }) => {
    const { modifiedLicenseHolder } = this.state;
    return { url: modifiedLicenseHolder };
  };
  getModifyVoterUploadParams = ({ meta }) => {
    const { modifiedVoterHolder } = this.state;
    return { url: modifiedVoterHolder };
  };
  getModifyPanUploadParams = ({ meta }) => {
    const { modifiedPanHolder } = this.state;
    return { url: modifiedPanHolder };
  };

  licenseUploadParams = ({ meta }) => {
    const { licenseHolder } = this.state;
    return { url: licenseHolder };
  };

  licenseChangeStatus = async ({ meta, file }, status) => {
    if (status === "headers_received") {
      try {
        this.setState({ licenseHolder: file });
      } catch (err) {
        console.log(err);
      }
    }
  };

  adhaarUploadParams = ({ meta }) => {
    const { adhaarHolder } = this.state;
    return { url: adhaarHolder };
  };

  adhaarChangeStatus = async ({ meta, file }, status) => {
    if (status === "headers_received") {
      try {
        this.setState({ adhaarHolder: file });
      } catch (err) {
        console.log(err);
      }
    }
  };
  panChangeStatus = async ({ meta, file }, status) => {
    if (status === "headers_received") {
      try {
        this.setState({ panHolder: file });
      } catch (err) {
        console.log(err);
      }
    }
  };
  panUploadParams = ({ meta }) => {
    const { panHolder } = this.state;
    return { url: panHolder };
  };
  voterIdUploadParams = ({ meta }) => {
    const { voterHolder } = this.state;
    // console.log({voterHolder: voterHolder})
    return { url: voterHolder };
  };

  voterIdChangeStatus = async ({ meta, file }, status) => {
    if (status === "headers_received") {
      try {
        this.setState({ voterHolder: file });
      } catch (err) {
        console.log(err);
      }
    }
  };
  modifyImageChangeStatus = async ({ meta, file }, status) => {
    if (status === "headers_received") {
      try {
        this.setState({ modifiedImageHolder: file });
      } catch (err) {
        console.log(err);
      }
    }
  };
  modifyAdhaarChangeStatus = async ({ meta, file }, status) => {
    if (status === "headers_received") {
      try {
        this.setState({ modifiedAdhaarHolder: file });
      } catch (err) {
        console.log(err);
      }
    }
  };
  modifyLicenseChangeStatus = async ({ meta, file }, status) => {
    if (status === "headers_received") {
      try {
        this.setState({ modifiedLicenseHolder: file });
      } catch (err) {
        console.log(err);
      }
    }
  };
  modifyVoterChangeStatus = async ({ meta, file }, status) => {
    if (status === "headers_received") {
      try {
        this.setState({ modifiedVoterHolder: file });
      } catch (err) {
        console.log(err);
      }
    }
  };
  modifyPanChangeStatus = async ({ meta, file }, status) => {
    if (status === "headers_received") {
      try {
        this.setState({ modifiedPanHolder: file });
      } catch (err) {
        console.log(err);
      }
    }
  };
  imageChangeStatus = async ({ meta, file }, status) => {
    if (status === "headers_received") {
      try {
        this.setState({ imageHolder: file });
      } catch (err) {
        console.log(err);
      }
    }
  };

  handleSubmit = async (files) => {
    console.log(files);
  };

  resignedEmployee() {
    this.handleSubmit();
  }

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
          initialValues={{
            employee_id: this.props.data[0]?.employee_id,
            telegram_username: this.props.data[0]?.telegram_username,
            aadhaar_card_no: this.props.data[0]?.aadhaar_card_no,
            aadhaar_card_name: this.props.data[0]?.aadhaar_card_name,
            aadhaar_card_image: this.props.data[0]?.aadhaar_card_image,
            employee_name: this.props.data[0]?.employee_name,
            father_name: this.props.data[0]?.father_name,
            dob: this.props.data[0]?.dob,
            permanent_address: this.props.data[0]?.permanent_address,
            residential_address: this.props.data[0]?.residential_address,
            primary_contact_number: this.props.data[0]?.primary_contact_number,
            alternate_contact_number:
              this.props.data[0]?.alternate_contact_number,
            email_id: this.props.data[0]?.email_id,
            qualification: this.props.data[0]?.qualification,
            introducer_name: this.props.data[0]?.introducer_name,
            introducer_details: this.props.data[0]?.introducer_details,
            salary: this.props.data[0]?.salary,
            uniform_qty: this.props.data[0]?.uniform_qty,
            previous_experience: this.props.data[0]?.previous_experience,
            date_of_joining: this.props.data[0]?.date_of_joining,
            gender: this.props.data[0]?.gender,
            blood_group: this.props.data[0]?.blood_group,
            designation_id: this.props.data[0]?.designation_id,
            designation_name: this.props.data[0]?.designation_name,
            store_id: this.props.data[0]?.store_id,
            store_name: this.props.data[0]?.outlet_name,
            shift_id: this.props.data[0]?.shift_id,
            shift_name: this.props.data[0]?.shift_name,
            department_id: this.props.data[0]?.department_id,
            department_name: this.props.data[0]?.department_name,
            marital_status: this.props.data[0]?.marital_status,
            marriage_date: this.props.data[0]?.marriage_date,
            employee_image: this.props.data[0]?.employee_image,

            bank_name: this.props.data[0]?.bank_name,
            ifsc: this.props.data[0]?.ifsc,
            account_no: this.props.data[0]?.account_no,

            esi: this.props.data[0]?.esi,
            esi_number: this.props.data[0]?.esi_number,
            pf: this.props.data[0]?.pf,
            pf_number: this.props.data[0]?.pf_number,
            UAN: this.props.data[0]?.uan,
            additional_course: this.props.data[0]?.additional_course,
            spouse_name: this.props.data[0]?.spouse_name,
            online_portal: this.props.data[0]?.online_portal,
            pan_no: this.props.data[0]?.pan_no,
            payment_type: this.props.data[0]?.payment_type,
            payment_name:
              this.props.data[0]?.payment_type === "1"
                ? "Bank"
                : this.props.data[0]?.payment_type === "2"
                ? "Cash"
                : "",
            modified_employee_image: "",
            files: [
              {
                id_card: "",
                id_card_no: "",
                id_card_name: "",
                expiry_date: "",
                file: "",
              },
            ],
            docupdate: [
              {
                card_type: "1",
                card_name: this.props.doc ? this.props.doc[0]?.card_name : "",
                card_no: this.props.doc ? this.props.doc[0]?.card_number : "",
                file: "",
              },
              {
                card_type: "2",
                card_name: this.props.doc ? this.props.doc[1]?.card_name : "",
                card_no: this.props.doc ? this.props.doc[1]?.card_number : "",
                file: "",
              },
              {
                card_type: "3",
                card_name: this.props.doc ? this.props.doc[2]?.card_name : "",
                card_no: this.props.doc ? this.props.doc[2]?.card_number : "",
                file: "",
              },
              {
                card_type: "4",
                card_name: this.props.doc ? this.props.doc[3]?.card_name : "",
                card_no: this.props.doc ? this.props.doc[3]?.card_number : "",
                file: "",
              },
            ],
          }}
          validationSchema={Validation}
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
