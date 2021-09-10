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
import { BloodGroup, PaymentType } from "../../constants/values";
import EmployeeHelper from "../../helper/employee";
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

const INITIAL_VALUES = {

};

class Id extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			employee_name: props.data.employee_name,
			father_name: props.data.father_name,
			dob: props.data.dob,
			permanent_address: props.data.permanent_address,
			residential_address: props.data.residential_address,
			primary_contact_number: props.data.primary_contact_number,
			alternate_contact_number: props.data.alternate_contact_number,
			email_id: props.data.email_id,
			qualification: props.data.qualification,
			introducer_name: props.data.introducer_name,
			introducer_details: props.data.introducer_details,
			salary: props.data.salary,
			uniform_qty: props.data.uniform_qty,
			previous_experience: props.data.previous_experience,
			date_of_joining: props.data.date_of_joining,
			gender: props.data.gender,
			blood_group: props.data.blood_group,
			designation_id: props.data.designation_id,
			store_id: props.data.store_id,
			shift_id: props.data.shift_id,
			department_id: props.data.department_id,
			marital_status: props.data.marital_status,
			marriage_date: props.data.marriage_date,
			employee_image: props.data.employee_image,

			bank_name: props.data.bank_name,
			ifsc: props.data.ifsc,
			account_no: props.data.account_no,

			esi: props.data.esi,
			esi_number: props.data.esi_number,
			pf: props.data.pf,
			pf_number: props.data.pf_number,
			UAN: props.data.uan,
			additional_course: props.data.additional_course,
			spouse_name: props.data.spouse_name,
			online_portal: props.data.online_portal,
			pan_no: props.data.pan_no,
			payment_type: props.data.payment_type,

			loading: false,
			department: [],
			designation: [],
			shift: [],
			uploadImage: [],
			uploadId: [],
			subUploadId: [],
			licenseHolder: [],
			adhaarHolder: [],
			voterHolder: [],
			subIdHolder: [],
			docType: [],
			imageHolder: [],
			employeeCards: false,
			subIdHolder2: [],
			pfToggle: false,
			esiToggle: false,

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
		};
	}

	componentDidMount() {
		this.getDesignation();
		this.getDepartment();
		this.getShift();
		this.getDocumentType();
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
	getDocumentType() {
		DocumentHelper.getDocType()
			.then((data) => {
				this.setState({ docType: data })
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

	updateEmployeeDetails = async (values) => {
		try {
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
				const Subarray = [];
				Subarray.push(await FilesHelper.upload(
					this.state.adhaarHolder,
					"adhaarUpload",
					"dashboard_file"
				));
				for (let i = 0; i <= values.files.length; i++) {
					if (values.files[i].id_card === "1") {
						values.files[i].file = Subarray.length > 0 ? Subarray[0].remoteUrl : "";
					}
				}
			}
		} catch (err) {
			console.log(err);
		}
		const { employee_id } = this.props.data[0];
		EmployeeHelper.updateEmployeeDetails({
			employee_id: employee_id,
			employee_details: values
		})
			.then((data) => {
				if (data.code == 200) {
					toast.success("Employee verified!");
				} else {
					throw "error";
				}
			})
			.catch((err) => {
				console.log(err);
				alert("Error verifying seller!");
			});
	}

	getImageUploadParams = ({ meta }) => {
		const { imageHolder } = this.state;
		return { url: imageHolder };
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

	render() {
		const {
			designation,
			department,
			shift,
			employeeCards,
			docType,
			pfToggle,
			esiToggle,
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
			loadingOtherInfo,
		} = this.state;
		const {
			employee_image
		} = this.props.data[0];
		const dropDownProps = {
			styles: {
				dropzone: {
					overflow: "auto",
					border: "none",
					borderRadius: "10px",
					background: "#EEEEEE",
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
			<GlobalWrapper title="Update Employee">
				<Head />
				<Formik
					initialValues={{
						employee_name: this.props.data[0].employee_name,
						father_name: this.props.data[0].father_name,
						dob: moment(this.props.data[0].dob).format("YYYY-MM-DD"),
						permanent_address: this.props.data[0].permanent_address,
						residential_address: this.props.data[0].residential_address,
						primary_contact_number: this.props.data[0].primary_contact_number,
						alternate_contact_number: this.props.data[0].alternate_contact_number,
						email_id: this.props.data[0].email_id,
						qualification: this.props.data[0].qualification,
						introducer_name: this.props.data[0].introducer_name,
						introducer_details: this.props.data[0].introducer_details,
						salary: this.props.data[0].salary,
						uniform_qty: this.props.data[0].uniform_qty,
						previous_experience: this.props.data[0].previous_experience,
						date_of_joining: this.props.data[0].date_of_joining,
						gender: this.props.data[0].gender,
						blood_group: this.props.data[0].blood_group,
						designation_id: this.props.data[0].designation_id,
						store_id: this.props.data[0].store_id,
						shift_id: this.props.data[0].shift_id,
						department_id: this.props.data[0].department_id,
						marital_status: this.props.data[0].marital_status,
						marriage_date: this.props.data[0].marriage_date,
						employee_image: this.props.data[0].employee_image,

						bank_name: this.props.data[0].bank_name,
						ifsc: this.props.data[0].ifsc,
						account_no: this.props.data[0].account_no,

						esi: this.props.data[0].esi,
						esi_number: this.props.data[0].esi_number,
						pf: this.props.data[0].pf,
						pf_number: this.props.data[0].pf_number,
						UAN: this.props.data[0].uan,
						additional_course: this.props.data[0].additional_course,
						spouse_name: this.props.data[0].spouse_name,
						online_portal: this.props.data[0].online_portal,
						pan_no: this.props.data[0].pan_no,
						payment_type: this.props.data[0].payment_type,
						files: [
							{
								id_card: "",
								id_card_no: "",
								id_card_name: "",
								expiry_date: "",
								file: "",
							},
						],
					}}
					validationSchema={Validation}
					onSubmit={(values) => {
						this.updateEmployeeDetails(values);

					}}
				>

					{(formikProps) => {
						const { handleSubmit, values } = formikProps;
						const handleEvent = () => {
							this.setState([...values.files, { id_card: "", id_card_no: "", file: "" }])
						}
						return (
							<Form>
								<FormikErrorFocus align={"middle"} ease={"linear"} duration={200} />
								<Flex className={styles.responsive}>
									<Container p={"0px"}>
										<Container {...containerProps} mb="20px">
											<p className={styles.title}>
												<div>Employee Information</div>
												<Button isLoading={loadingEmpInfo} variant="outline"
													leftIcon={editableEmpInfo ? <i class="fa fa-floppy-o" aria-hidden="true" /> : <i class="fa fa-pencil" aria-hidden="true" />}
													colorScheme="purple"
													onClick={() => {
														this.setState({ editableEmpInfo: !editableEmpInfo })
														editableEmpInfo && handleSubmit()
													}}
												>
													{editableEmpInfo ? "Save" : "Edit"}
												</Button>
											</p>

											<div>
												{employee_image === null ? (
													<div className={styles.personalInputHolder}>
														<div className={styles.uploadHolder}>
															<label className={styles.uploaderTitle} for="uploadImage">
																Upload Employee Image *
															</label>
															<Dropzone getUploadParams={this.getImageUploadParams} onChangeStatus={this.imageChangeStatus} {...dropDownProps} />
														</div>
														<div className={styles.inputHolder}>
															<CustomInput label="Name *" name="employee_name" type="text" editable={editableEmpInfo} />
														</div>
													</div>
												) : (
													<div className={styles.personalInputHolder}>
														<div className={styles.uploadHolder}>
															<label className={styles.uploaderTitle} for="uploadImage">
																Upload Employee Image *
															</label>
															<img id="uploadImage" className={styles.employee_image} src={`${employee_image}`} />
														</div>
														<div className={styles.inputHolder}>
															<CustomInput label="Name *" name="employee_name" type="text" editable={editableEmpInfo} />
														</div>
													</div>
												)}
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
														editable={editableEmpInfo}
													/>
													<CustomInput label="Email ID" name="email_id" type="text" editable={editableEmpInfo} />
												</div>
												<div className={styles.inputHolder}>
													<CustomInput label="Primary Mobile Number *" name="primary_contact_number" type="text" editable={editableEmpInfo} />
													<CustomInput label="Alternate Mobile Number" name="alternate_contact_number" type="text" editable={editableEmpInfo} />
												</div>
												<div className={styles.inputHolder}>
													<CustomInput
														label="Date of Joining"
														name="date_of_joining"
														type="text"
														editable={editableEmpInfo}
													/>
												</div>
											</div>
										</Container>

										<Container {...containerProps} mb={"20px"}>
											<p className={styles.title}>
												<div>Personal Details</div>
												<Button isLoading={loadingPerInfo} variant="outline"
													leftIcon={editablePerInfo ? <i class="fa fa-floppy-o" aria-hidden="true" /> : <i class="fa fa-pencil" aria-hidden="true" />}
													colorScheme="purple"
													onClick={() => {
														this.setState({ editablePerInfo: !editablePerInfo })
																		editablePerInfo && handleSubmit()
													}}
												>
													{editablePerInfo ? "Save" : "Edit"}
												</Button>
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
														editable={editablePerInfo}
													/>
													<div className={styles.inputHolder}>
														<CustomInput
															label="Date of Birth *"
															name="dob"
															type="text"
															editable={editablePerInfo}
														/>
													</div>
												</div>
												<div className={styles.personalInputHolder}	>
													{values.marital_status === "Married" && (
														<CustomInput
															label="Marriage Date"
															name="marriage_date"
															type="text"
															editable={editablePerInfo}
														/>
													)}
												</div>
												<div className={styles.personalInputHolder}>
													<CustomInput label="Permanent Address *" name="permanent_address" type="text" method="TextArea" editable={editablePerInfo} />
												</div>
												<div className={styles.personalInputHolder}>
													<CustomInput label="Residential Address *" name="residential_address" type="text" method="TextArea" editable={editablePerInfo} />
												</div>
												<div className={styles.inputHolder}>
													<CustomInput label="Father Name *" name="father_name" type="text" editable={editablePerInfo} />
													{values.marital_status === "Married" &&
														<CustomInput label="Spouse Name" name="spouse_name" type="text" editable={editablePerInfo} />
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
														editable={editablePerInfo}
													/>

												</div>
											</div>
										</Container>

										<Container {...containerProps} mb="20px">
											<p className={styles.title}>
												<div>Current Position</div>
												<Button isLoading={loadingPosiInfo} variant="outline"
													leftIcon={editablePosiInfo ? <i class="fa fa-floppy-o" aria-hidden="true" /> : <i class="fa fa-pencil" aria-hidden="true" />}
													colorScheme="purple"
													onClick={() => {
														this.setState({ editablePosiInfo: !editablePosiInfo })
																		editablePosiInfo && handleSubmit()
													}}
												>
													{editablePosiInfo ? "Save" : "Edit"}
												</Button>
											</p>

											<div>
												<div className={styles.personalInputHolder}>
													<div className={styles.inputHolder}>
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
															name="store_id"
															type="text"
															method="switch"
															editable={editablePosiInfo}
														/>
														<CustomInput
															label="Select Department *"
															values={department.map((m) => ({
																id: m.id,
																value: m.value,
															}))}
															name="department_id"
															type="text"
															method="switch"
															editable={editablePosiInfo}
														/>
													</div>
													<div className={styles.inputHolder}>
														<CustomInput
															label="Select Designation *"
															values={designation.map((m) => ({
																id: m.id,
																value: m.value,
															}))}
															name="designation_id"
															type="text"
															method="switch"
															editable={editablePosiInfo}
														/>
													</div>
													<div className={styles.inputHolder}>
														<CustomInput
															label="Shift Details"
															values={shift.map((m) => ({
																id: m.id,
																value: m.value,
															}))}
															name="shift_id"
															type="text"
															method="switch"
															editable={editablePosiInfo}
														/>
													</div>
												</div>
											</div>
										</Container>

										<Container {...containerProps} mb={"20px"}>
											<p className={styles.title}>
												<div>Education Details</div>
												<Button isLoading={loadingEducaInfo} variant="outline"
													leftIcon={editableEducaInfo ? <i class="fa fa-floppy-o" aria-hidden="true" /> : <i class="fa fa-pencil" aria-hidden="true" />}
													colorScheme="purple"
													onClick={() => {
														this.setState({ editableEducaInfo: !editableEducaInfo })
																		editableEducaInfo && handleSubmit()
													}}
												>
													{editableEducaInfo ? "Save" : "Edit"}
												</Button>
											</p>
											<div>
												<div className={styles.inputHolder}>
													<CustomInput label="Educational Qualification *" name="qualification" type="text" editable={editableEducaInfo} />
													<CustomInput label="Previous Experience" name="previous_experience" type="text" editable={editableEducaInfo} />
												</div>
												<div className={styles.personalInputHolder}>
													<CustomInput label="Additional Courses" name="additional_course" type="text" method="TextArea" editable={editableEducaInfo} />
												</div>
											</div>
										</Container>
									</Container>
									<Container>
										<Container {...containerProps} pb={"20px"} mb={"20px"}>
											<p className={styles.title}>
												<div>Employee Identity</div>
												<Button isLoading={loadingIdenInfo} variant="outline"
													leftIcon={editableIdenInfo ? <i class="fa fa-floppy-o" aria-hidden="true" /> : <i class="fa fa-pencil" aria-hidden="true" />}
													colorScheme="purple"
													onClick={() => {
														this.setState({ editableIdenInfo: !editableIdenInfo })
													    				editableIdenInfo && handleSubmit()
													}}
												>
													{editableIdenInfo ? "Save" : "Edit"}
												</Button>
											</p>

											<div>
												<div className={styles.inputHolder}>
													<CustomInput
														label="Payment Type *"
														values={PaymentType.map((m) => ({
															id: m.id,
															value: m.value
														}))}
														name="payment_type"
														type="text"
														method="switch"
														editable={editableIdenInfo}
													/>
												</div>
												{values.payment_type === "1" && (
													<>
														<div className={styles.inputHolder}>
															<CustomInput label="Bank Name *" name="bank_name" type="text" editable={editableIdenInfo} />
															<CustomInput label="IFSC Code *" name="ifsc" type="text" editable={editableIdenInfo} />
														</div>
														<div className={styles.inputHolder}>
															<CustomInput label="Account Number *" name="account_no" type="text" editable={editableIdenInfo} />
														</div>
													</>
												)}

												<FieldArray name="files">
													{fieldArrayProps => {
														const { push, remove, form } = fieldArrayProps
														const { values } = form
														const { files } = values;
														return <div>
															{files.map((file, index) => (
																<>
																	<div className={styles.inputHolder} key={index} style={{ marginBottom: 0 }}>
																		<CustomInput label="New ID Card Type" values={docType.map((d) => ({ id: d.id, value: d.value }))} name={`files[${index}].id_card`} type="text" method="switch" containerStyle={{ marginTop: 30, marginBottom: 30 }} editable={editableIdenInfo} />
																	</div>
																	{files[0].id_card && files[index].id_card === "1" && (
																		<>
																			<div className={styles.inputHolder} key={index}>
																				<CustomInput label="Adhaar Card Number" name={`files[${index}].id_card_no`} type="text" containerStyle={{ marginBottom: 0 }} editable={editableIdenInfo} />
																				<CustomInput label="Name in Adhaar Card" name={`files[${index}].id_card_name`} type="text" containerStyle={{ marginBottom: 0 }} editable={editableIdenInfo} />
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
																				<CustomInput label="Driving license Number" name={`files[${index}].id_card_no`} type="text" containerStyle={{ marginBottom: 0 }} editable={editableIdenInfo} />
																				<CustomInput label="Name in Driving License" name={`files[${index}].id_card_name`} type="text" containerStyle={{ marginBottom: 0 }} editable={editableIdenInfo} />
																				<CustomInput label="Expiry Date" name={`files[${index}].expiry_date`} type="text" containerStyle={{ marginBottom: 0 }} editable={editableIdenInfo} />
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
																				<CustomInput label="Voter Id Number" name={`files[${index}].id_card_no`} type="text" containerStyle={{ marginBottom: 0 }} editable={editableIdenInfo} />
																				<CustomInput label="Name in Voter Id" name={`files[${index}].id_card_name`} type="text" containerStyle={{ marginBottom: 0 }} editable={editableIdenInfo} />
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
																	<br />
																	{index > 0 && (
																		<Button className={styles.button} isLoading={loadingOtherInfo} loadingText="Generating" colorScheme="red" onClick={() => remove(index)}>
																			{"Remove"}
																		</Button>
																	)}
																	<Button isLoading={loadingOtherInfo} loadingText="Generating" colorScheme="purple" onClick={() => push('')}>
																		{"Add"}
																	</Button>
																</>
															))}
														</div>
													}}
												</FieldArray>
											</div>
										</Container>

										<Container {...containerProps} mb={"20px"}>
											<p className={styles.title}>
												<div>PF & ESI</div>
												<Button isLoading={loadingPFInfo} variant="outline"
													leftIcon={editablePFInfo ? <i class="fa fa-floppy-o" aria-hidden="true" /> : <i class="fa fa-pencil" aria-hidden="true" />}
													colorScheme="purple"
													onClick={() => {
														this.setState({ editablePFInfo: !editablePFInfo })
																	 	editablePFInfo && handleSubmit()
													}}
												>
													{editablePFInfo ? "Save" : "Edit"}
												</Button>
											</p>

											<div>
												<div className={styles.personalInputHolder} >
													<div className={styles.inputHolder}>
														<CustomInput label="PAN No *" name="pan_no" type="text" editable={editablePFInfo} />
													</div>
													<div className={styles.switchHolder}>
														<label>PF Number & UAN Number</label>
														<Switch className={styles.switch} id="email-alerts" onChange={() => this.setState({ pfToggle: !pfToggle })} />
													</div>
												</div>
												{pfToggle === true && (
													<div className={styles.inputHolder}>
														<CustomInput label="PF Number *" name="pf_number" type="text" editable={editablePFInfo} />
														<CustomInput label="UAN Number *" name="UAN" type="text" editable={editablePFInfo} />
													</div>
												)}
												<div className={styles.switchHolder}>
													<label>ESI Number</label>
													<Switch className={styles.switch} id="email-alerts" onChange={() => this.setState({ esiToggle: !esiToggle })} />
												</div>
												{esiToggle === true && (
													<div className={styles.inputHolder}>
														<CustomInput label="ESI Number *" name="esi_number" type="text" editable={editablePFInfo} />
													</div>
												)}
											</div>
										</Container>
										<Container {...containerProps} pb={"20px"}>
											<p className={styles.title}>
												<div>Salary Details</div>
												<Button isLoading={loadingSalInfo} variant="outline"
													leftIcon={editableSalInfo ? <i class="fa fa-floppy-o" aria-hidden="true" /> : <i class="fa fa-pencil" aria-hidden="true" />}
													colorScheme="purple"
													onClick={() => {
														this.setState({ editableSalInfo: !editableSalInfo })
																		editableSalInfo && handleSubmit()
													}}
												>
													{editableSalInfo ? "Save" : "Edit"}
												</Button>
											</p>

											<div className={styles.inputHolder}>
												<CustomInput label="Salary / Month *" name="salary" type="text" containerStyle={{ marginBottom: 0 }} editable={editableSalInfo} />
											</div>
										</Container>
										<br />
										<Container {...containerProps} pb={"20px"}>
											<p className={styles.title}>
												<div>Others</div>
												<Button isLoading={loadingOtherInfo} variant="outline"
													leftIcon={editableOtherInfo ? <i class="fa fa-floppy-o" aria-hidden="true" /> : <i class="fa fa-pencil" aria-hidden="true" />}
													colorScheme="purple"
													onClick={() => {
														this.setState({ editableOtherInfo: !editableOtherInfo })
																		editableOtherInfo && handleSubmit()
													}}
												>
													{editableOtherInfo ? "Save" : "Edit"}
												</Button>
											</p>

											<div className={styles.inputHolder} style={{ marginTop: 20, marginBottom: 0 }}>
												<CustomInput label="Unifrom" name="uniform_qty" type="text" containerStyle={{ marginBottom: 30 }} editable={editableOtherInfo} />
											</div>

											<div className={styles.personalInputHolder}>
												<CustomInput
													label="Introducer's Name"
													name="introducer_name"
													type="text"
													editable={editableOtherInfo}
												/>
											</div>
											<div className={styles.personalInputHolder}>
												<CustomInput
													label="Introducer Details"
													name="introducer_details"
													type="text"
													method="TextArea"
													containerStyle={{ marginBottom: 10 }}
													editable={editableOtherInfo}
												/>
											</div>
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
	const data = await EmployeeHelper.getEmployeeByID(context.query.id);
	return {
		props: { data }
	};
}

export default withRouter(Id);