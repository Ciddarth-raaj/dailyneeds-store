//External Dependencies
import React from "react";
import { Formik, Form, FieldArray } from "formik";
import Dropzone from "react-dropzone-uploader";
import { Container, Flex, ButtonGroup, Button, Switch } from "@chakra-ui/react";
import { toast } from "react-toastify";
import FormikErrorFocus from "formik-error-focus";
import { withRouter } from 'next/router';

//Styles
import styles from "../../styles/registration.module.css";

//Helpers
import DocumentHelper from "../../helper/document";
import ResignedUser from "../../components/resignedUser/resignedUser";
import { BloodGroup, PaymentType, IdCardType } from "../../constants/values";
import EmployeeHelper from "../../helper/employee";
import ResignationHelper from "../../helper/resignation";
import DesignationHelper from "../../helper/designation";
import ShiftHelper from "../../helper/shift";
import DepartmentHelper from "../../helper/department";
import FilesHelper from "../../helper/asset";

//Internal Dependencies
import CustomInput from "../../components/customInput/customInput";
import Head from "../../util/head";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import { Validation } from "../../util/validation";
import moment from "moment";


const selectedData = [{
	outlet_name: "three",
	outlet_nickname: "three",
	outlet_phone: "9898989898",
	phone: "9898989898",
	outlet_address: "9898989898",
}]
class Create extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			card_name_change: false,
			card_number_change: false,
			imageContainer: false,
			idContainer: false,
			employee_image: props.data[0]?.employee_image,
			loading: false,
			handlingSubmit: '',
			department: [],
			designation: [],
			shift: [],
			uploadImage: [],
			uploadId: [],
			subUploadId: [],
			licenseHolder: [],
			panHolder: [],
			modifiedImageHolder: [],
			modifiedAdhaarHolder: [],
			modifiedLicenseHolder: [],
			modifiedVoterHolder: [],
			modifiedPanHolder: [],
			resignationData: [],
			adhaarHolder: [],
			voterHolder: [],
			subIdHolder: [],
			employee_name: '',
			imageHolder: [],
			adhaarChecker: [],
			employeeCards: false,
			subIdHolder2: [],
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
			id: props.id
		};
	}

	componentDidMount() {
		this.getDesignation();
		this.getDepartment();
		this.getShift();
		this.getAdhaar();
	}
	componentDidUpdate() {
		const { employee_name, handlingSubmit } = this.state;
		if(employee_name !== '') {
			this.getResignation();
			this.setState({employee_name: ''})
		}
		if(handlingSubmit === false) {
			this.handleSubmit();
			this.setState({handlingSubmit: true})
		}
	}

	getResignation() {
		const { employee_name } = this.state;
		ResignationHelper.getResignationByName(employee_name)
			.then((data) => {	
				this.setState({resignationData: data, branchModalVisibility: true})
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
			const { router } = this.props;
			if (this.state.licenseHolder !== "") {
			const Idarray = [];
			Idarray.push(await FilesHelper.upload(
				this.state.licenseHolder,
				"licenseUpload",
				"dashboard_file"
			));
			for (let i = 0; i < values.files.length - 1 ; i++) {
				if (values.files[i].id_card === "2") {
					values.files[i].file = Idarray.length > 0 ? Idarray[0].remoteUrl : "";
				}
			}
		}
			if (this.state.adhaarHolder.length !== 0) {
			const Adhaararray = [];
			Adhaararray.push(await FilesHelper.upload(
				this.state.adhaarHolder,
				"adhaarUpload",
				"dashboard_file"
			));
			for (let i = 0; i <= values.files.length - 1; i++) {
				if (values.files[i].id_card === "1") {
					values.files[i].file = Adhaararray.length > 0 ? Adhaararray[0].remoteUrl : "";
				}
			}
		}

			if (this.state.voterHolder !== "") {
				const Subarray = [];
				Subarray.push(await FilesHelper.upload(
					this.state.voterHolder,
					"voterIdUpload",
					"dashboard_file"
				));
				for (let i = 0; i < values.files.length - 1; i++) {
					if (values.files[i].id_card === "3") {
						values.files[i].file = Subarray.length > 0 ? Subarray[0].remoteUrl : "";
					}
				}
			}

			if (this.state.panHolder !== "") {
				const Panarray = [];
				Panarray.push(await FilesHelper.upload(
					this.state.panHolder,
					"panUpload",
					"dashboard_file"
				));
				for (let i = 0; i <= values.files.length - 1; i++) {
					if (values.files[i].id_card === "4") {
						values.files[i].file = Panarray.length > 0 ? Panarray[0].remoteUrl : "";
					}
				}
			}

			const Imagearray = [];
			Imagearray.push(await FilesHelper.upload(
				this.state.imageHolder,
				"uploadImage",
				"dashboard_file"
			));
			values.employee_image = Imagearray.length > 0 ? Imagearray[0].remoteUrl : "";
			
		
		values.department_name = values.department_id;
		values.designation_name = values.designation_id;
		values.date_of_joining = moment(values.date_of_joining).format("YYYY-MM-DD");
		values.dob = moment(values.dob).format("YYYY-MM-DD");
		values.store_name = values.store_id;
		values.shift_name = values.shift_id;
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
					router.push("/employee")
				} else {
					toast.error("Error creating Account");
					throw `${data.msg}`;
				}
			})
			.catch((err) => console.log(err))
			.finally(() => this.setState({ loading: false }));
	}

	updateEmployee = async (values) => {
		try {
			if(this.state.modifiedImageHolder.length !== 0) {
				const Modifiedarray = [];
				Modifiedarray.push(await FilesHelper.upload(
					this.state.modifiedImageHolder,
					"modifiedUploadImage",
					"dashboard_file"
				));
				values.modified_employee_image = Modifiedarray.length > 0 ? Modifiedarray[0].remoteUrl : "";
			}
			if(this.state.modifiedAdhaarHolder.length !== 0) {
				const ModifiedAdhaararray = [];
				ModifiedAdhaararray.push(await FilesHelper.upload(
					this.state.modifiedAdhaarHolder,
					"modifiedAdhaarImage",
					"dashboard_file"
				));
				
				values.docupdate[0].file = ModifiedAdhaararray.length > 0 ? ModifiedAdhaararray[0].remoteUrl : "";
			}
			if(this.state.modifiedLicenseHolder.length !== 0) {
				const ModifiedLicensearray = [];
				ModifiedLicensearray.push(await FilesHelper.upload(
					this.state.modifiedLicenseHolder,
					"modifiedLicenseImage",
					"dashboard_file"
				));
				values.docupdate[1].file = ModifiedLicensearray.length > 0 ? ModifiedLicensearray[0].remoteUrl : "";
			}
			if(this.state.modifiedVoterHolder.length !== 0) {
				const ModifiedVoterarray = [];
				ModifiedVoterarray.push(await FilesHelper.upload(
					this.state.modifiedVoterHolder,
					"modifiedVoterImage",
					"dashboard_file"
				));
				values.docupdate[2].file = ModifiedVoterarray.length > 0 ? ModifiedVoterarray[0].remoteUrl : "";
			}
			if(this.state.modifiedPanHolder.length !== 0) {
				const ModifiedPanarray = [];
				ModifiedPanarray.push(await FilesHelper.upload(
					this.state.modifiedPanHolder,
					"modifiedPanImage",
					"dashboard_file"
				));
				values.docupdate[3].file = ModifiedPanarray.length > 0 ? ModifiedPanarray[0].remoteUrl : "";
			}

			if (this.state.licenseHolder !== "") {
				const Idarray = [];
				Idarray.push(await FilesHelper.upload(
					this.state.licenseHolder,
					"licenseUpload",
					"dashboard_file"
				));
				for (let i = 0; i < values.files.length; i++) {
					if (values.files[i].id_card === "2") {
						values.files[i].file = Idarray.length > 0 ? Idarray[0].remoteUrl : "";
					}
				}
			}
			if (this.state.voterHolder !== "") {
				const Subarray = [];
				Subarray.push(await FilesHelper.upload(
					this.state.voterHolder,
					"voterIdUpload",
					"dashboard_file"
				));
				for (let i = 0; i < values.files.length; i++) {
					if (values.files[i].id_card === "3") {
						values.files[i].file = Subarray.length > 0 ? Subarray[0].remoteUrl : "";
					}
				}
			}

			if (this.state.adhaarHolder !== "") {
				const Adhaararray = [];
				Adhaararray.push(await FilesHelper.upload(
					this.state.adhaarHolder,
					"adhaarUpload",
					"dashboard_file"
				));
				for (let i = 0; i <= values.files.length; i++) {
					if (values.files[i].id_card === "1") {
						values.files[i].file = Adhaararray.length > 0 ? Adhaararray[0].remoteUrl : "";
					}
				}
			}
		} catch (err) {
			console.log(err);
		}
		
		values.date_of_joining = moment(values.date_of_joining).format("YYYY-MM-DD");
		values.dob = moment(values.dob).format("YYYY-MM-DD");
		const { employee_id } = this.props.data[0];
		const { router } = this.props;
		delete values.department_name;
		delete values.designation_name;
		delete values.store_name;
		delete values.shift_name;
		delete values.payment_name;
		delete values.employee_image;
		EmployeeHelper.updateEmployeeDetails({
			employee_id: employee_id,
			employee_details: values
		})
			.then((data) => {
				if (data.code == 200) {
					toast.success("Employee details Updated!");
					router.push("/employee")
				} else {
					throw "error";
				}
			})
			.catch((err) => {
				console.log(err);
				toast.error("Error Updating Employee details!");
			})
			.finally(() => this.setState({ loading: false }));
	}

	getImageUploadParams = ({ meta }) => {
		const { imageHolder } = this.state;
		return { url: imageHolder };
	};
	
	
	getModifyImageUploadParams = ({ meta }) => {
		const { modifiedImageHolder } = this.state;
		return { url: modifiedImageHolder };
	};
	getModifyAdhaarUploadParams = ({ meta }) => {
		const { modifiedAdhaarHolder } = this.state;
		return { url: modifiedAdhaarHolder };
	}
	getModifyLicenseUploadParams = ({ meta }) => {
		const { modifiedLicenseHolder } = this.state;
		return { url: modifiedLicenseHolder };
	}
	getModifyVoterUploadParams = ({ meta }) => {
		const { modifiedVoterHolder } = this.state;
		return { url: modifiedVoterHolder };
	}
	getModifyPanUploadParams = ({ meta }) => {
		const { modifiedPanHolder } = this.state;
		return { url: modifiedPanHolder };
	}

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

	// AlertChecker(values) {
	// 	for(let i = 0; i < values.files.length; i++) {
	// 			if(values.files[i].id_card === "1") {
	// 				this.setState({adhaarAlert: true })
	// 			}
	// 			break;
	// 	}
	// }
	resignedEmployee() {
		this.handleSubmit();
	}
	render() {
		const { 
			loading,
			designation,
			department,
			employee_image,
			shift,
			employeeCards,
			employee_create,
			branchModalVisibility,
			pfToggle,
			handlingSubmit,
			resignationData,
			adhaarChecker,
			esiToggle,
			adhaarAlert,
			editableEmpInfo,
			editablePerInfo,
			editablePosiInfo,
			editableEducaInfo,
			editableIdenInfo,
			editablePFInfo,
			editableSalInfo,
			editableOtherInfo,
			loadingEmpInfo,
			loadingPerInfo,
			loadingPosiInfo,
			loadingEducaInfo,
			loadingIdenInfo,
			loadingPFInfo,
			loadingSalInfo,
			employee_name,
			loadingOtherInfo,
			id,
			imageContainer,
			idContainer,
		} = this.state;
		const { doc } = this.props;
		const dropDownProps = {
			styles: {
				dropzone: {
					overflow: "auto",
					border: "none",
					borderRadius: "10px",
					background: "#EEEEEE",
					marginTop: "10px"
				},
				inputLabelWithFiles: {
					margin: "20px 3%",
				},
				inputLabel: {
					color: "black",
					fontSize: "14px",
				},
			},
			multiple: false,
			maxFiles: 1,
			accept: "image/*",
		};
		const containerProps = {
			className: styles.container,
			boxShadow: "lg",
			// minW: "600px",
		}; 

		return (
			<GlobalWrapper title="New Employee">
				<Head />
				<Formik
				initialValues={{
						employee_name: this.props.data[0]?.employee_name,
						father_name: this.props.data[0]?.father_name,
						dob: moment(this.props.data[0]?.dob).format("MM/DD/YYYY"),
						permanent_address: this.props.data[0]?.permanent_address,
						residential_address: this.props.data[0]?.residential_address,
						primary_contact_number: this.props.data[0]?.primary_contact_number,
						alternate_contact_number: this.props.data[0]?.alternate_contact_number,
						email_id: this.props.data[0]?.email_id,
						qualification: this.props.data[0]?.qualification,
						introducer_name: this.props.data[0]?.introducer_name,
						introducer_details: this.props.data[0]?.introducer_details,
						salary: this.props.data[0]?.salary,
						uniform_qty: this.props.data[0]?.uniform_qty,
						previous_experience: this.props.data[0]?.previous_experience,
						date_of_joining: moment(this.props.data[0]?.date_of_joining).format("MM/DD/YYYY"),
						gender: this.props.data[0]?.gender,
						blood_group: this.props.data[0]?.blood_group,
						designation_id: this.props.data[0]?.designation_id,
						designation_name: this.props.data[0]?.designation_name,
						store_id: this.props.data[0]?.store_id,
						store_name: this.props.data[0]?.store_name,
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
						payment_name: this.props.data[0]?.payment_type === "1" ? "Bank" : "Cash",
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
								card_name:this.props.doc ? this.props.doc[0]?.card_name : "",
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
						]
					}}
					// validationSchema={Validation}
					onSubmit={(values) => {
						id !== null ? this.updateEmployee(values) : this.createEmployee(values);
					}}
				>
					{(formikProps) => {
						const { handleSubmit, values } = formikProps;
						const handleEvent = () => {
							this.setState([...values.files, { id_card: "", id_card_no: "", file: "" }])
						}
						const AlertChecker = () => {
							const { handlingSubmit, resignationData } = this.state;
							for(let i = 0; i < values.files.length; i++) {
								for(let j = 0; j < adhaarChecker.length - 1; j++) {
									if(values.files[i].id_card_no === adhaarChecker[j].card_number) {
										this.setState({employee_name: adhaarChecker[j].employee_name, handlingSubmit: true});
										break;
									}
								}
								if(resignationData.length > 0) {
									handleSubmit();
									break;
								}
							}
						}
						
						return (
							<Form onSubmit={formikProps.handleSubmit}>
								<FormikErrorFocus align={"middle"} ease={"linear"} duration={200} />
								<Flex className={styles.responsive}>
									<Container p={"0px"}>
									{branchModalVisibility && (
                        			    <ResignedUser
                        			        data={resignationData}
                        			        visibility={branchModalVisibility}
                        			        setVisibility={(v) =>
                        			            this.setState({ branchModalVisibility: v, handlingSubmit: v })
                        			        }
                        			    />
                        			)}
										<Container {...containerProps} mb="20px">
											<p className={styles.title}>
												<div>Employee Information</div>
												{id !== null &&
													<Button isLoading={loadingEmpInfo} variant="outline"
														leftIcon={editableEmpInfo ? <i class="fa fa-floppy-o" aria-hidden="true" /> : <i class="fa fa-pencil" aria-hidden="true" />}
														colorScheme="purple" 
														onClick={() => { editableEmpInfo === true && handleSubmit(), this.setState({ editableEmpInfo: !editableEmpInfo }) }}
													>
														{editableEmpInfo ? "Save" : "Edit"}
													</Button>
												}
											</p>

											<div>
												<div className={styles.personalInputHolder}>
													<div className={styles.uploadHolder}>
														<label className={styles.uploaderTitle} for="uploadImage">
															Upload Employee Image *
														</label>
														{id !== null ?
															<div className={styles.employeeImageModify}>
																<img src={employee_image} className={styles.employee_image} />
																{editableEmpInfo === true && (
																<>
																<Button variant="outline"
																	leftIcon={imageContainer ? <i class="fa fa-trash-o" aria-hidden="true" /> : <i class="fa fa-pencil" aria-hidden="true" />}
																	colorScheme={imageContainer ? "red" : "purple"}
																	className={styles.modifyButton}
																	onClick={() => this.setState({ imageContainer: !imageContainer })}
																>
																	{imageContainer ? "Remove" : "Add New Image"}
																</Button>
																{imageContainer === true && (
																	<Dropzone getUploadParams={this.getModifyImageUploadParams} onChangeStatus={this.modifyImageChangeStatus} {...dropDownProps} />
																)}
																</>
																)}
															</div>
															: ""}
														{id === null ?
															<Dropzone getUploadParams={this.getImageUploadParams} onChangeStatus={this.imageChangeStatus} {...dropDownProps} />
															: ""}
													</div>
													<div className={styles.inputHolder}>
														<CustomInput label="Name *" name="employee_name" type="text" editable={id !== null ? editableEmpInfo : !editableEmpInfo} />
													</div>
												</div>
												<div className={styles.inputHolder}>
													<CustomInput
														label="Gender *"
														values={[
															{
																id: "Male",
																value: "Male",
															},
															{
																id: "Female",
																value: "Female",
															},
															{
																id: "Transgendar",
																value: "Transgendar",
															},
														]}
														name="gender"
														type="text"
														method="switch"
														editable={id !== null ? editableEmpInfo : !editableEmpInfo}
													/>
													<CustomInput label="Email ID" name="email_id" type="text" editable={id !== null ? editableEmpInfo : !editableEmpInfo} />
												</div>
												<div className={styles.inputHolder}>
													<CustomInput label="Primary Mobile Number *" name="primary_contact_number" type="text" editable={id !== null ? editableEmpInfo : !editableEmpInfo} />
													<CustomInput label="Alternate Mobile Number" name="alternate_contact_number" type="text" editable={id !== null ? editableEmpInfo : !editableEmpInfo} />
												</div>
												<div className={styles.inputHolder}>
													<CustomInput
														label="Date of Joining"
														name="date_of_joining"
														type="text"
														method="datepicker"
														editable={id !== null ? editableEmpInfo : !editableEmpInfo}
													/>
												</div>
											</div>
										</Container>

										<Container {...containerProps} mb={"20px"}>
											<p className={styles.title}>
												<div>Personal Details</div>
												{id !== null &&
													<Button isLoading={loadingPerInfo} variant="outline"
														leftIcon={editablePerInfo ? <i class="fa fa-floppy-o" aria-hidden="true" /> : <i class="fa fa-pencil" aria-hidden="true" />}
														colorScheme="purple"
														onClick={() => { editablePerInfo === true && handleSubmit(), this.setState({ editablePerInfo: !editablePerInfo }) }}
													>
														{editablePerInfo ? "Save" : "Edit"}
													</Button>
												}
											</p>
											<div>
												<div className={styles.inputHolder}>
													<CustomInput
														label="Marital Status *"
														values={[
															{
																id: "Married",
																value: "Married",
															},
															{
																id: "Un Married",
																value: "Un Married",
															},
															{
																id: "Widowed",
																value: "Widowed",
															},
															{
																id: "Divorced",
																value: "Divorced",
															},
															{
																id: "Separated",
																value: "Separated",
															},
														]}
														name="marital_status"
														type="text"
														method="switch"
														editable={id !== null ? editablePerInfo : !editablePerInfo}
													/>
													<div className={styles.inputHolder}>
														<CustomInput
															label="Date of Birth *"
															name="dob"
															type="text"
															method="datepicker"
															editable={id !== null ? editablePerInfo : !editablePerInfo}
														/>
													</div>
												</div>
												<div className={styles.personalInputHolder}	>
													{values.marital_status === "Married" && (
														<CustomInput
															label="Marriage Date"
															name="marriage_date"
															type="text"
															editable={id !== null ? editablePerInfo : !editablePerInfo}
														/>
													)}
												</div>
												<div className={styles.personalInputHolder}>
													<CustomInput label="Permanent Address *" name="permanent_address" type="text" method="TextArea" editable={id !== null ? editablePerInfo : !editablePerInfo} />
												</div>
												<div className={styles.personalInputHolder}>
													<CustomInput label="Residential Address *" name="residential_address" type="text" method="TextArea" editable={id !== null ? editablePerInfo : !editablePerInfo} />
												</div>
												<div className={styles.inputHolder}>
													<CustomInput label="Father Name *" name="father_name" type="text" editable={id !== null ? editablePerInfo : !editablePerInfo} />
													{values.marital_status === "Married" &&
														<CustomInput label="Spouse Name" name="spouse_name" type="text" editable={id !== null ? editablePerInfo : !editablePerInfo} />
													}
												</div>
												<div className={styles.personalInputHolder}>
													<CustomInput
														label="Blood Group"
														values={BloodGroup.map((m) => ({
															id: m.id,
															value: m.value
														}))}
														name="blood_group"
														type="text"
														method="switch"
														editable={id !== null ? editablePerInfo : !editablePerInfo}
													/>

												</div>
											</div>
										</Container>

										<Container {...containerProps} mb="20px">
											<p className={styles.title}>
												<div>Current Position</div>
												{id !== null &&
													<Button isLoading={loadingPosiInfo} variant="outline"
														leftIcon={editablePosiInfo ? <i class="fa fa-floppy-o" aria-hidden="true" /> : <i class="fa fa-pencil" aria-hidden="true" />}
														colorScheme="purple" 
														onClick={() => {editablePosiInfo === true && handleSubmit(), this.setState({ editablePosiInfo: !editablePosiInfo }) }}
													>
														{editablePosiInfo ? "Save" : "Edit"}
													</Button>
												}
											</p>

											<div>
												<div className={styles.personalInputHolder}>
													<div className={styles.inputHolder}>
													{id !== null ? (
														<CustomInput
															label="Select Store *"
															values={[
																{
																	id: 1,
																	value: "Store1",
																},
																{
																	id: 2,
																	value: "Store2",
																},
																{
																	id: 3,
																	value: "Store3",
																},
															]}
															name={editablePosiInfo ? "store_id" : "store_name"}
															type="text"
															method="switch"
															editable={id !== null ? editablePosiInfo : !editablePosiInfo}
														/>
													) : (
														<CustomInput
															label="Select Store *"
															values={[
																{
																	id: 1,
																	value: "Store1",
																},
																{
																	id: 2,
																	value: "Store2",
																},
																{
																	id: 3,
																	value: "Store3",
																},
															]}
															name={"store_id"}
															type="text"
															method="switch"
															editable={id !== null ? editablePosiInfo : !editablePosiInfo}
														/>
													)}
														{id !== null ? (
														<CustomInput
															label="Select Department *"
															values={department.map((m) => ({
																id: m.id,
																value: m.value,
															}))}
															name={editablePosiInfo ? "department_id" : "department_name"}
															type="text"
															method="switch"
															editable={id !== null ? editablePosiInfo : !editablePosiInfo}
														/>
														) : (
															<CustomInput
															label="Select Department *"
															values={department.map((m) => ({
																id: m.id,
																value: m.value,
															}))}
															name={"department_id"}
															type="text"
															method="switch"
															editable={id !== null ? editablePosiInfo : !editablePosiInfo}
														/>
														)}
													</div>
													<div className={styles.inputHolder}>
													{id !== null ? (
														<CustomInput
															label="Select Designation *"
															values={designation.map((m) => ({
																id: m.id,
																value: m.value,
															}))}
															name={editablePosiInfo ? "designation_id" : "designation_name"}
															type="text"
															method="switch"
															editable={id !== null ? editablePosiInfo : !editablePosiInfo}
														/>
													) : (
														<CustomInput
															label="Select Designation *"
															values={designation.map((m) => ({
																id: m.id,
																value: m.value,
															}))}
															name={"designation_id"}
															type="text"
															method="switch"
															editable={id !== null ? editablePosiInfo : !editablePosiInfo}
														/>
													)}
													</div>
													<div className={styles.inputHolder}>
													{id !== null ? (
														<CustomInput
															label="Shift Details"
															values={shift.map((m) => ({
																id: m.id,
																value: m.value,
															}))}
															name="shift_id"
															name={editablePosiInfo ? "shift_id" : "shift_name"}
															type="text"
															method="switch"
															editable={id !== null ? editablePosiInfo : !editablePosiInfo}
														/>
													) : ( 
														<CustomInput
															label="Shift Details"
															values={shift.map((m) => ({
																id: m.id,
																value: m.value,
															}))}
															name="shift_id"
															name={"shift_id"}
															type="text"
															method="switch"
															editable={id !== null ? editablePosiInfo : !editablePosiInfo}
														/>
													)}
													</div>
												</div>
											</div>
										</Container>

										<Container {...containerProps} mb={"20px"}>
											<p className={styles.title}>
												<div>Education Details</div>
												{id != null &&
													<Button isLoading={loadingEducaInfo} variant="outline"
														leftIcon={editableEducaInfo ? <i class="fa fa-floppy-o" aria-hidden="true" /> : <i class="fa fa-pencil" aria-hidden="true" />}
														colorScheme="purple"
														onClick={() => { editableEducaInfo === true && handleSubmit(), this.setState({ editableEducaInfo: !editableEducaInfo }) }}
													>
														{editableEducaInfo ? "Save" : "Edit"}
													</Button>
												}
											</p>
											<div>
												<div className={styles.inputHolder}>
													<CustomInput label="Educational Qualification *" name="qualification" type="text" editable={id !== null ? editableEducaInfo : !editableEducaInfo} />
													<CustomInput label="Previous Experience" name="previous_experience" type="text" editable={id !== null ? editableEducaInfo : !editableEducaInfo} />
												</div>
												<div className={styles.personalInputHolder}>
													<CustomInput label="Additional Courses" name="additional_course" type="text" method="TextArea" editable={id !== null ? editableEducaInfo : !editableEducaInfo} />
												</div>
											</div>
										</Container>
									</Container>
									<Container>
										<Container {...containerProps} pb={"20px"} mb={"20px"}>
											<p className={styles.title}>
												<div>Employee Identity</div>
												{id !== null &&
													<Button isLoading={loadingIdenInfo} variant="outline"
														leftIcon={editableIdenInfo ? <i class="fa fa-floppy-o" aria-hidden="true" /> : <i class="fa fa-pencil" aria-hidden="true" />}
														colorScheme="purple"
														onClick={() => { editableIdenInfo === true && handleSubmit(), this.setState({ editableIdenInfo: !editableIdenInfo, idContainer: !idContainer }) }}
													>
														{editableIdenInfo ? "Save" : "Edit"}
													</Button>
												}
											</p>

											<div>
												<div className={styles.inputHolder}>
													<CustomInput
														label="Payment Type *"
														values={PaymentType.map((m) => ({
															id: m.id,
															value: m.value
														}))}
														name={editableIdenInfo || id === null ? "payment_type" : "payment_name"}
														type="text"
														method="switch"
														editable={id !== null ? editableIdenInfo : !editableIdenInfo}
													/>
												</div>
												{values.payment_type === "1" && (
													<>
														<div className={styles.inputHolder}>
															<CustomInput label="Bank Name *" name="bank_name" type="text" editable={id !== null ? editableIdenInfo : !editableIdenInfo} />
															<CustomInput label="IFSC Code *" name="ifsc" type="text" editable={id !== null ? editableIdenInfo : !editableIdenInfo} />
														</div>
														<div className={styles.inputHolder}>
															<CustomInput label="Account Number *" name="account_no" type="text" editable={id !== null ? editableIdenInfo : !editableIdenInfo} />
														</div>
													</>
												)}
												{doc !== null && (
													<div>
														{doc.map((m, i) => (
															<>	
																<div className={styles.inputHolder} style={{ marginBottom: 0 }}>
																	<CustomInput label="Card Type" name="card_type" value={m.card_type === '1' ? "Adhaar Card" : m.card_type === '2' ? "License" : m.card_type === '3' ? "Voter ID" : "pan card"} type="text" method="readonly" containerStyle={{ marginTop: 30, marginBottom: 30 }} />
																</div>
																<div className={styles.inputHolder} >
																	<CustomInput label="Card Number" name={`docupdate[${i}].card_no`} type="text" editable={id !== null ? editableIdenInfo : !editableIdenInfo} containerStyle={{ marginBottom: 0 }} />
																	<CustomInput label="Name in Card" name={`docupdate[${i}].card_name`}  type="text" editable={id !== null ? editableIdenInfo : !editableIdenInfo} containerStyle={{ marginBottom: 0 }} />
																	<br />
																</div>
																<div>
																{id !== null ?
																<div className={styles.employeeImageModify}>
																<img src={m.file} className={styles.employee_image} />
																{idContainer === true && (
																<Dropzone 
																	getUploadParams={
																		m.card_type === "1" ? this.getModifyAdhaarUploadParams : 
																		m.card_type === "2" ? this.getModifyLicenseUploadParams : 
																		m.card_type === '3' ? this.getModifyVoterUploadParams : 
																		this.getModifyPanUploadParams
																	} 
																	onChangeStatus={
																		m.card_type === "1" ? this.modifyAdhaarChangeStatus : 
																		m.card_type === "2" ? this.modifyLicenseChangeStatus : 
																		m.card_type === '3' ? this.modifyVoterChangeStatus : 
																		this.modifyPanChangeStatus
																	} 
																	{...dropDownProps} 
																	style={{marginTop: "60px"}}
																/>
																)}
															</div>
															: ""}
															{id === null ?
															<Dropzone getUploadParams={this.getImageUploadParams} onChangeStatus={this.imageChangeStatus} {...dropDownProps} />
															: ""}
																</div>
															</>
														))}
													</div>
												)}
												{id !== null && editableIdenInfo === true && <p className={styles.newDocumentSet}>To Upload New Documents</p>}
												{editableIdenInfo === true || id === null ?
													<FieldArray name="files">
														{fieldArrayProps => {
															const { push, remove, form } = fieldArrayProps
															const { values } = form
															const { files } = values;
															return <div>
																{files.map((file, index) => (
																	<>
																		<div className={styles.inputHolder} key={index} style={{ marginBottom: 0 }}>
																			<CustomInput label="New ID Card Type" values={IdCardType.map((d) => ({ id: d.id, value: d.value }))} name={`files[${index}].id_card`} type="text" method="switch" containerStyle={{ marginTop: 30, marginBottom: 30 }} editable={id !== null ? editableIdenInfo : !editableIdenInfo} />
																		</div>
																		
																		{files[0].id_card && files[index].id_card === "1" && (
																			<>
																				<div className={styles.inputHolder} key={index}>
																					<CustomInput label="Adhaar Card Number" name={`files[${index}].id_card_no`} type="text" containerStyle={{ marginBottom: 0 }} editable={id !== null ? editableIdenInfo : !editableIdenInfo} />
																					<CustomInput label="Name in Adhaar Card" name={`files[${index}].id_card_name`} type="text" containerStyle={{ marginBottom: 0 }} editable={id !== null ? editableIdenInfo : !editableIdenInfo} />
																					<br />
																				</div>
																				<div className={styles.uploadHolder} style={{ marginTop: 30 }}>
																					<label className={styles.uploaderTitle} for="subUploadID">
																						Upload ID *
																					</label>
																					<Dropzone getUploadParams={this.adhaarUploadParams} onChangeStatus={this.adhaarChangeStatus} {...dropDownProps} />
																				</div>
																			</>
																		)}
																		{files[0].id_card && files[index].id_card === "2" && (
																			<>
																				<div className={styles.inputHolder} key={index}>
																					<CustomInput label="Driving license Number" name={`files[${index}].id_card_no`} type="text" containerStyle={{ marginBottom: 0 }} editable={id !== null ? editableIdenInfo : !editableIdenInfo} />
																					<CustomInput label="Name in Driving License" name={`files[${index}].id_card_name`} type="text" containerStyle={{ marginBottom: 0 }} editable={id !== null ? editableIdenInfo : !editableIdenInfo} />
																					<CustomInput label="Expiry Date" name={`files[${index}].expiry_date`} type="text" method="datepicker" containerStyle={{ marginBottom: 0 }} editable={id !== null ? editableIdenInfo : !editableIdenInfo} />
																					<br />
																				</div>
																				<div className={styles.uploadHolder} style={{ marginTop: 30 }}>
																					<label className={styles.uploaderTitle} for="subUploadID">
																						Upload ID *
																					</label>
																					<Dropzone getUploadParams={this.licenseUploadParams} onChangeStatus={this.licenseChangeStatus} {...dropDownProps} />
																				</div>
																			</>
																		)}
																		{files[0].id_card && files[index].id_card === "3" && (
																			<>
																				<div className={styles.inputHolder} key={index}>
																					<CustomInput label="Voter Id Number" name={`files[${index}].id_card_no`} type="text" containerStyle={{ marginBottom: 0 }} editable={id !== null ? editableIdenInfo : !editableIdenInfo} />
																					<CustomInput label="Name in Voter Id" name={`files[${index}].id_card_name`} type="text" containerStyle={{ marginBottom: 0 }} editable={id !== null ? editableIdenInfo : !editableIdenInfo} />
																					<br />
																				</div>
																				<div className={styles.uploadHolder} style={{ marginTop: 30 }}>
																					<label className={styles.uploaderTitle} for="subUploadID">
																						Upload ID *
																					</label>
																					<Dropzone getUploadParams={this.voterIdUploadParams} onChangeStatus={this.voterIdChangeStatus} {...dropDownProps} />
																				</div>
																			</>
																		)}
																		{files[0].id_card && files[index].id_card === "4" && (
																			<>
																				<div className={styles.inputHolder} key={index}>
																					<CustomInput label="Pan Number" name={`files[${index}].id_card_no`} type="text" containerStyle={{ marginBottom: 0 }} editable={id !== null ? editableIdenInfo : !editableIdenInfo} />
																					<CustomInput label="Name in Pan" name={`files[${index}].id_card_name`} type="text" containerStyle={{ marginBottom: 0 }} editable={id !== null ? editableIdenInfo : !editableIdenInfo} />
																					<br />
																				</div>
																				<div className={styles.uploadHolder} style={{ marginTop: 30 }}>
																					<label className={styles.uploaderTitle} for="subUploadID">
																						Upload ID *
																					</label>
																					<Dropzone getUploadParams={this.panUploadParams} onChangeStatus={this.panChangeStatus} {...dropDownProps} />
																				</div>
																			</>
																		)}
																		<br />
																		{index > 0 && (
																			<Button className={styles.button} isLoading={loading} loadingText="Generating" colorScheme="red" onClick={() => remove(index)}>
																				{"Remove"}
																			</Button>
																		)}
																		{index <= 0 && (
																			<Button className={styles.button} isLoading={loading} loadingText="Generating" isDisabled={true} colorScheme="red" onClick={() => remove(index)}>
																				{"Remove"}
																			</Button>
																		)}
																		<Button isLoading={loading} loadingText="Generating" colorScheme="purple" onClick={() => push('')}>
																			{"Add"}
																		</Button>
																	</>
																))}
															</div>
														}}
													</FieldArray>
													: ""}
											</div>
										</Container>

										<Container {...containerProps} mb={"20px"}>
											<p className={styles.title}>
												<div>PF & ESI</div>
												{id !== null &&
													<Button isLoading={loadingPFInfo} variant="outline"
														leftIcon={editablePFInfo ? <i class="fa fa-floppy-o" aria-hidden="true" /> : <i class="fa fa-pencil" aria-hidden="true" />}
														colorScheme="purple"
														onClick={() => { editablePFInfo === true && handleSubmit(), this.setState({ editablePFInfo: !editablePFInfo }) }}
													>
														{editablePFInfo ? "Save" : "Edit"}
													</Button>
												}
											</p>

											<div>
												<div className={styles.personalInputHolder} >
													<div className={styles.inputHolder}>
														<CustomInput label="PAN No *" name="pan_no" type="text" editable={id !== null ? editablePFInfo : !editablePFInfo} />
													</div>
													{id !== null ?
														<div className={styles.switchHolder}>
															<label>PF Number & UAN Number</label>
															<Switch className={styles.switch} id="email-alerts" isChecked={true} isDisabled={true} onChange={() => this.setState({ pfToggle: true })} />
														</div>
														:
														<div className={styles.switchHolder}>
															<label>PF Number & UAN Number</label>
															<Switch className={styles.switch} id="email-alerts" onChange={() => this.setState({ pfToggle: !pfToggle })} />
														</div>
													}
												</div>
												{pfToggle === true || id !== null ? (
													<div className={styles.inputHolder}>
														<CustomInput label="PF Number *" name="pf_number" type="text" editable={id !== null ? editablePFInfo : !editablePFInfo} />
														<CustomInput label="UAN Number *" name="UAN" type="text" editable={id !== null ? editablePFInfo : !editablePFInfo} />
													</div>
												) : ""}

												{id !== null ?
													<div className={styles.switchHolder}>
														<label>ESI Number</label>
														<Switch className={styles.switch} id="email-alerts" isChecked={true} isDisabled={true} onChange={() => this.setState({ esiToggle: !esiToggle })} />
													</div>
													:
													<div className={styles.switchHolder}>
														<label>ESI Number</label>
														<Switch className={styles.switch} id="email-alerts" onChange={() => this.setState({ esiToggle: !esiToggle })} />
													</div>
												}
												{esiToggle === true || id !== null ? (
													<div className={styles.inputHolder}>
														<CustomInput label="ESI Number *" name="esi_number" type="text" editable={id !== null ? editablePFInfo : !editablePFInfo} />
													</div>
												) : ""}
											</div>
										</Container>
										<Container {...containerProps} pb={"20px"}>
											<p className={styles.title}>
												<div>Salary Details</div>
												{id !== null &&
													<Button isLoading={loadingSalInfo} variant="outline"
														leftIcon={editableSalInfo ? <i class="fa fa-floppy-o" aria-hidden="true" /> : <i class="fa fa-pencil" aria-hidden="true" />}
														colorScheme="purple"
														onClick={() => { editableSalInfo === true && handleSubmit(), this.setState({ editableSalInfo: !editableSalInfo }) }}
													>
														{editableSalInfo ? "Save" : "Edit"}
													</Button>
												}
											</p>

											<div className={styles.inputHolder}>
												<CustomInput label="Salary / Month *" name="salary" type="text" containerStyle={{ marginBottom: 0 }} editable={id !== null ? editableSalInfo : !editableSalInfo} />
											</div>
										</Container>
										<br />
										<Container {...containerProps} pb={"20px"}>
											<p className={styles.title}>
												<div>Others</div>
												{id !== null &&
													<Button isLoading={loadingOtherInfo} variant="outline"
														leftIcon={editableOtherInfo ? <i class="fa fa-floppy-o" aria-hidden="true" /> : <i class="fa fa-pencil" aria-hidden="true" />}
														colorScheme="purple"
														onClick={() => { editableOtherInfo === true && handleSubmit(), this.setState({ editableOtherInfo: !editableOtherInfo }) }}
													>
														{editableOtherInfo ? "Save" : "Edit"}
													</Button>
												}
											</p>

											<div className={styles.inputHolder} style={{ marginTop: 20, marginBottom: 0 }}>
												<CustomInput label="Unifrom" name="uniform_qty" type="text" containerStyle={{ marginBottom: 30 }} editable={id !== null ? editableOtherInfo : !editableOtherInfo} />
											</div>

											<div className={styles.personalInputHolder}>
												<CustomInput
													label="Introducer's Name"
													name="introducer_name"
													type="text"
													editable={id !== null ? editableOtherInfo : !editableOtherInfo}
												/>
											</div>
											<div className={styles.personalInputHolder}>
												<CustomInput
													label="Introducer Details"
													name="introducer_details"
													type="text"
													method="TextArea"
													containerStyle={{ marginBottom: 10 }}
													editable={id !== null ? editableOtherInfo : !editableOtherInfo}
												/>
											</div>
											{id === null && (
												<ButtonGroup
													spacing="6"
													mt={10}
													style={{
														display: "flex",
														// width: "100%",
														justifyContent: "flex-end",
													}}
												>
													<Button>Cancel</Button>
													<Button isLoading={loading} loadingText="Submitting" colorScheme="purple" onClick={() => AlertChecker()}>
														{"Create"}
													</Button>
												</ButtonGroup>
											)}
										</Container>
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

export async function getServerSideProps(context) {
	var data = [];
	if(context.query.id !== "create") {
	data = await EmployeeHelper.getEmployeeByID(context.query.id);
	}
	const id = context.query.id != "create" ? data[0].employee_id : null;
	let doc = [];
	doc = context.query.id == "create" ? null : await DocumentHelper.getDocType(id);
	return {
		props: { data, id, doc }
	};
}

export default withRouter(Create);